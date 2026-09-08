# BOOK.CRAFT Recorder 3.1.0

Base: `c5449b8`, tracking `agent/bookcraft-recorder-rebuild`.
Task: `CODEX_RECORDER_TASK.md`. Scope: recorder only, no STT.

## Changes

- Explicit REQUESTING and PROCESSING phases prevent double starts and edits while audio is pending.
- Operation identifiers discard late microphone/decode/stop results after cancellation.
- Recorder failures, cancellation, stop and page lifecycle release microphone tracks, animation frames and audio resources.
- Failed imports preserve the previous file, waveform and history. If captured audio cannot be decoded, its original blob remains playable/exportable without a stale waveform.
- Playback Stop resets the playhead; waveform click seeks immediately. Pointer cancellation clears incomplete selections.
- Edits and undo/redo use immutable AudioBuffers, preserve channels and export PCM WAV. The original remains reachable through undo; history retains the original and up to 19 recent snapshots.
- Waveform peaks are cached for playback/selections; very short buffers span the full canvas. Large audio still requires browser memory and synchronous PCM editing/export can take time.
- Unsaved replacement/deletion and leaving the page have loss protection. Closing/reopening the recorder preserves the current audio.
- Trace metadata is rendered as text, not HTML. Reports contain version, capabilities, audio metadata and latest error. Clipboard failure downloads JSON instead of falsely reporting success.
- Improved small-screen button alignment, text sizes, focus indicators and scrolling.
- The original START_BOOKCRAFT_MEDIA.ps1 was restored from the baseline; its contents were not changed.

## Validation

`npm test` and `npm run build` passed on Windows with Node 24.18.0.

The new `scripts/verify-recorder-page.mjs` executes the UI controller in JSDOM with deterministic microphone/recorder/audio-context doubles. It checks permission cancellation, duplicate Start, cancellation during decode, repeated recording, Pause/Resume, playback Stop, seek, range edits, Undo/Redo, WAV frames/channels, failed imports, permission denial, recorder construction/runtime failures, report copying/fallback and resource release.

The existing test suite also passed, including React UI and project controls. Browser inspection confirmed the full-screen page opens and controls are present. This is not a substitute for the real-microphone acceptance flow below.

## Remaining manual acceptance

Record 15–20 seconds → Pause → Continue → Stop → Play → seek → select a middle fragment → delete → play across boundary → Undo → Redo → Save → import the saved WAV → Copy report.

Real microphone recording, audible edit-boundary quality and the complete save/reimport flow still require a manual check on the user's browser/device. STT remains disabled until this passes.
