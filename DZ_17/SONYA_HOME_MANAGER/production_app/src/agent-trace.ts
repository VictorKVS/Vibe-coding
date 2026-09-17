type TraceStatus = 'waiting' | 'running' | 'done' | 'error';

type TraceStep = {
  key: string;
  label: string;
  status: TraceStatus;
  detail?: string;
  durationMs?: number;
};

type TraceEventDetail = {
  runId: string;
  source: 'client' | 'server';
  reset?: boolean;
  steps?: TraceStep[];
  state?: 'running' | 'done' | 'error';
};

let currentRunId = '';
let clientSteps: TraceStep[] = [];
let serverSteps: TraceStep[] = [];
let traceState: 'idle' | 'running' | 'done' | 'error' = 'idle';
let collapsed = false;

const statusText: Record<TraceStatus, string> = {
  waiting: 'WAIT',
  running: 'RUN',
  done: 'OK',
  error: 'ERR',
};

function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    #sonya-agent-trace{position:fixed;right:14px;bottom:14px;z-index:90;width:min(430px,calc(100vw - 28px));font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#eafaff;background:linear-gradient(145deg,rgba(66,182,229,.18),rgba(3,21,40,.91));border:1px solid rgba(169,231,255,.3);border-radius:20px;box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 18px 55px rgba(0,10,28,.46),0 0 28px rgba(62,205,255,.08);backdrop-filter:blur(22px) saturate(1.15);overflow:hidden;transition:height .2s ease,opacity .2s ease}
    #sonya-agent-trace *{box-sizing:border-box}
    .sat-head{display:grid;grid-template-columns:1fr auto;align-items:center;gap:10px;padding:11px 12px;border-bottom:1px solid rgba(153,224,251,.11);background:rgba(3,18,33,.25)}
    .sat-title{display:flex;align-items:center;gap:9px;min-width:0}.sat-led{width:8px;height:8px;border-radius:50%;background:#72e6ba;box-shadow:0 0 12px #72e6ba}.sat-led.running{background:#6ee8ff;box-shadow:0 0 14px #6ee8ff;animation:satPulse 1s ease-in-out infinite}.sat-led.error{background:#ff8f9c;box-shadow:0 0 12px #ff8f9c}.sat-title b{display:block;font:700 11px/1.2 Consolas,monospace;letter-spacing:.12em}.sat-title small{display:block;margin-top:3px;color:#7faabc;font:500 9px/1.2 Consolas,monospace;letter-spacing:.06em}.sat-actions{display:flex;gap:5px}.sat-actions button{width:29px;height:29px;border-radius:9px;border:1px solid rgba(159,225,249,.13);background:rgba(3,18,32,.44);color:#b9dce8;cursor:pointer}.sat-body{max-height:440px;overflow:auto;padding:9px}.sat-empty{padding:15px 12px;color:#7fa7b8;font-size:11px;text-align:center}.sat-step{display:grid;grid-template-columns:29px minmax(0,1fr) auto;gap:9px;align-items:start;position:relative;padding:8px 7px;border-radius:12px}.sat-step:not(:last-child):after{content:'';position:absolute;left:21px;top:32px;bottom:-8px;width:1px;background:linear-gradient(rgba(111,220,255,.24),rgba(111,220,255,.04))}.sat-node{width:27px;height:27px;border-radius:9px;display:grid;place-items:center;border:1px solid rgba(150,221,248,.14);background:rgba(3,19,34,.5);font:700 8px/1 Consolas,monospace;color:#789fb0;position:relative;z-index:1}.sat-step.done .sat-node{color:#7ce7c0;border-color:rgba(112,230,190,.24);background:rgba(51,166,126,.1)}.sat-step.running .sat-node{color:#7eeaff;border-color:rgba(103,223,255,.33);background:rgba(56,176,219,.13);box-shadow:0 0 14px rgba(73,210,255,.1)}.sat-step.error .sat-node{color:#ff9eaa;border-color:rgba(255,135,150,.26);background:rgba(160,48,66,.13)}.sat-copy b{display:block;color:#e9faff;font-size:11px;line-height:1.35;font-weight:650}.sat-copy small{display:block;margin-top:2px;color:#7fa8b9;font-size:9px;line-height:1.35}.sat-time{padding-top:3px;color:#6f9aab;font:600 8px/1 Consolas,monospace;white-space:nowrap}.sat-step.running .sat-time{color:#72dffb}.sat-foot{display:flex;justify-content:space-between;gap:10px;padding:7px 12px 9px;color:#668fa0;font:500 8px/1.35 Consolas,monospace;border-top:1px solid rgba(153,224,251,.08)}#sonya-agent-trace.collapsed .sat-body,#sonya-agent-trace.collapsed .sat-foot{display:none}#sonya-agent-trace.collapsed .sat-head{border-bottom:0}
    @keyframes satPulse{0%,100%{opacity:.55;transform:scale(.85)}50%{opacity:1;transform:scale(1.15)}}
    @media(max-width:720px){#sonya-agent-trace{left:8px;right:8px;bottom:76px;width:auto}.sat-body{max-height:300px}}
    @media(prefers-reduced-motion:reduce){.sat-led.running{animation:none}}
  `;
  document.head.appendChild(style);
}

function ensurePanel() {
  let panel = document.getElementById('sonya-agent-trace');
  if (panel) return panel;
  panel = document.createElement('aside');
  panel.id = 'sonya-agent-trace';
  panel.innerHTML = '<div class="sat-head"><div class="sat-title"><i class="sat-led"></i><div><b>AGENT TRACE</b><small>SONYA LOCAL · ожидает задачу</small></div></div><div class="sat-actions"><button type="button" title="Свернуть">–</button></div></div><div class="sat-body"><div class="sat-empty">После запуска анализа здесь появится реальная последовательность выполнения.</div></div><div class="sat-foot"><span>OPERATIONAL TRACE</span><span>без скрытых рассуждений модели</span></div>';
  panel.querySelector('button')?.addEventListener('click', () => {
    collapsed = !collapsed;
    panel?.classList.toggle('collapsed', collapsed);
    const button = panel?.querySelector('button');
    if (button) button.textContent = collapsed ? '+' : '–';
  });
  document.body.appendChild(panel);
  return panel;
}

function mergeSteps() {
  const order = [
    'client-image',
    'client-context',
    'client-request',
    'server-validate',
    'server-context',
    'server-model',
    'server-ollama',
    'server-parse',
    'server-complete',
    'client-render',
  ];
  const all = [...clientSteps, ...serverSteps];
  return all.sort((a, b) => {
    const ai = order.indexOf(a.key);
    const bi = order.indexOf(b.key);
    return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char] || char));
}

function render() {
  const panel = ensurePanel();
  const steps = mergeSteps();
  const led = panel.querySelector('.sat-led');
  led?.classList.toggle('running', traceState === 'running');
  led?.classList.toggle('error', traceState === 'error');

  const subtitle = panel.querySelector('.sat-title small');
  if (subtitle) {
    const stateLabel = traceState === 'running' ? 'RUNNING' : traceState === 'done' ? 'DONE' : traceState === 'error' ? 'ERROR' : 'ожидает задачу';
    subtitle.textContent = `SONYA LOCAL · ${stateLabel}${currentRunId ? ` · ${currentRunId.slice(0, 8)}` : ''}`;
  }

  const body = panel.querySelector('.sat-body');
  if (!body) return;
  if (!steps.length) {
    body.innerHTML = '<div class="sat-empty">После запуска анализа здесь появится реальная последовательность выполнения.</div>';
    return;
  }
  body.innerHTML = steps.map((step, index) => {
    const detail = step.detail ? `<small>${escapeHtml(step.detail)}</small>` : '';
    const time = typeof step.durationMs === 'number' ? `${step.durationMs} ms` : step.status === 'running' ? 'LIVE' : '';
    return `<div class="sat-step ${step.status}"><div class="sat-node">${statusText[step.status]}</div><div class="sat-copy"><b>${String(index + 1).padStart(2, '0')} · ${escapeHtml(step.label)}</b>${detail}</div><div class="sat-time">${time}</div></div>`;
  }).join('');
  body.scrollTop = body.scrollHeight;
}

function upsertClientSteps(steps: TraceStep[]) {
  clientSteps = steps;
}

function upsertServerSteps(steps: TraceStep[]) {
  serverSteps = steps;
}

function handleTrace(event: Event) {
  const detail = (event as CustomEvent<TraceEventDetail>).detail;
  if (!detail?.runId) return;
  if (detail.reset || detail.runId !== currentRunId) {
    currentRunId = detail.runId;
    clientSteps = [];
    serverSteps = [];
    traceState = 'running';
  }
  if (detail.source === 'client') upsertClientSteps(detail.steps || []);
  if (detail.source === 'server') upsertServerSteps(detail.steps || []);
  if (detail.state === 'done') traceState = 'done';
  else if (detail.state === 'error') traceState = 'error';
  else traceState = 'running';
  render();
}

injectStyles();
ensurePanel();
render();
window.addEventListener('sonya:trace', handleTrace);
