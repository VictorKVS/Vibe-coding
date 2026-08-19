# Vibe Coding — учебные проекты

> Единая витрина практических работ: отдельная сдача каждого задания, проверяемые требования, воспроизводимый запуск и доказательства результата.

[![DZ-6](https://img.shields.io/badge/DZ--6-готово-22c55e)](submissions/DZ-06/README.md)
[![DZ-8](https://img.shields.io/badge/DZ--8-подготовка-f59e0b)](submissions/DZ-08/README.md)
[![Tests](https://img.shields.io/badge/tests-10%2F10-22c55e)](DZ_6_WeWeb_Lovable/README.md)
[![Build](https://img.shields.io/badge/production_build-passed-2563eb)](DZ_6_WeWeb_Lovable/README.md)

## BOOK·CRAFT

[![BOOK·CRAFT — создание сценариев](submissions/DZ-06/screenshots/01-start-screen.png)](submissions/DZ-06/README.md)

Работающий локальный AI-редактор сценариев: выбор жанра, три части произведения, Model Gateway, база знаний, персонажи и контролируемая генерация.

## Навигация по сдачам

| Работа | Продукт | Состояние | Демонстрация | Материалы |
|---|---|---:|---|---|
| [ДЗ-6](submissions/DZ-06/README.md) | BOOK·CRAFT — генератор сценариев | ✅ Код и тесты готовы | [GitHub Pages](https://victorkvs.github.io/Vibe-coding/) | [Исходники](DZ_6_WeWeb_Lovable) |
| [ДЗ-8](submissions/DZ-08/README.md) | Будет указано по исходному заданию | ⏳ Подготовка | — | [Карточка сдачи](submissions/DZ-08/README.md) |

## Принцип организации

```mermaid
flowchart TD
    A["Главная витрина"] --> B["ДЗ-6 · BOOK·CRAFT"]
    A --> C["ДЗ-8 · отдельная сдача"]
    B --> D["Требования и доказательства"]
    B --> E["Код, тесты и скриншоты"]
    C --> F["Требования и доказательства"]
    C --> G["Код, тесты и скриншоты"]
```

Каждая сдача отделяет обязательные требования преподавателя от дополнительных продуктовых функций. Большие видео, модели, локальные базы, ключи и сборочные каталоги в Git не добавляются.

## Подтверждённые результаты ДЗ-6

| Проверка | Результат |
|---|---:|
| Контракт сущностей | 3/3 PASS |
| MIN/MED/MAX | 4/4 PASS |
| Интерактивный UI и восстановление | 3/3 PASS |
| Production build | PASS |
| Уязвимости npm audit | 0 |

Подробности, команды запуска и сценарий записи находятся в [карточке ДЗ-6](submissions/DZ-06/README.md).
