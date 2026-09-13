import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);

function arg(name, fallback = '') {
  const prefix = `--${name}=`;
  const value = process.argv.find((item) => item.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function safePart(value) {
  return String(value).replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120);
}

function timestampForFile() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

const baseUrl = arg('base', 'http://127.0.0.1:3000').replace(/\/$/, '');
const questId = arg('quest', 'Q-KB-001');
const maturityId = arg('maturity', '');

let maturity = null;
if (maturityId) {
  const maturityPath = path.resolve('knowledge', 'zoo', 'maturity-levels.json');
  const maturityDoc = JSON.parse(await fs.readFile(maturityPath, 'utf8'));
  maturity = maturityDoc.levels?.find((item) => item.id === maturityId) || null;
  if (!maturity) throw new Error(`Unknown maturity level: ${maturityId}`);
}

const modelList = arg('models', 'demo').split(',').map((item) => item.trim()).filter(Boolean);
const defaultCompositions = maturity
  ? maturity.compositions.join(',')
  : 'single,relay_critic,parallel_synthesis,specialist_pipeline';
const compositionList = arg('compositions', defaultCompositions).split(',').map((item) => item.trim()).filter(Boolean);
const defaultMaxRuns = maturity ? String(maturity.defaultMaxRuns) : '16';
const defaultRepeat = maturity ? String(maturity.defaultRepeat) : '1';
const maxRuns = Math.max(1, Math.min(Number(arg('max-runs', defaultMaxRuns)) || Number(defaultMaxRuns), 100));
const repeat = Math.max(1, Math.min(Number(arg('repeat', defaultRepeat)) || Number(defaultRepeat), 10));
const shouldCommit = hasFlag('commit') || hasFlag('push');
const shouldPush = hasFlag('push');

if (!modelList.length) throw new Error('At least one model is required.');

if (maturity) {
  const distinctModels = new Set(modelList).size;
  if (!maturity.demoAllowed && modelList.includes('demo')) {
    throw new Error(`${maturity.id} does not accept DEMO as maturity evidence. Configure real models.`);
  }
  if (distinctModels < maturity.minimumDistinctModels) {
    throw new Error(`${maturity.id} requires at least ${maturity.minimumDistinctModels} distinct model(s); got ${distinctModels}.`);
  }
  const forbidden = compositionList.filter((id) => !maturity.compositions.includes(id));
  if (forbidden.length) {
    throw new Error(`${maturity.id} does not allow compositions: ${forbidden.join(', ')}`);
  }
}

const catalogResponse = await fetch(`${baseUrl}/api/zoo/quests`);
if (!catalogResponse.ok) throw new Error(`Quest API unavailable: HTTP ${catalogResponse.status}`);
const catalog = await catalogResponse.json();
const quest = catalog.quests?.find((item) => item.id === questId);
if (!quest) throw new Error(`Unknown quest: ${questId}`);
const compositions = (catalog.compositions || []).filter((item) => compositionList.includes(item.id));
if (!compositions.length) throw new Error('No requested compositions found.');

function sameModelAssignments(composition) {
  return modelList.map((model) => Object.fromEntries(composition.modelSlots.map((slot) => [slot, model])));
}

function mixedAssignments(composition) {
  if (modelList.length < 2 || composition.modelSlots.length < 2) return [];
  const assignments = [];
  // Deterministic rotation: each slot gets the next model. This creates mixed teams without combinatorial explosion.
  for (let offset = 0; offset < modelList.length; offset += 1) {
    const map = {};
    composition.modelSlots.forEach((slot, index) => {
      map[slot] = modelList[(offset + index) % modelList.length];
    });
    assignments.push(map);
  }
  return assignments;
}

const planned = [];
for (const composition of compositions) {
  const seen = new Set();
  const candidates = [...sameModelAssignments(composition), ...mixedAssignments(composition)];
  for (const models of candidates) {
    const key = JSON.stringify(models);
    if (seen.has(key)) continue;
    seen.add(key);
    for (let r = 1; r <= repeat; r += 1) {
      planned.push({ composition, models, repeatIndex: r });
      if (planned.length >= maxRuns) break;
    }
    if (planned.length >= maxRuns) break;
  }
  if (planned.length >= maxRuns) break;
}

if (!planned.length) throw new Error('Experiment matrix is empty.');

console.log(`Quest: ${questId} · ${quest.title}`);
if (maturity) console.log(`Maturity: ${maturity.id} · ${maturity.name}`);
console.log(`Models: ${modelList.join(', ')}`);
console.log(`Compositions: ${compositionList.join(', ')}`);
console.log(`Repeat: ${repeat}`);
console.log(`Planned runs: ${planned.length}/${maxRuns}`);
console.log('');

const runRoot = path.resolve('quest-runs', 'pending');
const matrixRoot = path.resolve('quest-runs', 'matrices');
await fs.mkdir(runRoot, { recursive: true });
await fs.mkdir(matrixRoot, { recursive: true });

const rows = [];
const writtenFiles = [];

for (let index = 0; index < planned.length; index += 1) {
  const item = planned[index];
  const label = `${index + 1}/${planned.length}`;
  console.log(`[${label}] ${item.composition.id} · ${JSON.stringify(item.models)}`);
  const started = Date.now();
  try {
    const response = await fetch(`${baseUrl}/api/zoo/quests`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ questId, compositionId: item.composition.id, models: item.models }),
    });
    const record = await response.json();
    if (!response.ok) throw new Error(record?.error || `HTTP ${response.status}`);

    record.maturityAssessment = maturity
      ? {
          level: maturity.id,
          levelName: maturity.name,
          promotionGate: maturity.promotionGate,
          state: 'PENDING_STRICT_REVIEW',
        }
      : null;

    const filename = record.artifactFilename || `${timestampForFile()}__${safePart(questId)}__${safePart(item.composition.id)}.json`;
    const target = path.join(runRoot, filename);
    await fs.writeFile(target, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
    writtenFiles.push(path.relative(process.cwd(), target));

    rows.push({
      status: 'COMPLETED',
      questId,
      maturityLevel: maturity?.id || null,
      compositionId: item.composition.id,
      repeatIndex: item.repeatIndex,
      combinationLabel: record.combinationLabel,
      combinationFingerprint: record.combinationFingerprint,
      autoScore: record.automaticEvaluation?.score ?? null,
      wallMs: record.wallMs ?? Date.now() - started,
      callsUsed: record.callsUsed ?? null,
      file: path.relative(process.cwd(), target).replaceAll('\\', '/'),
      strictReview: record.strictReview?.status || 'PENDING_STRICT_REVIEW',
    });
    console.log(`  score=${rows.at(-1).autoScore ?? 'n/a'} · wall=${rows.at(-1).wallMs} ms · saved=${filename}`);
  } catch (error) {
    rows.push({
      status: 'FAILED',
      questId,
      maturityLevel: maturity?.id || null,
      compositionId: item.composition.id,
      repeatIndex: item.repeatIndex,
      combinationLabel: Object.entries(item.models).map(([slot, model]) => `${slot}=${model}`).join('__'),
      autoScore: null,
      wallMs: Date.now() - started,
      callsUsed: null,
      file: null,
      strictReview: 'NOT_REVIEWABLE',
      error: error instanceof Error ? error.message : 'Unknown matrix error',
    });
    console.log(`  FAILED: ${rows.at(-1).error}`);
  }
}

const matrixId = `MX-${Date.now().toString(36).toUpperCase()}`;
const successful = rows.filter((row) => row.status === 'COMPLETED');
const byAutoScore = [...successful].sort((a, b) => (b.autoScore ?? -1) - (a.autoScore ?? -1) || a.wallMs - b.wallMs);
const summary = {
  schemaVersion: 2,
  matrixId,
  createdAt: new Date().toISOString(),
  quest: { id: quest.id, title: quest.title, profession: quest.profession, level: quest.level },
  maturity: maturity
    ? {
        id: maturity.id,
        name: maturity.name,
        goal: maturity.goal,
        requiredEvidence: maturity.requiredEvidence,
        promotionGate: maturity.promotionGate,
      }
    : null,
  protocolRule: 'Automatic score is structural signal only. Final ranking and maturity promotion require strict independent review of durable run files.',
  requested: { models: modelList, compositions: compositionList, maxRuns, repeat },
  stats: {
    planned: planned.length,
    completed: successful.length,
    failed: rows.length - successful.length,
  },
  automaticLeaderboard: byAutoScore.map((row, rank) => ({ rank: rank + 1, ...row })),
  runs: rows,
  strictReviewState: 'PENDING',
  maturityPromotionState: maturity ? 'NOT_ASSESSED' : null,
};

const maturityPart = maturity ? `__${maturity.id}` : '';
const stem = `${timestampForFile()}__${safePart(questId)}${maturityPart}__${matrixId}`;
const summaryJson = path.join(matrixRoot, `${stem}.json`);
const summaryMd = path.join(matrixRoot, `${stem}.md`);
await fs.writeFile(summaryJson, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

const md = [
  `# Quest Matrix ${matrixId}`,
  '',
  `Quest: **${quest.id} — ${quest.title}**`,
  maturity ? `Maturity target: **${maturity.id} — ${maturity.name}**` : 'Maturity target: not specified',
  '',
  `Models: \`${modelList.join('`, `')}\``,
  '',
  '> Automatic score is a structural signal only. Strict independent review decides the final result and maturity promotion.',
  '',
  '| Auto rank | Composition | Combination | Auto score | Wall ms | Status | Strict review |',
  '|---:|---|---|---:|---:|---|---|',
  ...byAutoScore.map((row, rank) => `| ${rank + 1} | ${row.compositionId} | ${row.combinationLabel} | ${row.autoScore ?? '—'} | ${row.wallMs} | ${row.status} | ${row.strictReview} |`),
  '',
  `Completed: ${successful.length}/${rows.length}.`,
  '',
  maturity ? `## ${maturity.id} promotion gate` : '## Next gate',
  '',
  maturity ? maturity.promotionGate : 'Perform the common strict-review rubric and decide the next maturity target.',
  '',
  'Open every referenced run JSON, perform the common strict-review rubric, then replace the provisional auto ordering with a human/domain-reviewed ranking.',
  '',
];
await fs.writeFile(summaryMd, md.join('\n'), 'utf8');
writtenFiles.push(path.relative(process.cwd(), summaryJson), path.relative(process.cwd(), summaryMd));

console.log('');
console.log(`Matrix saved: ${summaryMd}`);
console.log(`Completed: ${successful.length}/${rows.length}`);
if (byAutoScore[0]) console.log(`Provisional auto leader: ${byAutoScore[0].compositionId} · ${byAutoScore[0].combinationLabel} · ${byAutoScore[0].autoScore}%`);
console.log('Strict verdict: PENDING');
if (maturity) console.log(`Maturity promotion: ${maturity.id} NOT_ASSESSED`);

if (shouldCommit) {
  await exec('git', ['add', '--', ...writtenFiles], { cwd: process.cwd() });
  const message = `eval(alina): matrix ${questId} ${maturity?.id || 'unscoped'} ${matrixId}`;
  await exec('git', ['commit', '-m', message, '--', ...writtenFiles], { cwd: process.cwd() });
  console.log(`Committed: ${message}`);
}

if (shouldPush) {
  await exec('git', ['push', '-u', 'origin', 'HEAD'], { cwd: process.cwd() });
  console.log('Pushed matrix and run files to GitHub.');
} else if (!shouldCommit) {
  console.log('Use --push to commit and publish all matrix results for strict review.');
}
