# SONYA app · ДЗ-17

Рабочий MVP домашнего AI-управляющего для мультимодального задания.

## Уже реализовано

- Next.js/React UI в синей glassmorphism-стилистике;
- анимированная Соня без тяжёлого animation runtime;
- сценарий «Детский праздник»;
- семейный/event profile: возраст, гости, бюджет, образ жизни, ограничения;
- загрузка JPG/PNG/WEBP до 5 МБ;
- обязательный текстовый запрос;
- совместная отправка `image + text + profile`;
- server-side `/api/analyze`;
- OpenAI-compatible vision gateway для локального `llama.cpp`;
- честный DEMO fallback: не имитирует pixel-level анализ;
- model trace + latency для реального provider;
- чек-лист подготовки события;
- адаптивный интерфейс.

## Запуск

```powershell
cd "G:\1\Vibe coding\Vibe-coding\DZ_17\SONYA_HOME_MANAGER\app"
Copy-Item .env.example .env.local
npm install
npm run dev
```

Открыть `http://localhost:3000`.

## Реальный vision через llama.cpp

В `.env.local`:

```env
SONYA_PROVIDER=compatible
SONYA_LLM_BASE_URL=http://127.0.0.1:8080/v1
SONYA_VISION_MODEL=<exact model id from /v1/models>
SONYA_LLM_API_KEY=local-no-key
```

Vision model должна реально поддерживать изображения. Плановый baseline — Qwen2.5-VL 7B class в Q4-профиле, если он стабильно работает на текущем runtime/GPU.

## DEMO режим

```env
SONYA_PROVIDER=demo
```

Он нужен только для проверки UI. В ответе явно написано, что пиксели изображения не анализировались, поэтому такой прогон **не считается** финальным доказательством мультимодальности ДЗ-17.

## Что требуется до сдачи

1. `npm run build`;
2. запустить реальную vision-модель;
3. загрузить тестовое фото;
4. выполнить совместный `image + text` анализ;
5. убедиться, что результат отделяет наблюдение от предположений;
6. сделать скриншот с фото, запросом, ответом и model trace;
7. развернуть публичную версию;
8. проверить публичный доступ без аккаунта владельца.

Не хранить GGUF, runtime binaries, `.env.local` и реальные секреты в Git.
