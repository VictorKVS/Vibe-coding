# DZ-18 — ALINA Content Studio

Статус: `BUILD FULL HOMEWORK FIRST -> POLISH SECOND`

## Цель
Собрать полностью рабочее и публикуемое ДЗ PRO AI «Контент-мейкер», а затем использовать его как полигон Persona/Media Engine для FATHER.

## Обязательное соответствие заданию

Приложение должно:
1. создавать контент по заданному сценарию;
2. иметь индивидуальный дизайн и логику;
3. использовать самостоятельно написанные системные промпты;
4. иметь вкладку «Видео-аватар» с реальной внешней API-интеграцией;
5. получать по API список голосов и список аватаров HeyGen либо выбранного аналога;
6. иметь дополнительную собственную вкладку;
7. быть опубликовано;
8. иметь скриншоты итогового тестирования.

## Выбранная архитектура приложения

```text
ALINA CONTENT STUDIO
├── Рассылки
├── Подкасты
├── Видео-аватар
├── Комикс / Storyboard        # дополнительная вкладка
└── Настройки / диагностика
```

### Рассылки
- тема / аудитория / тон;
- генерация текста;
- subject/preheader/CTA;
- генерация/подбор изображения;
- preview результата;
- копирование/экспорт.

### Подкасты
- тема и длительность;
- сценарий;
- выбор voice profile;
- скорость / эмоциональность;
- TTS provider abstraction;
- preview/export результата.

### Видео-аватар
- server-side API key only;
- загрузка списка avatars;
- загрузка списка voices;
- фильтр/поиск/preview;
- выбор avatar + voice;
- optional generate video;
- status polling при генерации;
- понятные ошибки API;
- mock/demo fallback только с явной маркировкой.

### Комикс / Storyboard
Это наша дополнительная вкладка и первый Persona Engine MVP.

Пользователь задаёт:
- тему;
- персонажа;
- число кадров;
- стиль;
- цель публикации.

ALINA создаёт:
```text
scenario
→ scenes
→ emotion per scene
→ pose/action
→ dialogue
→ background/clothes/props
→ image prompt
→ frames
→ comic strip
```

Минимальные эмоции:
```text
neutral
friendly
focused
thinking
doubtful
concerned
surprised
confident
strict
explaining
happy
```

## Общие ядра

### Persona Registry
Хранит:
- persona_id;
- identity description;
- face consistency description;
- age appearance;
- hairstyle;
- character;
- voice profile;
- default wardrobe;
- allowed styles;
- negative constraints.

### Scene Registry
Хранит:
- scene_id;
- persona_id;
- environment;
- time/season;
- emotion;
- pose;
- action;
- clothing;
- props;
- dialogue;
- image prompt;
- generation metadata.

### Media Generation Core
Один общий слой для:
- newsletter image;
- comic frame;
- podcast cover;
- avatar scene/background.

## Безопасность
- API secrets только на сервере/.env;
- никогда не коммитить ключи;
- логировать provider/status/error без секретов;
- внешний контент и prompt input считаются недоверенными;
- graceful failure вместо падения UI.

## Две фазы

### Phase A — Submission Baseline
Сначала закрыть ДЗ полностью:
- все вкладки работают;
- системные промпты собственные;
- HeyGen/аналог реально отдаёт voices + avatars;
- Comic tab работает как дополнительная вкладка;
- приложение публикуется;
- есть README, инструкция запуска, .env.example;
- есть сценарий демонстрации;
- подготовлены места под скриншоты.

### Phase B — Polish
Только после baseline:
- постоянство лица;
- emotion sheet;
- pose sheet;
- comic composition;
- смена одежды/фона по сцене;
- animation/motion comic;
- TTS/lip-sync;
- перенос Persona/Scene Engine в общий модуль FATHER.

## Definition of Done
ДЗ считается готовым к сдаче, когда:
- [ ] опубликованный URL открывается;
- [ ] Newsletter работает;
- [ ] Podcast работает;
- [ ] Video Avatar показывает реальные API lists;
- [ ] Comic/Storyboard работает;
- [ ] промпты версионированы и написаны внутри проекта;
- [ ] секреты не попали в Git;
- [ ] ошибки API видимы и понятны;
- [ ] smoke test пройден;
- [ ] README содержит запуск и demo-flow;
- [ ] подготовлен отчёт со скриншотами.
