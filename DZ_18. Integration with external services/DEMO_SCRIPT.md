# DZ-18 — Demo Script

## Цель демонстрации

За 5–7 минут показать, что FATHER Content Generator:

1. использует собственную архитектуру и системные промпты;
2. интегрируется с внешними сервисами через backend;
3. не раскрывает API keys браузеру;
4. умеет генерировать текст, речь и avatar video;
5. содержит дополнительный Persona / Storyboard модуль.

## Перед записью

```powershell
cd "G:\1\Vibe coding\Vibe-coding-router\DZ_18. Integration with external services"
.\CHECK_DZ18.cmd
.\START_DZ18.cmd
```

Открыть:

```text
http://localhost:5188
```

## Сцена 1 — Diagnostics

Открыть «Диагностика».

Показать:
- HeyGen v3 = configured;
- OpenAI Responses = configured;
- OpenAI TTS = configured;
- Provider tests = ready;
- Production image = ready.

Важно: API keys на экране отсутствуют.

## Сцена 2 — Рассылки

Тема:

```text
Запуск FATHER Content Generator
```

Аудитория:

```text
Специалисты по ИИ и разработчики
```

Тон:

```text
Профессиональный
```

Нажать «Сгенерировать рассылку».

Показать:
- Subject;
- Preheader;
- Body;
- CTA;
- Image brief;
- provider/model/prompt version.

## Сцена 3 — Подкасты

Тема:

```text
Как аналитический материал превращается в проверенный медиаконтент
```

Длительность: 3 минуты.

Сгенерировать сценарий.

Показать:
- title;
- hook;
- outline;
- script;
- voice direction.

Выбрать `marin` или `cedar`.

Нажать «Озвучить сценарий».

Запустить MP3 и показать маркировку:

```text
AI-generated voice
```

## Сцена 4 — Video Avatar

Нажать:

```text
Загрузить avatars + voices
```

Показать реальные списки HeyGen.

Выбрать avatar и voice.

Script:

```text
Здравствуйте! Это демонстрация внешней интеграции FATHER Content Generator. Персонаж и голос загружены через HeyGen API, а генерация выполняется серверным адаптером без передачи API-ключа в браузер.
```

Orientation: landscape.

Нажать «Сгенерировать видео».

Показать:
- session id;
- status;
- video id;
- completed;
- MP4 preview.

Если job ещё выполняется — показать polling и кнопку «Проверить статус».

## Сцена 5 — Comic / Storyboard

Выбрать F-01.

Тема:

```text
История создания классической скрипки
```

Показать 6 кадров:
- разные emotions;
- environment;
- wardrobe;
- pose.

Затем переключить на M-01 и показать, что используется тот же engine path.

## Сцена 6 — Архитектура

В README показать:

```text
ALINA Analyst
      ↓
ResearchPacket
      ↓
shared/contracts
      ↓
ContentBrief
      ↓
FATHER Content Generator
```

Ключевая мысль: генератор создаёт форму подачи, но не переписывает проверенную фактическую основу.

## Финальная фраза

```text
В DZ-18 реализован FATHER Content Generator: отдельный генератор контента с provider abstraction, server-side интеграциями OpenAI и HeyGen, Persona/Scene Engine, тестами, Docker-развёртыванием и трассируемой границей с аналитическим модулем ALINA.
```
