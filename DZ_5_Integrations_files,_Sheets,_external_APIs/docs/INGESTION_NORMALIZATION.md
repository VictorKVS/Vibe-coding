# Ingestion & Normalization Layer

## Зачем он нужен

Telegram, ссылки и будущая OSINT-система могут получать файлы в разных контейнерах, кодеках, форматах и языках. Бизнес-логика бота не должна зависеть от конкретного расширения файла.

## Pipeline

```text
Telegram / URL / OSINT source
        ↓
Artifact + SHA-256
        ↓
проверка типа
        ↓
сохранение ORIGINAL
        ↓
File Router
   ├─ audio → FFmpeg → normalized.wav
   ├─ video → FFmpeg → normalized.wav
   ├─ image → Pillow/ImageMagick → normalized image
   └─ document → parser → ExtractedContent
        ↓
Transcription / parsing / vision
        ↓
AI analysis
```

## Правила

1. Оригинал всегда сохраняется отдельно и не перезаписывается.
2. До преобразования считается SHA-256.
3. Расширение файла не считается достаточным доказательством типа.
4. По возможности сравниваются имя, MIME Telegram и сигнатура файла.
5. Аудио и видео приводятся к единому аудиоформату для транскрибации.
6. Документы превращаются в единый `ExtractedContent`.
7. Язык хранится как метаданные; исходный текст не уничтожается переводом.
8. Нормализованный файл используется для анализа, оригинал — для аудита, дедупликации и будущей OSINT-доказательной базы.

## План форматов

- Audio/video: mp3, wav, m4a, aac, ogg, opus, flac, mp4, mov, mkv, webm, avi через FFmpeg/ffprobe.
- Images: jpg, jpeg, png, webp, bmp, tiff; HEIC при наличии соответствующего декодера.
- Documents: PDF, DOCX, XLSX, PPTX, TXT, CSV, HTML, JSON, XML.

## OSINT migration

`Artifact` и `ExtractedContent` являются общими контрактами. В будущей OSINT-системе источником Artifact может быть Telegram, веб-страница, Google Drive, email, публичный канал, PDF, фото, видео или архив.
