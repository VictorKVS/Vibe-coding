# Vibe Coding · портфолио учебных AI-проектов

> Практические интеграции, воспроизводимый запуск, тестируемые критерии и отдельная карточка сдачи для каждой работы.

[![DZ-5](https://img.shields.io/badge/DZ--5-код_готов-22c55e)](submissions/DZ-05/README.md)
[![DZ-6](https://img.shields.io/badge/DZ--6-тесты_и_build_готовы-22c55e)](submissions/DZ-06/README.md)
[![DZ-8 Lite](https://img.shields.io/badge/DZ--8_Lite-готово-22c55e)](submissions/DZ-08/LITE/README.md)
[![DZ-8 Pro](https://img.shields.io/badge/DZ--8_Pro-подготовка-f59e0b)](submissions/DZ-08/PRO/README.md)

## Проекты

| Работа | Продукт | Ключевой результат | Карточка сдачи |
|---|---|---|---|
| ДЗ‑5 | AI‑секретарь встреч | файлы → STT → Sheets → PDF + TXT | [Открыть](submissions/DZ-05/README.md) |
| ДЗ‑6 | BOOK·CRAFT | AI‑редактор сценариев с жанрами и Model Gateway | [Открыть](submissions/DZ-06/README.md) |
| ДЗ‑8 Lite | BOOK·CRAFT Media | зелёный статус после загрузки изображения | [Открыть](submissions/DZ-08/LITE/README.md) |
| ДЗ‑8 Pro | Voice Backend | audio → STT → user_message | [Открыть](submissions/DZ-08/PRO/README.md) |

## ДЗ‑5 · AI-секретарь встреч

```mermaid
flowchart LR
    F["Аудио / видео / ссылка"] --> STT["AssemblyAI"]
    STT --> TXT["TXT-транскрипт"]
    TXT --> AI["OpenAI-анализ"]
    AI --> GS["Google Sheets"]
    AI --> PDF["PDF-протокол"]
    TXT --> TG["Telegram-кнопки"]
    PDF --> TG
```

В одном сообщении пользователь получает:

- **«Скачать протокол (PDF)»**;
- **«Скачать транскрипт (TXT)»**.

[Открыть исходники ДЗ‑5](DZ_5_Integrations_files,_Sheets,_external_APIs/) ·
[Открыть Notebook](DZ_5_Integrations_files,_Sheets,_external_APIs/notebooks/DZ5_AI_Secretary_TXT_Download.ipynb) ·
[Открыть в Colab](https://colab.research.google.com/github/VictorKVS/Vibe-coding/blob/agent/dz6-dz8-showcase-clean/DZ_5_Integrations_files,_Sheets,_external_APIs/notebooks/DZ5_AI_Secretary_TXT_Download.ipynb)

## ДЗ‑6 · BOOK·CRAFT

[![BOOK·CRAFT — создание сценариев](submissions/DZ-06/screenshots/01-start-screen.png)](submissions/DZ-06/README.md)

Локальный AI‑редактор сценариев: пять жанров, три редактируемые части, база знаний, паспорта персонажей, импорт/экспорт, автосохранение и подключение моделей.

| Проверка | Результат |
|---|---:|
| Контракт сущностей | 3/3 PASS |
| MIN/MED/MAX | 4/4 PASS |
| React UI и восстановление | PASS |
| Production build | PASS |
| npm audit | 0 уязвимостей |

## Организация репозитория

```text
Vibe-coding/
├── DZ_5_Integrations_files,_Sheets,_external_APIs/
├── DZ_6_WeWeb_Lovable/
└── submissions/
    ├── DZ-05/
    ├── DZ-06/
    └── DZ-08/
        ├── LITE/
        └── PRO/
```

```mermaid
flowchart TD
    R["Главная витрина"] --> D5["ДЗ-5 · AI-секретарь"]
    R --> D6["ДЗ-6 · BOOK·CRAFT"]
    R --> D8L["ДЗ-8 Lite · Image status"]
    R --> D8P["ДЗ-8 Pro · Voice backend"]
    D5 --> E5["Код · Notebook · скрины · видео"]
    D6 --> E6["Код · тесты · build · скрины"]
    D8L --> E8L["Код · тест · скрин"]
    D8P --> E8P["ТЗ · backend · видео"]
```

Каждая карточка отделяет обязательные требования преподавателя от дополнительных продуктовых функций. В репозиторий не добавляются реальные токены, пользовательские транскрипты, runtime-файлы, модели, `node_modules` и production-сборки.
