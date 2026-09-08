# CODEX TASK — BOOK.CRAFT Recorder hardening

Branch: `agent/bookcraft-recorder-rebuild`
Baseline: `c5449b8`
Scope: recorder only. Do not redesign login/cover/project navigation. Do not add STT yet.

## Goal
Bring the BOOK.CRAFT recorder page to a production-like, stable state before Whisper/STT is connected.

## Required UX
- Clicking `🎙 Диктофон` opens a dedicated full-screen recorder workspace, not a small popup.
- Large real waveform area.
- Recording controls: Start, Pause, Continue, Stop, New recording.
- Playback after recording.
- Click waveform to move playhead.
- Mouse drag selects an audio range.
- Edit controls: Delete selection, Trim to selection, Undo, Redo, Clear selection.
- Import local audio: MP3/WAV/M4A/OGG/WebM where browser decoding allows it.
- Save edited audio locally.
- Clear/remove current recording.
- State machine must be explicit: EMPTY, RECORDING, PAUSED, RECORDED/READY, EDITING.
- Buttons must enable/disable consistently with state.

## Waveform / audio requirements
- Live microphone waveform during recording.
- Real input-level meter.
- Timer during recording, pause-aware.
- After stop/import, draw waveform from decoded AudioBuffer, not a decorative animation.
- Selection overlay/markers must correspond to real times.
- Editing must operate on AudioBuffer data and regenerate playback/export audio.
- Preserve original recording in memory so Undo can restore edits.
- Avoid destructive changes until the user confirms/exports.

## Trace / diagnostics — mandatory
Keep the on-screen `ТРАССИРОВКА / ОТЧЁТ` panel visible on the recorder page.
Record metadata-only events for:
- recorder page open/close
- microphone request / ready / error
- recording start / pause / resume / stop
- blob/file received
- decode start / success / error
- playback start / pause / seek / end
- selection create / change / clear
- delete selection
- trim selection
- undo / redo
- import start / success / error
- export/save
- clear recording
- unexpected exceptions

Each event should include safe fields when available: timestamp, state, MIME, size_bytes, duration_ms, selection start/end, operation name, browser API error name/message. Do NOT log audio bytes, transcript text, manuscript text, tokens, secrets or API keys.

The `Копировать отчёт` action must copy a self-contained JSON report that can be pasted into ChatGPT and understood without extra context. Include:
- recorder version/build marker
- current state
- user agent/browser capability flags
- MediaRecorder support and chosen MIME
- AudioContext/sample rate/channel count when available
- file metadata
- current selection
- ordered event list
- final error summary if any

## Reliability requirements
- No MutationObserver loops.
- No duplicate recorder mount/button after React re-renders.
- Closing/opening recorder must not lose a finished recording unless user explicitly clears it.
- Starting a new recording must stop old streams/tracks and release AudioContext resources correctly.
- Object URLs must be revoked when replaced/cleared.
- Repeated Start/Pause/Resume/Stop cycles must work.
- Import after recording and recording after import must both work.
- Browser denial of microphone permission must produce a clear visible error and trace entry.

## Privacy
Recorder is local-first. Until STT stage is added, no audio may be uploaded or sent to backend/network. Trace contains metadata only.

## Tests / acceptance
Extend `scripts/verify-recorder-page.mjs` (or the existing recorder verifier) to gate at least:
- full-screen page mount
- MediaRecorder use
- mic constraints
- live analyser waveform
- real level meter
- timer
- pause/resume
- playback
- waveform selection
- delete selection
- trim selection
- undo/redo
- local import/export
- trace report copy
- no `/api/stt/` call in recorder stage

Run and keep green:
- `npm test`
- `npm run build`

## Manual acceptance flow
1. Open recorder.
2. Record 15–20 s.
3. Pause.
4. Resume.
5. Stop.
6. Play.
7. Click waveform to seek.
8. Drag-select a middle fragment.
9. Delete selection.
10. Play across edit boundary.
11. Undo.
12. Redo.
13. Save audio.
14. Import saved audio.
15. Copy trace report.

Do not start Whisper/STT work until this flow is stable and the pasted trace is clean.
