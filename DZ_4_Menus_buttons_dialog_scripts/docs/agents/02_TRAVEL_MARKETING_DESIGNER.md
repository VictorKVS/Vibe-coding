# ТЗ — Travel Marketing Designer

## 1. Назначение

Travel Marketing Designer — специализированный AI-агент, который превращает структурированные данные тура в рекламный визуал в фирменном стиле AI Travel Premium.

Агент не консультирует пользователя по визам, погоде, отзывам или безопасности. Его задача — визуальная упаковка предложения.

## 2. Входные данные

Пример:

```json
{
  "country": "Непал",
  "title": "Гималаи и древние храмы",
  "days": 10,
  "hotel": "4★",
  "price": 145000,
  "currency": "RUB",
  "rating": 4.9,
  "travelers": "2 взрослых + ребенок",
  "included": ["перелет", "отель", "трансфер", "страховка"],
  "brand": "AI Travel Premium",
  "format": "telegram_ad"
}
```

Дополнительно агент может получать:

- логотип;
- референс фирменного стиля;
- референс страны;
- фото отеля;
- уже существующую карточку тура;
- формат публикации.

## 3. Поддерживаемые режимы MVP

### telegram_screen

Фоновый или информационный экран внутри Telegram-бота.

Правила:

- не рисовать кнопки;
- не рисовать Telegram-клавиатуру;
- не имитировать интерактивные элементы;
- оставлять управление настоящему Telegram UI;
- использовать минимальный текст.

### telegram_ad

Рекламная карточка тура.

Разрешено размещать в изображении:

- логотип;
- страну;
- название тура;
- флаг;
- длительность;
- категорию отеля;
- цену;
- рейтинг;
- основные включенные услуги;
- короткий рекламный слоган.

Кнопки выбора тура, галереи, перехода назад и вперед не рисуются. Их создает Telegram через InlineKeyboardMarkup.

## 4. BrandBook MVP

Основные принципы:

- бренд: AI Travel Premium;
- стиль: премиальный, современный, минималистичный;
- темная navy-база;
- золотые акценты;
- белая типографика;
- яркие туристические фотографии;
- аккуратные карточки;
- единая композиционная система;
- без визуального шума.

## 5. Алгоритм агента

```text
Данные тура
   ↓
Проверка обязательных полей
   ↓
Определение режима
   ↓
Подбор визуальных символов страны
   ↓
Применение BrandBook
   ↓
Формирование image prompt
   ↓
Генерация изображения
   ↓
Проверка результата
   ↓
Сохранение имени и пути
```

## 6. Правила генерации

Агент обязан:

- сохранять единый стиль между карточками;
- показывать узнаваемые особенности направления;
- не перегружать изображение текстом;
- не выдумывать данные тура;
- использовать только входные значения цены, дат и характеристик;
- не добавлять новые сервисы, PDF, email или другие функции, если они не указаны;
- не рисовать кнопки для Telegram;
- не копировать интерфейс сайта Booking или другого веб-сервиса.

## 7. Пример внутреннего промпта

```text
Create a premium Telegram advertising card for AI Travel Premium.

Destination: Nepal.
Tour title: Himalayas and Ancient Temples.
Duration: 10 days.
Hotel: 4 stars.
Price: 145,000 RUB.
Rating: 4.9.

Visual language: dark navy premium layout, gold accents, white typography, cinematic high-quality Nepal imagery, Himalayas, temple architecture and prayer flags.

Include the AI Travel Premium logo, destination name, duration, hotel class, rating and price.

Do NOT draw Telegram buttons, navigation buttons, keyboards, browser chrome, web filters or fake interactive controls. The actual Telegram bot will render all controls separately.
```

## 8. Именование файлов

Статические экраны:

```text
assets/screens/{screen_name}.jpg
```

Карточки туров:

```text
assets/tours/{direction}.jpg
```

Галерея:

```text
assets/gallery/{direction}/photo1.jpg
assets/gallery/{direction}/photo2.jpg
...
```

Динамически созданные рекламные материалы:

```text
assets/generated/{direction}_{price}_{timestamp}.jpg
```

## 9. Выход агента

```json
{
  "status": "ok",
  "format": "telegram_ad",
  "filename": "nepal_145000.jpg",
  "path": "assets/generated/nepal_145000.jpg",
  "prompt": "...",
  "validation": {
    "brand_ok": true,
    "telegram_buttons_drawn": false,
    "price_matches_input": true
  }
}
```

## 10. Критерии готовности MVP

Travel Marketing Designer считается реализованным, если:

- принимает структурированные данные тура;
- умеет строить промпт автоматически;
- различает telegram_screen и telegram_ad;
- соблюдает BrandBook;
- не рисует Telegram-кнопки;
- генерирует визуал с логотипом, направлением и ценой;
- возвращает имя файла, путь и результат проверки.
