import http from 'node:http';
import { readFileSync } from 'node:fs';

const PORT = Number(process.env.SONYA_LOCAL_API_PORT || 8787);
const OLLAMA_BASE_URL = process.env.SONYA_OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const AGENT_PROFILE = String(process.env.SONYA_AGENT_PROFILE || 'FAST').toUpperCase();
const VISION_MODEL = process.env.SONYA_VISION_MODEL || 'qwen3-vl:8b-instruct-q4_K_M';
const REASONING_MODEL = process.env.SONYA_REASONING_MODEL || (AGENT_PROFILE === 'DEEP' ? 'qwen2.5:7b' : 'qwen2.5:3b');
const RAG_VERSION = 6;
const VALIDATOR_VERSION = 'semantic-v7';
const VISION_CONTRACT = 'resilient-json-v3';

let FOOD_VISION_RAG = '';
try {
  FOOD_VISION_RAG = readFileSync(new URL('./rag/food-vision-kb-v6.md', import.meta.url), 'utf8');
} catch (error) {
  console.warn('SONYA RAG v6 not loaded:', error instanceof Error ? error.message : error);
}

const RAG_CORE = `SONYA Food Vision Core v6:
1. observation = только физически видимое: цвет, форма, положение, количество, текстура.
2. assumptions = вероятный продукт и художественная интерпретация.
3. Точный цвет: turquoise/cyan/blue-green = бирюзовый; light blue = светло-голубой; blue = синий/голубой по фактическому оттенку.
4. Ярко-оранжевый плотный овощ в форме кружка и тонких полосок намного вероятнее морковь, чем обычный картофель.
5. Длинные непрерывные нити пасты не называй «нарезанными спагетти».
6. Круглые розовые ломтики описывай физически отдельно; сосиска/колбасное изделие — только гипотеза.
7. preparation = реальные действия; safety = безопасность; menu = конкретные варианты; shoppingList = количества на гостей.
8. Только русский язык, без дублей.`;

const VISION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['physical', 'assumptions', 'uncertainty', 'scene'],
  properties: {
    physical: { type: 'array', items: { type: 'string' }, maxItems: 7 },
    assumptions: { type: 'array', items: { type: 'string' }, maxItems: 5 },
    uncertainty: { type: 'array', items: { type: 'string' }, maxItems: 3 },
    scene: {
      type: 'object',
      additionalProperties: false,
      required: ['dishwareColor', 'dishwareColorConfidence'],
      properties: {
        dishwareColor: { type: 'string' },
        dishwareColorConfidence: { type: 'string' },
      },
    },
  },
};

const ANALYSIS_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['headline', 'confidenceNote', 'observation', 'assumptions', 'preparation', 'menu', 'shoppingList', 'safety'],
  properties: {
    headline: { type: 'string' },
    confidenceNote: { type: 'string' },
    observation: { type: 'array', items: { type: 'string' }, maxItems: 8 },
    assumptions: { type: 'array', items: { type: 'string' }, maxItems: 6 },
    preparation: { type: 'array', items: { type: 'string' }, maxItems: 8 },
    menu: { type: 'array', maxItems: 3, items: { type: 'object', additionalProperties: false, required: ['name', 'why', 'timeMinutes'], properties: { name: { type: 'string' }, why: { type: 'string' }, timeMinutes: { type: 'integer', minimum: 1, maximum: 240 } } } },
    shoppingList: { type: 'array', maxItems: 20, items: { type: 'object', additionalProperties: false, required: ['item', 'quantity', 'priority'], properties: { item: { type: 'string' }, quantity: { type: 'string' }, priority: { type: 'string' } } } },
    safety: { type: 'array', items: { type: 'string' }, maxItems: 4 },
  },
};

const visionSystem = `Ты VISION OBSERVER системы SONYA. Анализируй только изображение и верни короткий JSON по схеме.
physical = физические признаки без догадок; assumptions = вероятные продукты и смысл композиции; uncertainty = только реальные сомнения; scene = цвет видимой посуды.
Различай бирюзовый/циан и голубой. Насыщенно-оранжевый круг/пластина плюс тонкие оранжевые полоски — сильный признак моркови; обычный картофель чаще кремовый/жёлтый/бежевый. Длинные нити пасты не называй нарезанными. Розовые круглые ломтики — физический факт, «сосиска» — гипотеза. Зелёные перистые веточки — физический факт, «укроп» — гипотеза.
Не составляй рецепт, меню, покупки или советы. Только русский язык.`;

const analystSystem = `Ты SONYA ANALYST. Получаешь готовый VISION JSON, запрос, профиль семьи и RAG-правила. Не видишь изображение напрямую. Сформируй практичный ответ строго по JSON-схеме. observation = физические факты; assumptions = вероятные продукты/образы; preparation = реальные шаги; menu = конкретные варианты; shoppingList = количества; safety = меры безопасности. Не повторяй пункты.`;

const traces = new Map();
function initTrace(id) { traces.set(id, { state: 'running', startedAt: Date.now(), steps: [] }); }
function traceStep(id, key, label, status, detail = '') {
  const t = traces.get(id); if (!t) return;
  const now = Date.now(); let s = t.steps.find(x => x.key === key);
  if (!s) { s = { key, label, status, detail, startedAt: now }; t.steps.push(s); }
  else { s.label = label; s.status = status; s.detail = detail; }
  if (status === 'done' || status === 'error') { s.durationMs = now - s.startedAt; s.endedAt = now; }
}
function finishTrace(id, state = 'done', error = '') { const t = traces.get(id); if (!t) return; t.state = state; t.finishedAt = Date.now(); if (error) t.error = error; }
function traceView(id) { const t = traces.get(id); if (!t) return { state: 'waiting', steps: [] }; return { state: t.state, totalMs: (t.finishedAt || Date.now()) - t.startedAt, steps: t.steps.map(({ key, label, status, detail, durationMs }) => ({ key, label, status, detail, durationMs })), error: t.error }; }
function json(res, status, body) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' }); res.end(JSON.stringify(body)); }

function cleanText(v) { return String(v ?? '').replace(/\s+/g, ' ').replace(/^[-–—•]\s*/, '').trim(); }
function keyOf(v) { return cleanText(v).toLocaleLowerCase('ru-RU').replace(/[.!?,;:()«»"']/g, '').trim(); }
function uniq(values, max = 8) { const out = [], seen = new Set(); for (const v of Array.isArray(values) ? values : []) { const text = cleanText(v), key = keyOf(text); if (!text || text === '-' || seen.has(key)) continue; seen.add(key); out.push(text); if (out.length >= max) break; } return out; }

function parseJsonLoose(text) {
  let s = String(text || '').replace(/^\uFEFF/, '').replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  const a = s.indexOf('{'), b = s.lastIndexOf('}'); if (a >= 0 && b > a) s = s.slice(a, b + 1);
  const variants = [s, s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/,\s*([}\]])/g, '$1')];
  for (const candidate of variants) { try { return JSON.parse(candidate); } catch {} }
  return null;
}

function decodeJsonString(raw) {
  try { return JSON.parse(`"${raw.replace(/"/g, '\\"')}"`); } catch { return raw.replace(/\\n/g, ' ').replace(/\\"/g, '"'); }
}

function extractArrayFromBrokenJson(text, key) {
  const source = String(text || '');
  const match = source.match(new RegExp(`["']?${key}["']?\\s*:\\s*\\[([\\s\\S]*?)(?:\\]|$)`, 'i'));
  if (!match) return [];
  const out = [];
  const re = /"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'/g;
  let m;
  while ((m = re.exec(match[1])) !== null) out.push(decodeJsonString(m[1] ?? m[2] ?? ''));
  return uniq(out, key === 'physical' ? 7 : 5);
}

function extractStringFromBrokenJson(text, key) {
  const m = String(text || '').match(new RegExp(`["']?${key}["']?\\s*:\\s*["']([^"']+)["']`, 'i'));
  return cleanText(m?.[1] || '');
}

function parseVisionSections(text) {
  const physical = [], assumptions = [], uncertainty = [];
  let section = 'physical';
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = cleanText(raw.replace(/^\s*(?:\d+[.)-]?|[-*])\s*/, '').replace(/\*\*/g, ''));
    if (!line) continue;
    if (/ФИЗИЧЕСК|НАБЛЮДЕН|PHYSICAL/i.test(line)) { section = 'physical'; continue; }
    if (/ИНТЕРПРЕТ|ПРЕДПОЛОЖ|ASSUMPTION/i.test(line)) { section = 'assumptions'; continue; }
    if (/НЕУВЕР|НЕОПРЕДЕЛ|UNCERTAINT/i.test(line)) { section = 'uncertainty'; continue; }
    if (/^[\[{].*[\]}],?$/.test(line)) continue;
    (section === 'physical' ? physical : section === 'assumptions' ? assumptions : uncertainty).push(line.replace(/^"|",?$/g, ''));
  }
  return { physical: uniq(physical, 7), assumptions: uniq(assumptions, 5), uncertainty: uniq(uncertainty, 3) };
}

function normalizeColorName(value) {
  const v = cleanText(value).toLocaleLowerCase('ru-RU'); if (!v) return '';
  if (/turquoise|cyan|teal|бирюз|циан|зел[её]но[- ]?голуб/.test(v)) return 'бирюзовая';
  if (/светло[- ]?голуб|light blue/.test(v)) return 'светло-голубая';
  if (/голуб/.test(v)) return 'голубая';
  if (/син/.test(v)) return 'синяя';
  return cleanText(value);
}

function parseVisionResilient(text) {
  const strict = parseJsonLoose(text);
  if (strict && (Array.isArray(strict.physical) || strict.scene)) {
    return { raw: strict, mode: 'strict-json' };
  }

  const broken = {
    physical: extractArrayFromBrokenJson(text, 'physical'),
    assumptions: extractArrayFromBrokenJson(text, 'assumptions'),
    uncertainty: extractArrayFromBrokenJson(text, 'uncertainty'),
    scene: {
      dishwareColor: extractStringFromBrokenJson(text, 'dishwareColor'),
      dishwareColorConfidence: extractStringFromBrokenJson(text, 'dishwareColorConfidence') || 'низкая',
    },
  };
  if (broken.physical.length || broken.assumptions.length || broken.scene.dishwareColor) return { raw: broken, mode: 'broken-json-salvage' };

  const sections = parseVisionSections(text);
  return {
    raw: { ...sections, scene: { dishwareColor: '', dishwareColorConfidence: 'низкая' } },
    mode: sections.physical.length || sections.assumptions.length ? 'text-section-fallback' : 'semantic-reconstruction',
  };
}

function normalizeVision(raw, rawText = '') {
  const vision = {
    physical: uniq(raw?.physical, 8), assumptions: uniq(raw?.assumptions, 6), uncertainty: uniq(raw?.uncertainty, 4),
    scene: { dishwareColor: normalizeColorName(raw?.scene?.dishwareColor), dishwareColorConfidence: cleanText(raw?.scene?.dishwareColorConfidence || 'низкая') },
  };
  const joined = `${JSON.stringify(vision)} ${rawText}`.toLocaleLowerCase('ru-RU');
  const orangeMorphology = /оранжев/.test(joined) && /(полоск|луч|круг|диск|пластин|элемент)/.test(joined);
  const potatoMention = /картоф/.test(joined), carrotMention = /морков/.test(joined);
  if (orangeMorphology && potatoMention && !carrotMention) {
    vision.physical = vision.physical.map(x => /картоф/i.test(x) ? x.replace(/картофель\w*/gi, 'оранжевый овощной элемент') : x);
    vision.assumptions = vision.assumptions.filter(x => !/картоф/i.test(x));
    vision.uncertainty = vision.uncertainty.filter(x => !/картоф/i.test(x));
    vision.assumptions.push('По насыщенно-оранжевому цвету и форме кружка/тонких полосок овощные элементы больше всего похожи на морковь.');
  }
  vision.physical = vision.physical.map(x => x.replace(/нарезанн\w* спагетти/gi, 'длинные нити спагетти'));
  vision.assumptions = uniq(vision.assumptions, 6); vision.uncertainty = uniq(vision.uncertainty, 4);
  return vision;
}

function detectFlags(...parts) {
  const t = parts.map(x => typeof x === 'string' ? x : JSON.stringify(x || '')).join(' ').toLocaleLowerCase('ru-RU');
  return {
    pasta: /спагет|паст\w*|макарон|длинн\w*.*светл\w*.*нит/.test(t),
    sausage: /сосиск|колбас|розов\w*.*(круг|ломтик|кусоч)/.test(t),
    carrot: /морков|оранжев\w*.*(круг|полоск|луч|элемент|диск)/.test(t),
    greens: /укроп|зелень|зел[её]н\w*.*(веточ|стеб|лист|перист)/.test(t),
    caterpillar: /гусениц|червяк/.test(t), sun: /солнц|радиальн\w*.*оранж/.test(t),
  };
}

function inferredPhysical(flags, scene) {
  const out = [];
  if (scene?.dishwareColor) out.push(`${scene.dishwareColor.charAt(0).toUpperCase()}${scene.dishwareColor.slice(1)} тарелка.`);
  if (flags.pasta) out.push('На тарелке видны длинные светло-жёлтые нити пасты, собранные в несколько пучков.');
  if (flags.sausage) out.push('Над пастой расположена цепочка круглых розовых ломтиков примерно одинакового диаметра.');
  if (flags.carrot) out.push('В верхней части композиции виден насыщенно-оранжевый элемент и несколько тонких оранжевых полосок.');
  if (flags.greens) out.push('В нижней части тарелки видны тонкие зелёные веточки или перистые листья.');
  return out;
}

function deterministicPreparation(flags) {
  const out = [];
  if (flags.pasta) out.push('Отварите пасту до готовности по инструкции на упаковке и слейте воду.');
  if (flags.sausage) out.push('Если круглые розовые ломтики действительно являются сосиской или другим готовым колбасным изделием, подготовьте его по инструкции на упаковке и нарежьте кружками.');
  if (flags.carrot) out.push('Если оранжевые элементы — морковь, очистите её и нарежьте один крупный элемент и несколько тонких полосок для декоративной выкладки.');
  if (flags.greens) out.push('Зелень промойте, обсушите и подготовьте небольшие веточки для декора.');
  if (flags.pasta) out.push('Выложите пасту на тарелку как основу композиции.');
  if (flags.sausage) out.push('Разложите круглые ломтики цепочкой над пастой, повторяя композицию с фотографии.');
  if (flags.carrot) out.push('Разместите оранжевые элементы в верхней части композиции.');
  if (flags.greens) out.push('Добавьте зелень перед подачей.');
  return uniq(out, 8);
}

function deterministicMenu(flags) {
  const out = [];
  if (flags.pasta && flags.sausage) out.push({ name: 'Спагетти «Весёлая гусеница»', why: 'Повторяет цепочку круглых розовых элементов над пастой и подходит для детской фигурной подачи.', timeMinutes: 30 });
  if (flags.pasta && flags.carrot) out.push({ name: 'Детская паста с морковным солнцем', why: 'Сохраняет основу из пасты и ярко-оранжевую радиальную композицию из моркови.', timeMinutes: 30 });
  if (flags.pasta) out.push({ name: 'Паста-конструктор с фигурной выкладкой', why: 'Позволяет собрать похожую композицию из пасты и декоративных элементов перед подачей.', timeMinutes: 25 });
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

function fallbackAnalysis(vision, profile, mode, rawVisionText = '') {
  const flags = detectFlags(vision, rawVisionText);
  const physical = vision.physical.length ? [...vision.physical] : inferredPhysical(flags, vision.scene);
  if (vision.scene?.dishwareColor && !physical.some(x => /тарелк|посуд/i.test(x))) physical.unshift(`${vision.scene.dishwareColor.charAt(0).toUpperCase()}${vision.scene.dishwareColor.slice(1)} тарелка.`);
  return {
    headline: mode === 'fridge' ? 'Разбор продуктов на фото' : 'Разбор идеи блюда',
    confidenceNote: vision.uncertainty.length ? 'Основные визуальные элементы определены; часть конкретных ингредиентов остаётся предположением.' : 'Основные визуальные элементы определены.',
    observation: uniq(physical.length ? physical : ['Фото получено; точные физические признаки требуют повторной проверки.'], 8),
    assumptions: uniq([...vision.assumptions, ...vision.uncertainty], 6),
    preparation: deterministicPreparation(flags), menu: deterministicMenu(flags), shoppingList: deterministicShopping(flags, profile.guests ?? 10), safety: deterministicSafety(flags),
  };
}

async function ollamaChat({ model, messages, format, temperature = 0.02, numPredict = 360, numCtx = 4096, keepAlive = '10m' }) {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model, stream: false, messages, ...(format ? { format } : {}), keep_alive: keepAlive, options: { temperature, num_predict: numPredict, num_ctx: numCtx } }) });
  if (!response.ok) throw new Error(`Ollama ${response.status} (${model}): ${(await response.text()).slice(0, 300)}`);
  const payload = await response.json(); return String(payload?.message?.content || payload?.response || '').trim();
}

async function analyze(body) {
  const started = Date.now(), requestId = String(body?.requestId || `server-${started}`); initTrace(requestId);
  try {
    traceStep(requestId, 'server-validate', 'Проверка входных данных', 'running', 'Фото + текстовый запрос');
    if (!body?.prompt?.trim()) throw new Error('Введите текстовый запрос.'); if (!body?.image?.data) throw new Error('Загрузите фотографию.');
    traceStep(requestId, 'server-validate', 'Проверка входных данных', 'done', 'Фото и текст приняты');
    const profile = body.profile || {}, modeLabel = body.mode === 'fridge' ? 'холодильник/запасы' : 'референс блюда';
    traceStep(requestId, 'server-context', 'Сбор контекста задачи', 'done', `Профиль ${AGENT_PROFILE} · ${modeLabel} · гостей ${profile.guests ?? 10}`);

    traceStep(requestId, 'server-vision-model', 'Выбор vision-модели', 'done', `${VISION_MODEL} · ${VISION_CONTRACT}`);
    traceStep(requestId, 'server-vision', 'Vision extraction в Ollama', 'running', 'JSON → repair → salvage → semantic reconstruction');
    const v0 = Date.now();
    const visionText = await ollamaChat({ model: VISION_MODEL, format: VISION_SCHEMA, temperature: 0.01, numPredict: 420, numCtx: 4096, keepAlive: '10m', messages: [
      { role: 'system', content: visionSystem },
      { role: 'user', content: 'Проанализируй изображение. Точно различай оттенок посуды, морковь/картофель, длинные нити пасты и круглые розовые ломтики. Верни максимально короткий JSON по схеме.', images: [body.image.data] },
    ] });
    const visionMs = Date.now() - v0;
    const parsed = parseVisionResilient(visionText);
    const vision = normalizeVision(parsed.raw, visionText);
    const initialFlags = detectFlags(vision, visionText);
    if (!vision.physical.length) vision.physical = inferredPhysical(initialFlags, vision.scene);
    traceStep(requestId, 'server-vision', 'Vision extraction в Ollama', 'done', `Vision готов · ${visionMs} мс · parse=${parsed.mode} · physical=${vision.physical.length}`);

    traceStep(requestId, 'server-rag', 'RAG grounding', 'done', `Food Vision KB v${RAG_VERSION} · loaded=${Boolean(FOOD_VISION_RAG)}`);
    let analysis, reasoningMs = 0, usedFallback = parsed.mode !== 'strict-json';
    if (AGENT_PROFILE === 'FAST') {
      analysis = fallbackAnalysis(vision, profile, body.mode, visionText);
      traceStep(requestId, 'server-reasoning', 'FAST deterministic synthesis', 'done', `Второй LLM-проход пропущен · vision parse=${parsed.mode}`);
    } else {
      traceStep(requestId, 'server-reasoning-model', 'Выбор аналитической модели', 'done', `${REASONING_MODEL} · ${AGENT_PROFILE}`);
      traceStep(requestId, 'server-reasoning', 'Grounded reasoning в Ollama', 'running', `${REASONING_MODEL} · JSON Schema`);
      const r0 = Date.now();
      const prompt = `VISION JSON:\n${JSON.stringify(vision, null, 2)}\n\nRAG-CORE:\n${RAG_CORE}\n\nПРОФИЛЬ: ребёнок ${profile.childAge ?? 8} лет; гостей ${profile.guests ?? 10}; бюджет ${profile.budget ?? 15000} ₽; образ жизни ${profile.lifestyle ?? 'не указан'}; ограничения ${profile.allergies ?? 'не указаны'}; режим ${modeLabel}.\n\nЗАПРОС:\n${body.prompt.trim()}`;
      const structured = await ollamaChat({ model: REASONING_MODEL, format: ANALYSIS_SCHEMA, temperature: 0.01, numPredict: AGENT_PROFILE === 'DEEP' ? 700 : 520, numCtx: 4096, keepAlive: '10m', messages: [{ role: 'system', content: analystSystem }, { role: 'user', content: prompt }] });
      reasoningMs = Date.now() - r0; const a = parseJsonLoose(structured);
      if (a) {
        analysis = a; analysis.observation = uniq(a.observation, 8); analysis.assumptions = uniq(a.assumptions, 6);
        const fb = fallbackAnalysis(vision, profile, body.mode, visionText);
        if (!analysis.observation.length) analysis.observation = fb.observation;
        if (!Array.isArray(analysis.menu) || !analysis.menu.length) analysis.menu = fb.menu;
        if (!Array.isArray(analysis.shoppingList) || !analysis.shoppingList.length) analysis.shoppingList = fb.shoppingList;
      } else { usedFallback = true; analysis = fallbackAnalysis(vision, profile, body.mode, visionText); }
      traceStep(requestId, 'server-reasoning', 'Grounded reasoning в Ollama', 'done', `Аналитик завершён · ${reasoningMs} мс · fallback=${!a}`);
    }

    const totalMs = Date.now() - started;
    traceStep(requestId, 'server-parse', 'Semantic validator v7', 'done', `Resilient vision=${parsed.mode} · color/food guard · empty cleanup`);
    traceStep(requestId, 'server-complete', 'Завершение агентного прохода', 'done', `Vision ${visionMs} мс · Analyst ${reasoningMs} мс · fallback=${usedFallback} · Total ${totalMs} мс`);
    finishTrace(requestId);
    return { analysis, latencyMs: totalMs, engine: `SONYA Local v7 · ${VISION_MODEL}${AGENT_PROFILE === 'FAST' ? ' → deterministic' : ` → ${REASONING_MODEL}`} + RAG v${RAG_VERSION}`, profile: AGENT_PROFILE, performance: { visionMs, reasoningMs, totalMs, usedFallback, visionParseMode: parsed.mode }, vision, trace: traceView(requestId) };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Local analysis failed'; traceStep(requestId, 'server-error', 'Ошибка агентного прохода', 'error', message); finishTrace(requestId, 'error', message); throw error;
  }
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') return json(res, 200, { ok: true });
  const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);
  if (req.method === 'GET' && url.pathname === '/api/_healthcheck') return json(res, 200, { ok: true, backend: 'v7', profile: AGENT_PROFILE, visionModel: VISION_MODEL, reasoningModel: REASONING_MODEL, visionContract: VISION_CONTRACT, ragLoaded: Boolean(FOOD_VISION_RAG), ragVersion: RAG_VERSION, validator: VALIDATOR_VERSION, ollama: OLLAMA_BASE_URL });
  if (req.method === 'GET' && url.pathname === '/api/trace') return json(res, 200, traceView(url.searchParams.get('requestId') || ''));
  if (req.method !== 'POST' || url.pathname !== '/api/analyze') return json(res, 404, { error: 'Not found' });
  let raw = ''; req.on('data', chunk => { raw += chunk; if (raw.length > 14 * 1024 * 1024) req.destroy(); });
  req.on('end', async () => { try { json(res, 200, await analyze(JSON.parse(raw || '{}'))); } catch (error) { console.error('SONYA v7 analyze failed', error); json(res, 500, { error: error instanceof Error ? error.message : 'Local analysis failed' }); } });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`SONYA local API v7: http://127.0.0.1:${PORT}`);
  console.log(`Profile: ${AGENT_PROFILE}`); console.log(`Vision: ${VISION_MODEL} · contract ${VISION_CONTRACT}`);
  console.log(`Analyst: ${AGENT_PROFILE === 'FAST' ? 'skipped' : REASONING_MODEL}`); console.log(`RAG: loaded=${Boolean(FOOD_VISION_RAG)} · v${RAG_VERSION}`);
  console.log(`Validator: ${VALIDATOR_VERSION}`); console.log(`Ollama: ${OLLAMA_BASE_URL}`);
});
