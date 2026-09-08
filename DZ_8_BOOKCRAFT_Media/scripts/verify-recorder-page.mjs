import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { audioBufferToWavBlob, cutSelection, trimToSelection, drawWaveform } from "../src/recorder-audio.js";

const dom = new JSDOM("<!doctype html><body></body>", { url: "http://localhost", pretendToBeVisual: true });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage });
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
let rafId = 0;
const frames = new Map();
globalThis.requestAnimationFrame = fn => { frames.set(++rafId, fn); return rafId; };
globalThis.cancelAnimationFrame = id => frames.delete(id);
let confirms = true;
window.confirm = () => confirms;
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const coordinates = [];
const paint = new Proxy({}, { get: (_, key) => key === "moveTo" || key === "lineTo" ? (...args) => coordinates.push(args) : () => {}, set: () => true });
window.HTMLCanvasElement.prototype.getContext = () => paint;
window.HTMLCanvasElement.prototype.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100 });
const media = window.HTMLMediaElement.prototype;
Object.defineProperty(media, "paused", { get() { return this._paused !== false; } });
media.load = function () { this._paused = true; this.currentTime = 0; };
media.play = async function () { this._paused = false; this.dispatchEvent(new window.Event("play")); };
media.pause = function () { if (!this.paused) { this._paused = true; this.dispatchEvent(new window.Event("pause")); } };
const urls = new Map(); let urlId = 0; let revoked = 0;
URL.createObjectURL = blob => { const url = `blob:recorder-${++urlId}`; urls.set(url, blob); return url; };
URL.revokeObjectURL = url => { if (urls.delete(url)) ++revoked; };
const downloads = [];
window.HTMLAnchorElement.prototype.click = function () { downloads.push({ name: this.download, blob: urls.get(this.href) }); };
let copied = "";
Object.defineProperty(navigator, "clipboard", { value: { writeText: async text => { copied = text; } }, configurable: true });

class Buffer {
  constructor(channels, length, sampleRate) { this.numberOfChannels = channels; this.length = length; this.sampleRate = sampleRate; this.duration = length / sampleRate; this.data = Array.from({ length: channels }, () => new Float32Array(length)); }
  getChannelData(channel) { return this.data[channel]; }
  copyToChannel(data, channel) { this.data[channel].set(data); }
}
let decodeGate = null;
let decodeFailure = false;
const contexts = [];
const makeBuffer = () => {
  const buffer = new Buffer(2, 1000, 100);
  buffer.data[0].set(Array.from({ length: 1000 }, (_, i) => Math.sin(i / 10)));
  buffer.data[1].set(Array.from({ length: 1000 }, (_, i) => Math.cos(i / 10)));
  return buffer;
};
class Context {
  constructor() { this.state = "suspended"; contexts.push(this); }
  async resume() { this.state = "running"; }
  async suspend() { this.state = "suspended"; }
  async close() { this.state = "closed"; }
  createBuffer(...args) { return new Buffer(...args); }
  async decodeAudioData() { if (decodeGate) return decodeGate.promise; if (decodeFailure) throw new Error("Invalid audio"); return makeBuffer(); }
  createAnalyser() { return { fftSize: 2048, disconnect() {}, getByteTimeDomainData(data) { data.fill(140); } }; }
  createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
}
window.AudioContext = Context;
const streams = [];
const newStream = () => { const track = { stopped: false, stop() { this.stopped = true; } }; const stream = { getTracks: () => [track], getAudioTracks: () => [track] }; streams.push(stream); return stream; };
let micGate = null; let micFailure = null; let micRequests = 0; let constructorFailure = false;
Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia: async () => { ++micRequests; if (micGate) return micGate.promise; if (micFailure) throw micFailure; return newStream(); } }, configurable: true });
const recorders = [];
class Recorder {
  static isTypeSupported = type => type.includes("webm");
  constructor(stream) { if (constructorFailure) throw new Error("Recorder constructor failed"); this.stream = stream; this.state = "inactive"; this.mimeType = "audio/webm"; recorders.push(this); }
  start() { this.state = "recording"; }
  pause() { this.state = "paused"; }
  resume() { this.state = "recording"; }
  stop() {
    this.state = "inactive";
    const data = this.ondataavailable, stop = this.onstop;
    setTimeout(() => { data?.({ data: new Blob(["audio"], { type: this.mimeType }) }); stop?.(); }, 0);
  }
}
globalThis.MediaRecorder = Recorder;
const { mountRecorderPage } = await import("../src/recorder-page.js");
mountRecorderPage(); mountRecorderPage();
assert.equal(document.querySelectorAll(".br-launch").length, 1);
assert.equal(contexts.length, 0, "AudioContext is lazy");
const page = document.querySelector(".br-page");
const button = name => page.querySelector(`[data-action="${name}"]`);
const click = async name => { button(name).click(); await tick(); await tick(); };
const report = () => page._recorder.report();
const phase = () => report().recorder_state;
const preview = page.querySelector("audio");
const select = (start, end) => {
  const canvas = page.querySelector("canvas");
  for (const [type, x] of [["pointerdown", start], ["pointermove", end], ["pointerup", end]]) canvas.dispatchEvent(new window.MouseEvent(type, { clientX: x, button: 0 }));
};
const importFile = async (name = "story.mp3") => {
  const file = new Blob(["test audio"], { type: "audio/mpeg" }); file.name = name;
  const input = page.querySelector('input[type="file"]');
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  input.dispatchEvent(new window.Event("change")); await tick(); await tick();
};

try {
  document.querySelector(".br-launch").click();
  assert.ok(page.classList.contains("open"));
  micGate = deferred();
  await click("record"); await click("record");
  assert.equal(micRequests, 1, "double start only requests one stream");
  assert.equal(phase(), "REQUESTING");
  await click("new");
  const abandoned = newStream(); micGate.resolve(abandoned); micGate = null; await tick();
  assert.equal(phase(), "EMPTY"); assert.ok(abandoned.getTracks()[0].stopped, "late permission result releases tracks");

  await click("record");
  assert.equal(phase(), "RECORDING"); assert.equal(frames.size, 1);
  assert.ok(Number.parseInt(page.querySelector('[data-r="level"]').textContent) > 0);
  await click("pause-record"); assert.equal(phase(), "PAUSED"); assert.equal(frames.size, 0);
  await click("pause-record"); assert.equal(phase(), "RECORDING"); assert.equal(frames.size, 1);
  decodeGate = deferred();
  await click("stop"); assert.equal(phase(), "PROCESSING"); assert.ok(button("record").disabled);
  await click("new"); decodeGate.resolve(makeBuffer()); decodeGate = null; await tick();
  assert.equal(phase(), "EMPTY", "late decode cannot resurrect cleared recording");

  for (let i = 0; i < 2; i++) {
    await click("record"); await click("stop"); await tick();
    assert.equal(phase(), "RECORDED"); assert.equal(report().audio.duration_ms, 10000);
    assert.ok(streams.at(-1).getTracks()[0].stopped); assert.equal(frames.size, 0);
  }
  assert.ok(revoked > 0, "replacing audio revokes old URL");
  await click("play"); assert.equal(phase(), "PLAYING");
  await click("stop"); assert.equal(phase(), "RECORDED"); assert.equal(preview.currentTime, 0);
  select(30, 30); assert.equal(preview.currentTime, 3, "wave click seeks immediately");
  select(20, 40); assert.equal(report().selection.start_ms, 2000);
  await click("delete-selection"); assert.equal(report().audio.duration_ms, 8000);
  await click("undo"); assert.equal(report().audio.duration_ms, 10000);
  await click("redo"); assert.equal(report().audio.duration_ms, 8000);
  select(25, 75); await click("trim-selection"); assert.equal(report().audio.duration_ms, 4000);
  await click("undo"); assert.equal(report().audio.duration_ms, 8000);
  assert.ok(!report().audio.name.includes("-edited-edited"));
  await click("download"); assert.ok(downloads.at(-1).name.endsWith(".wav"));
  const wav = new DataView(await downloads.at(-1).blob.arrayBuffer());
  assert.equal(wav.getUint32(40, true), 800 * 2 * 2, "edited WAV contains expected PCM frame count");

  confirms = false;
  await click("clear"); assert.equal(report().audio.duration_ms, 8000, "cancel protects unsaved audio");
  confirms = true;
  await click("close"); document.querySelector(".br-launch").click();
  assert.equal(report().audio.duration_ms, 8000, "close/reopen preserves audio");
  const oldUrl = preview.src;
  decodeFailure = true;
  await importFile("broken.mp3");
  assert.equal(preview.src, oldUrl, "failed import preserves old preview");
  assert.equal(report().audio.duration_ms, 8000);
  decodeFailure = false;
  await importFile('<img src=x onerror="boom">.mp3');
  assert.equal(report().audio.duration_ms, 10000);
  assert.equal(page.querySelector('[data-r="events"] img'), null, "trace metadata never becomes HTML");

  micFailure = Object.assign(new Error("Permission denied"), { name: "NotAllowedError" });
  await click("record"); assert.equal(phase(), "RECORDED"); assert.equal(report().audio.duration_ms, 10000);
  assert.match(page.querySelector('[data-r="toast"]').textContent, /запрещён/); micFailure = null;
  constructorFailure = true; await click("record"); constructorFailure = false;
  assert.ok(streams.at(-1).getTracks()[0].stopped, "constructor failure releases microphone");
  assert.equal(phase(), "RECORDED");
  decodeFailure = true; await click("record"); await click("stop"); await tick(); decodeFailure = false;
  assert.equal(report().audio.channels, null, "decode failure cannot keep stale waveform");
  assert.ok(!button("play").disabled && !button("download").disabled, "undecodable captured audio is salvageable");
  assert.ok(button("delete-selection").disabled);
  await click("copy-report");
  const json = JSON.parse(copied); assert.equal(json.recorder_version, "3.1.0-hardened"); assert.ok(json.final_error);
  assert.ok(json.events.every((event, i, all) => i === 0 || event.seq > all[i - 1].seq));
  navigator.clipboard.writeText = async () => { throw new Error("denied"); };
  document.execCommand = () => false;
  await click("copy-report"); assert.equal(downloads.at(-1).name, "bookcraft-recorder-report.json");
  assert.match(page.querySelector('[data-r="toast"]').textContent, /JSON/);

  await importFile(); await click("record");
  const interrupted = recorders.at(-1); interrupted.onerror({ error: new Error("Device disconnected") });
  assert.equal(phase(), "RECORDED"); assert.ok(interrupted.stream.getTracks()[0].stopped);
  await click("record"); await click("new"); await tick(); assert.equal(phase(), "EMPTY");
  assert.ok(streams.every(stream => stream.getTracks()[0].stopped));
  assert.equal(frames.size, 0);

  const ctx = new Context(); const original = makeBuffer();
  const cut = cutSelection(ctx, original, 2, 4);
  for (let channel = 0; channel < 2; channel++) {
    assert.deepEqual(cut.getChannelData(channel), new Float32Array([...original.data[channel].slice(0, 200), ...original.data[channel].slice(400)]));
  }
  const trim = trimToSelection(ctx, original, 2, 4); assert.deepEqual(trim.data[1], original.data[1].slice(200, 400));
  const one = cutSelection(ctx, original, 0, 10); assert.equal(one.length, 1); assert.equal(one.data[0][0], 0);
  coordinates.length = 0;
  drawWaveform({ canvas: page.querySelector("canvas"), buffer: one });
  assert.ok(coordinates.every(([, y]) => y >= 0 && y <= 100));
  assert.ok(coordinates.slice(0, 200).every(([, y]) => y === 50), "short silence is flat across waveform");
  const header = new DataView(await audioBufferToWavBlob(trim).arrayBuffer());
  assert.equal(header.getUint16(22, true), 2); assert.equal(header.getUint32(24, true), 100);
  window.dispatchEvent(new window.Event("pagehide"));
  assert.equal(contexts[0].state, "closed");
  console.log("PASS RECORDER BEHAVIOR: recording lifecycle, async cancellation, editing PCM, import recovery, trace copy and resource cleanup.");
} finally {
  window.dispatchEvent(new window.Event("pagehide"));
  clearTimeout(page.querySelector('[data-r="toast"]')._t);
  dom.window.close();
}
