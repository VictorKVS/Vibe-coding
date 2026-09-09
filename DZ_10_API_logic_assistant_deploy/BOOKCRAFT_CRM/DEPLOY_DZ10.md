# ДЗ-10 Lite — публичный деплой BOOKCRAFT ONE

Статус: конфигурация подготовлена; публичный адрес нужно получить после успешного деплоя.

## Render Web Service

Источник: https://github.com/VictorKVS/Vibe-coding

| Поле | Значение |
|---|---|
| Branch | `codex/universal-bot-crm` |
| Root Directory | `DZ_9_BOOKCRAFT_ONE` |
| Language | Node |
| Build Command | `npm ci --omit=dev` |
| Start Command | `node server.cjs` |
| Instance Type | Free |
| Environment | `CLOUD_MODE=true`, `NODE_VERSION=24` |
| Health Check | `/api/health` |

Либо используйте Blueprint с путём `DZ_9_BOOKCRAFT_ONE/render.yaml`.

Сервер слушает `0.0.0.0` и порт `PORT`, предоставленный Render. Секреты для этого демонстрационного режима не требуются.

## Что доступно

- `/` — интерфейс CRM: профили, текстовый бот, заявки, история, каталог.
- `/api/health` — JSON с состоянием сервера.
- `/api/catalog` — серверный JSON-каталог шести профилей и демонстрационных услуг.

Данные пользователя сохраняются в браузере. Реального бронирования нет. Whisper, Ollama и внешний Telegram в облачном демо не подключены; компьютер автора для работы текстовой CRM не нужен.

## Проверка перед сдачей

После статуса Live открыть выданный Render HTTPS-адрес в отдельном браузере. Проверить страницу, текстовый диалог, создание демо-заявки и оба API. В ответ на ДЗ отправить именно адрес приложения, не ссылку на GitHub или панель Render.

[Официальная инструкция Render](https://render.com/docs/deploy-node-express-app)
