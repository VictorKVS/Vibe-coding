type TraceStatus = 'waiting' | 'running' | 'done' | 'error';

type TraceStep = {
  key: string;
  label: string;
  status: TraceStatus;
  detail?: string;
  durationMs?: number;
};

type TracePayload = {
  runId: string;
  source: 'client' | 'server';
  reset?: boolean;
  steps: TraceStep[];
  state?: 'running' | 'done' | 'error';
};

let activeRunId = '';
const clientSteps = new Map<string, TraceStep>();

function makeRunId() {
  return globalThis.crypto?.randomUUID?.() || `sonya-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function emitTrace(payload: TracePayload) {
  window.dispatchEvent(new CustomEvent('sonya:trace', { detail: payload }));
}

function snapshotClient(reset = false) {
  if (!activeRunId) return;
  emitTrace({
    runId: activeRunId,
    source: 'client',
    reset,
    steps: Array.from(clientSteps.values()),
    state: 'running',
  });
}

function setClientStep(step: TraceStep) {
  clientSteps.set(step.key, step);
  snapshotClient(false);
}

function beginTraceRun() {
  activeRunId = makeRunId();
  clientSteps.clear();
  emitTrace({ runId: activeRunId, source: 'client', reset: true, steps: [], state: 'running' });
  return activeRunId;
}

async function pollServerTrace(runId: string, signal: AbortSignal) {
  while (!signal.aborted) {
    try {
      const response = await fetch(`/api/trace?requestId=${encodeURIComponent(runId)}`, { signal });
      if (response.ok) {
        const payload = await response.json() as { steps?: TraceStep[]; state?: 'running' | 'done' | 'error' };
        emitTrace({
          runId,
          source: 'server',
          steps: payload.steps || [],
          state: payload.state || 'running',
        });
        if (payload.state === 'done' || payload.state === 'error') return;
      }
    } catch (error) {
      if (signal.aborted) return;
      console.debug('SONYA trace polling retry', error);
    }
    await new Promise(resolve => setTimeout(resolve, 450));
  }
}

export const api = {
  async post(url: string, data: unknown) {
    const runId = activeRunId || beginTraceRun();
    const controller = new AbortController();
    const started = performance.now();
    setClientStep({ key: 'client-request', label: 'Передача задачи локальному агенту', status: 'running', detail: 'POST /api/analyze' });

    const polling = url === '/api/analyze'
      ? pollServerTrace(runId, controller.signal)
      : Promise.resolve();

    try {
      const body = typeof data === 'object' && data !== null
        ? { ...(data as Record<string, unknown>), requestId: runId }
        : { data, requestId: runId };
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setClientStep({
          key: 'client-request',
          label: 'Передача задачи локальному агенту',
          status: 'error',
          detail: (payload as { error?: string }).error || `HTTP ${response.status}`,
          durationMs: Math.round(performance.now() - started),
        });
        throw new Error((payload as { error?: string }).error || `HTTP ${response.status}`);
      }
      setClientStep({
        key: 'client-request',
        label: 'Передача задачи локальному агенту',
        status: 'done',
        detail: 'Ответ API получен',
        durationMs: Math.round(performance.now() - started),
      });
      setClientStep({
        key: 'client-render',
        label: 'Передача результата в интерфейс',
        status: 'done',
        detail: 'Структурированный ответ готов к отображению',
      });
      return { data: payload };
    } finally {
      await Promise.race([polling, new Promise(resolve => setTimeout(resolve, 700))]);
      controller.abort();
    }
  },
};

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.split(',')[1] || '');
    };
    reader.readAsDataURL(blob);
  });
}

export const imageTools = {
  async resizeIfNeeded(
    file: File | Blob,
    options: {
      maxDimension?: number;
      maxPixels?: number;
      quality?: number;
      mimeType?: 'image/jpeg' | 'image/webp' | 'image/png';
    } = {}
  ) {
    beginTraceRun();
    const started = performance.now();
    setClientStep({
      key: 'client-image',
      label: 'Подготовка изображения',
      status: 'running',
      detail: 'Декодирование, масштабирование и JPEG-нормализация',
    });

    const maxDimension = options.maxDimension ?? 1600;
    const maxPixels = options.maxPixels ?? 2_000_000;
    const quality = options.quality ?? 0.82;
    const mimeType = options.mimeType ?? 'image/jpeg';
    const bitmap = await createImageBitmap(file);
    let width = bitmap.width;
    let height = bitmap.height;
    const dimensionScale = Math.min(1, maxDimension / Math.max(width, height));
    const pixelScale = Math.min(1, Math.sqrt(maxPixels / (width * height)));
    const scale = Math.min(dimensionScale, pixelScale);
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is unavailable');
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(result => result ? resolve(result) : reject(new Error('Image conversion failed')), mimeType, quality);
    });
    const data = await blobToBase64(blob);

    setClientStep({
      key: 'client-image',
      label: 'Подготовка изображения',
      status: 'done',
      detail: `${width}×${height}px · ${Math.round(blob.size / 1024)} KB${scale < 1 ? ' · уменьшено' : ''}`,
      durationMs: Math.round(performance.now() - started),
    });
    setClientStep({
      key: 'client-context',
      label: 'Сбор пользовательского контекста',
      status: 'done',
      detail: 'Режим, запрос, возраст, гости, бюджет и ограничения',
    });

    return {
      data,
      mimeType,
      width,
      height,
      bytes: blob.size,
      resized: scale < 1 || file.type !== mimeType,
    };
  },
};
