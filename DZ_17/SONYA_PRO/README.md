# SONYA PRO

**SONYA PRO** — отдельная витринная версия SONYA Home Manager для портфолио и дальнейшей продуктовой разработки.

Эта папка специально отделена от уже сданного ДЗ-17 и от `SONYA_HOME_MANAGER`.

## Цель

Сделать визуально цельный premium household AI-продукт в стиле референса:

- luminous blue glassmorphism;
- большой эмоциональный hero;
- premium sidebar;
- визуальные карточки функций;
- promo-блок;
- законченный footer;
- рабочая MVP-точка входа для каждого пункта меню.

## Запуск

```powershell
Set-Location -LiteralPath "G:\1\Vibe coding\Vibe-coding\DZ_17\SONYA_PRO"
npm install
npm run dev
```

Открыть:

```text
http://localhost:5173
```

## Что уже есть в v0.1

- premium header;
- glass navigation;
- hero в стиле SONYA PRO;
- sidebar со всеми разделами;
- главная сетка модулей;
- promo banner;
- footer;
- отдельный экран для каждого модуля;
- локальные заметки через `localStorage`;
- локальный checklist;
- responsive shell.

## Следующий слой

### Visual assets
Заменить emoji-заглушки на фирменные изображения:

```text
public/images/
├─ hero/
├─ menu/
├─ kids/
├─ desserts/
├─ drinks/
├─ events/
├─ tips/
└─ family/
```

### AI
Подключить рабочий контур из `SONYA_HOME_MANAGER/production_app`:

- Qwen3-VL;
- resilient vision parser;
- RAG;
- semantic validator;
- Focus Mode;
- Voice;
- Agent Trace.

### MVP модулей

| Раздел | v0.1 |
|---|---|
| Мой дом | shell |
| Планировщик меню | entry screen |
| Детский обед | entry screen |
| Десерты без сахара | entry screen |
| Компоты и морсы | entry screen |
| Праздники и гости | local MVP |
| Покупки | local MVP |
| Полезные советы | entry screen |
| Мой холодильник | entry screen |
| Счета и напоминания | local MVP |
| Семейный календарь | local MVP |
| Заметки | localStorage MVP |
| Настройки | local MVP |

## Принцип продукта

```text
AI предлагает → человек видит основания → человек подтверждает действие
```

SONYA PRO не должна утверждать, что заказ, оплата или бронирование выполнены, пока нет реальной интеграции и явного подтверждения пользователя.
