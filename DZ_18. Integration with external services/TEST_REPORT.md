# DZ-18 — Test Report

Дата: 2026-09-18

## Проверено в изолированной Node 22 среде

Результат:

```text
tests 8
pass 8
fail 0
duration ~191 ms
```

Проверены:

1. HeyGen health не раскрывает API key.
2. HeyGen v3 avatar groups/looks нормализуются в DTO.
3. HeyGen v3 voices нормализуются в DTO.
4. HeyGen Video Agent create формирует avatar/voice/script/orientation payload.
5. HeyGen session/video polling возвращает completed video URL.
6. OpenAI health не раскрывает API key.
7. Responses API structured generation использует `store:false` и strict `json_schema`.
8. OpenAI TTS использует `/v1/audio/speech`, `gpt-4o-mini-tts` и MP3.

## Что не было проверено в этой среде

Полный `npm install` и React/Vite build здесь не удалось выполнить из-за отсутствия DNS/network доступа к GitHub/npm registry.

Поэтому обязательный локальный gate остаётся:

```powershell
.\CHECK_DZ18.cmd
```

Он выполняет:

```text
npm test
npm run build
```

## Real-key acceptance

Требуется локально:

- OPENAI_API_KEY — Newsletter/Podcast/TTS;
- HEYGEN_API_KEY — avatars/voices/video agent;
- один успешный HeyGen video job до `completed`;
- screenshots из `EVIDENCE_MATRIX.md`.
