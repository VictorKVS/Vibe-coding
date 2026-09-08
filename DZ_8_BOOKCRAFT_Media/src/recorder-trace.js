const TRACE_KEY = "bookcraft.recorder.trace.v3";
const MAX_EVENTS = 180;

function sessionId() {
  return globalThis.crypto?.randomUUID?.() || `rec-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function safeMeta(meta = {}) {
  return Object.fromEntries(Object.entries(meta).slice(0, 30).map(([key, value]) => {
    if (/text|prompt|transcript|token|secret|password|authorization/i.test(key)) return [key, "[REDACTED]"];
    if (typeof value === "string") return [key, value.slice(0, 240)];
    if (typeof value === "number" || typeof value === "boolean" || value == null) return [key, value];
    return [key, String(value).slice(0, 240)];
  }));
}

export function createRecorderTrace(onChange = () => {}) {
  const state = {
    sessionId: sessionId(),
    sequence: 0,
    events: [],
  };

  try {
    const saved = JSON.parse(localStorage.getItem(TRACE_KEY) || "null");
    if (Array.isArray(saved?.events)) {
      state.events = saved.events.slice(-40);
      state.sequence = Math.max(0, ...state.events.map((event) => Number(event.seq) || 0));
    }
  } catch {}

  const persist = () => {
    try {
      localStorage.setItem(TRACE_KEY, JSON.stringify({
        session_id: state.sessionId,
        updated_at: new Date().toISOString(),
        events: state.events.slice(-MAX_EVENTS),
      }));
    } catch {}
  };

  const trace = (event, recorderState, meta = {}, kind = "") => {
    state.sequence += 1;
    state.events.push({
      seq: state.sequence,
      time: new Date().toISOString(),
      event,
      state: recorderState,
      kind,
      meta: safeMeta(meta),
    });
    if (state.events.length > MAX_EVENTS) state.events = state.events.slice(-MAX_EVENTS);
    persist();
    onChange(state);
    try { console.info("[BOOKCRAFT RECORDER]", event, safeMeta(meta)); } catch {}
  };

  const clear = (recorderState) => {
    state.events = [];
    state.sequence = 0;
    trace("trace.cleared", recorderState, {}, "warn");
  };

  const buildReport = ({ recorderState, runtime, audio, selection }) => ({
    schema: "bookcraft.recorder.trace.v3",
    generated_at: new Date().toISOString(),
    session_id: state.sessionId,
    recorder_state: recorderState,
    runtime,
    audio,
    selection,
    events: state.events,
  });

  return { state, trace, clear, buildReport };
}
