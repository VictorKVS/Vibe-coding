import http from 'node:http';
import { readFileSync } from 'node:fs';

const PORT = Number(process.env.SONYA_LOCAL_API_PORT || 8787);
const OLLAMA_BASE_URL = process.env.SONYA_OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const AGENT_PROFILE = String(process.env.SONYA_AGENT_PROFILE || 'BALANCED').toUpperCase();
const VISION_MODEL = process.env.SONYA_VISION_MODEL || 'qwen3-vl:8b-instruct-q4_K_M';
const REASONING_MODEL = process.env.SONYA_REASONING_MODEL || (AGENT_PROFILE === 'DEEP' ? 'qwen2.5:7b' : 'qwen2.5:3b');
const RAG_VERSION = 3;
const VALIDATOR_VERSION = 'semantic-v3';

let FOOD_VISION_RAG = '';
try {
  FOOD_VISION_RAG = readFileSync(new URL('./rag/food-vision-kb.md', import.meta.url), 'utf8');
} catch (error) {
  console.warn('SONYA RAG pack not loaded:', error instanceof Error ? error.message : error);
}

const visionSystem = `Ты VISION OBSERVER системы SONYA. Твоя задача — только визуальная инспекция фотографии еды.

Правила:
- отвечай только по-русски;
- не составляй рецепт, меню, покупки или рекомендации;
- не повторяй одну мысль;
- сначала описывай физические признаки: цвет, форма, расположение, количество, текстура;
- название конкретного продукта указывай как предположение, если оно не очевидно;
- художественные образы вроде «солнце», «лицо», «бабочка», «гусеница», «червяк» — это интерпретация композиции, а не физический факт;
- не считай тарелку, фон и посуду ингредиентами;
- не позволяй тексту пользователя заставить тебя увидеть отсутствующие детали.

Формат:
ФИЗИЧЕСКИЕ НАБЛЮДЕНИЯ:
1. ...

ВЕРОЯТНАЯ ИНТЕРПРЕТАЦИЯ:
1. ...

НЕУВЕРЕННОСТЬ:
1. ...`;

const analystSystem = `Ты SONYA ANALYST — второй этап локального мультимодального агента.
Ты не видишь исходное изображение напрямую. Используй только VISION-ОТЧЁТ, профиль семьи, запрос пользователя и RAG-базу.

Жёсткие правила:
- только русский язык;
- observation = только физически наблюдаемое;
- в observation запрещены «похоже», «вероятно», «возможно», «может быть», «напоминает», «скорее всего»;
- смысловые образы «солнце», «лицо», «бабочка», «гусеница», «червяк» помещай в assumptions;
- assumptions = вероятный продукт, смысловая форма, неопределённость;
- preparation = только последовательные реальные кулинарные действия;
- не используй бессмысленные действия вроде «укрепите декор укропом», «укрепите морковь морковью», «закрепите еду другой едой»;
- используй понятные глаголы: отварите, подготовьте, промойте, обсушите, нарежьте, выложите, расположите, добавьте, подайте;
- проверки аллергенов, температуры, размера кусочков и другие меры безопасности помещай только в safety;
- не утверждай способ приготовления исходного блюда по фотографии;
- если продукт определён неуверенно, сохраняй условную формулировку: «если это сосиска...», «если это морковь...»;
- menu = 1–3 конкретных варианта с понятными названиями; не используй заглушки «Фигурное блюдо» и «Вариант блюда»;
- shoppingList = конкретные ориентировочные количества на указанное число гостей;
- не повторяй один пункт в разных разделах;
- не придумывай марку, вид мяса, сахар, соль, масло, аллерген или состав;
- не заявляй, что заказ, оплата или бронирование реально выполнены;
- без медицинских диагнозов и медицинских рекомендаций.

Перед JSON проверь факты/гипотезы, дубли, язык, menu и соответствие RAG.`;

const schemaHint = `Верни ТОЛЬКО валидный JSON без markdown:
{
  "headline": "короткий русский заголовок",
  "confidenceNote": "что определено уверенно и что остаётся неопределённым",
  "observation": ["3-7 физических наблюдений без интерпретаций"],
  "assumptions": ["0-5 предположений и интерпретаций"],
  "preparation": ["4-8 реальных шагов реконструкции блюда"],
  "menu": [{"name":"конкретное название","why":"конкретная связь с фото","timeMinutes":30}],
  "shoppingList": [{"item":"продукт","quantity":"ориентировочное количество","priority":"важно/обычно"}],
  "safety": ["1-4 релевантные меры"]
}`;

const traces = new Map();

function initTrace(requestId) {
  traces.set(requestId, { state: 'running', startedAt: Date.now(), steps: [] });
}

function upsertStep(requestId, key, label, status, detail = '', startedAt = null) {
  const trace = traces.get(requestId);
  if (!trace) return;
  const now = Date.now();
  const existing = trace.steps.find(step => step.key === key);
  if (existing) {
    existing.label = label;
    existing.status = status;
    existing.detail = detail;
    if (status === 'done' || status === 'error') {
      existing.durationMs = now - (existing.startedAt || now);
      existing.endedAt = now;
    }
    return;
  }
  trace.steps.push({
    key,
    label,
    status,
    detail,
    startedAt: startedAt || now,
    durationMs: status === 'done' ? 0 : undefined,
  });
}

function failTrace(requestId, message) {
  const trace = traces.get(requestId);
  if (!trace) return;
  const running = [...trace.steps].reverse().find(step => step.status === 'running');
  if (running) {
    running.status = 'error';
    running.detail = message;
    running.durationMs = Date.now() - running.startedAt;
  }
  trace.state = 'error';
  trace.error = message;
  trace.finishedAt = Date.now();
}

function finishTrace(requestId) {
  const trace = traces.get(requestId);
  if (!trace) return;
  trace.state = 'done';
  trace.finishedAt = Date.now();
}

function traceView(requestId) {
  const trace = traces.get(requestId);
  if (!trace) return { state: 'waiting', steps: [] };
  return {
    state: trace.state,
    totalMs: (trace.finishedAt || Date.now()) - trace.startedAt,
    steps: trace.steps.map(step => ({
      key: step.key,
      label: step.label,
      status: step.status,
      detail: step.detail,
      durationMs: step.durationMs,
    })),
    error: trace.error,
  };
}

function json(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(body));
}

function parseModelJson(text) {
  const cleaned = String(text || '')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try { return JSON.parse(cleaned.slice(start, end + 1)); } catch { return null; }
    }
    return null;
  }
}

function cleanText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function semanticKey(value) {
  return cleanText(value)
    .toLocaleLowerCase('ru-RU')
    .replace(/[.!?,;:()«»"']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function uniqueStrings(value, maxItems) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const result = [];
  for (const raw of value) {
    const text = cleanText(raw);
    if (!text) continue;
    const key = semanticKey(text);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(text);
    if (result.length >= maxItems) break;
  }
  return result;
}

const uncertaintyPattern = /\b(похож\w*|вероятн\w*|возможн\w*|может быть|напомина\w*|скорее всего|предполож\w*)\b/i;
const figurativePattern = /\b(солнц\w*|лиц\w*|бабоч\w*|червяк\w*|гусениц\w*|персонаж\w*)\b/i;
const recommendationPattern = /\b(проверь\w*|следует|рекоменду\w*|нужно|необходимо|замен\w*|приготов\w*|разогре\w*|нареж\w*|подава\w*)\b/i;
const safetyPattern = /\b(аллерг\w*|безопас\w*|температур\w*|ожог\w*|маленьк\w* дет\w*|мелк\w* кусоч\w*|разреж\w*.*кусоч\w*|проверь\w* состав|удуш\w*|подав\w*)\b/i;
const nonsensePrepPattern = /\b(укреп\w*|закреп\w*|прикреп\w*)\b/i;
const genericMenuPattern = /^(фигурное блюдо|блюдо для праздника|вариант блюда|блюдо)$/i;

function extractVisionFallback(visionText) {
  return String(visionText || '')
    .split('\n')
    .map(line => line.replace(/^\s*(?:\d+[.)-]?|[-*])\s*/, '').trim())
    .filter(line => line && !/^(ФИЗИЧЕСКИЕ НАБЛЮДЕНИЯ|ВЕРОЯТНАЯ ИНТЕРПРЕТАЦИЯ|НЕУВЕРЕННОСТЬ|ОБЪЕКТЫ|КОМПОЗИЦИЯ)\s*:?$/i.test(line))
    .slice(0, 12);
}

function detectFoodFlags(...parts) {
  const text = parts.map(part => typeof part === 'string' ? part : JSON.stringify(part || '')).join(' ').toLocaleLowerCase('ru-RU');
  return {
    pasta: /спагет|паст\w*|макарон/.test(text),
    sausage: /сосиск|колбас|розов\w* ломтик/.test(text),
    carrot: /морков|оранжев\w* (круг|элемент|полоск)/.test(text),
    greens: /укроп|зелень|зел[её]н\w* веточ/.test(text),
    caterpillar: /гусениц|червяк/.test(text),
    sun: /солнц/.test(text),
  };
}

function buildPreparation(rawPreparation, flags) {
  const base = uniqueStrings(rawPreparation, 12)
    .filter(item => !safetyPattern.test(item))
    .filter(item => !nonsensePrepPattern.test(item));

  const result = [...base];
  const has = pattern => result.some(item => pattern.test(item));

  if (flags.pasta && !has(/спагет|паст\w*|макарон/i)) {
    result.unshift('Отварите пасту до готовности по инструкции на упаковке и слейте воду.');
  }
  if (flags.sausage && !has(/сосиск|колбас/i)) {
    result.push('Если круглые розовые ломтики действительно являются сосиской или другим готовым колбасным изделием, подготовьте продукт согласно инструкции на упаковке и нарежьте кружками.');
  }
  if (flags.carrot && !has(/морков|оранжев/i)) {
    result.push('Если оранжевые элементы — морковь, очистите её и нарежьте один кружок и несколько тонких полосок для декоративной выкладки.');
  }
  if (flags.greens && !has(/укроп|зелень/i)) {
    result.push('Зелень промойте, обсушите и подготовьте небольшие веточки для декора.');
  }
  if ((flags.pasta || flags.sausage || flags.carrot || flags.greens) && !has(/вылож|располож/i)) {
    result.push('На тарелке сначала выложите основу из пасты, затем расположите круглые и оранжевые элементы, повторяя общую композицию с фотографии.');
  }

  return uniqueStrings(result, 8);
}

function fallbackMenu(flags) {
  const items = [];
  if (flags.pasta && (flags.caterpillar || flags.sausage)) {
    items.push({
      name: 'Спагетти «Весёлая гусеница»',
      why: 'Повторяет идею цепочки круглых элементов над пастой и подходит для фигурной детской подачи.',
      timeMinutes: 30,
    });
  }
  if (flags.pasta && (flags.sun || flags.carrot)) {
    items.push({
      name: 'Детская паста с овощным солнцем',
      why: 'Сохраняет основу из пасты и оранжевую радиальную композицию, похожую на солнце.',
      timeMinutes: 30,
    });
  }
  if (flags.pasta) {
    items.push({
      name: 'Паста-конструктор с фигурной выкладкой',
      why: 'Позволяет собрать похожую композицию из пасты и небольших декоративных элементов непосредственно перед подачей.',
      timeMinutes: 25,
    });
  }
  return items.slice(0, 3);
}

function normalizeMenu(rawMenu, flags) {
  const parsed = Array.isArray(rawMenu)
    ? rawMenu.slice(0, 3).map(item => ({
        name: cleanText(item?.name),
        why: cleanText(item?.why),
        timeMinutes: Math.max(1, Number(item?.timeMinutes) || 30),
      })).filter(item => item.name && item.why)
    : [];

  const useful = parsed.filter(item => !genericMenuPattern.test(item.name) && item.why.length >= 25 && !/^связано с фото/i.test(item.why));
  return useful.length ? useful : fallbackMenu(flags);
}

function normalizeSafety(rawSafety) {
  return uniqueStrings(rawSafety, 8)
    .map(item => /подогре\w*.*безопасн\w*.*температур/i.test(item)
      ? 'Перед подачей убедитесь, что горячие компоненты не слишком горячие для ребёнка.'
      : item)
    .slice(0, 4);
}

function fallbackShopping(flags, guests) {
  const count = Math.max(1, Number(guests) || 10);
  const items = [];
  if (flags.pasta) {
    items.push({ item: 'Сухая паста / спагетти', quantity: `${Math.round(count * 60)}–${Math.round(count * 80)} г`, priority: 'важно' });
  }
  if (flags.sausage) {
    items.push({ item: 'Сосиски или другое подходящее колбасное изделие', quantity: `${Math.max(1, Math.ceil(count))}–${Math.max(2, Math.ceil(count * 1.5))} небольших шт.`, priority: 'обычно' });
  }
  if (flags.carrot) {
    items.push({ item: 'Морковь', quantity: `${Math.max(1, Math.ceil(count / 5))}–${Math.max(2, Math.ceil(count / 4))} шт.`, priority: 'обычно' });
  }
  if (flags.greens) {
    items.push({ item: 'Свежая зелень', quantity: '1 небольшой пучок', priority: 'обычно' });
  }
  return items;
}

function normalizeAnalysis(raw, visionText, mode = 'inspiration', guests = 10) {
  const rawObservation = uniqueStrings(raw?.observation, 10);
  const rawAssumptions = uniqueStrings(raw?.assumptions, 8);
  const observation = [];
  const assumptions = [...rawAssumptions];

  const sourceObservation = rawObservation.length ? rawObservation : extractVisionFallback(visionText);
  for (const item of sourceObservation) {
    if (uncertaintyPattern.test(item) || figurativePattern.test(item) || recommendationPattern.test(item)) assumptions.push(item);
    else observation.push(item);
  }

  const cleanObservation = uniqueStrings(observation, 7);
  const observationKeys = new Set(cleanObservation.map(semanticKey));
  const cleanAssumptions = uniqueStrings(assumptions, 7)
    .filter(item => !observationKeys.has(semanticKey(item)))
    .slice(0, 5);

  const flags = detectFoodFlags(visionText, raw, cleanObservation, cleanAssumptions);
  const safetySeed = [...uniqueStrings(raw?.safety, 8)];
  const prepSeed = [];
  for (const item of uniqueStrings(raw?.preparation, 12)) {
    if (safetyPattern.test(item)) safetySeed.push(item);
    else prepSeed.push(item);
  }

  const preparation = buildPreparation(prepSeed, flags);
  const safety = normalizeSafety(safetySeed);
  const menu = mode === 'fridge' ? normalizeMenu(raw?.menu, flags) : normalizeMenu(raw?.menu, flags);

  let shoppingList = Array.isArray(raw?.shoppingList)
    ? raw.shoppingList.slice(0, 20).map(item => ({
        item: cleanText(item?.item),
        quantity: cleanText(item?.quantity),
        priority: cleanText(item?.priority || 'обычно'),
      })).filter(item => item.item && item.quantity)
    : [];
  if (!shoppingList.length) shoppingList = fallbackShopping(flags, guests);

  return {
    headline: cleanText(raw?.headline || 'Разбор идеи блюда'),
    confidenceNote: cleanText(raw?.confidenceNote || 'Часть ингредиентов определена по внешнему виду; точный состав следует проверять отдельно.'),
    observation: cleanObservation,
    assumptions: cleanAssumptions,
    preparation,
    menu,
    shoppingList,
    safety,
  };
}

async function ollamaChat({ model, messages, format, temperature = 0.15, numPredict = 700, keepAlive = '10m' }) {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      messages,
      ...(format ? { format } : {}),
      keep_alive: keepAlive,
      options: { temperature, num_predict: numPredict },
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ollama ${response.status} (${model}): ${text.slice(0, 300)}`);
  }
  const payload = await response.json();
  return String(payload?.message?.content || payload?.response || '').trim();
}

async function analyze(body) {
  const started = Date.now();
  const requestId = String(body?.requestId || `server-${started}`);
  initTrace(requestId);

  try {
    upsertStep(requestId, 'server-validate', 'Проверка входных данных', 'running', 'Фото + текстовый запрос');
    if (!body?.prompt?.trim()) throw new Error('Введите текстовый запрос.');
    if (!body?.image?.data) throw new Error('Загрузите фотографию.');
    upsertStep(requestId, 'server-validate', 'Проверка входных данных', 'done', 'Фото и текст приняты');

    const profile = body.profile || {};
    const modeLabel = body.mode === 'fridge' ? 'холодильник/запасы' : 'референс блюда';
    upsertStep(requestId, 'server-context', 'Сбор контекста задачи', 'done', `Профиль ${AGENT_PROFILE} · режим: ${modeLabel} · гостей: ${profile.guests ?? 10}`);

    upsertStep(requestId, 'server-vision-model', 'Выбор vision-модели', 'done', `${VISION_MODEL} · визуальный инспектор`);
    const visionStarted = Date.now();
    upsertStep(requestId, 'server-vision', 'Vision extraction в Ollama', 'running', `${VISION_MODEL} выделяет физические признаки и неопределённость`);
    const visionText = await ollamaChat({
      model: VISION_MODEL,
      temperature: 0.03,
      numPredict: 420,
      keepAlive: '10m',
      messages: [
        { role: 'system', content: visionSystem },
        {
          role: 'user',
          content: 'Выполни строгую визуальную инспекцию. Сначала только физические признаки. Названия продуктов и смысловые образы вынеси отдельно как вероятную интерпретацию. Не составляй рецепт.',
          images: [body.image.data],
        },
      ],
    });
    const visionMs = Date.now() - visionStarted;
    upsertStep(requestId, 'server-vision', 'Vision extraction в Ollama', 'done', `Vision-отчёт получен · ${visionMs} мс`);

    upsertStep(requestId, 'server-rag', 'RAG grounding', 'running', 'Правила fact / hypothesis / action / safety');
    const ragText = FOOD_VISION_RAG || 'RAG-пакет недоступен. Разделяй факты и предположения, не допускай дублей.';
    upsertStep(requestId, 'server-rag', 'RAG grounding', 'done', FOOD_VISION_RAG ? `Food Vision KB v${RAG_VERSION} · ${FOOD_VISION_RAG.length} символов` : 'Fallback rules');

    upsertStep(requestId, 'server-reasoning-model', 'Выбор аналитической модели', 'done', `${REASONING_MODEL} · профиль ${AGENT_PROFILE}`);
    const reasoningStarted = Date.now();
    upsertStep(requestId, 'server-reasoning', 'Grounded reasoning в Ollama', 'running', `${REASONING_MODEL} формирует структурированный ответ`);

    const analystPrompt = `VISION-ОТЧЁТ:\n${visionText}\n\nRAG-БАЗА:\n${ragText}\n\nПРОФИЛЬ:\nребёнок: ${profile.childAge ?? 8} лет\nгостей: ${profile.guests ?? 10}\nбюджет: ${profile.budget ?? 15000} ₽\nобраз жизни: ${profile.lifestyle ?? 'не указан'}\nаллергии/ограничения: ${profile.allergies ?? 'не указаны'}\nрежим: ${modeLabel}\n\nЗАПРОС ПОЛЬЗОВАТЕЛЯ:\n${body.prompt.trim()}\n\n${schemaHint}`;

    const structuredText = await ollamaChat({
      model: REASONING_MODEL,
      format: 'json',
      temperature: 0.06,
      numPredict: 900,
      keepAlive: '10m',
      messages: [
        { role: 'system', content: analystSystem },
        { role: 'user', content: analystPrompt },
      ],
    });
    const reasoningMs = Date.now() - reasoningStarted;
    upsertStep(requestId, 'server-reasoning', 'Grounded reasoning в Ollama', 'done', `Структурированный ответ получен · ${reasoningMs} мс`);

    const validatorStarted = Date.now();
    upsertStep(requestId, 'server-parse', 'Semantic validator v3', 'running', 'Fact/hypothesis, действия, menu и покупки');
    const parsed = parseModelJson(structuredText);
    if (!parsed) throw new Error('Аналитическая модель вернула невалидный JSON. Повторите анализ.');
    const analysis = normalizeAnalysis(parsed, visionText, body.mode, profile.guests ?? 10);
    const validatorMs = Date.now() - validatorStarted;
    upsertStep(requestId, 'server-parse', 'Semantic validator v3', 'done', `Нормализация завершена · ${validatorMs} мс`);

    const totalMs = Date.now() - started;
    upsertStep(requestId, 'server-complete', 'Завершение агентного прохода', 'done', `Vision ${visionMs} мс · Analyst ${reasoningMs} мс · Validator ${validatorMs} мс · Total ${totalMs} мс`);
    finishTrace(requestId);

    return {
      analysis,
      latencyMs: totalMs,
      engine: `SONYA Local · ${VISION_MODEL} → ${REASONING_MODEL} + RAG v${RAG_VERSION}`,
      profile: AGENT_PROFILE,
      performance: { visionMs, reasoningMs, validatorMs, totalMs },
      trace: traceView(requestId),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Local analysis failed';
    failTrace(requestId, message);
    throw error;
  }
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') return json(res, 200, { ok: true });
  const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);

  if (req.method === 'GET' && url.pathname === '/api/_healthcheck') {
    return json(res, 200, {
      ok: true,
      profile: AGENT_PROFILE,
      model: VISION_MODEL,
      visionModel: VISION_MODEL,
      reasoningModel: REASONING_MODEL,
      ragLoaded: Boolean(FOOD_VISION_RAG),
      ragChars: FOOD_VISION_RAG.length,
      ragVersion: RAG_VERSION,
      validator: VALIDATOR_VERSION,
      ollama: OLLAMA_BASE_URL,
    });
  }

  if (req.method === 'GET' && url.pathname === '/api/trace') {
    const requestId = url.searchParams.get('requestId') || '';
    return json(res, 200, traceView(requestId));
  }

  if (req.method !== 'POST' || url.pathname !== '/api/analyze') {
    return json(res, 404, { error: 'Not found' });
  }

  let raw = '';
  req.on('data', chunk => {
    raw += chunk;
    if (raw.length > 14 * 1024 * 1024) req.destroy();
  });

  req.on('end', async () => {
    try {
      const body = JSON.parse(raw || '{}');
      json(res, 200, await analyze(body));
    } catch (error) {
      console.error('SONYA local analyze failed', error);
      json(res, 500, { error: error instanceof Error ? error.message : 'Local analysis failed' });
    }
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`SONYA local API: http://127.0.0.1:${PORT}`);
  console.log(`Profile: ${AGENT_PROFILE}`);
  console.log(`Vision: ${VISION_MODEL}`);
  console.log(`Analyst: ${REASONING_MODEL}`);
  console.log(`RAG: ${FOOD_VISION_RAG ? 'loaded' : 'fallback'} · v${RAG_VERSION} · ${FOOD_VISION_RAG.length} chars`);
  console.log(`Validator: ${VALIDATOR_VERSION}`);
  console.log('Image budget: <= 1280 px / <= 1.2 MP');
  console.log(`Ollama: ${OLLAMA_BASE_URL}`);
  console.log('Agent trace: GET /api/trace?requestId=<id>');
});
