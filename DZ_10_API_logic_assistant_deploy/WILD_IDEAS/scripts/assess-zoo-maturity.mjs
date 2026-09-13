import fs from 'node:fs/promises';
import path from 'node:path';

function arg(name, fallback = '') {
  const prefix = `--${name}=`;
  const value = process.argv.find((item) => item.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

function median(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

async function readJsonFiles(root) {
  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    const out = [];
    for (const entry of entries) {
      const full = path.join(root, entry.name);
      if (entry.isDirectory()) out.push(...await readJsonFiles(full));
      else if (entry.isFile() && entry.name.endsWith('.json')) {
        try {
          const parsed = JSON.parse(await fs.readFile(full, 'utf8'));
          if (parsed?.experimentId && parsed?.quest && parsed?.composition) out.push({ file: full, record: parsed });
        } catch {}
      }
    }
    return out;
  } catch {
    return [];
  }
}

function traceComplete(record) {
  if (!Array.isArray(record.stageResults) || !record.stageResults.length) return false;
  return record.stageResults.every((stage) =>
    stage?.ok === true &&
    typeof stage.agentId === 'string' && stage.agentId.length > 0 &&
    typeof stage.promptId === 'string' && stage.promptId.length > 0 &&
    typeof stage.promptVersion === 'string' && stage.promptVersion.length > 0 &&
    Array.isArray(stage.knowledgeRefs)
  );
}

function modelId(record) {
  return record?.models?.M1 || null;
}

const level = arg('level', 'ZM0').toUpperCase();
const questFilter = arg('quest', '');
if (!['ZM0', 'ZM1'].includes(level)) throw new Error('This assessor currently supports ZM0 and ZM1 only.');

const roots = [path.resolve('quest-runs', 'pending'), path.resolve('quest-runs', 'reviewed')];
const all = [];
for (const root of roots) all.push(...await readJsonFiles(root));

let runs = all
  .map((item) => ({ ...item, record: item.record }))
  .filter(({ record }) => record.status === 'COMPLETED');
if (questFilter) runs = runs.filter(({ record }) => record.quest?.id === questFilter);

const report = {
  schemaVersion: 1,
  level,
  assessedAt: new Date().toISOString(),
  questFilter: questFilter || null,
  decision: 'BLOCKED',
  reasons: [],
  evidence: {},
};

if (level === 'ZM0') {
  const single = runs.filter(({ record }) => record.composition?.id === 'single');
  const traced = single.filter(({ record }) => traceComplete(record));
  report.evidence = {
    completedSingleRuns: single.length,
    completeTraceRuns: traced.length,
    ciGreen: 'EXTERNAL_CHECK_REQUIRED',
    files: traced.map(({ file }) => path.relative(process.cwd(), file).replaceAll('\\', '/')),
  };
  if (!traced.length) report.reasons.push('No completed single run with complete agent/prompt/knowledge trace.');
  else {
    report.decision = 'READY_FOR_EXTERNAL_CI_GATE';
    report.reasons.push('Run/trace evidence is sufficient; confirm green CI separately before declaring ZM0 PASS.');
  }
}

if (level === 'ZM1') {
  const baseline = runs.filter(({ record }) => record.composition?.id === 'single' && modelId(record) && modelId(record) !== 'demo');
  const groups = new Map();
  for (const item of baseline) {
    const model = modelId(item.record);
    if (!groups.has(model)) groups.set(model, []);
    groups.get(model).push(item);
  }

  const candidates = [];
  for (const [model, items] of groups.entries()) {
    const sorted = [...items].sort((a, b) => String(a.record.generatedAt).localeCompare(String(b.record.generatedAt)));
    const qualificationRuns = sorted.slice(-3);
    const reviewed = qualificationRuns.filter(({ record }) => record.strictReview?.state === 'REVIEWED');
    const passing = reviewed.filter(({ record }) => ['PASS', 'STRONG_PASS'].includes(record.strictReview?.verdict));
    const hardFails = qualificationRuns.filter(({ record }) => record.strictReview?.hardFail === true);
    const scores = reviewed.map(({ record }) => Number(record.strictReview?.score)).filter(Number.isFinite);
    const qualified = qualificationRuns.length >= 3 && reviewed.length === qualificationRuns.length && passing.length >= 2 && hardFails.length === 0;

    candidates.push({
      model,
      totalRunsFound: sorted.length,
      qualificationRuns: qualificationRuns.length,
      reviewedRuns: reviewed.length,
      passingReviews: passing.length,
      hardFails: hardFails.length,
      medianStrictScore: median(scores),
      medianWallMs: median(qualificationRuns.map(({ record }) => Number(record.wallMs))),
      qualified,
      files: qualificationRuns.map(({ file }) => path.relative(process.cwd(), file).replaceAll('\\', '/')),
    });
  }

  const qualifiedModels = candidates.filter((item) => item.qualified);
  report.evidence = {
    distinctRealModels: candidates.length,
    qualifiedModels: qualifiedModels.map((item) => item.model),
    candidates,
  };

  if (candidates.length < 2) report.reasons.push('Need at least two distinct real models on the same professional quest.');
  for (const candidate of candidates) {
    if (candidate.qualificationRuns < 3) report.reasons.push(`${candidate.model}: need 3 repeated runs.`);
    else if (candidate.reviewedRuns < 3) report.reasons.push(`${candidate.model}: all three qualification runs require strict review.`);
    else if (candidate.hardFails > 0) report.reasons.push(`${candidate.model}: hard fail present.`);
    else if (candidate.passingReviews < 2) report.reasons.push(`${candidate.model}: fewer than two PASS/STRONG_PASS reviews.`);
  }

  if (qualifiedModels.length >= 2) {
    report.decision = 'PASS';
    report.reasons = ['At least two real models satisfy the repeated-run strict-review qualification rule.'];
  } else if (candidates.length >= 2 && candidates.every((item) => item.qualificationRuns >= 3)) {
    report.decision = 'READY_FOR_STRICT_REVIEW';
  }
}

const outRoot = path.resolve('quest-runs', 'gates');
await fs.mkdir(outRoot, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const questPart = questFilter || 'ALL';
const out = path.join(outRoot, `${stamp}__${level}__${questPart}.json`);
await fs.writeFile(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(`Maturity assessment: ${level}`);
console.log(`Decision: ${report.decision}`);
for (const reason of report.reasons) console.log(`- ${reason}`);
console.log(`Saved: ${path.relative(process.cwd(), out)}`);
