import http from 'node:http';
import { readFileSync } from 'node:fs';

const PORT = Number(process.env.SONYA_LOCAL_API_PORT || 8787);
const OLLAMA_BASE_URL = process.env.SONYA_OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const VISION_MODEL = process.env.SONYA_VISION_MODEL || 'qwen3-vl:8b-instruct-q4_K_M';
const REASONING_MODEL = process.env.SONYA_REASONING_MODEL || 'qwen2.5:7b';

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
- смысловые образы «солнце», «лицо», «бабочка», «гусеница», «червяк», если это интерпретация выкладки еды, помещай в assumptions;
- assumptions = вероятный продукт, смысловая форма, неопределённость;
- preparation = только последовательные действия реконструкции блюда;
- проверки аллергенов, температуры, размера кусочков и другие меры безопасности помещай только в safety;
- не утверждай способ приготовления исходного блюда по фотографии;
- если продукт определён неуверенно, сохраняй условную формулировку: «если это сосиска...», «если это морковь...»;
- menu = 1–3 варианта, если пользователь просит идею блюда/праздника;
- shoppingList = конкретные ориентировочные количества на число гостей;
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
  "preparation": ["3-8 шагов реконструкции блюда"],
  "menu": [{"name":"название","why":"почему связано с фото","timeMinutes":30}],
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
const figurativePattern = /\b(солнц\w*|лиц\w*|бабоч\w*|червяк\w*|червяка|гусениц\w*|персонаж\w*)\b/i;
const recommendationPattern = /\b(проверь\w*|следует|рекоменду\w*|нужно|необходимо|замен\w*|приготов\w*|разогре\w*|нареж\w*|подава\w*)\b/i;
const safetyPattern = /\b(аллерг\w*|безопас\w*|температур\w*|ожог\w*|маленьк\w* дет\w*|мелк\w* кусоч\w*|разреж\w*.*кусоч\w*|проверь\w* состав|удуш\w*|подав\w*)\b/i;

function extractVisionFallback(visionText) {
  return String(visionText || '')
    .split('\n')
    .map(line => line.replace(/^\s*(?:\d+[.)-]?|[-*])\s*/, '').trim())
    .filter(line => line && !/^(ФИЗИЧЕСКИЕ НАБЛЮДЕНИЯ|ВЕРОЯТНАЯ ИНТЕРПРЕТАЦИЯ|НЕУВЕРЕННОСТЬ|ОБЪЕКТЫ|КОМПОЗИЦИЯ)\s*:?$/i.test(line))
    .slice(0, 12);
}

function normalizeAnalysis(raw, visionText, mode = 'inspiration') {
  const rawObservation = uniqueStrings(raw?.observation, 10);
  const rawAssumptions = uniqueStrings(raw?.assumptions, 8);
  const rawPreparation = uniqueStrings(raw?.preparation, 12);
  const rawSafety = uniqueStrings(raw?.safety, 8);

  const observation = [];
  const assumptions = [...rawAssumptions];

  const sourceObservation = rawObservation.length ? rawObservation : extractVisionFallback(visionText);
  for (const item of sourceObservation) {
    if (uncertaintyPattern.test(item) || figurativePattern.test(item) || recommendationPattern.test(item)) {
      assumptions.push(item);
    } else {
      observation.push(item);
    }
  }

  const safety = [...rawSafety];
  const preparation = [];
  for (const item of rawPreparation) {
    if (safetyPattern.test(item)) safety.push(item);
    else preparation.push(item);
  }

  const cleanObservation = uniqueStrings(observation, 7);
  const observationKeys = new Set(cleanObservation.map(semanticKey));
  const cleanAssumptions = uniqueStrings(assumptions, 7)
    .filter(item => !observationKeys.has(semanticKey(item)))
    .slice(0, 5);

  const cleanSafety = uniqueStrings(safety, 6).slice(0, 4);
  const safetyKeys = new Set(cleanSafety.map(semanticKey));
  const cleanPreparation = uniqueStrings(preparation, 10)
    .filter(item => !safetyKeys.has(semanticKey(item)))
    .slice(0, 8);

  let menu = Array.isArray(raw?.menu)
    ? raw.menu.slice(0, 3).map(item => ({
        name: cleanText(item?.name),
        why: cleanText(item?.why),
        timeMinutes: Math.max(1, Number(item?.timeMinutes) || 30),
      })).filter(item => item.name && item.why)
    : [];

  if (!menu.length) {
    menu = mode === 'fridge'
      ? [{ name: 'Блюдо из распознанных продуктов', why: 'Базовый вариант на основе продуктов, которые удалось определить по фотографии.', timeMinutes: 30 }]
      : [{ name: 'Фигурная паста для детского стола', why: 'Вариант реконструкции на основе видимой пасты и декоративной выкладки продуктов.', timeMinutes: 30 }];
  }

  const shoppingList = Array.isArray(raw?.shoppingList)
    ? raw.shoppingList.slice(0, 20).map(item => ({
        item: cleanText(item?.item),
        quantity: cleanText(item?.quantity),
        priority: cleanText(item?.priority || 'обычно'),
      })).filter(item => item.item && item.quantity)
    : [];

  return {
    headline: cleanText(raw?.headline || 'Разбор идеи блюда'),
    confidenceNote: cleanText(raw?.confidenceNote || 'Часть ингредиентов определена по внешнему виду; точный состав следует проверять отдельно.'),
    observation: cleanObservation,
    assumptions: cleanAssumptions,
    preparation: cleanPreparation,
    menu,
    shoppingList,
    safety: cleanSafety,
  };
}

async function ollamaChat({ model, messages, format, temperature = 0.15 }) {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      messages,
      ...(format ? { format } : {}),
      options: { temperature },
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

    upsertStep(requestId, 'server-context', 'Сбор контекста задачи', 'running', 'Семья, событие и режим анализа');
    const profile = body.profile || {};
    const modeLabel = body.mode === 'fridge' ? 'холодильник/запасы' : 'референс блюда';
    upsertStep(requestId, 'server-context', 'Сбор контекста задачи', 'done', `Режим: ${modeLabel} · гостей: ${profile.guests ?? 10}`);

    upsertStep(requestId, 'server-vision-model', 'Выбор vision-модели', 'done', `${VISION_MODEL} · визуальный инспектор`);
    upsertStep(requestId, 'server-vision', 'Vision extraction в Ollama', 'running', `${VISION_MODEL} выделяет физические признаки и неопределённость`);
    const visionText = await ollamaChat({
      model: VISION_MODEL,
      temperature: 0.03,
      messages: [
        { role: 'system', content: visionSystem },
        {
          role: 'user',
          content: 'Выполни строгую визуальную инспекцию. Сначала только физические признаки. Названия продуктов и смысловые образы вынеси отдельно как вероятную интерпретацию. Не составляй рецепт.',
          images: [body.image.data],
        },
      ],
    });
    upsertStep(requestId, 'server-vision', 'Vision extraction в Ollama', 'done', 'Vision-отчёт получен');

    upsertStep(requestId, 'server-rag', 'RAG grounding', 'running', 'Правила fact / hypothesis / action / safety');
    const ragText = FOOD_VISION_RAG || 'RAG-пакет недоступен. Разделяй факты и предположения, не допускай дублей.';
    upsertStep(requestId, 'server-rag', 'RAG grounding', 'done', FOOD_VISION_RAG ? `Food Vision KB v2 · ${FOOD_VISION_RAG.length} символов` : 'Fallback rules');

    upsertStep(requestId, 'server-reasoning-model', 'Выбор аналитической модели', 'done', `${REASONING_MODEL} · структуризация + RAG`);
    upsertStep(requestId, 'server-reasoning', 'Grounded reasoning в Ollama', 'running', `${REASONING_MODEL} формирует структурированный ответ`);

    const analystPrompt = `VISION-ОТЧЁТ:\n${visionText}\n\nRAG-БАЗА:\n${ragText}\n\nПРОФИЛЬ:\nребёнок: ${profile.childAge ?? 8} лет\nгостей: ${profile.guests ?? 10}\nбюджет: ${profile.budget ?? 15000} ₽\nобраз жизни: ${profile.lifestyle ?? 'не указан'}\nаллергии/ограничения: ${profile.allergies ?? 'не указаны'}\nрежим: ${modeLabel}\n\nЗАПРОС ПОЛЬЗОВАТЕЛЯ:\n${body.prompt.trim()}\n\n${schemaHint}`;

    const structuredText = await ollamaChat({
      model: REASONING_MODEL,
      format: 'json',
      temperature: 0.08,
      messages: [
        { role: 'system', content: analystSystem },
        { role: 'user', content: analystPrompt },
      ],
    });
    upsertStep(requestId, 'server-reasoning', 'Grounded reasoning в Ollama', 'done', 'Структурированный ответ получен');

    upsertStep(requestId, 'server-parse', 'Semantic validator', 'running', 'Перенос гипотез, дедупликация, разделение safety/preparation, menu fallback');
    const parsed = parseModelJson(structuredText);
    if (!parsed) throw new Error('Аналитическая модель вернула невалидный JSON. Повторите анализ.');
    const analysis = normalizeAnalysis(parsed, visionText, body.mode);
    upsertStep(requestId, 'server-parse', 'Semantic validator', 'done', 'Fact / hypothesis / action / safety проверены сервером');

    upsertStep(requestId, 'server-complete', 'Завершение агентного прохода', 'done', `Vision: ${VISION_MODEL} → RAG v2 → Analyst: ${REASONING_MODEL} → validator`);
    finishTrace(requestId);

    return {
      analysis,
      latencyMs: Date.now() - started,
      engine: `SONYA Local · ${VISION_MODEL} → ${REASONING_MODEL} + RAG v2`,
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
      model: VISION_MODEL,
      visionModel: VISION_MODEL,
      reasoningModel: REASONING_MODEL,
      ragLoaded: Boolean(FOOD_VISION_RAG),
      ragChars: FOOD_VISION_RAG.length,
      ragVersion: 2,
      validator: 'semantic-v2',
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
  console.log(`Vision: ${VISION_MODEL}`);
  console.log(`Analyst: ${REASONING_MODEL}`);
  console.log(`RAG: ${FOOD_VISION_RAG ? 'loaded' : 'fallback'} · v2 · ${FOOD_VISION_RAG.length} chars`);
  console.log('Validator: semantic-v2');
  console.log(`Ollama: ${OLLAMA_BASE_URL}`);
  console.log('Agent trace: GET /api/trace?requestId=<id>');
});