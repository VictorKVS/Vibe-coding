# DESIGN_ADMIN · SONYA

Design Admin — локальная панель управления фирменным видом SONYA без правки CSS вручную.

## Открытие

Нажать шестерёнку в правой части верхней панели.

## Настройки

### Общий тон

Быстрые пресеты:

- Blue
- Aqua
- Violet
- Emerald
- Sunset

Дополнительно:

- `Hue` — глобальный сдвиг фирменного оттенка;
- `Glow` — интенсивность свечения;
- `Glass` — прозрачность/плотность стекла;
- `Motion` — величина интерактивного движения карточек.

Изображения контента не должны перекрашиваться глобальным Hue. Меняется оболочка сайта: фон, glass, glow, borders, accents.

### Hero

- autoplay on/off;
- задержка 3–15 секунд;
- transition 200–1600 мс;
- sequential/random;
- pause on hover.

### Terminal ticker

- on/off;
- редактируемый текст;
- скорость полного прохода;
- бесшовное движение справа налево.

Рекомендация: не использовать мигание. Эффект строится на моноширинном тексте, мягком glow и непрерывном движении.

## Persistence

В MVP настройки сохраняются в:

```text
localStorage['sonya-design-settings']
```

Это означает:

- изменение видно сразу;
- сохраняется после reload;
- действует только в текущем браузере;
- не меняет production для других пользователей.

## Production roadmap

Позже Design Admin переводится в серверный режим:

```text
Admin login
   ↓
Design settings API
   ↓
Database / versioned config
   ↓
Published site config
```

Желательные production-функции:

- Draft / Publish;
- Preview;
- version history;
- rollback;
- schedule theme;
- day/night profile;
- A/B variant;
- content slot management;
- hero playlist;
- ticker playlists;
- per-device tuning.
