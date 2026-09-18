# DZ-18 — FATHER Content Generator

Статус: `ARCHITECTURE SPLIT STARTED / BUILD BASELINE NEXT`

## Цель

Собрать рабочее и публикуемое ДЗ PRO AI «Интеграция с внешними сервисами» как отдельный модуль **FATHER Content Generator**.

ALINA Analyst и FATHER Content Generator — разные bounded contexts:

```text
ALINA Analyst
  research / RAG / graph / reports
        |
        | verified ResearchPacket
        v
shared/contracts
        |
        | ContentBrief
        v
FATHER Content Generator
  personas / scenes / storyboard / images / audio / avatars / video / providers
```

Content Generator не перепроверяет и не меняет фактическую основу самостоятельно. Если данных недостаточно или обнаружен конфликт, он возвращает состояние `NEED_RESEARCH`, `CONFLICT_FOUND`, `MISSING_FACT` или `SOURCE_REQUIRED`.

## Кодовая граница DZ-18

```text
src/
├── content_generator/
│   ├── briefs/
│   ├── personas/
│   ├── scenes/
│   ├── storyboard/
│   └── providers/
└── shared/
    └── contracts/
```

ALINA Analyst не переносится внутрь DZ-18. Связь с ней идёт только через версионированные контракты.

## Продуктовые разделы

- Рассылки
- Подкасты
- Видео-аватар
- Комикс / Storyboard
- Настройки / диагностика

## Persona / Scene Engine

Сохраняется спроектированный ранее подход:
- reference personas F-01 и M-01;
- data-driven age presets;
- emotion switching;
- wardrobe/background/props;
- Scene Registry;
- provider abstraction;
- частичная регенерация кадра без переписывания всей истории.

Подробности: `PERSONA_ENGINE_MVP.md`.

## External services

Первый обязательный provider integration:
- HeyGen или совместимый AvatarProvider;
- server-side API key;
- реальные API lists для avatars и voices;
- нормализованные DTO;
- timeout/error handling;
- явный demo/mock mode только как fallback.

## Фазы

### Phase A — Architecture split
- [x] отделить ALINA Analyst от Content Generator концептуально;
- [x] завести отдельную ветку `feature/dz18-father-content-generator`;
- [x] создать кодовые namespaces;
- [x] ввести ResearchPacket / ContentBrief boundary;
- [ ] выбрать web runtime и поднять application shell.

### Phase B — Submission baseline
- [ ] Newsletter;
- [ ] Podcast;
- [ ] Video Avatar real API lists;
- [ ] Comic / Storyboard;
- [ ] versioned prompts;
- [ ] .env.example;
- [ ] tests;
- [ ] publish;
- [ ] screenshots and evidence matrix.

### Phase C — Polish
- consistency benchmark;
- emotion/pose sheets;
- provider comparison;
- richer persona continuity;
- video/TTS/lip-sync;
- extraction into reusable FATHER service.

## Definition of Done

ДЗ готово к сдаче, когда опубликованный UI работает, внешняя API-интеграция подтверждена, секреты не попадают в клиент/Git, все обязательные разделы проходят smoke test, а README содержит запуск, demo-flow и evidence matrix.
