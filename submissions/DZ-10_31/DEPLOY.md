# 🚀 Публикация ДЗ-10_31

Ветка публикации: `dz10_31`.

Корень приложения:

`DZ_10_API_logic_assistant_deploy/WILD_IDEAS`

## Контейнерный хостинг

В приложении есть `Dockerfile`. Контейнер собирает `vinext`, затем запускает сгенерированный Cloudflare Worker через `wrangler dev` на внешнем интерфейсе.

Рекомендуемые параметры сервиса:

- repository: `VictorKVS/Vibe-coding`;
- branch: `dz10_31`;
- root directory: `DZ_10_API_logic_assistant_deploy/WILD_IDEAS`;
- Dockerfile: `Dockerfile`;
- port: `8080`;
- health check: `/api/health`.

## Переменные окружения

Минимально приложение работает без внешнего LLM благодаря `DEMO` fallback.

Для реальной OpenAI-модели задайте на хостинге секреты, не в Git:

```env
OPENAI_API_KEY=...
OPENAI_MODELS=<разрешённые модели через запятую>
```

Для OpenAI-compatible gateway:

```env
COMPATIBLE_BASE_URL=...
COMPATIBLE_API_KEY=...
COMPATIBLE_MODELS=...
COMPATIBLE_LABEL=...
```

Для удалённой Ollama:

```env
OLLAMA_BASE_URL=...
OLLAMA_MODELS=...
```

Локальный `127.0.0.1:11434` на облачном хостинге указывает на сам контейнер, поэтому локальную Ollama с домашнего ПК так подключить нельзя без отдельного доступного endpoint/VPN/tunnel.

## Проверка после публикации

1. Открыть `/api/health` — должно быть `ok: true`.
2. Открыть главную страницу и проверить favicon.
3. Начать диалог с Алиной.
4. Проверить модель `DEMO` без ключей или выбранный провайдер с секретами.
5. Пройти `Research → Story DNA → Мир → Герои`.
6. Перезагрузить страницу и проверить Project Memory.
7. После успешной проверки вставить публичный URL в `submissions/DZ-10_31/README.md`.

## Видео

После успешной публикации записать маршрут из `demo/RECORDING_SCRIPT.md` и сохранить MP4 как:

`submissions/DZ-10_31/demo/DZ10_31_WILD_IDEAS.mp4`
