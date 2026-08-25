# Реестр отработанных технологий и инженерных приёмов

Этот документ — рабочая память репозитория. Перед разработкой новой функции
сначала ищем здесь готовый модуль или приём, затем проверяем его ограничения и
только после этого выбираем: **переиспользовать**, **усилить** или **создать
новое**.

Машиночитаемая версия: [`../registry/technologies.json`](../registry/technologies.json).

## Статусы и зрелость

| Статус | Значение |
|---|---|
| `PROVEN` | Код существует и есть автоматическое либо воспроизводимое доказательство |
| `IMPLEMENTED` | Код существует, но интеграционная проверка зависит от внешнего сервиса/ключа |
| `CONFIG_REQUIRED` | Контур подготовлен, но на конкретном ПК требуется модель, токен или сервис |
| `ROADMAP` | Есть архитектура или интерфейс, промышленная реализация ещё не завершена |

| Уровень | Критерий |
|---|---|
| `MIN` | закрывает один обязательный сценарий |
| `MED` | пригодно для повторного применения с контролируемыми ошибками |
| `MAX` | есть безопасность, трассировка, recovery и доказательства приёмки |

## Быстрый каталог повторного применения

| ID | Готовое решение | Источник | Статус | Зрелость | Как применять повторно | Что улучшить |
|---|---|---|---|---|---|---|
| `TG-FSM-001` | Telegram-меню, inline/reply-кнопки и FSM | `DZ_4.../src/` | PROVEN | MED | каркас бота с многошаговым диалогом | общий пакет компонентов и тесты переходов |
| `CATALOG-001` | CSV → SQLite каталог и фильтрация | `DZ_4.../src/catalog.py` | IMPLEMENTED | MED | небольшие локальные каталоги | миграции схемы и репозиторий данных |
| `KB-LITE-001` | Markdown knowledge pack + `manifest.json` + простой retrieval | `DZ_4.../knowledge/`, `src/knowledge.py` | IMPLEMENTED | MIN | компактная предметная справка без vector DB | чанки, provenance, версии и quality gates |
| `GIGACHAT-001` | адаптер GigaChat для агента | `DZ_4.../src/llm.py` | IMPLEMENTED | MIN | российская облачная LLM с секретом из окружения | единый provider contract, тайм-ауты и retry |
| `MEDIA-INGEST-001` | приём audio/video/document/link и нормализация | `DZ_5.../src/ingestion.py`, `router.py` | IMPLEMENTED | MED | единая входная точка для мультимедиа | лимиты, malware scan и потоковая загрузка |
| `MIME-001` | sniffing MIME и предупреждение о несовпадении расширения | `DZ_5.../src/filetype.py` | IMPLEMENTED | MED | безопаснее доверия одному расширению | magic bytes policy и quarantine |
| `FFMPEG-001` | извлечение/нормализация аудио через FFmpeg | `DZ_5.../src/media.py` | IMPLEMENTED | MED | подготовка MP3/WAV/M4A/видео перед STT | автоматический поиск FFmpeg и health-check |
| `STT-ASSEMBLYAI-001` | распознавание речи AssemblyAI | `DZ_5.../src/services.py` | IMPLEMENTED | MED | быстрый STT для MP3, voice и видео | адаптер в Gateway, fallback и контроль квоты |
| `ARTIFACT-001` | связка результата через `artifact_id` | `DZ_5.../src/app.py` | PROVEN | MAX | не путать PDF/TXT разных обработок | постоянное хранилище вместо памяти процесса |
| `PDF-001` | русский PDF-протокол ReportLab | `DZ_5.../src/services.py` | IMPLEMENTED | MED | отчёты, протоколы, саммари | шаблоны, PDF/A и визуальные regression tests |
| `SHEETS-001` | запись структуры в Google Sheets | `DZ_5.../src/services.py` | IMPLEMENTED | MED | журнал задач и результатов | idempotency, batch-запись и retry queue |
| `PROGRESS-001` | этапы длительной обработки в одном сообщении | `DZ_5.../src/progress.py` | IMPLEMENTED | MED | STT, анализ и экспорт | общий event/status contract |
| `REACT-STUDIO-001` | React + Vite редактор BOOK.CRAFT | `DZ_6.../src/` | PROVEN | MED | основа новых AI-редакторов | декомпозиция большого `App.jsx` |
| `MODEL-GATEWAY-001` | локальная и OpenAI-compatible LLM через общий UI | `DZ_6.../src/App.jsx` | PROVEN | MED | смена модели без переписывания продукта | вынести provider adapters на backend |
| `LLM-JSON-001` | строгий JSON-контракт, тайм-аут и одна format-repair попытка | `DZ_6.../src/App.jsx` | PROVEN | MAX | структурированная генерация без потери текущего текста | JSON Schema на сервере и метрики отказов |
| `ENTITY-001` | формальный контракт персонажей/событий/локаций/объектов | `DZ_6.../src/entity-contract.js` | PROVEN | MAX | единый формат элементов мира | версии схемы и миграции |
| `RECOVERY-001` | автосохранение, импорт/экспорт без секретов | `DZ_6.../src/App.jsx` | PROVEN | MAX | браузерные MVP и восстановление проекта | IndexedDB, версии и конфликт-merge |
| `ACCEPTANCE-001` | MIN/MED/MAX + UI/recovery проверки | `DZ_6.../scripts/`, `DZ_8.../tests/` | PROVEN | MAX | обязательный шаблон для новых функций | единый runner и CI matrix |
| `LOCAL-MODELS-001` | безопасный каталог GGUF из разрешённых корней | `DZ_8.../backend/app.py` | PROVEN | MED | обнаружение локальных моделей | capability detection, dedup и readiness |
| `MEDIA-GATEWAY-001` | FastAPI gateway text/image/audio | `DZ_8.../backend/app.py` | PROVEN | MED | локальная граница UI и AI-сервисов | разнести adapters/routes/services |
| `STT-WHISPERCPP-001` | локальный whisper.cpp adapter | `DZ_8.../backend/app.py` | CONFIG_REQUIRED | MIN | полностью локальное распознавание | installer, auto-discovery и AssemblyAI fallback |
| `TTS-SILERO-001` | четыре ролевых профиля Silero и WAV | `DZ_8.../backend/app.py`, `INSTALL_SILERO_TTS.*` | IMPLEMENTED | MED | озвучка мужчины/женщины/мальчика/девочки | тест на целевом ПК, очередь и сборка сцен |
| `COMFY-001` | ComfyUI API: checkpoints, LoRA, queue/history/view | `DZ_8.../backend/app.py` | CONFIG_REQUIRED | MED | локальная генерация иллюстраций | стабильный installer и optional-provider registry |
| `GIGA-ART-001` | GigaChat `text2image` + скачивание JPG | `DZ_8.../backend/app.py` | IMPLEMENTED | MED | облачная иллюстрация выделенного текста | token exchange на backend и quota telemetry |
| `TRACE-001` | единый ограниченный журнал UI/API/ошибок с очисткой секретов | `DZ_8.../src/App.jsx`, `backend/app.py` | PROVEN | MAX | диагностика всего pipeline | общий `trace_id`, JSONL и correlation across services |
| `RELIABLE-START-001` | Windows one-click start/stop, проверки портов и readiness | `DZ_8.../START_*`, `STOP_*` | PROVEN | MED | стандарт запуска локальных приложений | registry необязательных провайдеров и degraded mode |
| `SECRET-001` | ключи только в памяти/окружении, исключение из export/localStorage | ДЗ-4—ДЗ-8 | PROVEN | MAX | обязательная политика всех проектов | автоматический secret scan в CI |
| `EVIDENCE-001` | `реализация → verify → build → скриншоты/видео → commit` | `submissions/`, verify-скрипты | PROVEN | MAX | единый процесс сдачи и демонстрации | manifest доказательств и связь с commit SHA |

## Золотые решения

Эти приёмы уже показали себя и должны использоваться по умолчанию:

1. **Ядро независимо от модели и интерфейса.** Конкретные LLM, STT, TTS и каналы
   подключаются адаптерами.
2. **Сначала ищем в реестре.** Новый код пишется только после проверки аналогов
   в репозитории.
3. **Секреты не являются данными проекта.** Они не входят в Git, localStorage,
   экспорт, трассировку и скриншоты.
4. **Безопасная деградация.** Необязательный ComfyUI, облачный API или TTS не
   должны блокировать текстовый редактор.
5. **Контракт до интеграции.** Вход, выход, ошибки и приоритеты фиксируются до
   подключения провайдера.
6. **MIN → MED → MAX.** Сначала один рабочий сценарий, затем устойчивость, затем
   безопасность, recovery и доказательства.
7. **Человеческое подтверждение.** Расшифровка и AI-правка сначала попадают в
   редактор/предпросмотр и применяются только пользователем.
8. **Трассировка без содержимого.** Журнал хранит этап, длительность, провайдера,
   размер и категорию ошибки, но не рукопись, токен или исходное аудио.

## Главные долги и порядок улучшения

| Приоритет | Улучшение | Почему сейчас |
|---:|---|---|
| P0 | единый Provider Registry (`installed/configured/running/ready`) | устранит мучительный запуск и путаницу между найденной моделью и работающим API |
| P0 | подключить `STT-ASSEMBLYAI-001` в Media Gateway как уже проверенный канал | MP3 заработает без повторной установки Whisper |
| P0 | единый `trace_id` через frontend → gateway → provider | позволит точно видеть место и причину сбоя |
| P1 | разбить `App.jsx` и `backend/app.py` по функциям | снизит риск регрессий при добавлении аудио/изображений |
| P1 | автоматический выбор fallback: local → approved cloud | сохранит работу при выключенном локальном сервисе |
| P1 | общий one-click launcher с degraded mode | текст и звук не должны зависеть от ComfyUI |
| P2 | вынести повторяемые модули в `shared/` | прекратит копирование кода между домашними заданиями |
| P2 | CI: secret scan, schema validation, registry validation | сделает реестр и безопасность проверяемыми |

## Правило добавления новой записи

Запись добавляется одновременно с функцией и содержит:

- стабильный ID;
- источник кода;
- статус и уровень зрелости;
- зависимости и стоимость;
- доказательство проверки;
- ограничения и безопасный fallback;
- рекомендацию повторного применения;
- следующий шаг улучшения.

Нельзя обозначать технологию `PROVEN`, если есть только README или интерфейс без
выполняемого кода и доказательства.
