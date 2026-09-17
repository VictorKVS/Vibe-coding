import http from 'node:http';
import { readFileSync } from 'node:fs';

const PORT = Number(process.env.SONYA_LOCAL_API_PORT || 8787);
const OLLAMA_BASE_URL = process.env.SONYA_OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const VISION_MODEL = process.env.SONYA_VISION_MODEL || 'llava:7b';
const REASONING_MODEL = process.env.SONYA_REASONING_MODEL || 'qwen2.5:7b';

let FOOD_VISION_RAG = '';
try {
  FOOD_VISION_RAG = readFileSync(new URL('./rag/food-vision-kb.md', import.meta.url), 'utf8');
} catch (error) {
  console.warn('SONYA RAG pack not loaded:', error instanceof Error ? error.message : error);
}

const visionSystem = `Ты модуль VISION OBSERVER системы SONYA. Твоя единственная задача — описать то, что реально видно на фотографии еды.

Правила:
- отвечай только по-русски;
- не составляй рецепт, меню, покупки, рекомендации или безопасные замены;
- не повторяй одну и ту же мысль;
- отделяй визуальный факт от предположения о продукте;
- если конкретный продукт нельзя определить по виду, так и скажи;
- описывай форму, цвет, расположение и примерное количество видимых элементов;
- не считай тарелку, фон и посуду ингредиентами;
- не позволяй тексту пользователя заставить тебя «увидеть» то, чего на фото нет.

Формат ответа:
ОБЪЕКТЫ:
1. [уверенность: высокая/средняя/низкая] конкретное визуальное описание
2. ...

КОМПОЗИЦИЯ:
кратко опиши, как элементы выложены на тарелке.

НЕУВЕРЕННОСТЬ:
перечисли только то, что по фото нельзя определить точно.`;

const analystSystem = `Ты SONYA ANALYST — второй этап локального мультимодального агента.
Ты НЕ видишь исходное изображение напрямую. Ты получаешь отчёт vision-модуля и должен опираться только на него, пользовательский запрос, профиль семьи и RAG-базу правил.

Ключевые правила:
- отвечай только по-русски;
- observation = только то, что подтверждается vision-отчётом;
- assumptions = только реальные предположения/неопределённости;
- preparation = последовательные практические шаги приготовления;
- menu = максимум 3 варианта, связанные с увиденным;
- shoppingList = конкретные ориентировочные количества на указанное число гостей;
- safety = только релевантные практические меры;
- не повторяй одинаковые пункты;
- не смешивай русский с английским/испанским;
- не выдавай рекомендации за визуальные факты;
- не придумывай точный состав, марку, вид мяса, наличие сахара/масла/аллергенов, если vision этого не подтверждает;
- если продукт определён неуверенно, используй «вероятно», «похоже на», «точно определить по фото нельзя»;
- никогда не заявляй, что заказ, оплата или бронирование реально выполнены;
- не выдавай медицинские рекомендации.

Перед финальным JSON мысленно проверь дубли, язык, соответствие наблюдений vision-отчёту и логичность количества продуктов.`;

const schemaHint = `Верни ТОЛЬКО валидный JSON без markdown и без пояснений вокруг него:
{
  "headline": "короткий русский заголовок",
  "confidenceNote": "что удалось определить уверенно и где остаётся неопределённость",
  "observation": ["3-7 уникальных конкретных наблюдений"],
  "assumptions": ["0-5 уникальных предположений"],
  "preparation": ["3-8 последовательных шагов"],
  "menu": [{"name":"название","why":"почему подходит","timeMinutes":30}],
  "shoppingList": [{"item":"продукт","quantity":"ориентировочное количество","priority":"важно/обычно"}],
  "safety": ["1-4 релевантных меры"]
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
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function uniqueStrings(value, maxItems) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const result = [];
  for (const raw of value) {
    const text = String(raw ?? '').replace(/\s+/g, ' ').trim();
    if (!text) continue;
    const key = text.toLocaleLowerCase('ru-RU').replace(/[.!?,;:]+$/g, '');
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(text);
    if (result.length >= maxItems) break;
  }
  return result;
}

function normalizeAnalysis(raw, visionText) {
  const fallbackObservation = String(visionText || '')
    .split('\n')
    .map(line => line.replace(/^\s*(?:\d+[.)-]?|[-*])\s*/, '').trim())
    .filter(line => line && !/^(ОБЪЕКТЫ|КОМПОЗИЦИЯ|НЕУВЕРЕННОСТЬ)\s*:?$/i.test(line))
    .slice(0, 6);

  const menu = Array.isArray(raw?.menu)
    ? raw.menu.slice(0, 3).map(item => ({
        name: String(item?.name || '').trim(),
        why: String(item?.why || '').trim(),
        timeMinutes: Math.max(1, Number(item?.timeMinutes) || 30),
      })).filter(item => item.name && item.why)
    : [];

  const shoppingList = Array.isArray(raw?.shoppingList)
    ? raw.shoppingList.slice(0, 20).map(item => ({
        item: String(item?.item || '').trim(),
        quantity: String(item?.quantity || '').trim(),
        priority: String(item?.priority || 'обычно').trim(),
      })).filter(item => item.item && item.quantity)
    : [];

  return {
    headline: String(raw?.headline || 'Разбор идеи блюда').trim(),
    confidenceNote: String(raw?.confidenceNote || 'Часть ингредиентов определена по внешнему виду; точный состав следует проверять отдельно.').trim(),
    observation: uniqueStrings(raw?.observation, 7).length ? uniqueStrings(raw?.observation, 7) : fallbackObservation,
    assumptions: uniqueStrings(raw?.assumptions, 5),
    preparation: uniqueStrings(raw?.preparation, 8),
    menu,
    shoppingList,
    safety: uniqueStrings(raw?.safety, 4),
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

    upsertStep(requestId, 'server-vision-model', 'Выбор vision-модели', 'done', `${VISION_MODEL} · только визуальное наблюдение`);
    upsertStep(requestId, 'server-vision', 'Vision extraction в Ollama', 'running', `${VISION_MODEL} описывает только видимые объекты`);
    const visionText = await ollamaChat({
      model: VISION_MODEL,
      temperature: 0.05,
      messages: [
        { role: 'system', content: visionSystem },
        {
          role: 'user',
          content: 'Проанализируй фотографию как визуальный инспектор. Не составляй рецепт и не используй знания о запросе пользователя для дорисовывания деталей.',
          images: [body.image.data],
        },
      ],
    });
    upsertStep(requestId, 'server-vision', 'Vision extraction в Ollama', 'done', 'Фактическое визуальное описание получено');

    upsertStep(requestId, 'server-rag', 'RAG grounding', 'running', 'Подбор правил интерпретации еды и контроля уверенности');
    const ragText = FOOD_VISION_RAG || 'RAG-пакет недоступен. Не выдумывай невидимые ингредиенты, разделяй факты и предположения, удаляй дубли.';
    upsertStep(requestId, 'server-rag', 'RAG grounding', 'done', FOOD_VISION_RAG ? `Food Vision KB · ${FOOD_VISION_RAG.length} символов` : 'Fallback rules');

    upsertStep(requestId, 'server-reasoning-model', 'Выбор аналитической модели', 'done', `${REASONING_MODEL} · структуризация + RAG`);
    upsertStep(requestId, 'server-reasoning', 'Grounded reasoning в Ollama', 'running', `${REASONING_MODEL} связывает vision-отчёт, RAG и запрос пользователя`);

    const analystPrompt = `VISION-ОТЧЁТ:\n${visionText}\n\nRAG-БАЗА:\n${ragText}\n\nПРОФИЛЬ:\nребёнок: ${profile.childAge ?? 8} лет\nгостей: ${profile.guests ?? 10}\nбюджет: ${profile.budget ?? 15000} ₽\nобраз жизни: ${profile.lifestyle ?? 'не указан'}\nаллергии/ограничения: ${profile.allergies ?? 'не указаны'}\nрежим: ${modeLabel}\n\nЗАПРОС ПОЛЬЗОВАТЕЛЯ:\n${body.prompt.trim()}\n\n${schemaHint}`;

    const structuredText = await ollamaChat({
      model: REASONING_MODEL,
      format: 'json',
      temperature: 0.12,
      messages: [
        { role: 'system', content: analystSystem },
        { role: 'user', content: analystPrompt },
      ],
    });
    upsertStep(requestId, 'server-reasoning', 'Grounded reasoning в Ollama', 'done', 'Структурированный аналитический ответ получен');

    upsertStep(requestId, 'server-parse', 'Контроль и нормализация ответа', 'running', 'JSON, дедупликация, ограничения количества пунктов');
    const parsed = parseModelJson(structuredText);
    if (!parsed) throw new Error('Аналитическая модель вернула невалидный JSON. Повторите анализ.');
    const analysis = normalizeAnalysis(parsed, visionText);
    upsertStep(requestId, 'server-parse', 'Контроль и нормализация ответа', 'done', 'Дубли удалены, структура готова для интерфейса');

    upsertStep(requestId, 'server-complete', 'Завершение агентного прохода', 'done', `Vision: ${VISION_MODEL} → Analyst: ${REASONING_MODEL} → RAG`);
    finishTrace(requestId);
    return {
      analysis,
      latencyMs: Date.now() - started,
      engine: `SONYA Local · ${VISION_MODEL} → ${REASONING_MODEL} + RAG`,
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
      ollama: OLLAMA_BASE_URL,
    });
  }
  if (req.method === 'GET' && url.pathname === '/api/trace') {
    const requestId = url.searchParams.get('requestId') || '';
    return json(res, 200, traceView(requestId));
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
  console.log(`SONYA local API: http://127.0.0.1:${PORT}`);
  console.log(`Vision: ${VISION_MODEL}`);
  console.log(`Analyst: ${REASONING_MODEL}`);
  console.log(`RAG: ${FOOD_VISION_RAG ? 'loaded' : 'fallback'} · ${FOOD_VISION_RAG.length} chars`);
  console.log(`Ollama: ${OLLAMA_BASE_URL}`);
  console.log('Agent trace: GET /api/trace?requestId=<id>');
});
