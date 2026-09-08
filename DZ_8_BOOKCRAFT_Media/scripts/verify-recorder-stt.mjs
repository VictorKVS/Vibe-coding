import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { mountRecorderStt } from '../src/recorder-stt.js';

const dom = new JSDOM('<section><div class="br-stt"></div></section>', { url: 'http://localhost' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document });
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
const deferred = () => { let resolve; const promise = new Promise(r => resolve = r); return { promise, resolve }; };
const buffer = seconds => ({ duration: seconds, sampleRate: 16000, numberOfChannels: 1, getChannelData: () => new Float32Array(seconds * 16000) });
globalThis.OfflineAudioContext = class {
  constructor(channels, length, sampleRate) { Object.assign(this, { channels, length, sampleRate }); }
  createBuffer(channels, length) { return { getChannelData: () => new Float32Array(length) }; }
  createBufferSource() { return { connect() {}, start() {} }; }
  async startRendering() { return { numberOfChannels: 1, sampleRate: 16000, length: this.length, getChannelData: () => new Float32Array(this.length) }; }
};
let current = buffer(65), busy = false, calls = 0, gate = null, fail = false;
const traces = [];
globalThis.fetch = async (url, options) => {
  if (url.endsWith('health')) return { ok: true, json: async () => ({ ready: true, model: 'test' }) };
  calls++;
  assert.ok(options.body.get('audio').size < 1_100_000);
  if (gate) await gate.promise;
  if (fail) return { ok: false, json: async () => ({ detail: 'Test failure' }) };
  return { ok: true, json: async () => ({ text: `Фраза ${calls}`, elapsed_seconds: 1 }) };
};
const page = document.querySelector('section');
const api = mountRecorderStt(page, { getBuffer: () => current, isBusy: () => busy, trace: (...args) => traces.push(args) });
const q = name => page.querySelector(`[data-stt="${name}"]`);
const start = () => page.querySelector('[data-action="recognize"]').click();
try {
  start(); for (let i = 0; i < 10; i++) await tick();
  assert.equal(calls, 3); assert.equal(q('progress').value, 100); assert.match(q('text').value, /Фраза 3/);
  assert.ok(!JSON.stringify(traces).includes('Фраза'), 'transcript is not traced');
  current = buffer(60); api.changed(); assert.match(q('status').textContent, /предыдущей/);
  gate = deferred(); start(); await tick(); await tick(); q('cancel').click();
  gate.resolve(); gate = null; await tick(); await tick();
  assert.equal(q('progress').value, 0); assert.equal(q('text').value, ''); assert.ok(!api.active());
  fail = true; start(); await tick(); await tick(); assert.match(q('status').textContent, /Test failure/);
  fail = false; start(); for (let i = 0; i < 6; i++) await tick(); assert.equal(q('progress').value, 100);
  // Changing the source during a pending response must never attach old text to it.
  current = buffer(45); api.changed(); gate = deferred(); start(); await tick(); await tick();
  current = buffer(10); api.changed(); gate.resolve(); gate = null; await tick();
  assert.equal(q('text').value, ''); assert.ok(!api.active());
  busy = true; api.changed(); assert.ok(page.querySelector('[data-action="recognize"]').disabled);
  console.log('PASS RECORDER STT: bounded segments, progress, cancellation, retry, stale responses, text privacy.');
} finally { window.dispatchEvent(new window.Event('pagehide')); dom.window.close(); }
