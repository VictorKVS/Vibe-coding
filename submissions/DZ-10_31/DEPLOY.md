# Публикация ДЗ-10_31 / интегрированная Алина

Исходная параллельная ветка: `dz10_31`.

Текущий интегрированный контур: `feature/alina-agent-zoo-rag`.

Корень приложения: `DZ_10_API_logic_assistant_deploy/WILD_IDEAS`.

## Контейнерный хостинг

В приложении есть `Dockerfile` и `/api/health`.

Рекомендуемые параметры сервиса: repository `VictorKVS/Vibe-coding`; branch `feature/alina-agent-zoo-rag` до финального merge; root directory `DZ_10_API_logic_assistant_deploy/WILD_IDEAS`; port `8080`; health check `/api/health`.

## Провайдеры моделей

Поддержаны OpenAI, OpenAI-compatible gateway, Ollama/локальные модели, GigaChat через server-side OAuth и DEMO fallback.

Секреты задаются только через локальные переменные окружения или secrets хостинга и не должны попадать в GitHub/Quest run artifacts.

## Локальная Ollama и облачный контейнер

`127.0.0.1:11434` внутри облачного контейнера указывает на сам контейнер, а не на домашний ПК. Для удалённого использования локальной модели нужен отдельно доступный endpoint, VPN/tunnel либо запуск всего приложения рядом с Ollama.

## Проверка после публикации

1. Открыть `/api/health` — `ok: true`.
2. Проверить `/api/llm` и каталог моделей.
3. Проверить `/api/zoo`.
4. Открыть `/model-lab`.
5. Выполнить минимум один `ZM0` Quest Arena run.
6. Проверить Project Memory после reload.
7. Только после этого переходить к ZM1/ZM2 экспериментам с реальными моделями.
