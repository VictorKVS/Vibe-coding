# BOOK.CRAFT · Narrative Audio Engineering System

## Принцип

Звук является частью канона произведения, а не отдельным постпроцессом.

Основной pipeline:

`Источник → Текст → Сцены → Персонажи → Комикс → Звук → Видео`

Все звуковые сущности используют те же идентификаторы, что и Narrative Knowledge Base:

- `character_id` — постоянный голос героя;
- `scene_id` — атмосфера, SFX и музыка сцены;
- `dialogue_id` — конкретная реплика;
- `beat_id` — драматургический момент;
- `shot_id` — звуковой фрагмент видеошота.

## 1. Audio Source / STT

Поддерживаемый вход:

- микрофон;
- MP3;
- WAV;
- OGG;
- WebM;
- M4A/MP4 audio.

Текущий рабочий путь:

`audio → /api/stt/transcribe → локальный Whisper → transcript`

Расшифровка может быть вставлена во вступление, развитие или финал. В будущем тот же механизм используется для загрузки аудиокниг и интервью как источников проекта.

Обязательный trace:

- `audio.record.start`;
- `audio.record.finish/error`;
- `audio.stt.start`;
- `audio.stt.ready/error`;
- `audio.transcript.insert`.

## 2. Voice Bible

У каждого канонического персонажа должен быть постоянный голосовой профиль.

Минимальная структура:

```json
{
  "character_id": "char_001",
  "voice_profile_id": "voice_001",
  "provider": "system|local-tts|external-tts",
  "voice": "preset-or-engine-id",
  "rate": 1.0,
  "pitch": 1.0,
  "emotion_policy": "canon-aware",
  "immutable": ["base_voice_identity"]
}
```

Главный герой не получает новый голос в каждой сцене. Изменение голоса создаёт новую версию continuity state.

Текущий рабочий уровень BOOK.CRAFT использует локальный браузерный Speech Synthesis и четыре безопасных пресета: женщина, мужчина, девочка, мальчик.

## 3. Dialogue Audio

После появления `Dialogue` сущности каждая реплика связывается с:

- `dialogue_id`;
- `character_id` говорящего;
- адресатом;
- эмоцией;
- сценой;
- текстовым source span;
- voice profile;
- будущим audio asset.

Это позволяет из одной базы автоматически получать:

- чтение ролей;
- speech bubbles комикса;
- субтитры;
- озвучку видео.

## 4. Scene Sound Plan

Для каждой `scene_id` хранится:

```json
{
  "scene_id": "SC-07",
  "ambience": "ночной вокзал, редкие объявления",
  "sfx": "шаги, дверь вагона, свисток",
  "music": "сдержанное напряжение, без вокала",
  "dialogue_refs": [],
  "narration_refs": []
}
```

Это производственная спецификация. Она не должна смешиваться с исходным текстом или каноном событий.

## 5. Audio Timeline

Минимальные дорожки:

1. `NARRATOR`;
2. `DIALOGUE`;
3. `AMBIENCE`;
4. `SFX`;
5. `MUSIC`.

Все клипы привязаны к `scene_id`/`beat_id`/`shot_id`, поэтому storyboard и видео используют тот же звуковой план.

## 6. Sound Engineering UI

В основном инженерном ribbon:

`Целиком | Сцены | Персонажи | Комикс | Звук | Видео | ⚙ Под капотом`

Вкладка `Звук` содержит:

- захват/загрузку аудио;
- STT;
- Voice Bible персонажей;
- рабочий Voice Studio;
- звуковую карту сцен;
- Audio Timeline.

Технические модели и сервисы остаются под `⚙ Под капотом`.

## 7. Что работает сейчас

- микрофон → STT;
- аудиофайл → STT;
- вставка transcript в произведение;
- системная локальная TTS-озвучка;
- постоянные voice presets персонажей;
- scene sound plan;
- Audio Timeline metadata;
- trace всех действий.

## 8. Что требует отдельного audio backend

Пока не заявляется как готовое:

- нейросетевой TTS с экспортом WAV;
- генерация музыки;
- генерация SFX;
- voice cloning;
- loudness normalization;
- многодорожечный mixdown;
- экспорт master audio/video.

Эти функции должны подключаться через отдельные провайдеры, не ломая `character_id`, `dialogue_id`, `scene_id` и timeline contract.

## 9. Traceability

Звуковой слой следует `TRACEABILITY_STANDARD.md`.

Нельзя писать в trace:

- полный transcript;
- сырой аудиофайл;
- ключи/токены;
- приватный текст рукописи.

Разрешена metadata: размер, MIME, длительность, идентификаторы, состояние, elapsed time и категория ошибки.
