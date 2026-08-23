# 🧭 ДЗ-4 — AI Travel Premium

<p align="center">
  <strong>Telegram-бот туристического агента: меню, кнопки и диалоговые сценарии</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Telegram-aiogram-26A5E4?logo=telegram&logoColor=white" alt="Telegram">
  <img src="https://img.shields.io/badge/Python-bot-3776AB?logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/FSM-dialogs-7C5CFC" alt="FSM dialogs">
</p>

> Первый продуктовый этап курса: от Notebook к структурированному Telegram-приложению с каталогом направлений, клавиатурами, состояниями диалога, хранилищем и LLM-слоем.

## 🔗 Материалы

- [Исходный код](../../DZ_4_Menus_buttons_dialog_scripts/src/)
- [Notebook AI Travel Premium](../../DZ_4_Menus_buttons_dialog_scripts/AI_TRAVEL_PREMIUM.ipynb)
- [Каталог изображений](../../assets/)
- [Зависимости](../../DZ_4_Menus_buttons_dialog_scripts/requirements.txt)

## 🧩 Архитектура

```mermaid
flowchart LR
    U[Пользователь] --> TG[Telegram Bot]
    TG --> KB[Клавиатуры и меню]
    TG --> FSM[Состояния диалога]
    FSM --> CAT[Каталог туров]
    FSM --> LLM[LLM-помощник]
    CAT --> MEDIA[Фото направлений]
    FSM --> STORE[Хранилище]
```

## ✅ Что реализовано в кодовой базе

| Слой | Реализация |
|---|---|
| Telegram | `bot.py`, `main.py` |
| Меню и inline-кнопки | `keyboards.py` |
| Диалоговые сценарии | `fsm.py` |
| Каталог туров | `catalog.py`, `destinations.py` |
| LLM | `llm.py` |
| База знаний | `knowledge.py`, каталог `knowledge/` |
| Хранение | `storage.py` |
| Медиа | `assets/gallery`, `assets/tours`, `assets/screens` |

## 📸 Визуальные материалы

<table>
<tr>
<td width="50%">
<a href="../../assets/screens/search.jpg"><img src="../../assets/screens/search.jpg" width="100%" alt="Поиск тура"></a>
</td>
<td width="50%">
<a href="../../assets/screens/direction.jpg"><img src="../../assets/screens/direction.jpg" width="100%" alt="Выбор направления"></a>
</td>
</tr>
<tr>
<td width="50%">
<a href="../../assets/screens/hotel.jpg"><img src="../../assets/screens/hotel.jpg" width="100%" alt="Выбор отеля"></a>
</td>
<td width="50%">
<a href="../../assets/screens/gallery.jpg"><img src="../../assets/screens/gallery.jpg" width="100%" alt="Галерея тура"></a>
</td>
</tr>
</table>

## 📈 Полученный навык

**Вход:** отдельный Notebook и набор материалов.  
**Результат:** разнесённое по модулям Telegram-приложение с управляемым пользовательским сценарием.

Это фундамент следующего этапа — подключения файлов, таблиц и внешних API в ДЗ-5.
