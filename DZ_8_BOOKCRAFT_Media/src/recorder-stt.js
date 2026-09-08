import { audioBufferToWavBlob, formatClock } from "./recorder-audio.js";

export function mountRecorderStt(page, { getBuffer, isBusy, trace }) {
  const panel = page.querySelector('.br-stt');
  panel.style.display = 'block';
  panel.innerHTML = `<strong>РАСПОЗНАВАНИЕ · РУССКИЙ</strong>
    <p data-stt="status" role="status" aria-live="polite">Запишите голос или импортируйте аудиофайл.</p>
    <div class="br-row"><button class="br-btn primary" data-action="recognize">✦ Распознать</button><button class="br-btn" data-stt="cancel" disabled>Отменить</button><button class="br-btn" data-stt="copy" disabled>Копировать текст</button><button class="br-btn" data-stt="save" disabled>Сохранить TXT</button></div>
    <progress data-stt="progress" max="100" value="0" style="width:100%;margin-top:14px" aria-label="Распознано аудио"></progress>
    <p data-stt="timing" style="font-size:12px;color:#9fb3cb">0%</p>
    <textarea data-stt="text" aria-label="Распознанный текст" readonly placeholder="Здесь появится текст по мере распознавания…" style="width:100%;box-sizing:border-box;min-height:180px;resize:vertical;background:#07111c;color:#eef5ff;border:1px solid #324359;border-radius:10px;padding:12px;font:14px/1.6 system-ui"></textarea>`;
  const q = name => panel.querySelector(`[data-stt="${name}"]`);
  const startButton = panel.querySelector('[data-action="recognize"]');
  let source = null, controller = null, run = 0, next = 0, parts = [], processingSeconds = 0, timer = null;
  let active = false, started = 0;
  const total = () => source ? Math.ceil(source.duration / 30) : 0;
  const refresh = () => {
    startButton.disabled = active || isBusy() || !getBuffer();
    startButton.textContent = next > 0 && next < total() ? '▶ Продолжить распознавание' : '✦ Распознать';
    q('cancel').disabled = !active;
    q('copy').disabled = q('save').disabled = !q('text').value;
  };
  const timing = () => {
    const processed = Math.min(source?.duration || 0, next * 30);
    const percent = source ? processed / source.duration * 100 : 0;
    const elapsed = processingSeconds + (active ? (performance.now() - started) / 1000 : 0);
    q('progress').value = percent;
    const eta = processed > 0 ? elapsed / processed * ((source?.duration || 0) - processed) : null;
    q('timing').textContent = `${Math.floor(percent)}% · ${formatClock(processed * 1000)} / ${formatClock((source?.duration || 0) * 1000)} · прошло ${formatClock(elapsed * 1000)}${eta === null ? '' : ` · осталось примерно ${formatClock(eta * 1000)}`}`;
  };
  const cancel = () => {
    if (!active) return;
    ++run; controller?.abort(); active = false; processingSeconds += (performance.now() - started) / 1000; clearInterval(timer);
    q('status').textContent = 'Отменено. Готовый текст сохранён; можно продолжить.';
    trace('stt.cancel', { completed_segments: next }); timing(); refresh();
  };
  const changed = () => {
    if (source && getBuffer() !== source) {
      cancel(); source = null; next = 0; parts = []; processingSeconds = 0;
      // Keep the old transcript available for copying until a new run starts.
      q('status').textContent = q('text').value ? 'Аудио изменилось. Ниже текст предыдущей версии; распознайте заново.' : 'Аудио готово к распознаванию.';
      timing();
    }
    refresh();
  };
  async function makeSegment(buffer, index) {
    const start = index * 30;
    const duration = Math.min(30, buffer.duration - start);
    const ctx = new OfflineAudioContext(1, Math.max(1, Math.round(duration * 16000)), 16000);
    const input = ctx.createBuffer(1, Math.max(1, Math.round(duration * buffer.sampleRate)), buffer.sampleRate);
    const mono = input.getChannelData(0);
    const offset = Math.round(start * buffer.sampleRate);
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < mono.length; i++) mono[i] += (data[offset + i] || 0) / buffer.numberOfChannels;
    }
    const node = ctx.createBufferSource(); node.buffer = input; node.connect(ctx.destination); node.start();
    return audioBufferToWavBlob(await ctx.startRendering());
  }
  startButton.addEventListener('click', async () => {
    if (active || isBusy() || !getBuffer()) return;
    if (source !== getBuffer() || next >= total()) {
      source = getBuffer(); next = 0; parts = []; processingSeconds = 0; q('text').value = '';
    }
    active = true; const id = ++run; controller = new AbortController(); const signal = controller.signal;
    started = performance.now(); timer = setInterval(timing, 500); refresh(); timing();
    trace('stt.start', { duration_ms: Math.round(source.duration * 1000), segments: total(), resume_from: next });
    try {
      q('status').textContent = 'Проверка локального Whisper…';
      const health = await fetch('/recorder-stt/health', { signal });
      if (!health.ok) throw new Error('Сервис распознавания не запущен. Запустите START_RECORDER_STT.cmd.');
      const readiness = await health.json();
      if (!readiness.ready) throw new Error('Whisper или модель не настроены. Проверьте запуск сервиса.');
      while (next < total()) {
        if (id !== run) return;
        q('status').textContent = `Подготовка фрагмента ${next + 1} из ${total()}…`;
        const blob = await makeSegment(source, next);
        if (id !== run) return;
        q('status').textContent = `Whisper · ${readiness.model} · фрагмент ${next + 1} из ${total()}`;
        const form = new FormData(); form.append('audio', blob, 'segment.wav');
        const response = await fetch('/recorder-stt/segment', { method: 'POST', body: form, signal });
        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(typeof error.detail === 'string' ? error.detail : `Сервис вернул HTTP ${response.status}`);
        }
        const result = await response.json();
        if (id !== run) return;
        if (typeof result.text !== 'string') throw new Error('Некорректный ответ сервиса распознавания.');
        parts.push(result.text); next++;
        q('text').value = parts.filter(Boolean).join('\n\n');
        trace('stt.segment.ready', { segment: next, total: total(), elapsed_seconds: result.elapsed_seconds }); timing(); refresh();
      }
      q('status').textContent = q('text').value ? 'Готово. Текст можно скопировать или сохранить.' : 'Обработка завершена. Разборчивая речь не найдена.';
      trace('stt.finish', { segments: next }, 'ready');
    } catch (error) {
      if (id !== run) return;
      q('status').textContent = `${error.message} Готовые фрагменты сохранены; можно повторить.`;
      trace('stt.error', { operation: 'recognition', segment: next + 1, error: error.message }, 'error');
    } finally {
      if (id === run) { processingSeconds += (performance.now() - started) / 1000; active = false; clearInterval(timer); timing(); refresh(); }
    }
  });
  q('cancel').addEventListener('click', cancel);
  q('copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(q('text').value); q('status').textContent = 'Текст скопирован.'; }
    catch { q('text').focus(); q('text').select(); q('status').textContent = 'Нажмите Ctrl+C для копирования выделенного текста.'; }
  });
  q('save').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob(['\uFEFF' + q('text').value], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'bookcraft-transcript.txt'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    trace('stt.text.download');
  });
  window.addEventListener('pagehide', cancel);
  refresh();
  return { changed, active: () => active };
}
