# 2026-09-13 — GigaChat как основной облачный провайдер ALINA

## TASK

Перевести стандартную маршрутизацию ALINA с общего списка внешних провайдеров на схему, где основным облачным провайдером является GigaChat, а OpenAI остаётся только опциональной интеграцией.

## ORIGIN_CLASS

`HUMAN_DECISION` — пользователь явно выбрал GigaChat вместо OpenAI для стандартной эксплуатации ALINA.

## WHAT CHANGED

Изменён шаблон конфигурации `DZ_17/app/.env.example`:

```text
ALINA_PROVIDER_ORDER=llamacpp,gigachat,demo
```

OpenAI, OpenAI-compatible и Ollama сохранены как поддерживаемые, но исключены из AUTO-routing по умолчанию. Они могут быть включены только явным добавлением provider id в `ALINA_PROVIDER_ORDER`.

GigaChat помечен как PRIMARY CLOUD PROVIDER. Серверный adapter уже существовал и использует `GIGACHAT_AUTH_KEY`, самостоятельно получает и обновляет короткоживущий access token и динамически обнаруживает доступные модели через `/v1/models`.

## WHY

Нужно исключить случайный выбор OpenAI в стандартном маршруте и сделать эксплуатационную конфигурацию однозначной:

```text
LOCAL llama.cpp
→ GigaChat
→ DEMO fallback
```

## PHYSICAL PATHS

Изменён:

```text
DZ_17/app/.env.example
```

Связанные существующие компоненты:

```text
DZ_17/app/app/api/llm/route.ts
DZ_17/app/app/admin-security-console.tsx
DZ_17/app/lib/runtime-policy.ts
```

## SECURITY

- `GIGACHAT_AUTH_KEY` хранится только в `.env.local`;
- `.env.local` исключён из Git;
- access token не вводится пользователем и не хранится в UI;
- secret values не возвращаются через admin API;
- выбор провайдера и runtime policy остаются раздельными слоями.

## VALIDATION

После локального обновления пользователь должен:

1. добавить `GIGACHAT_AUTH_KEY` в `DZ_17/app/.env.local`;
2. установить `ALINA_PROVIDER_ORDER=llamacpp,gigachat,demo`;
3. перезапустить `npm run dev:models`;
4. открыть `SYS → Модели`;
5. проверить, что GigaChat обнаружен как READY и входит в routing раньше DEMO;
6. выполнить текстовый запрос и проверить `provider/model` в LLM Gateway trace.

## COMMIT

```text
96702ed93fa6e8f812ecf443e97e59a3c34d9249
```
