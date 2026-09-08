export const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
];

export function preferredMime() {
  if (typeof MediaRecorder === "undefined") return "";
  return MIME_CANDIDATES.find((item) => MediaRecorder.isTypeSupported?.(item)) || "";
}

export function formatClock(ms) {
  const total = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return hours
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} Б`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} КБ`;
  return `${(value / 1024 / 1024).toFixed(2)} МБ`;
}

export function audioBufferToWavBlob(buffer) {
  const channels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const frames = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = channels * bytesPerSample;
  const dataSize = frames * blockAlign;
  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);
  const writeString = (offset, value) => {
    for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);
  let offset = 44;
  const channelData = Array.from({ length: channels }, (_, channel) => buffer.getChannelData(channel));
  for (let frame = 0; frame < frames; frame += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      const sample = Math.max(-1, Math.min(1, channelData[channel][frame]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([arrayBuffer], { type: "audio/wav" });
}

export function cloneAudioBuffer(context, source) {
  const copy = context.createBuffer(source.numberOfChannels, source.length, source.sampleRate);
  for (let channel = 0; channel < source.numberOfChannels; channel += 1) {
    copy.copyToChannel(source.getChannelData(channel), channel);
  }
  return copy;
}

export function cutSelection(context, source, startSeconds, endSeconds) {
  const start = Math.max(0, Math.min(source.length, Math.floor(startSeconds * source.sampleRate)));
  const end = Math.max(start, Math.min(source.length, Math.ceil(endSeconds * source.sampleRate)));
  const target = context.createBuffer(source.numberOfChannels, Math.max(1, source.length - (end - start)), source.sampleRate);
  for (let channel = 0; channel < source.numberOfChannels; channel += 1) {
    const input = source.getChannelData(channel);
    const output = target.getChannelData(channel);
    output.set(input.subarray(0, start), 0);
    output.set(input.subarray(end), start);
  }
  return target;
}

export function trimToSelection(context, source, startSeconds, endSeconds) {
  const start = Math.max(0, Math.min(source.length - 1, Math.floor(startSeconds * source.sampleRate)));
  const end = Math.max(start + 1, Math.min(source.length, Math.ceil(endSeconds * source.sampleRate)));
  const target = context.createBuffer(source.numberOfChannels, end - start, source.sampleRate);
  for (let channel = 0; channel < source.numberOfChannels; channel += 1) {
    target.copyToChannel(source.getChannelData(channel).subarray(start, end), channel);
  }
  return target;
}

const peakCache = new WeakMap();

export function drawWaveform({ canvas, buffer, selection, playhead = 0 }) {
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.max(1, window.devicePixelRatio || 1);
  const widthPx = Math.max(1, Math.floor(rect.width * ratio));
  const heightPx = Math.max(1, Math.floor(rect.height * ratio));
  if (canvas.width !== widthPx || canvas.height !== heightPx) {
    canvas.width = widthPx;
    canvas.height = heightPx;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);
  if (!buffer) return;
  const data = buffer.getChannelData(0);
  const width = Math.max(1, Math.floor(rect.width));
  let peaks = peakCache.get(buffer);
  if (!peaks || peaks.width !== width) {
    peaks = { width, minimum: new Float32Array(width), maximum: new Float32Array(width) };
    for (let x = 0; x < width; x += 1) {
      const begin = Math.min(data.length - 1, Math.floor(x * data.length / width));
      const finish = Math.min(data.length, Math.max(begin + 1, Math.floor((x + 1) * data.length / width)));
      let min = 1, max = -1;
      for (let index = begin; index < finish; index += 1) {
        const value = data[index];
        if (value < min) min = value;
        if (value > max) max = value;
      }
      peaks.minimum[x] = min; peaks.maximum[x] = max;
    }
    peakCache.set(buffer, peaks);
  }
  const center = rect.height / 2;
  ctx.beginPath();
  for (let x = 0; x < width; x += 1) {
    ctx.moveTo(x, center + peaks.minimum[x] * rect.height * 0.42);
    ctx.lineTo(x, center + peaks.maximum[x] * rect.height * 0.42);
  }
  ctx.strokeStyle = "rgba(74,230,177,.96)";
  ctx.lineWidth = 1;
  ctx.stroke();
  if (selection && buffer.duration > 0) {
    const x1 = (selection.start / buffer.duration) * rect.width;
    const x2 = (selection.end / buffer.duration) * rect.width;
    ctx.fillStyle = "rgba(72,141,230,.25)";
    ctx.fillRect(x1, 0, x2 - x1, rect.height);
    ctx.strokeStyle = "rgba(125,187,255,.9)";
    ctx.strokeRect(x1 + 0.5, 0.5, Math.max(1, x2 - x1 - 1), rect.height - 1);
  }
  if (buffer.duration > 0) {
    const x = (Math.max(0, Math.min(buffer.duration, playhead)) / buffer.duration) * rect.width;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, rect.height);
    ctx.strokeStyle = "rgba(255,224,125,.95)";
    ctx.stroke();
  }
}
