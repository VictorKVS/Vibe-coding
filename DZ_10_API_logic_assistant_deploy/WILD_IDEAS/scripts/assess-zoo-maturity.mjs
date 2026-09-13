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

function ratio(next, base) {
  return Number.isFinite(next) && Number.isFinite(base) && base > 0 ? next / base : null;
}

async function readJsonFiles(root, sourceState) {
  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    const out = [];
    for (const entry of entries) {
      const full = path.join(root, entry.name);
      if (entry.isDirectory()) out.push(...await readJsonFiles(full, sourceState));
      else if (entry.isFile() && entry.name.endsWith('.json')) {
        try {
          const parsed = JSON.parse(await fs.readFile(full, 'utf8'));
          if (parsed?.experimentId && parsed?.quest && parsed?.composition) out.push({ file: full, record: parsed, sourceState });
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

function modelId(record, slot = 'M1') {
  return record?.models?.[slot] || null;
}

function isRealModel(value) {
  return Boolean(value && value !== 'demo' && value !== 'auto');
}

function isReviewed(record) {
  return record?.strictReview?.state === 'REVIEWED';
}

function isPassingReview(record) {
  return ['PASS', 'STRONG_PASS'].includes(record?.strictReview?.verdict);
}

function strictScore(record) {
  const value = Number(record?.strictReview?.score);
  return Number.isFinite(value) ? value : null;
}

function usageTokensFromObject(value) {
  if (!value || typeof value !== 'object') return null;
  const direct = ['total_tokens', 'totalTokens', 'total_token_count'];
  for (const key of direct) {
    const candidate = Number(value[key]);
    if (Number.isFinite(candidate)) return candidate;
  }
  const input = Number(value.input_tokens ?? value.prompt_tokens ?? value.inputTokens);
  const output = Number(value.output_tokens ?? value.completion_tokens ?? value.outputTokens);
  if (Number.isFinite(input) || Number.isFinite(output)) return (Number.isFinite(input) ? input : 0) + (Number.isFinite(output) ? output : 0);
  return null;
}

function runUsageTokens(record) {
  if (!Array.isArray(record.stageResults)) return null;
  const values = record.stageResults.map((stage) => usageTokensFromObject(stage?.usage)).filter(Number.isFinite);
  return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
}

function latest(items, count) {
  return [...items]
    .sort((a, b) => String(a.record.generatedAt).localeCompare(String(b.record.generatedAt)))
    .slice(-count);
}

function qualificationForSingleModel(model, items) {
  const qualificationRuns = latest(items, 3);
  const reviewed = qualificationRuns.filter(({ record }) => isReviewed(record));
  const passing = reviewed.filter(({ record }) => isPassingReview(record));
  const hardFails = qualificationRuns.filter(({ record }) => record.strictReview?.hardFail === true);
  const scores = reviewed.map(({ record }) => strictScore(record)).filter(Number.isFinite);
  const qualified = qualificationRuns.length >= 3 && reviewed.length === qualificationRuns.length && passing.length >= 2 && hardFails.length === 0;
  return {
    model,
    totalRunsFound: items.length,
    qualificationRuns: qualificationRuns.length,
    reviewedRuns: reviewed.length,
    passingReviews: passing.length,
    hardFails: hardFails.length,
    medianStrictScore: median(scores),
    medianWallMs: median(qualificationRuns.map(({ record }) => Number(record.wallMs))),
    medianCalls: median(qualificationRuns.map(({ record }) => Number(record.callsUsed))),
    medianUsageTokens: median(qualificationRuns.map(({ record }) => runUsageTokens(record)).filter(Number.isFinite)),
    qualified,
    files: qualificationRuns.map(({ file }) => path.relative(process.cwd(), file).replaceAll('\\', '/')),
  };
}

const level = arg('level', 'ZM0').toUpperCase();
const questFilter = arg('quest', '');
if (!['ZM0', 'ZM1', 'ZM2'].includes(level)) throw new Error('This assessor currently supports ZM0, ZM1 and ZM2 only.');
if (['ZM1', 'ZM2'].includes(level) && !questFilter) throw new Error(`${level} assessment requires --quest=<questId> so evidence is compared on the same professional quest.`);

const sources = [
  { root: path.resolve('quest-runs', 'pending'), sourceState: 'pending' },
  { root: path.resolve('quest-runs', 'reviewed'), sourceState: 'reviewed' },
];

const byExperimentId = new Map();
for (const source of sources) {
  const items = await readJsonFiles(source.root, source.sourceState);
  for (const item of items) {
    const existing = byExperimentId.get(item.record.experimentId);
    if (!existing || item.sourceState === 'reviewed') byExperimentId.set(item.record.experimentId, item);
  }
}

let runs = [...byExperimentId.values()].filter(({ record }) => record.status === 'COMPLETED');
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

function buildSingleCandidates() {
  const baseline = runs.filter(({ record }) => record.composition?.id === 'single' && isRealModel(modelId(record)));
  const groups = new Map();
  for (const item of baseline) {
    const model = modelId(item.record);
    if (!groups.has(model)) groups.set(model, []);
    groups.get(model).push(item);
  }
  return [...groups.entries()].map(([model, items]) => qualificationForSingleModel(model, items));
}

if (level === 'ZM1') {
  const candidates = buildSingleCandidates();
  const qualifiedModels = candidates.filter((item) => item.qualified);
  report.evidence = {
    questId: questFilter,
    distinctRealModels: candidates.length,
    qualifiedModels: qualifiedModels.map((item) => item.model),
    candidates,
  };

  if (candidates.length < 2) report.reasons.push('Need at least two distinct real models on this exact professional quest.');
  for (const candidate of candidates) {
    if (candidate.qualificationRuns < 3) report.reasons.push(`${candidate.model}: need 3 repeated runs.`);
    else if (candidate.reviewedRuns < 3) report.reasons.push(`${candidate.model}: all three qualification runs require strict review.`);
    else if (candidate.hardFails > 0) report.reasons.push(`${candidate.model}: hard fail present.`);
    else if (candidate.passingReviews < 2) report.reasons.push(`${candidate.model}: fewer than two PASS/STRONG_PASS reviews.`);
  }

  if (qualifiedModels.length >= 2) {
    report.decision = 'PASS';
    report.reasons = ['At least two real models satisfy the repeated-run strict-review qualification rule on the same quest.'];
  } else if (candidates.length >= 2 && candidates.every((item) => item.qualificationRuns >= 3)) {
    report.decision = 'READY_FOR_STRICT_REVIEW';
  }
}

if (level === 'ZM2') {
  const singleCandidates = buildSingleCandidates();
  const singleByModel = new Map(singleCandidates.map((item) => [item.model, item]));
  const relayRuns = runs.filter(({ record }) =>
    record.composition?.id === 'relay_critic' &&
    isRealModel(modelId(record, 'M1')) &&
    isRealModel(modelId(record, 'M2'))
  );
  const relayGroups = new Map();
  for (const item of relayRuns) {
    const key = `${modelId(item.record, 'M1')} -> ${modelId(item.record, 'M2')}`;
    if (!relayGroups.has(key)) relayGroups.set(key, []);
    relayGroups.get(key).push(item);
  }

  const pairs = [];
  for (const [pair, items] of relayGroups.entries()) {
    const [draftModel, criticModel] = pair.split(' -> ');
    const baseline = singleByModel.get(draftModel);
    const qualificationRuns = latest(items, 2);
    const reviewed = qualificationRuns.filter(({ record }) => isReviewed(record));
    const passing = reviewed.filter(({ record }) => isPassingReview(record));
    const hardFails = qualificationRuns.filter(({ record }) => record.strictReview?.hardFail === true);
    const dissentPreserved = qualificationRuns.filter(({ record }) => record.strictReview?.dissentPreserved === true);
    const scores = reviewed.map(({ record }) => strictScore(record)).filter(Number.isFinite);
    const relayMedianScore = median(scores);
    const baselineMedianScore = baseline?.medianStrictScore ?? null;
    const qualityDeltaPoints = Number.isFinite(relayMedianScore) && Number.isFinite(baselineMedianScore) ? relayMedianScore - baselineMedianScore : null;
    const relayWallMs = median(qualificationRuns.map(({ record }) => Number(record.wallMs)));
    const relayCalls = median(qualificationRuns.map(({ record }) => Number(record.callsUsed)));
    const relayUsageTokens = median(qualificationRuns.map(({ record }) => runUsageTokens(record)).filter(Number.isFinite));
    const qualified = Boolean(
      baseline?.qualified &&
      qualificationRuns.length >= 2 &&
      reviewed.length === qualificationRuns.length &&
      passing.length === qualificationRuns.length &&
      hardFails.length === 0 &&
      dissentPreserved.length === qualificationRuns.length &&
      Number.isFinite(qualityDeltaPoints) && qualityDeltaPoints >= 5
    );

    pairs.push({
      pair,
      draftModel,
      criticModel,
      baselineQualified: Boolean(baseline?.qualified),
      baselineMedianStrictScore,
      relayRunsFound: items.length,
      qualificationRuns: qualificationRuns.length,
      reviewedRuns: reviewed.length,
      passingReviews: passing.length,
      hardFails: hardFails.length,
      dissentPreservedRuns: dissentPreserved.length,
      relayMedianStrictScore,
      qualityDeltaPoints,
      operationalDelta: {
        baselineMedianCalls: baseline?.medianCalls ?? null,
        relayMedianCalls: relayCalls,
        callMultiplier: ratio(relayCalls, baseline?.medianCalls),
        baselineMedianWallMs: baseline?.medianWallMs ?? null,
        relayMedianWallMs: relayWallMs,
        wallTimeMultiplier: ratio(relayWallMs, baseline?.medianWallMs),
        baselineMedianUsageTokens: baseline?.medianUsageTokens ?? null,
        relayMedianUsageTokens: relayUsageTokens,
        usageTokenMultiplier: ratio(relayUsageTokens, baseline?.medianUsageTokens),
      },
      qualified,
      files: qualificationRuns.map(({ file }) => path.relative(process.cwd(), file).replaceAll('\\', '/')),
    });
  }

  const qualifiedPairs = pairs.filter((item) => item.qualified);
  report.evidence = {
    questId: questFilter,
    qualifiedSingleBaselines: singleCandidates.filter((item) => item.qualified).map((item) => item.model),
    relayPairsFound: pairs.length,
    qualifiedPairs: qualifiedPairs.map((item) => item.pair),
    pairs,
  };

  if (!singleCandidates.some((item) => item.qualified)) report.reasons.push('Need at least one ZM1-qualified single-model baseline for the relay M1 model.');
  if (!pairs.length) report.reasons.push('Need at least one real-model relay_critic pair on this quest.');
  for (const item of pairs) {
    if (!item.baselineQualified) report.reasons.push(`${item.pair}: M1 single baseline is not ZM1-qualified.`);
    else if (item.qualificationRuns < 2) report.reasons.push(`${item.pair}: need 2 repeated relay runs.`);
    else if (item.reviewedRuns < 2) report.reasons.push(`${item.pair}: both relay qualification runs require strict review.`);
    else if (item.hardFails > 0) report.reasons.push(`${item.pair}: hard fail present.`);
    else if (item.passingReviews < 2) report.reasons.push(`${item.pair}: both relay qualification runs must be PASS/STRONG_PASS.`);
    else if (item.dissentPreservedRuns < 2) report.reasons.push(`${item.pair}: reviewer must set dissentPreserved=true on both relay runs.`);
    else if (!Number.isFinite(item.qualityDeltaPoints) || item.qualityDeltaPoints < 5) report.reasons.push(`${item.pair}: reviewed median quality gain is below +5 points over the M1 single baseline.`);
  }

  if (qualifiedPairs.length) {
    report.decision = 'PASS';
    report.reasons = ['At least one critic pair demonstrates a reviewed +5 point or greater median quality gain over its qualified single-model baseline with preserved reviewer dissent.'];
  } else if (pairs.length && pairs.some((item) => item.qualificationRuns >= 2)) {
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
