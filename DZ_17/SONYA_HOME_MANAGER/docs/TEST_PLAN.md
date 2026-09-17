# TEST_PLAN · SONYA Flagship

## Цель

Перед каждым заметным релизом проверить, что визуальный flagship-слой не ломает мультимодальный сценарий, голос, mobile/tablet и Design Admin.

## Smoke

1. Главная страница открывается без ошибок.
2. Terminal ticker движется плавно.
3. Hero меняется автоматически.
4. Шестерёнка открывает Design Admin.
5. Изменение tone/glow/glass видно сразу.
6. После reload настройки сохраняются.
7. Карточки сценариев подставляют правильные prompts.
8. Фото можно загрузить/заменить/удалить.
9. `POST /api/analyze` возвращает результат.
10. Result UI не ломается при пустых массивах.

## Vision cases

Минимум 5 прогонов:

- детское блюдо;
- семейный завтрак;
- десерт без сахара;
- напиток/морс;
- холодильник/продукты.

Для каждого фиксировать:

```text
input image
prompt
model
latency
correct observations
incorrect observations
assumptions
JSON stability
voice playback
```

## Responsive

Проверить:

- desktop 1440×900;
- laptop 1280×800;
- tablet 820×1180;
- mobile 390×844.

## Design Admin

Проверить крайние значения:

- Hue -120 / +160;
- Glow 0 / 100;
- Glass 20 / 100;
- Motion 0 / 100;
- ticker 10 / 50 sec;
- hero delay 3 / 15 sec;
- transition 200 / 1600 ms.

## Negative

- запуск анализа без фото;
- неподдерживаемый файл;
- фото >8 МБ;
- Ollama остановлен;
- модель не установлена;
- Ollama вернул не-JSON;
- Web Speech API недоступен.

## Release gate

Релиз можно считать пригодным для демонстрации, если:

- нет критических UI ошибок;
- нет горизонтального overflow на mobile;
- основной image+text сценарий проходит;
- ошибки backend видимы пользователю;
- голос можно остановить;
- Design Admin не ломает layout;
- в README указан актуальный Live Demo и local run.
