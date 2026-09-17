import http from 'node:http';
import { readFileSync } from 'node:fs';

const PORT = Number(process.env.SONYA_LOCAL_API_PORT || 8787);
const OLLAMA_BASE_URL = process.env.SONYA_OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const AGENT_PROFILE = String(process.env.SONYA_AGENT_PROFILE || 'BALANCED').toUpperCase();
const VISION_MODEL = process.env.SONYA_VISION_MODEL || 'qwen3-vl:8b-instruct-q4_K_M';
const REASONING_MODEL = process.env.SONYA_REASONING_MODEL || (AGENT_PROFILE === 'DEEP' ? 'qwen2.5:7b' : 'qwen2.5:3b');
const RAG_VERSION = 4;
const VALIDATOR_VERSION = 'semantic-v4';

let FOOD_VISION_RAG = '';
try {
  FOOD_VISION_RAG = readFileSync(new URL('./rag/food-vision-kb.md', import.meta.url), 'utf8');
} catch (error) {
  console.warn('SONYA RAG pack not loaded:', error instanceof Error ? error.message : error);
}

const RAG_CORE = `
SONYA Food Vision Core Rules:
1. observation = только физически видимое: цвет, форма, положение, количество, текстура. Без «похоже/вероятно/напоминает».
2. assumptions = вероятный продукт и художественная интерпретация композиции.
3. preparation = реальные кулинарные действия: отварить, промыть, нарезать, выложить, добавить, подать. Не использовать «укрепить/закрепить еду».
4. safety = аллергии, температура подачи, размер плотных круглых кусочков для маленьких детей. Не дублировать в preparation.
5. menu = 1–3 конкретных названия, связанные с изображением. Не использовать заглушки «Фигурное блюдо».
6. shoppingList = ориентировочные количества на указанное число гостей.
7. Не выдумывать марку, вид мяса, сахар, соль, масло, аллерген или способ приготовления исходного блюда по одному фото.
8. Только русский язык, без дублей между разделами.
`;

const visionSystem = `Ты VISION OBSERVER системы SONYA. Выполни только визуальную инспекцию фотографии еды.
Отвечай по-русски кратко и конкретно. Не составляй рецепт, меню, покупки или советы.
Сначала физические признаки, затем вероятные продукты/образы, затем неопределённость.
Не считай посуду и фон ингредиентами. Не повторяй пункты.

Формат:
ФИЗИЧЕСКИЕ НАБЛЮДЕНИЯ:
1. ...
2. ...
ВЕРОЯТНАЯ ИНТЕРПРЕТАЦИЯ:
1. ...
2. ...
НЕУВЕРЕННОСТЬ:
1. ...`;

const analystSystem = `Ты SONYA ANALYST. Ты получаешь уже готовый VISION-ОТЧЁТ, пользовательский запрос, профиль семьи и короткие RAG-правила.
Не видишь изображение напрямую и не можешь добавлять визуальные факты от себя.
Сформируй практичный русский ответ строго по JSON-схеме.
observation = только физические факты; assumptions = вероятные продукты/образы; preparation = реальные шаги реконструкции; menu = конкретные варианты; shoppingList = количества на гостей; safety = только меры безопасности.
Не повторяй пункты. Не используй бессмысленные действия «укрепить/закрепить еду».`;

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
          name: { type: 'string' },
          why: { type: 'string' },
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
          item: { type: 'string' },
          quantity: { type: 'string' },
          priority: { type: 'string' },
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
  let s = trace.steps.find(x => x.key === key);
  if (!s) { s = { key, label, status, detail, startedAt: now }; trace.steps.push(s); }
  else { s.label = label; s.status = status; s.detail = detail; }
  if (status === 'done' || status === 'error') { s.durationMs = now - s.startedAt; s.endedAt = now; }
}
function finishTrace(id, state = 'done', error = '') {
  const trace = traces.get(id); if (!trace) return;
  trace.state = state; trace.finishedAt = Date.now(); if (error) trace.error = error;
}
function traceView(id) {
  const t = traces.get(id);
  if (!t) return { state: 'waiting', steps: [] };
  return { state: t.state, totalMs: (t.finishedAt || Date.now()) - t.startedAt, steps: t.steps.map(({ key, label, status, detail, durationMs }) => ({ key, label, status, detail, durationMs })), error: t.error };
}

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' });
  res.end(JSON.stringify(body));
}

function cleanText(v) { return String(v ?? '').replace(/\s+/g, ' ').trim(); }
function keyOf(v) { return cleanText(v).toLocaleLowerCase('ru-RU').replace(/[.!?,;:()«»"']/g, '').trim(); }
function uniq(values, max = 8) {
  const out = [], seen = new Set();
  for (const v of Array.isArray(values) ? values : []) {
    const text = cleanText(v), key = keyOf(text); if (!text || seen.has(key)) continue;
    seen.add(key); out.push(text); if (out.length >= max) break;
  }
  return out;
}

function parseJsonLoose(text) {
  let s = String(text || '').replace(/^\uFEFF/, '').replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  const start = s.indexOf('{'), end = s.lastIndexOf('}');
  if (start >= 0 && end > start) s = s.slice(start, end + 1);
  const tries = [
    s,
    s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/,\s*([}\]])/g, '$1'),
  ];
  for (const candidate of tries) { try { return JSON.parse(candidate); } catch {} }
  return null;
}

function splitVision(text) {
  const physical = [], assumptions = [];
  let section = 'physical';
  for (const raw of String(text || '').split('\n')) {
    const line = raw.replace(/^\s*(?:\d+[.)-]?|[-*])\s*/, '').trim();
    if (!line) continue;
    if (/^ФИЗИЧЕСКИЕ НАБЛЮДЕНИЯ/i.test(line)) { section = 'physical'; continue; }
    if (/^ВЕРОЯТНАЯ ИНТЕРПРЕТАЦИЯ/i.test(line)) { section = 'assumptions'; continue; }
    if (/^НЕУВЕРЕННОСТЬ/i.test(line)) { section = 'assumptions'; continue; }
    (section === 'physical' ? physical : assumptions).push(line.replace(/^\[.*?\]\s*/, ''));
  }
  return { physical: uniq(physical, 7), assumptions: uniq(assumptions, 5) };
}

function detectFlags(...parts) {
  const t = parts.map(x => typeof x === 'string' ? x : JSON.stringify(x || '')).join(' ').toLocaleLowerCase('ru-RU');
  return {
    pasta: /спагет|паст\w*|макарон/.test(t),
    sausage: /сосиск|колбас|розов\w*.*(круг|ломтик|кусоч)/.test(t),
    carrot: /морков|оранжев\w*.*(круг|полоск|элемент)/.test(t),
    greens: /укроп|зелень|зел[её]н\w*.*(веточ|стеб|лист)/.test(t),
    caterpillar: /гусениц|червяк/.test(t),
    sun: /солнц/.test(t),
  };
}

function deterministicPreparation(flags) {
  const out = [];
  if (flags.pasta) out.push('Отварите пасту до готовности по инструкции на упаковке и слейте воду.');
  if (flags.sausage) out.push('Если розовые круглые ломтики действительно являются сосиской или другим готовым колбасным изделием, подготовьте его по инструкции на упаковке и нарежьте кружками.');
  if (flags.carrot) out.push('Если оранжевые элементы — морковь, очистите её и нарежьте один крупный элемент и несколько тонких полосок для декоративной выкладки.');
  if (flags.greens) out.push('Зелень промойте, обсушите и подготовьте небольшие веточки для декора.');
  out.push('Выложите пасту на тарелку как основу композиции.');
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

function fallbackAnalysis(visionText, profile, mode) {
  const vision = splitVision(visionText), flags = detectFlags(visionText, vision);
  const physical = vision.physical.length ? vision.physical : ['Изображение блюда получено, но часть деталей распознана неуверенно.'];
  return {
    headline: mode === 'fridge' ? 'Разбор продуктов по фотографии' : 'Разбор идеи детского блюда',
    confidenceNote: 'Ответ собран из vision-отчёта и серверных правил после сбоя структурированного ответа аналитической модели.',
    observation: physical,
    assumptions: vision.assumptions,
    preparation: deterministicPreparation(flags),
    menu: deterministicMenu(flags),
    shoppingList: deterministicShopping(flags, profile.guests ?? 10),
    safety: deterministicSafety(flags),
  };
}

const uncertainty = /\b(похож\w*|вероятн\w*|возможн\w*|может быть|напомина\w*|скорее всего)\b/i;
const figurative = /\b(солнц\w*|лиц\w*|бабоч\w*|червяк\w*|гусениц\w*)\b/i;
const badPrep = /\b(укреп\w*|закреп\w*|прикреп\w*)\b/i;
const safetyPattern = /\b(аллерг\w*|температур\w*|маленьк\w* дет\w*|проверь\w* состав|безопас\w*)\b/i;

function normalizeAnalysis(raw, visionText, profile, mode) {
  const vision = splitVision(visionText);
  const obs = [], assumptions = [...uniq(raw?.assumptions, 7)];
  for (const item of uniq(raw?.observation, 10).length ? uniq(raw?.observation, 10) : vision.physical) {
    if (uncertainty.test(item) || figurative.test(item)) assumptions.push(item); else obs.push(item);
  }
  const flags = detectFlags(visionText, raw, obs, assumptions);
  const prep = uniq(raw?.preparation, 12).filter(x => !badPrep.test(x) && !safetyPattern.test(x));
  const safetySeed = uniq(raw?.safety, 8);
  for (const x of uniq(raw?.preparation, 12)) if (safetyPattern.test(x)) safetySeed.push(x);
  const rawMenu = Array.isArray(raw?.menu) ? raw.menu.map(x => ({ name: cleanText(x?.name), why: cleanText(x?.why), timeMinutes: Math.max(1, Number(x?.timeMinutes) || 30) })).filter(x => x.name && x.why && !/^(фигурное блюдо|вариант блюда|блюдо)$/i.test(x.name)) : [];
  const rawShop = Array.isArray(raw?.shoppingList) ? raw.shoppingList.map(x => ({ item: cleanText(x?.item), quantity: cleanText(x?.quantity), priority: cleanText(x?.priority || 'обычно') })).filter(x => x.item && x.quantity) : [];
  return {
    headline: cleanText(raw?.headline || 'Разбор идеи детского блюда'),
    confidenceNote: cleanText(raw?.confidenceNote || 'Часть ингредиентов определена по внешнему виду; точный состав следует проверять отдельно.'),
    observation: uniq(obs, 7),
    assumptions: uniq(assumptions, 5),
    preparation: prep.length >= 4 ? uniq(prep, 8) : deterministicPreparation(flags),
    menu: rawMenu.length ? rawMenu.slice(0, 3) : deterministicMenu(flags),
    shoppingList: rawShop.length ? rawShop.slice(0, 20) : deterministicShopping(flags, profile.guests ?? 10),
    safety: uniq(safetySeed, 4).length ? uniq(safetySeed, 4) : deterministicSafety(flags),
  };
}

async function ollamaChat({ model, messages, format, temperature = 0.05, numPredict = 300, numCtx = 4096, keepAlive = '10m' }) {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, stream: false, messages, ...(format ? { format } : {}), keep_alive: keepAlive, options: { temperature, num_predict: numPredict, num_ctx: numCtx } }),
  });
  if (!response.ok) throw new Error(`Ollama ${response.status} (${model}): ${(await response.text()).slice(0, 300)}`);
  const payload = await response.json();
  return cleanText(payload?.message?.content || payload?.response || '');
}

async function analyze(body) {
  const started = Date.now(), requestId = String(body?.requestId || `server-${started}`);
  initTrace(requestId);
  try {
    traceStep(requestId, 'server-validate', 'Проверка входных данных', 'running', 'Фото + текстовый запрос');
    if (!body?.prompt?.trim()) throw new Error('Введите текстовый запрос.');
    if (!body?.image?.data) throw new Error('Загрузите фотографию.');
    traceStep(requestId, 'server-validate', 'Проверка входных данных', 'done', 'Фото и текст приняты');

    const profile = body.profile || {}, modeLabel = body.mode === 'fridge' ? 'холодильник/запасы' : 'референс блюда';
    traceStep(requestId, 'server-context', 'Сбор контекста задачи', 'done', `Профиль ${AGENT_PROFILE} · ${modeLabel} · гостей ${profile.guests ?? 10}`);

    traceStep(requestId, 'server-vision-model', 'Выбор vision-модели', 'done', VISION_MODEL);
    traceStep(requestId, 'server-vision', 'Vision extraction в Ollama', 'running', `${VISION_MODEL} · короткий визуальный отчёт`);
    const v0 = Date.now();
    const visionText = await ollamaChat({
      model: VISION_MODEL, temperature: 0.02, numPredict: 220, numCtx: 4096, keepAlive: '10m',
      messages: [
        { role: 'system', content: visionSystem },
        { role: 'user', content: 'Кратко опиши физически видимые элементы, затем вероятные продукты/образы и неопределённость. Не составляй рецепт.', images: [body.image.data] },
      ],
    });
    const visionMs = Date.now() - v0;
    traceStep(requestId, 'server-vision', 'Vision extraction в Ollama', 'done', `Vision готов · ${visionMs} мс`);

    traceStep(requestId, 'server-rag', 'RAG grounding', 'done', `Food Vision KB v${RAG_VERSION} · loaded=${Boolean(FOOD_VISION_RAG)} · runtime core ${RAG_CORE.length} chars`);

    let analysis, reasoningMs = 0, usedFallback = false;
    if (AGENT_PROFILE === 'FAST') {
      usedFallback = true;
      analysis = fallbackAnalysis(visionText, profile, body.mode);
      traceStep(requestId, 'server-reasoning', 'FAST deterministic synthesis', 'done', 'Второй LLM-проход пропущен');
    } else {
      traceStep(requestId, 'server-reasoning-model', 'Выбор аналитической модели', 'done', `${REASONING_MODEL} · ${AGENT_PROFILE}`);
      traceStep(requestId, 'server-reasoning', 'Grounded reasoning в Ollama', 'running', `${REASONING_MODEL} · JSON Schema`);
      const r0 = Date.now();
      const prompt = `VISION-ОТЧЁТ:\n${visionText}\n\nRAG-CORE:\n${RAG_CORE}\n\nПРОФИЛЬ: ребёнок ${profile.childAge ?? 8} лет; гостей ${profile.guests ?? 10}; бюджет ${profile.budget ?? 15000} ₽; образ жизни ${profile.lifestyle ?? 'не указан'}; ограничения ${profile.allergies ?? 'не указаны'}; режим ${modeLabel}.\n\nЗАПРОС:\n${body.prompt.trim()}`;
      const structured = await ollamaChat({
        model: REASONING_MODEL, format: ANALYSIS_SCHEMA, temperature: 0.02,
        numPredict: AGENT_PROFILE === 'DEEP' ? 700 : 520, numCtx: 4096, keepAlive: '10m',
        messages: [{ role: 'system', content: analystSystem }, { role: 'user', content: prompt }],
      });
      reasoningMs = Date.now() - r0;
      traceStep(requestId, 'server-reasoning', 'Grounded reasoning в Ollama', 'done', `Аналитик завершён · ${reasoningMs} мс`);

      traceStep(requestId, 'server-parse', 'Semantic validator v4', 'running', 'JSON repair → normalize → fallback');
      const parsed = parseJsonLoose(structured);
      if (parsed) {
        analysis = normalizeAnalysis(parsed, visionText, profile, body.mode);
        traceStep(requestId, 'server-parse', 'Semantic validator v4', 'done', 'JSON валиден/восстановлен · нормализация завершена');
      } else {
        usedFallback = true;
        analysis = fallbackAnalysis(visionText, profile, body.mode);
        traceStep(requestId, 'server-parse', 'Semantic validator v4', 'done', 'JSON аналитика повреждён · применён deterministic fallback');
      }
    }

    const totalMs = Date.now() - started;
    traceStep(requestId, 'server-complete', 'Завершение агентного прохода', 'done', `Vision ${visionMs} мс · Analyst ${reasoningMs} мс · fallback=${usedFallback} · Total ${totalMs} мс`);
    finishTrace(requestId);
    return {
      analysis, latencyMs: totalMs,
      engine: `SONYA Local v4 · ${VISION_MODEL}${AGENT_PROFILE === 'FAST' ? ' → deterministic' : ` → ${REASONING_MODEL}`} + RAG v${RAG_VERSION}`,
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
  if (req.method === 'GET' && url.pathname === '/api/_healthcheck') return json(res, 200, {
    ok: true, backend: 'v4', profile: AGENT_PROFILE, model: VISION_MODEL, visionModel: VISION_MODEL,
    reasoningModel: REASONING_MODEL, ragLoaded: Boolean(FOOD_VISION_RAG), ragChars: FOOD_VISION_RAG.length,
    ragVersion: RAG_VERSION, validator: VALIDATOR_VERSION, ollama: OLLAMA_BASE_URL,
  });
  if (req.method === 'GET' && url.pathname === '/api/trace') return json(res, 200, traceView(url.searchParams.get('requestId') || ''));
  if (req.method !== 'POST' || url.pathname !== '/api/analyze') return json(res, 404, { error: 'Not found' });

  let raw = '';
  req.on('data', chunk => { raw += chunk; if (raw.length > 14 * 1024 * 1024) req.destroy(); });
  req.on('end', async () => {
    try { json(res, 200, await analyze(JSON.parse(raw || '{}'))); }
    catch (error) { console.error('SONYA v4 analyze failed', error); json(res, 500, { error: error instanceof Error ? error.message : 'Local analysis failed' }); }
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`SONYA local API v4: http://127.0.0.1:${PORT}`);
  console.log(`Profile: ${AGENT_PROFILE}`);
  console.log(`Vision: ${VISION_MODEL}`);
  console.log(`Analyst: ${REASONING_MODEL}`);
  console.log(`RAG: loaded=${Boolean(FOOD_VISION_RAG)} · v${RAG_VERSION} · full ${FOOD_VISION_RAG.length} chars · runtime core ${RAG_CORE.length} chars`);
  console.log(`Validator: ${VALIDATOR_VERSION}`);
  console.log(`Ollama: ${OLLAMA_BASE_URL}`);
});
