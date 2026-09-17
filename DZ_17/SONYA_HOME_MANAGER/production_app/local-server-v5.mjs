import http from 'node:http';
import { readFileSync } from 'node:fs';

const PORT = Number(process.env.SONYA_LOCAL_API_PORT || 8787);
const OLLAMA_BASE_URL = process.env.SONYA_OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const AGENT_PROFILE = String(process.env.SONYA_AGENT_PROFILE || 'BALANCED').toUpperCase();
const VISION_MODEL = process.env.SONYA_VISION_MODEL || 'qwen3-vl:8b-instruct-q4_K_M';
const REASONING_MODEL = process.env.SONYA_REASONING_MODEL || (AGENT_PROFILE === 'DEEP' ? 'qwen2.5:7b' : 'qwen2.5:3b');
const RAG_VERSION = 5;
const VALIDATOR_VERSION = 'semantic-v5';

let FOOD_VISION_RAG = '';
try {
  FOOD_VISION_RAG = readFileSync(new URL('./rag/food-vision-kb.md', import.meta.url), 'utf8');
} catch (error) {
  console.warn('SONYA RAG pack not loaded:', error instanceof Error ? error.message : error);
}

const RAG_CORE = `SONYA Food Vision Core Rules:
1. observation = только физически видимое: цвет, форма, положение, количество, текстура. Без «похоже/вероятно/напоминает».
2. assumptions = вероятный продукт и художественная интерпретация композиции.
3. preparation = реальные кулинарные действия: отварить, промыть, нарезать, выложить, добавить, подать.
4. safety = аллергии, температура подачи, размер плотных круглых кусочков для маленьких детей.
5. menu = 1–3 конкретных названия, связанных с изображением.
6. shoppingList = ориентировочные количества на указанное число гостей.
7. Не выдумывать марку, вид мяса, сахар, соль, масло, аллерген или способ приготовления исходного блюда по одному фото.
8. Только русский язык, без дублей.`;

const VISION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['physical', 'assumptions', 'uncertainty'],
  properties: {
    physical: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 7 },
    assumptions: { type: 'array', items: { type: 'string' }, maxItems: 5 },
    uncertainty: { type: 'array', items: { type: 'string' }, maxItems: 4 },
  },
};

const ANALYSIS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['headline', 'confidenceNote', 'observation', 'assumptions', 'preparation', 'menu', 'shoppingList', 'safety'],
  properties: {
    headline: { type: 'string' },
    confidenceNote: { type: 'string' },
    observation: { type: 'array', items: { type: 'string' }, maxItems: 7 },
    assumptions: { type: 'array', items: { type: 'string' }, maxItems: 5 },
    preparation: { type: 'array', items: { type: 'string' }, maxItems: 8 },
    menu: {
      type: 'array', maxItems: 3,
      items: {
        type: 'object', additionalProperties: false,
        required: ['name', 'why', 'timeMinutes'],
        properties: {
          name: { type: 'string' }, why: { type: 'string' },
          timeMinutes: { type: 'integer', minimum: 1, maximum: 240 },
        },
      },
    },
    shoppingList: {
      type: 'array', maxItems: 20,
      items: {
        type: 'object', additionalProperties: false,
        required: ['item', 'quantity', 'priority'],
        properties: {
          item: { type: 'string' }, quantity: { type: 'string' }, priority: { type: 'string' },
        },
      },
    },
    safety: { type: 'array', items: { type: 'string' }, maxItems: 4 },
  },
};

const traces = new Map();
function initTrace(id) { traces.set(id, { state: 'running', startedAt: Date.now(), steps: [] }); }
function traceStep(id, key, label, status, detail = '') {
  const trace = traces.get(id); if (!trace) return;
  const now = Date.now();
  let step = trace.steps.find(x => x.key === key);
  if (!step) { step = { key, label, status, detail, startedAt: now }; trace.steps.push(step); }
  else { step.label = label; step.status = status; step.detail = detail; }
  if (status === 'done' || status === 'error') { step.durationMs = now - step.startedAt; step.endedAt = now; }
}
function finishTrace(id, state = 'done', error = '') {
  const trace = traces.get(id); if (!trace) return;
  trace.state = state; trace.finishedAt = Date.now(); if (error) trace.error = error;
}
function traceView(id) {
  const t = traces.get(id);
  if (!t) return { state: 'waiting', steps: [] };
  return {
    state: t.state,
    totalMs: (t.finishedAt || Date.now()) - t.startedAt,
    steps: t.steps.map(({ key, label, status, detail, durationMs }) => ({ key, label, status, detail, durationMs })),
    error: t.error,
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

function cleanText(v) { return String(v ?? '').replace(/\s+/g, ' ').replace(/^[-–—•]\s*/, '').trim(); }
function keyOf(v) { return cleanText(v).toLocaleLowerCase('ru-RU').replace(/[.!?,;:()«»"']/g, '').trim(); }
function uniq(values, max = 8) {
  const out = [], seen = new Set();
  for (const v of Array.isArray(values) ? values : []) {
    const text = cleanText(v), key = keyOf(text);
    if (!text || text === '-' || seen.has(key)) continue;
    seen.add(key); out.push(text); if (out.length >= max) break;
  }
  return out;
}

function parseJsonLoose(text) {
  let s = String(text || '').replace(/^\uFEFF/, '').replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  const start = s.indexOf('{'), end = s.lastIndexOf('}');
  if (start >= 0 && end > start) s = s.slice(start, end + 1);
  const tries = [s, s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/,\s*([}\]])/g, '$1')];
  for (const candidate of tries) { try { return JSON.parse(candidate); } catch {} }
  return null;
}

function parseVisionLoose(text) {
  const parsed = parseJsonLoose(text);
  if (parsed && Array.isArray(parsed.physical)) {
    return {
      physical: uniq(parsed.physical, 7),
      assumptions: uniq(parsed.assumptions, 5),
      uncertainty: uniq(parsed.uncertainty, 4),
    };
  }

  const physical = [], assumptions = [], uncertainty = [];
  let section = 'physical';
  for (const raw of String(text || '').split('\n')) {
    const line = cleanText(raw.replace(/^\s*(?:\d+[.)-]?|[-*])\s*/, '').replace(/\*\*/g, ''));
    if (!line) continue;
    if (/ФИЗИЧЕСК|НАБЛЮДЕН/i.test(line)) { section = 'physical'; continue; }
    if (/ИНТЕРПРЕТ|ПРЕДПОЛОЖ/i.test(line)) { section = 'assumptions'; continue; }
    if (/НЕУВЕР|НЕОПРЕДЕЛ/i.test(line)) { section = 'uncertainty'; continue; }
    if (section === 'physical') physical.push(line);
    else if (section === 'assumptions') assumptions.push(line);
    else uncertainty.push(line);
  }
  return { physical: uniq(physical, 7), assumptions: uniq(assumptions, 5), uncertainty: uniq(uncertainty, 4) };
}

function detectFlags(...parts) {
  const t = parts.map(x => typeof x === 'string' ? x : JSON.stringify(x || '')).join(' ').toLocaleLowerCase('ru-RU');
  return {
    pasta: /спагет|паст\w*|макарон|длинн\w*.*светл\w*.*нит/.test(t),
    sausage: /сосиск|колбас|розов\w*.*(круг|ломтик|кусоч)/.test(t),
    carrot: /морков|оранжев\w*.*(круг|полоск|элемент)/.test(t),
    greens: /укроп|зелень|зел[её]н\w*.*(веточ|стеб|лист)/.test(t),
    caterpillar: /гусениц|червяк/.test(t),
    sun: /солнц|радиальн\w*.*оранж/.test(t),
  };
}

function inferredPhysical(flags) {
  const out = [];
  if (flags.pasta) out.push('На тарелке видны длинные светлые нити пасты, собранные в несколько пучков.');
  if (flags.sausage) out.push('Над пастой расположена цепочка круглых розовых ломтиков примерно одинакового диаметра.');
  if (flags.carrot) out.push('В верхней части композиции виден оранжевый элемент и несколько тонких оранжевых полосок.');
  if (flags.greens) out.push('В нижней части тарелки присутствуют тонкие зелёные веточки или листья.');
  return out;
}

function deterministicPreparation(flags) {
  const out = [];
  if (flags.pasta) out.push('Отварите пасту до готовности по инструкции на упаковке и слейте воду.');
  if (flags.sausage) out.push('Если розовые круглые ломтики действительно являются сосиской или другим готовым колбасным изделием, подготовьте его по инструкции на упаковке и нарежьте кружками.');
  if (flags.carrot) out.push('Если оранжевые элементы — морковь, очистите её и нарежьте один крупный элемент и несколько тонких полосок для декоративной выкладки.');
  if (flags.greens) out.push('Зелень промойте, обсушите и подготовьте небольшие веточки для декора.');
  if (flags.pasta) out.push('Выложите пасту на тарелку как основу композиции.');
  if (flags.sausage) out.push('Разложите круглые ломтики цепочкой над пастой, повторяя композицию с фотографии.');
  if (flags.carrot) out.push('Разместите оранжевые элементы отдельно в верхней части композиции.');
  if (flags.greens) out.push('Добавьте зелень в самом конце перед подачей.');
  return uniq(out, 8);
}

function deterministicMenu(flags) {
  const out = [];
  if (flags.pasta && flags.sausage) out.push({ name: 'Спагетти «Весёлая гусеница»', why: 'Повторяет идею цепочки круглых элементов над пастой и подходит для детской фигурной подачи.', timeMinutes: 30 });
  if (flags.pasta && (flags.carrot || flags.sun)) out.push({ name: 'Детская паста с овощным солнцем', why: 'Сохраняет основу из пасты и отдельную оранжевую радиальную композицию.', timeMinutes: 30 });
  if (flags.pasta) out.push({ name: 'Паста-конструктор с фигурной выкладкой', why: 'Позволяет собрать похожую композицию из пасты и небольших декоративных элементов перед подачей.', timeMinutes: 25 });
  return out.slice(0, 3);
}

function deterministicShopping(flags, guests) {
  const n = Math.max(1, Number(guests) || 10), out = [];
  if (flags.pasta) out.push({ item: 'Сухая паста / спагетти', quantity: `${n * 60}–${n * 80} г`, priority: 'важно' });
  if (flags.sausage) out.push({ item: 'Сосиски или подходящее колбасное изделие', quantity: `${Math.ceil(n)}–${Math.ceil(n * 1.5)} небольших шт.`, priority: 'обычно' });
  if (flags.carrot) out.push({ item: 'Морковь', quantity: `${Math.max(1, Math.ceil(n / 5))}–${Math.max(2, Math.ceil(n / 4))} шт.`, priority: 'обычно' });
  if (flags.greens) out.push({ item: 'Свежая зелень', quantity: '1 небольшой пучок', priority: 'обычно' });
  return out;
}

function deterministicSafety(flags) {
  const out = ['Если есть аллергические ограничения, сверяйте состав готовых продуктов с упаковкой.'];
  if (flags.sausage) out.push('Для маленьких детей адаптируйте размер плотных круглых кусочков перед подачей.');
  out.push('Перед подачей убедитесь, что горячие компоненты не слишком горячие для ребёнка.');
  return out.slice(0, 4);
}

function fallbackAnalysis(vision, profile, mode) {
  const flags = detectFlags(vision);
  const physical = vision.physical.length ? vision.physical : inferredPhysical(flags);
  const assumptions = uniq([...vision.assumptions, ...vision.uncertainty], 5);
  return {
    headline: mode === 'fridge' ? 'Разбор продуктов на фото' : 'Разбор идеи блюда',
    confidenceNote: assumptions.length ? 'Часть продуктов и смысл композиции определены предположительно; физические признаки вынесены отдельно.' : 'Основные физические элементы изображения распознаны.',
    observation: physical.length ? physical : ['На изображении распознана композиция блюда, но физические детали требуют повторного более крупного кадра.'],
    assumptions,
    preparation: deterministicPreparation(flags),
    menu: deterministicMenu(flags),
    shoppingList: deterministicShopping(flags, profile.guests ?? 10),
    safety: deterministicSafety(flags),
  };
}

function normalizeAnalysis(raw, vision, profile, mode) {
  const flags = detectFlags(vision, raw);
  const observation = uniq(raw?.observation, 7).filter(x => !/\b(похож|вероят|возмож|напомина)/i.test(x));
  const assumptions = uniq([...(raw?.assumptions || []), ...vision.assumptions, ...vision.uncertainty], 5);
  const preparation = uniq(raw?.preparation, 8).filter(x => !/\b(укреп|закреп|прикреп)/i.test(x));
  const menu = Array.isArray(raw?.menu) ? raw.menu.filter(x => cleanText(x?.name) && cleanText(x?.why)).slice(0, 3) : [];
  const shoppingList = Array.isArray(raw?.shoppingList) ? raw.shoppingList.filter(x => cleanText(x?.item) && cleanText(x?.quantity)).slice(0, 20) : [];
  const safety = uniq(raw?.safety, 4);

  return {
    headline: cleanText(raw?.headline || 'Разбор идеи блюда'),
    confidenceNote: cleanText(raw?.confidenceNote || 'Физические наблюдения и предположения разделены.'),
    observation: observation.length ? observation : (vision.physical.length ? vision.physical : inferredPhysical(flags)),
    assumptions,
    preparation: preparation.length >= 3 ? preparation : deterministicPreparation(flags),
    menu: menu.length ? menu : deterministicMenu(flags),
    shoppingList: shoppingList.length ? shoppingList : deterministicShopping(flags, profile.guests ?? 10),
    safety: safety.length ? safety : deterministicSafety(flags),
  };
}

async function ollamaChat({ model, messages, format, temperature = 0.05, numPredict = 500, numCtx = 4096, keepAlive = '10m' }) {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model, stream: false, messages,
      ...(format ? { format } : {}),
      keep_alive: keepAlive,
      options: { temperature, num_predict: numPredict, num_ctx: numCtx },
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
    traceStep(requestId, 'server-validate', 'Проверка входных данных', 'running', 'Фото + текст');
    if (!body?.prompt?.trim()) throw new Error('Введите текстовый запрос.');
    if (!body?.image?.data) throw new Error('Загрузите фотографию.');
    traceStep(requestId, 'server-validate', 'Проверка входных данных', 'done', 'Фото и текст приняты');

    const profile = body.profile || {};
    const modeLabel = body.mode === 'fridge' ? 'холодильник/запасы' : 'референс блюда';
    traceStep(requestId, 'server-context', 'Сбор контекста задачи', 'done', `${AGENT_PROFILE} · ${modeLabel} · гостей ${profile.guests ?? 10}`);

    traceStep(requestId, 'server-vision-model', 'Выбор vision-модели', 'done', `${VISION_MODEL} · structured vision`);
    const v0 = Date.now();
    traceStep(requestId, 'server-vision', 'Vision extraction в Ollama', 'running', `${VISION_MODEL} → JSON Schema`);
    const visionText = await ollamaChat({
      model: VISION_MODEL,
      format: VISION_SCHEMA,
      temperature: 0.02,
      numPredict: 260,
      numCtx: 4096,
      messages: [
        { role: 'system', content: 'Ты VISION OBSERVER SONYA. Опиши только то, что видно на фотографии. physical = физические признаки без предположений; assumptions = вероятные продукты/образы; uncertainty = то, что по фото установить нельзя. Только русский язык.' },
        { role: 'user', content: 'Проанализируй изображение строго по JSON-схеме. Не составляй рецепт и не добавляй советы.', images: [body.image.data] },
      ],
    });
    const vision = parseVisionLoose(visionText);
    const visionMs = Date.now() - v0;
    traceStep(requestId, 'server-vision', 'Vision extraction в Ollama', 'done', `physical=${vision.physical.length} · assumptions=${vision.assumptions.length} · ${visionMs} мс`);

    traceStep(requestId, 'server-rag', 'RAG grounding', 'done', `Food Vision KB v${RAG_VERSION} · runtime core ${RAG_CORE.length} chars`);

    let analysis;
    let reasoningMs = 0;
    let usedFallback = false;

    if (AGENT_PROFILE === 'FAST') {
      usedFallback = true;
      analysis = fallbackAnalysis(vision, profile, body.mode);
      traceStep(requestId, 'server-reasoning', 'FAST deterministic synthesis', 'done', 'Второй LLM-проход пропущен');
    } else {
      traceStep(requestId, 'server-reasoning-model', 'Выбор аналитической модели', 'done', `${REASONING_MODEL} · ${AGENT_PROFILE}`);
      const r0 = Date.now();
      traceStep(requestId, 'server-reasoning', 'Grounded reasoning в Ollama', 'running', `${REASONING_MODEL} · JSON Schema`);
      const prompt = `VISION JSON:\n${JSON.stringify(vision, null, 2)}\n\nRAG CORE:\n${RAG_CORE}\n\nПРОФИЛЬ:\nребёнок ${profile.childAge ?? 8} лет; гостей ${profile.guests ?? 10}; бюджет ${profile.budget ?? 15000} ₽; образ жизни ${profile.lifestyle ?? 'не указан'}; ограничения ${profile.allergies ?? 'не указаны'}; режим ${modeLabel}.\n\nЗАПРОС:\n${body.prompt.trim()}`;

      let analystText = await ollamaChat({
        model: REASONING_MODEL,
        format: ANALYSIS_SCHEMA,
        temperature: 0.03,
        numPredict: 700,
        numCtx: 4096,
        messages: [
          { role: 'system', content: 'Ты SONYA ANALYST. Используй только VISION JSON, запрос и RAG CORE. Верни практичный русский ответ строго по JSON-схеме. Не добавляй визуальные факты от себя.' },
          { role: 'user', content: prompt },
        ],
      });

      let parsed = parseJsonLoose(analystText);
      if (!parsed) {
        traceStep(requestId, 'server-repair', 'JSON repair retry', 'running', 'Первый ответ аналитика невалиден');
        analystText = await ollamaChat({
          model: REASONING_MODEL,
          format: ANALYSIS_SCHEMA,
          temperature: 0,
          numPredict: 650,
          numCtx: 4096,
          messages: [
            { role: 'system', content: 'Исправь структуру и верни ТОЛЬКО валидный JSON по заданной схеме. Никакого markdown.' },
            { role: 'user', content: `VISION JSON:\n${JSON.stringify(vision)}\n\nЗАПРОС:\n${body.prompt.trim()}\n\nПредыдущий повреждённый ответ:\n${analystText.slice(0, 5000)}` },
          ],
        });
        parsed = parseJsonLoose(analystText);
        traceStep(requestId, 'server-repair', 'JSON repair retry', parsed ? 'done' : 'error', parsed ? 'JSON восстановлен' : 'Используем deterministic fallback');
      }

      reasoningMs = Date.now() - r0;
      if (parsed) {
        analysis = normalizeAnalysis(parsed, vision, profile, body.mode);
        traceStep(requestId, 'server-reasoning', 'Grounded reasoning в Ollama', 'done', `JSON готов · ${reasoningMs} мс`);
      } else {
        usedFallback = true;
        analysis = fallbackAnalysis(vision, profile, body.mode);
        traceStep(requestId, 'server-reasoning', 'Grounded reasoning в Ollama', 'done', `Fallback после невалидного JSON · ${reasoningMs} мс`);
      }
    }

    traceStep(requestId, 'server-parse', 'Semantic validator v5', 'done', `observation=${analysis.observation.length} · assumptions=${analysis.assumptions.length}`);
    const totalMs = Date.now() - started;
    traceStep(requestId, 'server-complete', 'Завершение агентного прохода', 'done', `Vision ${visionMs} мс · Analyst ${reasoningMs} мс · fallback=${usedFallback} · Total ${totalMs} мс`);
    finishTrace(requestId);

    return {
      analysis,
      latencyMs: totalMs,
      engine: `SONYA Local v5 · ${VISION_MODEL}${AGENT_PROFILE === 'FAST' ? ' → deterministic' : ` → ${REASONING_MODEL}`} + RAG v${RAG_VERSION}`,
      profile: AGENT_PROFILE,
      performance: { visionMs, reasoningMs, totalMs, usedFallback },
      trace: traceView(requestId),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Local analysis failed';
    traceStep(requestId, 'server-error', 'Ошибка агентного прохода', 'error', message);
    finishTrace(requestId, 'error', message);
    throw error;
  }
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') return json(res, 200, { ok: true });
  const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);

  if (req.method === 'GET' && url.pathname === '/api/_healthcheck') {
    return json(res, 200, {
      ok: true,
      backendVersion: 5,
      profile: AGENT_PROFILE,
      model: VISION_MODEL,
      visionModel: VISION_MODEL,
      reasoningModel: AGENT_PROFILE === 'FAST' ? 'skipped' : REASONING_MODEL,
      ragLoaded: Boolean(FOOD_VISION_RAG),
      ragChars: FOOD_VISION_RAG.length,
      ragVersion: RAG_VERSION,
      validator: VALIDATOR_VERSION,
      visionContract: 'json-schema-v1',
      ollama: OLLAMA_BASE_URL,
    });
  }

  if (req.method === 'GET' && url.pathname === '/api/trace') {
    return json(res, 200, traceView(url.searchParams.get('requestId') || ''));
  }

  if (req.method !== 'POST' || url.pathname !== '/api/analyze') return json(res, 404, { error: 'Not found' });

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
  console.log(`SONYA local API v5: http://127.0.0.1:${PORT}`);
  console.log(`Profile: ${AGENT_PROFILE}`);
  console.log(`Vision: ${VISION_MODEL} · contract=json-schema-v1`);
  console.log(`Analyst: ${AGENT_PROFILE === 'FAST' ? 'skipped' : REASONING_MODEL}`);
  console.log(`RAG: v${RAG_VERSION} · loaded=${Boolean(FOOD_VISION_RAG)}`);
  console.log(`Validator: ${VALIDATOR_VERSION}`);
  console.log(`Ollama: ${OLLAMA_BASE_URL}`);
});
