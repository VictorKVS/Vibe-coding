import fs from 'node:fs/promises';
import path from 'node:path';

function arg(name, fallback = '') {
  const prefix = `--${name}=`;
  const value = process.argv.find((item) => item.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

const baseUrl = arg('base', 'http://127.0.0.1:3000').replace(/\/$/, '');
const questId = arg('quest', 'Q-PROMPT-001');
const compositionId = arg('composition', 'single');
const scenarioOverride = arg('scenario', '');
const modelArgs = process.argv.filter((item) => item.startsWith('--model.'));

const models = {};
for (const item of modelArgs) {
  const match = item.match(/^--model\.([^=]+)=(.+)$/);
  if (match) models[match[1]] = match[2];
}

if (!Object.keys(models).length) {
  models.M1 = 'demo';
}

const response = await fetch(`${baseUrl}/api/zoo/quests`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ questId, compositionId, models, scenarioOverride: scenarioOverride || undefined }),
});

const record = await response.json();
if (!response.ok) {
  console.error(JSON.stringify(record, null, 2));
  process.exitCode = 1;
} else {
  const root = path.resolve('quest-runs', 'pending');
  await fs.mkdir(root, { recursive: true });
  const filename = record.artifactFilename || `${Date.now()}__${questId}__${compositionId}.json`;
  const target = path.join(root, filename);
  await fs.writeFile(target, `${JSON.stringify(record, null, 2)}\n`, 'utf8');

  console.log(`Saved: ${target}`);
  console.log(`Combination: ${record.combinationLabel}`);
  console.log(`Fingerprint: ${record.combinationFingerprint}`);
  console.log(`Auto score: ${record.automaticEvaluation?.score ?? 'n/a'}%`);
  console.log('Review state: PENDING_STRICT_REVIEW');
  console.log('Next: git add quest-runs/pending && git commit && git push');
}
