# Quest Arena Run Archive

This directory stores durable experiment records for independent review.

## Folder states

- `pending/` — experiment finished, strict review not yet completed;
- `reviewed/` — independent review completed and written into the JSON record;
- `rejected/` — optional archive for hard-fail / invalid experiments;
- `superseded/` — old runs retained for traceability after protocol/model/prompt changes;
- `matrices/` — batch experiment summaries comparing several compositions/model assignments on the same quest.

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

## Run and save

Start the app first:

```bash
npm run dev
```

In another terminal run a quest:

```bash
npm run quest:run -- --quest=Q-KB-001 --composition=relay_critic --model.M1=openai:gpt-5.6-sol --model.M2=ollama:qwen3:8b
```

The runner writes the full record to:

`quest-runs/pending/<timestamp>__<quest>__<composition>__<combination>__<fingerprint>.json`

### One command to commit and push the result to GitHub

```bash
npm run quest:run -- --quest=Q-KB-001 --composition=relay_critic --model.M1=openai:gpt-5.6-sol --model.M2=ollama:qwen3:8b --push
```

`--push` implies `--commit`: the runner stages **only the newly created result file**, creates an `eval(alina): ...` commit and runs `git push` on the current branch.

If you want a local commit without pushing:

```bash
npm run quest:run -- --quest=Q-KB-001 --composition=single --model.M1=demo --commit
```

Without `--commit` / `--push`, commit manually:

```bash
git add quest-runs/pending
git commit -m "eval(alina): add Quest Arena run"
git push
```

Do not place API keys, environment variables or hidden provider credentials in result files.

## Matrix experiments

Use the matrix runner when the goal is to compare **one model vs combinations of models** on the same professional quest.

Example with DEMO only:

```bash
npm run quest:matrix -- --quest=Q-KB-001 --models=demo --push
```

Example with several available providers/models:

```bash
npm run quest:matrix -- --quest=Q-KB-001 --models=openai:gpt-5.6-sol,ollama:qwen3:8b,compatible:model-a --max-runs=16 --push
```

By default the matrix covers:

- `single`;
- `relay_critic`;
- `parallel_synthesis`;
- `specialist_pipeline`.

The runner generates both same-model baselines and deterministic mixed-model teams without exploding into every possible permutation. `--max-runs` is the hard experiment cap. `--repeat=N` can be used to test stability of the same setup.

Each individual run still goes to `pending/`. The matrix runner also writes:

- `quest-runs/matrices/<matrix>.json` — machine-readable experiment summary;
- `quest-runs/matrices/<matrix>.md` — provisional leaderboard for human review.

The matrix leaderboard is **not the final winner table**. It ranks by deterministic auto checks only until strict review is completed.

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
