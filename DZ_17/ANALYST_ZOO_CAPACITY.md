# ALINA Analyst Zoo · расчёт локальной ёмкости

> Назначение: зафиксировать практический ресурсный бюджет для **Tool Zoo + Analysis Zoo** на текущем ПК и определить, какие задачи выполнять локально, а какие выносить во внешний GigaChat.
>
> Это **плановая модель ресурсов**, а не замер производительности. Токены/сек, latency и фактический VRAM/RAM для каждой модели должны быть подтверждены телеметрией после локального запуска.

## 1. Подтверждённая конфигурация ПК

| Ресурс | Конфигурация |
|---|---|
| ОС | Windows 11 Pro 23H2 |
| CPU | Intel Core i5-10400F |
| CPU topology | 6 ядер / 12 потоков, до 4.3 ГГц |
| RAM | ~32 ГБ DDR4 |
| GPU | NVIDIA GeForce RTX 3060 |
| VRAM | 12 ГБ |
| CUDA | доступна в рабочем PyTorch-контуре |

## 2. Основной принцип

Количество аналитических ролей **не равно** количеству одновременно загруженных моделей.

```text
25–30 ANALYST ROLES
        ↓
ROLE / PROMPT / SCHEMA ROUTER
        ↓
3 тяжёлых локальных AI-движка
+ CPU tools
+ PostgreSQL/pgvector
+ внешний GigaChat
```

Один локальный text LLM может обслуживать Entity Analyst, Fact Analyst, Relation Analyst, Timeline Analyst, Dialogue Analyst, Knowledge-State Analyst, preliminary contradiction check и другие роли. Аналогично один vision-движок обслуживает Visual Analyst, Character Appearance, Wardrobe/Prop State, Screenshot Analysis и Visual Continuity.

---

# 3. GPU-бюджет RTX 3060 12 ГБ

Физически доступно:

```text
VRAM_total = 12 ГБ
```

Для Windows/WDDM, UI и служебных буферов резервируем:

```text
VRAM_reserve = 1.5–2.0 ГБ
```

Плановый безопасный бюджет для одной тяжёлой AI-задачи:

```text
VRAM_AI_safe = 12 - 2 ≈ 10 ГБ
```

Отсюда правило планировщика:

```text
GPU_HEAVY_SEMAPHORE = 1
```

То есть в штатном режиме на GPU одновременно исполняется **одна тяжёлая модель/задача**.

## 3.1. Практический класс локальной text-модели

Плановый диапазон для 7–8B модели в Q4:

```text
weights ≈ 5–6.5 ГБ
KV/cache/runtime ≈ 1.5–3 ГБ
--------------------------------
expected working set ≈ 6.5–9.5 ГБ
```

Это укладывается в безопасный бюджет ~10 ГБ и оставляет небольшой запас.

Для 14B Q4 плановый working set может приблизиться к границе 10–12+ ГБ в зависимости от backend, context length и offload. Поэтому 14B можно использовать как экспериментальный профиль, но **не как базовый always-on worker** на RTX 3060 12 ГБ.

### Решение

```text
DEFAULT LOCAL TEXT = 7–8B Q4
EXPERIMENTAL DEEP  = 14B Q4 only on demand
```

## 3.2. Локальный vision

Для 7B-class multimodal/VL модели планируем тот же порядок:

```text
~7–10 ГБ рабочего VRAM
```

Следовательно text LLM и vision LLM **не должны считаться двумя постоянными GPU worker одновременно**.

```text
TEXT batch → unload / release → VISION batch
```

## 3.3. STT

Whisper/faster-whisper запускается отдельной GPU-задачей по очереди. Базовый scheduler:

```text
TEXT LLM   ┐
VISION LLM ├─ GPU queue, concurrency = 1
STT        ┘
```

---

# 4. CPU-бюджет i5-10400F

Имеем:

```text
logical_threads = 12
```

Резерв ОС, браузеру, IDE, Git и интерфейсу:

```text
reserved_threads = 2
usable_threads ≈ 10
```

Если тяжёлый CPU worker в среднем получает 2 логических потока:

```text
floor(10 / 2) = 5 workers theoretical
```

Для устойчивой интерактивной работы принимаем 20% запас:

```text
recommended_heavy_CPU_workers = 4
```

Это не значит всего четыре процесса. Лёгкие I/O-задачи могут иметь большую очередь, но одновременно CPU-heavy обработчиков держим четыре.

### Базовый профиль

```yaml
cpu_heavy_workers: 4
parser_io_workers: 2
background_queue: many
```

Парсеры, hashing, metadata, file discovery и сетевые I/O могут перекрываться с CPU-heavy работой, но scheduler должен снижать параллелизм, если CPU > 85–90% длительное время.

---

# 5. RAM-бюджет 32 ГБ

Плановый резерв:

```text
RAM_total                 ≈ 32 ГБ
Windows + browser + IDE   ≈ 8–10 ГБ
PostgreSQL/Redis/services ≈ 3–4 ГБ
-----------------------------------
RAM_remaining             ≈ 18–21 ГБ
```

Этот остаток должен покрывать:

- локальный inference runtime;
- model offload при необходимости;
- embeddings/reranker на CPU;
- парсинг крупных документов;
- временные buffers OCR/STT/video;
- очереди и промежуточные JSON/graph artifacts.

Поэтому не держим одновременно несколько больших CPU-offloaded LLM.

---

# 6. Два зоопарка

## 6.1. Tool Zoo — добывает наблюдения

Локально без LLM или с малым ML:

```text
file ingest
hash / SHA / provenance
PDF parser
DOCX parser
XLSX parser
PPTX parser
HTML / Markdown / JSON parser
metadata / EXIF
FFmpeg / ffprobe
OCR
STT
language detection
regex / rules
NER
chunker
embeddings
reranker
image hash / similarity
```

Выход Tool Zoo:

```text
OBSERVATION
SOURCE
CAPTURE
PROVENANCE
CONFIDENCE
```

## 6.2. Analysis Zoo — превращает evidence в proposed knowledge

```text
Entity Analyst
Claim Analyst
Fact Analyst
Relation Analyst
Event Analyst
Timeline Analyst
Cause/Effect Analyst
Dialogue Analyst
Knowledge-State Analyst
Character Analyst
Scene Analyst
Relationship-State Analyst
Plot-Thread Analyst
Foreshadowing/Payoff Analyst
Visual Identity Analyst
Wardrobe/Prop/Injury State Analyst
Visual Continuity Analyst
Contradiction Analyst
Source Reliability Analyst
Cross-document Analyst
Hypothesis Analyst
Narrative Drift / «Фейкомёт»
KB Validator
Socrates / Counter-evidence
```

Это порядка **25+ аналитических ролей**, но большинство ролей исполняются одним и тем же text LLM с разными контрактами и JSON-schema.

---

# 7. Физические движки

## Локально

```text
ENGINE-1  Local Text LLM 7–8B Q4
ENGINE-2  Local Vision/VL 7B-class Q4
ENGINE-3  faster-whisper / STT
ENGINE-4  Embeddings (CPU preferred)
ENGINE-5  Reranker (CPU preferred)
ENGINE-6  deterministic parsers/rules
```

На GPU одновременно активен один из ENGINE-1/2/3.

## Внешне

```text
ENGINE-X  GigaChat
```

GigaChat не потребляет локальную VRAM/RAM модели и используется как независимый сильный слой для:

- deep synthesis;
- cross-document reasoning;
- hypothesis comparison;
- Socrates/counter-evidence;
- сложной KB validation;
- второй независимой оценки локального вывода.

---

# 8. Плановый scheduler

## 8.1. Безопасный baseline

```yaml
workers:
  cpu_heavy: 4
  gpu_heavy: 1
  external_gigachat: 2
```

Одновременно:

```text
4 CPU-heavy lanes
+ 1 local GPU lane
+ 2 external GigaChat lanes
= 7 полезных тяжёлых/средних lanes
```

Это **не семь LLM**. CPU lanes выполняют parser/NER/embeddings/graph/normalization, GPU lane — одну локальную AI-задачу, внешние lanes — независимые сетевые анализы.

## 8.2. Верхний тестовый профиль

Если GigaChat rate limits и сеть позволяют, внешний semaphore можно поднять до 3:

```text
4 CPU + 1 GPU + 3 external = 8 lanes
```

Значение `3` считается **экспериментальным**, пока не собрана телеметрия ошибок 429/timeout/latency.

---

# 9. Маршрутизация задач

```text
ingest / parse / hash / metadata
→ CPU deterministic

OCR / NER / chunking
→ CPU

embeddings / rerank
→ CPU first

entity / fact / relation / event extraction
→ Local Text LLM

scene / dialogue / knowledge state
→ Local Text LLM

vision / appearance / wardrobe / screenshot
→ Local Vision

audio/video transcript
→ Local STT

cross-document synthesis
→ GigaChat

hypothesis competition
→ Local draft + GigaChat independent pass

Socrates / counter-evidence
→ GigaChat preferred

final KB validation
→ Local validator + GigaChat second opinion
```

---

# 10. Зачем GigaChat нужен именно как внешний второй мозг

Не отправляем каждую строку наружу. Массовый конвейер остаётся локальным:

```text
1000 raw fragments
      ↓ local
entities / facts / claims / events
      ↓ local
candidate graph
      ↓
30 ambiguous / conflicting cases
      ↓ external
GigaChat deep review
```

Если внешний анализ и локальный анализ расходятся:

```text
status = needs_review
```

Никакое расхождение не разрешается скрыто моделью.

---

# 11. Плановая нагрузка по профилям

| Профиль | CPU lanes | GPU lanes | GigaChat lanes | Назначение |
|---|---:|---:|---:|---|
| Interactive | 2–3 | 1 | 1 | работа пользователя в UI |
| Balanced | 4 | 1 | 2 | обычная обработка корпуса |
| Batch max | 4 | 1 | 3* | пакетный анализ при подтверждённых API limits |

`*` — только после телеметрии внешнего API.

---

# 12. Ограничения расчёта

Пока **не измерены**:

- tokens/sec local text LLM;
- images/min local vision;
- realtime factor STT;
- embeddings/sec;
- средний VRAM при выбранном context length;
- фактический лимит параллельных запросов GigaChat;
- latency и 429 rate внешнего API.

Поэтому прогноз завершения больших корпусов сейчас не рассчитывается. После подключения runtime telemetry нужно автоматически собирать:

```text
items/min
chunks/min
tokens/sec
VRAM peak
RAM peak
CPU utilization
queue wait
retry rate
GigaChat latency
429/error rate
% rework
```

Только после этого можно честно считать ускорение относительно 1 потока и ETA.

---

# 13. Итоговая конфигурация ALINA Analyst на текущем ПК

```text
≈25–30 ANALYTICAL ROLES

работают поверх:

1 × Local Text LLM 7–8B Q4
1 × Local Vision LLM 7B-class Q4
1 × Local STT
2 × small CPU ML (embeddings + reranker)
10+ deterministic tools
PostgreSQL + pgvector
Queue / Scheduler

+

GigaChat
→ deep reasoning
→ cross-document analysis
→ independent second opinion
→ Socrates
```

Главный вывод: **RTX 3060 12 ГБ достаточно не для десятка одновременно загруженных LLM, а для одного тяжёлого GPU worker, который последовательно обслуживает десятки аналитических ролей.** Масштаб достигается оркестрацией ролей, CPU-инструментами и внешним GigaChat, а не одновременной загрузкой большого числа моделей.

## Следующий обязательный шаг

После первого локального запуска включить telemetry и заменить все плановые оценки реальными измерениями. Тогда в отчёте появятся:

```text
скорость vs 1 поток
% ускорения
throughput за проход
throughput накопительно
доля повторной работы
остаток
ETA завершения
```

До появления измерений эти показатели не выдумываются.
