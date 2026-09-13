# Alina Strict Review Protocol

Status: `review contract / Quest Arena`

## Common strict-review fields

Every reviewed run must set:

- `state = REVIEWED`;
- `reviewer`;
- `reviewedAt`;
- `verdict = STRONG_PASS | PASS | NEEDS_WORK | REJECT`;
- `hardFail = true | false`;
- `score` from 0 to 100;
- dimension scores;
- strengths;
- critical defects;
- notes.

Automatic checks never replace this review.

## ZM2 relay_critic requirement

For `Draft → Critic → Revision`, add:

```json
"dissentPreserved": true
```

or

```json
"dissentPreserved": false
```

The reviewer sets `true` only when the final revision either:

1. fixes a material critic objection; or
2. explicitly preserves the objection/disagreement and explains why it was not adopted.

Set `false` when the final revision silently drops a material objection, pretends consensus, or removes uncertainty that the critic correctly surfaced.

A `relay_critic` run cannot qualify for ZM2 while `dissentPreserved` is missing or false.

## ZM2 scoring rule

The maturity assessor compares each pair `M1 draft/revision → M2 critic` against reviewed `single` runs of the same M1 model on the exact same quest.

Current bounded gate:

- M1 baseline must already satisfy the ZM1 single-model qualification rule;
- at least 2 reviewed relay runs for the pair;
- both relay runs are `PASS` or `STRONG_PASS`;
- no hard fail;
- `dissentPreserved=true` on both;
- median strict score improves by at least **+5 points** over the M1 single baseline;
- call, wall-time and token deltas remain visible.

The +5 threshold is an explicit project policy for this experiment protocol, not a universal industry constant. Change it only by changing the qualification policy/version, not during review of a particular model pair.

## Hard-fail examples

- fabricated evidence;
- hard constraint ignored;
- candidate/hypothesis presented as verified fact;
- role authority leakage;
- critic finds a material defect and final revision silently hides it;
- corrupted/missing stages preventing fair comparison.
