import { NextResponse } from 'next/server';

const SYSTEM_PROMPT = `Ты СОНЯ — домашний AI-управляющий. Ты помогаешь семье планировать быт, покупки, праздники и питание. Для мультимодального анализа всегда разделяй: 1) что видно на изображении; 2) что является предположением; 3) практические действия. Для детского праздника учитывай безопасность, возраст детей, бюджет, время, аллергию и предпочтения. Не утверждай, что оплатил, заказал или забронировал что-либо, если реального действия не было.`;

type AnalyzeBody = {
  prompt?: string;
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
  return `DEMO-режим: изображение не анализировалось пиксельно.\n\nСценарий: детский праздник, ребёнку ${age} лет, гостей: ${guests}, бюджет: ${budget.toLocaleString('ru-RU')} ₽.\n\nЧто сделает реальная vision-модель:\n1. Выделит продукты и предметы, которые действительно видны на фото.\n2. Отдельно отметит неуверенные распознавания и предположения.\n3. Сопоставит имеющиеся продукты с меню праздника.\n4. Предложит 3 варианта меню с учётом возраста, образа жизни и ограничений.\n5. Сформирует список недостающих покупок и задачи по подготовке.\n\nПодключите SONYA_PROVIDER=compatible и локальный llama.cpp/Qwen2.5-VL для реального image+text анализа.`;
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
        temperature: 0.3,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: `Профиль семьи: ${JSON.stringify(body.profile || {})}\n\nЗадача: ${prompt}` },
              { type: 'image_url', image_url: { url: body.imageDataUrl } }
            ]
          }
        ]
      }),
      cache: 'no-store'
    });

    if (!response.ok) {
      const details = await response.text();
      return NextResponse.json({ error: `Vision provider error ${response.status}`, details: details.slice(0, 600) }, { status: 502 });
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) {
      return NextResponse.json({ error: 'Модель вернула пустой ответ.' }, { status: 502 });
    }

    return NextResponse.json({
      provider,
      model,
      latencyMs: Date.now() - started,
      text
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Неизвестная ошибка' }, { status: 500 });
  }
}
