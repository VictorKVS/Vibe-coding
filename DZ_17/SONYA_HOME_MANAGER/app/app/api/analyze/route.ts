import { NextResponse } from 'next/server';

const SYSTEM_PROMPT = `Ты СОНЯ — домашний AI-управляющий. Ты помогаешь семье планировать быт, покупки, праздники и питание.

Для любого мультимодального анализа изображения всегда разделяй:
1) НАБЛЮДЕНИЕ — только то, что действительно видно на изображении;
2) ПРЕДПОЛОЖЕНИЯ — неуверенные распознавания, вероятный состав или назначение;
3) ПРАКТИЧЕСКИЕ ДЕЙСТВИЯ — рецепт, меню, покупки, подготовка или другой полезный следующий шаг.

Поддерживай два режима:
- fridge: фото холодильника/продуктов → распознать продукты → предложить блюда → определить, чего не хватает → сформировать покупки;
- inspiration: фото готового блюда/сервировки/идеи → понять, что изображено → восстановить вероятный состав → объяснить, как приготовить → рассчитать на гостей → сформировать покупки.

Для детского праздника учитывай безопасность, возраст детей, количество гостей, бюджет, время, аллергию и предпочтения. Не выдавай медицинские рекомендации. Не утверждай, что оплатил, заказал, купил или забронировал что-либо, если реального действия не было. Если состав блюда невозможно определить по фото надёжно, явно скажи об этом и предложи безопасные варианты.`;

type PhotoMode = 'fridge' | 'inspiration';

type AnalyzeBody = {
  prompt?: string;
  photoMode?: PhotoMode;
  imageDataUrl?: string | null;
  profile?: {
    childAge?: number;
    guests?: number;
    budget?: number;
    lifestyle?: string;
    allergies?: string;
  };
};

function demoAnswer(body: AnalyzeBody) {
  const age = body.profile?.childAge ?? 8;
  const guests = body.profile?.guests ?? 10;
  const budget = body.profile?.budget ?? 15000;
  const mode = body.photoMode === 'fridge' ? '«Что у меня есть»' : '«Хочу такое»';
  const next = body.photoMode === 'fridge'
    ? 'распознает продукты, предложит 3 блюда и сформирует недостающие покупки'
    : 'разберет готовое блюдо/идею, предложит способ приготовления, рассчитает продукты на гостей и сформирует покупки';

  return `DEMO-режим: изображение не анализировалось пиксельно.\n\nВыбран режим: ${mode}.\nСценарий: детский праздник, ребёнку ${age} лет, гостей: ${guests}, бюджет: ${budget.toLocaleString('ru-RU')} ₽.\n\nПосле подключения реальной vision-модели Соня ${next}.\n\nФинальный ответ будет разделён на:\n1. Что видно точно.\n2. Что является предположением.\n3. Как приготовить / что сделать.\n4. Расчёт на ${guests} гостей.\n5. Что уже есть и что нужно купить.\n6. Безопасные замены с учётом ограничений.\n\nДля финального скриншота ДЗ нужен не DEMO, а реальный image+text прогон.`;
}

function stripDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:image\/[A-Za-z0-9.+-]+;base64,(.+)$/s);
  return match?.[1] || dataUrl;
}

function buildUserText(body: AnalyzeBody, prompt: string) {
  return `Режим анализа фото: ${body.photoMode || 'inspiration'}\nПрофиль семьи/события: ${JSON.stringify(body.profile || {})}\n\nЗадача пользователя: ${prompt}`;
}

async function runOllama(body: AnalyzeBody, prompt: string) {
  const baseUrl = (process.env.SONYA_OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');
  const model = process.env.SONYA_VISION_MODEL || 'qwen2.5vl:7b';
  const started = Date.now();

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      options: { temperature: 0.25 },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: buildUserText(body, prompt),
          images: [stripDataUrl(body.imageDataUrl!)]
        }
      ]
    }),
    cache: 'no-store'
  });

  if (!response.ok) {
    const details = await response.text();
    return NextResponse.json({ error: `Ollama vision error ${response.status}`, details: details.slice(0, 900) }, { status: 502 });
  }

  const data = await response.json();
  const text = data?.message?.content;
  if (!text) {
    return NextResponse.json({ error: 'Ollama вернул пустой ответ.' }, { status: 502 });
  }

  return NextResponse.json({
    provider: 'ollama',
    model,
    latencyMs: Date.now() - started,
    text
  });
}

async function runCompatible(body: AnalyzeBody, prompt: string) {
  const baseUrl = process.env.SONYA_LLM_BASE_URL;
  const model = process.env.SONYA_VISION_MODEL;
  if (!baseUrl || !model) {
    return NextResponse.json({ error: 'Не настроены SONYA_LLM_BASE_URL / SONYA_VISION_MODEL.' }, { status: 500 });
  }

  const apiKey = process.env.SONYA_LLM_API_KEY || 'local-no-key';
  const started = Date.now();
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.25,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: buildUserText(body, prompt) },
            { type: 'image_url', image_url: { url: body.imageDataUrl } }
          ]
        }
      ]
    }),
    cache: 'no-store'
  });

  if (!response.ok) {
    const details = await response.text();
    return NextResponse.json({ error: `Vision provider error ${response.status}`, details: details.slice(0, 900) }, { status: 502 });
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    return NextResponse.json({ error: 'Модель вернула пустой ответ.' }, { status: 502 });
  }

  return NextResponse.json({
    provider: 'compatible',
    model,
    latencyMs: Date.now() - started,
    text
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnalyzeBody;
    const prompt = body.prompt?.trim();
    if (!prompt) {
      return NextResponse.json({ error: 'Введите текстовый запрос.' }, { status: 400 });
    }

    const provider = (process.env.SONYA_PROVIDER || 'demo').toLowerCase();
    if (provider === 'demo') {
      return NextResponse.json({ provider: 'demo', model: 'demo', text: demoAnswer(body) });
    }

    if (!body.imageDataUrl) {
      return NextResponse.json({ error: 'Для мультимодального теста загрузите изображение.' }, { status: 400 });
    }

    if (provider === 'ollama') {
      return runOllama(body, prompt);
    }

    if (provider === 'compatible') {
      return runCompatible(body, prompt);
    }

    return NextResponse.json({ error: `Неизвестный SONYA_PROVIDER: ${provider}` }, { status: 500 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Неизвестная ошибка' }, { status: 500 });
  }
}
