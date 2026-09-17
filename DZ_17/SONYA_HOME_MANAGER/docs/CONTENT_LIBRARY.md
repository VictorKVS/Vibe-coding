# CONTENT_LIBRARY · SONYA Premium Content

Цель: отделить визуальный контент от кода, чтобы hero, карточки, коллажи и premium-папки можно было менять без переделки интерфейса.

## Структура

```text
content/
├── hero/
├── dishes/
│   ├── kids/
│   ├── family/
│   └── party/
├── products/
├── recipes/
├── desserts/
├── drinks/
├── collages/
├── parties/
└── lifestyle/
```

## Назначение

### `hero/`
Широкие эмоциональные кадры главной страницы.

Примеры:
- happy-child-healthy-breakfast.webp
- family-kitchen-morning.webp
- kids-party-table.webp

### `dishes/kids/`
Яркие детские блюда, фигурная подача, тарелки-зверюшки, тематические обеды.

### `dishes/family/`
Семейные завтраки, ужины, полезные блюда, meal planner.

### `dishes/party/`
Блюда для праздников и гостей.

### `products/`
Ингредиенты, продуктовые композиции, холодильник, кладовая, pantry.

### `recipes/`
Коллажи или последовательности приготовления.

### `desserts/`
Десерты без добавленного сахара, ягоды, фрукты, йогурт, натуральные сладости.

### `drinks/`
Компоты, морсы, ягодные напитки, вода с фруктами.

### `collages/`
Готовые premium-коллажи для карточек и промо-блоков.

### `parties/`
Дети играют, украшения, шарики, праздничный стол, семейные события.

### `lifestyle/`
Уютный дом, семья, кухня, полезные привычки, календарь, организация быта.

## Форматы

Предпочтительно:

- WebP для сайта;
- JPG для фотографий, если WebP не готов;
- PNG только для прозрачности;
- 16:9 / 3:2 для hero;
- 4:3 / 1:1 для карточек;
- до 1–1.5 МБ на один production asset после оптимизации.

## Именование

```text
category_subject_variant_001.webp
```

Примеры:

```text
kids_bear_pancake_001.webp
party_children_balloons_001.webp
dessert_berry_yogurt_001.webp
drink_cranberry_mors_001.webp
hero_family_breakfast_001.webp
```

## Контент-manifest roadmap

Следующий этап — `content/manifest.json`:

```json
{
  "hero": [
    {
      "id": "hero-family-breakfast-001",
      "file": "hero/hero_family_breakfast_001.webp",
      "title": "Вкусное детство сегодня",
      "enabled": true,
      "weight": 10
    }
  ]
}
```

Design Admin позже будет управлять этим manifest: включать/выключать кадры, менять порядок, длительность, устройства и расписание.
