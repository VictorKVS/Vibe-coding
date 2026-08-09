# AI Secretary — Architecture for DZ 5 and OSINT reuse

## Goal
Build a Telegram bot in Google Colab that satisfies the DZ 5 requirements and is structured so the reusable components can later migrate into a larger OSINT system.

## Hard DZ 5 requirements
1. Accept audio/video (and links for large files).
2. Convert/extract audio when needed.
3. Transcribe through external API.
4. Save transcript to `transcripts/`.
5. Immediately after successful transcript save, send a separate message exactly:
   `Транскрибация завершена успешно.`
6. Analyze transcript into summary, tasks, assignees and next meeting date.
7. Write results to Google Sheets.
8. Produce a PDF protocol.
9. Allow grounded Q&A strictly against the latest transcript.
10. Use Colab Secrets for tokens/keys; no credentials in GitHub.

## Visual UX
Telegram itself does not allow a bot to set the user's chat wallpaper. Visual consistency is therefore achieved with:
- dark navy / graphite visual cards;
- cyan / blue accents;
- matching status copy and emoji;
- inline Telegram buttons below cards;
- no dates, names, prices, percentages or other dynamic data embedded into JPG/PNG;
- progress shown as editable Telegram text, not painted into images.

## GitHub → Colab asset loading
At every Colab start:
1. remove previous `/content/Vibe-coding` clone;
2. clone `https://github.com/VictorKVS/Vibe-coding.git`;
3. `cd` into `DZ_5_Integrations_files,_Sheets,_external_APIs`;
4. verify required screen assets;
5. start the bot.

Canonical asset layout:
```text
assets/screens/
├── start/             # SCR-001
│   ├── phone.jpg
│   ├── tablet.jpg
│   └── desktop.jpg
├── file_received/     # SCR-002
├── transcription/     # SCR-003
├── analysis/          # SCR-004
├── ready/             # SCR-005
└── ai_consultant/     # SCR-006
```

The production Telegram flow uses `phone.jpg` as the universal chat card. Tablet/desktop versions are for README/demo materials and cross-device presentation.

## Runtime flow
```text
/start
  ↓
SCR-001 start
  ↓
user sends audio/video/link
  ↓
SCR-002 file_received
  ↓
progress message created
  ↓
download file
  ↓
extract/convert audio
  ↓
SCR-003 transcription
  ↓
AssemblyAI transcription
  ↓
save transcripts/<id>.txt
  ↓
SEPARATE MESSAGE:
Транскрибация завершена успешно.
  ↓
SCR-004 analysis
  ↓
LLM summary/tasks/assignees/date
  ↓
Google Sheets append
  ↓
PDF protocol
  ↓
SCR-005 ready
  ↓
[📄 Скачать PDF] [💬 Задать вопрос] [🔄 Новая запись]
  ↓
SCR-006 ai_consultant
  ↓
grounded Q&A over transcript only
```

## Real progress model
Use one Telegram message and update it with `edit_text()` after real milestones. Suggested stages:
- received
- downloaded
- audio prepared
- transcription completed
- transcript saved
- AI analysis completed
- Sheets completed
- PDF completed

Percentages, if shown, are UI mapping to milestones, not elapsed-time estimates.

## Module boundaries
```text
src/
├── bot.py              # Telegram handlers and orchestration
├── config.py           # Colab Secrets / settings
├── assets.py           # screen resolution and validation
├── progress.py         # editable Telegram progress
├── ingestion.py        # Telegram files and URLs
├── media.py            # ffmpeg audio extraction/conversion
├── transcription.py    # AssemblyAI adapter
├── transcript_store.py # transcript persistence and metadata
├── analysis.py         # LLM summary/tasks/date extraction
├── sheets.py           # Google Sheets adapter
├── protocol.py         # PDF generation
├── qa.py               # grounded transcript Q&A
└── models.py           # typed data models
```

## OSINT migration strategy
Reusable components must not depend on the meeting domain.

### Reused directly in OSINT
- `ingestion.py` — files/URLs/source retrieval;
- `progress.py` — long-running job feedback;
- `transcript_store.py` — artifact storage + metadata;
- `assets.py` — UI asset handling;
- generic API adapters and retry/error handling;
- source metadata (`source_url`, `collected_at`, `source_type`, hashes);
- document export pipeline.

### Extended for OSINT
`transcription.py` becomes one extractor among many:
```text
source
├── audio/video → speech-to-text
├── html → page text
├── PDF → text
├── image → vision/OCR when required
└── social/public channel → normalized post text
```

`analysis.py` evolves from meeting extraction into:
- entity extraction;
- claims/facts;
- source reliability;
- chronology;
- contradictions;
- summaries;
- links between entities;
- approved/research/community layers.

## Data principle
Raw source data, derived text, and analytical conclusions are separate artifacts. Never overwrite the source with LLM output.

Example future OSINT record:
```json
{
  "source_id": "...",
  "source_type": "video|audio|url|pdf|telegram_public|web",
  "source_url": "...",
  "collected_at": "...",
  "raw_artifact": "...",
  "text_artifact": "...",
  "sha256": "...",
  "analysis_status": "...",
  "confidence": null
}
```

## Core reliability rules
- LLM does not invent transcript content.
- Q&A is grounded only in saved transcript.
- If information is absent: `В записи это не обсуждалось.`
- Google Sheets errors are surfaced to the user without losing the transcript.
- Failure in PDF generation must not erase transcription/analysis results.
- Duplicate processing is prevented per chat/message.
- Secrets never enter logs or GitHub.
