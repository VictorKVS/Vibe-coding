import http from 'node:http';

const PORT = Number(process.env.SONYA_LOCAL_API_PORT || 8787);
const OLLAMA_BASE_URL = process.env.SONYA_OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const VISION_MODEL = process.env.SONYA_VISION_MODEL || 'llava:7b';

const system = `Ты СОНЯ — домашний AI-управляющий. Отвечай по-русски. Помогай семье с бытом, покупками, праздниками и питанием. При анализе изображения строго разделяй наблюдение и предположения. Не заявляй, что заказ, оплата или бронирование реально выполнены. Для детского праздника учитывай возраст, число гостей, бюджет, ограничения и безопасность. Не выдавай медицинские рекомендации. Если точный ингредиент по фото определить нельзя — скажи об этом прямо.`;

const schemaHint = `Верни ТОЛЬКО JSON без markdown в формате:
{
  "headline": "string",
  "confidenceNote": "string",
  "observation": ["string"],
  "assumptions": ["string"],
  "preparation": ["string"],
  "menu": [{"name":"string","why":"string","timeMinutes":30}],
  "shoppingList": [{"item":"string","quantity":"string","priority":"string"}],
  "safety": ["string"]
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
      try { return JSON.parse(cleaned.slice(start, end + 1)); } catch { /* fallback below */ }
    }
    return {
      headline: 'Ответ локальной SONYA Vision',
      confidenceNote: 'Локальная модель вернула свободный текст; проверьте вывод вручную.',
      observation: [cleaned || 'Модель не вернула текст.'],
      assumptions: [],
      preparation: [],
      menu: [],
      shoppingList: [],
      safety: ['Если результат неоднозначен, повторите анализ с более чёткой фотографией.'],
    };
  }
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

    upsertStep(requestId, 'server-context', 'Сбор контекста задачи', 'running', 'Семья, событие, режим анализа');
    const profile = body.profile || {};
    const modeText = body.mode === 'fridge'
      ? 'Фото холодильника/продуктов: распознай видимые продукты, предложи варианты блюд и недостающие покупки.'
      : 'Фото готового блюда/сервировки/идеи: определи видимые элементы, вероятный состав, приготовление и закупку.';
    const prompt = `${modeText}\n\nПрофиль: ребёнок ${profile.childAge ?? 8} лет; гостей ${profile.guests ?? 10}; бюджет ${profile.budget ?? 15000} ₽; образ жизни: ${profile.lifestyle ?? 'не указан'}; ограничения: ${profile.allergies ?? 'не указаны'}.\n\nЗапрос пользователя: ${body.prompt.trim()}\n\n${schemaHint}`;
    upsertStep(requestId, 'server-context', 'Сбор контекста задачи', 'done', `Режим: ${body.mode === 'fridge' ? 'холодильник' : 'референс блюда'} · гостей: ${profile.guests ?? 10}`);

    upsertStep(requestId, 'server-model', 'Выбор мультимодальной модели', 'done', `${VISION_MODEL} · ${OLLAMA_BASE_URL}`);

    upsertStep(requestId, 'server-ollama', 'Vision inference в Ollama', 'running', `Модель ${VISION_MODEL} анализирует изображение и запрос`);
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: VISION_MODEL,
        stream: false,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt, images: [body.image.data] },
        ],
        options: { temperature: 0.2 },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Ollama ${response.status}: ${text.slice(0, 300)}`);
    }
    upsertStep(requestId, 'server-ollama', 'Vision inference в Ollama', 'done', 'Мультимодальный ответ модели получен');

    upsertStep(requestId, 'server-parse', 'Разбор структурированного ответа', 'running', 'JSON → наблюдения, гипотезы, меню и покупки');
    const payload = await response.json();
    const analysis = parseModelJson(payload?.message?.content || payload?.response || '');
    upsertStep(requestId, 'server-parse', 'Разбор структурированного ответа', 'done', 'Результат нормализован для интерфейса');

    upsertStep(requestId, 'server-complete', 'Завершение агентного прохода', 'done', `Общее время backend: ${Date.now() - started} мс`);
    finishTrace(requestId);
    return { analysis, latencyMs: Date.now() - started, engine: `SONYA Local · ${VISION_MODEL}`, trace: traceView(requestId) };
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
    return json(res, 200, { ok: true, model: VISION_MODEL, ollama: OLLAMA_BASE_URL });
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
  console.log(`Ollama: ${OLLAMA_BASE_URL} · model: ${VISION_MODEL}`);
  console.log('Agent trace: GET /api/trace?requestId=<id>');
});
