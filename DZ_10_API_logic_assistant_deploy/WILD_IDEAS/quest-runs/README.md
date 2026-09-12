# Quest Arena Run Archive

This directory stores durable experiment records for independent review.

## Folder states

- `pending/` — experiment finished, strict review not yet completed;
- `reviewed/` — independent review completed and written into the JSON record;
- `rejected/` — optional archive for hard-fail / invalid experiments;
- `superseded/` — old runs retained for traceability after protocol/model/prompt changes.

Directories are created locally by the runner when needed.

## What one JSON record contains

Each run records:

- quest id, profession, level, scenario, constraints and success criteria;
- composition id (`single`, `relay_critic`, `parallel_synthesis`, `specialist_pipeline`);
- model slot mapping such as `M1=openai:model-a__M2=ollama:model-b`;
- full SHA-256 `combinationFingerprint` over quest + composition + model mapping + scenario;
- every stage, role, selected model, prompt id/version, knowledge refs, latency and usage;
- final output;
- deterministic automatic checks;
- an empty `strictReview` block for later independent judgement.

The fingerprint identifies the **experiment setup**, not the generated answer. Two repeated runs with the same setup should share the same combination fingerprint but have different `experimentId` / timestamp and may produce different answers.

## Commit workflow

After running a quest locally:

```bash
npm run quest:run -- --quest=Q-KB-001 --composition=relay_critic --model.M1=openai:gpt-5.6-sol --model.M2=ollama:qwen3:8b
```

or directly:

```bash
node scripts/run-quest-arena.mjs --quest=Q-KB-001 --composition=relay_critic --model.M1=openai:gpt-5.6-sol --model.M2=ollama:qwen3:8b
```

The runner writes the full record to:

`quest-runs/pending/<timestamp>__<quest>__<composition>__<combination>__<fingerprint>.json`

Then:

```bash
git add quest-runs/pending
git commit -m "eval(alina): add Quest Arena run"
git push
```

Do not place API keys, environment variables or hidden provider credentials in result files.

## Strict review

Automatic checks are intentionally weak evidence. They can confirm that an answer contains expected concepts or obvious forbidden phrases, but they cannot prove professional correctness.

Independent review fills `strictReview` and uses the same rubric for every model combination.

### Weighted dimensions

- Professional correctness — 30 points
- Constraint adherence — 15 points
- Evidence / uncertainty discipline — 20 points
- Completeness — 15 points
- Clarity / traceability — 10 points
- Efficiency / unnecessary complexity — 10 points

Total: 100.

### Verdict bands

- `90–100 STRONG_PASS`
- `75–89 PASS`
- `60–74 NEEDS_WORK`
- `<60 REJECT`

### Hard-fail conditions

A reviewer may set `hardFail=true` regardless of numeric subtotal when the run contains a material defect such as:

- fabricated source/evidence presented as real;
- explicit hard constraint ignored;
- verified / candidate / hypothesis states silently collapsed;
- dangerous authority leakage between roles;
- final synthesis hides a critical reviewer objection;
- stage output is missing/corrupted such that the combination cannot be fairly evaluated.

Hard fail must name the exact defect. Preference, writing style or model brand is not a hard-fail reason.

## Fair comparison rule

Compare combinations primarily **within the same quest and protocol version**. Do not compare raw scores across unrelated professions as if difficulty were identical.

A combination is not a universal winner because it wins one quest. Promotion needs repeated evidence across the target role/task family.
