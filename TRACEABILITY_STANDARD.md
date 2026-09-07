# Traceability & Runtime Observability Standard

Стандарт обязателен для всех проектов пользователя, где есть локальные/внешние модели, фоновые сервисы, автоматизация или долгие операции.

## 1. Источник истины

Каждый runtime пишет append-only JSONL-журнал. Минимальная запись:

```json
{
  "timestamp": "ISO-8601 UTC",
  "run_id": "startup/session id",
  "request_id": "correlation id",
  "component": "router|gateway|ui|stt|image|launcher",
  "event": "llm.model.load.start",
  "status": "optional state",
  "duration_ms": 0
}
```

Секреты, API-ключи, токены, пароли, рукописи, промпты и ПДн в trace не пишутся.

## 2. Обязательные события моделей

Для локальных моделей минимум:

- `llm.switch.request` — пользователь/Router запросил смену;
- `llm.model.unload` — старая модель выгружена;
- `llm.model.load.start` — начата загрузка новой;
- `llm.model.load.finish` — модель поднята;
- `llm.switch.ready` — выбранная модель стала активной;
- `llm.switch.error` — ручная смена не удалась;
- `llm.route` — AUTO выбрал модель и зафиксировал причину;
- `llm.route.quarantine` — нерабочая модель временно исключена;
- `llm.route.fallback` — AUTO перешёл на следующего кандидата;
- `llm.forward.finish/error` — inference завершён/упал.

Для внешних агентов минимум:

- `ui.agent.control.click` / `ui.agent.external.select` — выбран провайдер/пресет;
- `agent.external.connect.start`;
- `agent.external.connect.ready/error`;
- endpoint, protocol и model id можно писать; ключи/токены нельзя.

## 3. Обязательный Live Trace UI

В каждом интерактивном проекте должна быть сворачиваемая панель `TRACE`, которая показывает:

1. здоровье gateway/backend;
2. здоровье model server;
3. какая модель реально находится в памяти;
4. какая модель выбрана пользователем;
5. текущую операцию (`LOADING`, `UNLOADING`, `INFERENCE`, `IDLE`);
6. последние lifecycle-события;
7. понятную причину ошибки;
8. детектор зависшей операции по отсутствию terminal-event;
9. скачивание snapshot/trace JSON.

Панель не должна перекрывать основной интерфейс: по умолчанию это компактная кнопка, drawer открывается по нажатию или автоматически при ошибке.

## 4. Корреляция

Одна операция должна сохранять один `request_id` через UI → gateway → router → model server proxy → ответ. Это позволяет восстановить цепочку без догадок.

## 5. Долгие операции

Для операции дольше 3 секунд UI показывает elapsed time. Для каждого `*.start` должен существовать terminal-event (`*.finish`, `*.ready`, `*.error`, `*.cancelled`). Если terminal-event отсутствует дольше установленного timeout, Live Trace помечает операцию как `POSSIBLY STUCK`.

## 6. Хранение

- runtime JSONL — append-only;
- браузерная диагностика — вспомогательная, не источник истины;
- ротация допустима по дате/размеру;
- журнал должен переживать падение UI и позволять анализ после перезапуска.

## 7. Acceptance gate

CI проекта должен проверять наличие:

- trace writer;
- recent-trace API или эквивалента;
- lifecycle events;
- correlation id;
- live viewer для GUI-проектов;
- secret redaction;
- теста на ошибку/timeout/fallback.

## 8. BOOK.CRAFT reference implementation

BOOK.CRAFT является эталонной реализацией стандарта в текущем репозитории. Новые проекты должны переиспользовать схему событий и UX Live Trace, а существующие — переводиться на неё по мере доработки.
