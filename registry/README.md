# Machine-readable technology registry

`technologies.json` is the source for agents and automation. Human-readable
guidance and the full catalog are in
[`../docs/TECHNOLOGY_REGISTRY.md`](../docs/TECHNOLOGY_REGISTRY.md).

Allowed values:

- `status`: `PROVEN`, `IMPLEMENTED`, `CONFIG_REQUIRED`, `ROADMAP`;
- `maturity`: `MIN`, `MED`, `MAX`;
- `reuse`: `REUSE`, `IMPROVE`, `REFERENCE_ONLY`.

Every entry must have a stable `id`, at least one source path, evidence, known
limitations, and a next improvement. Secrets and local absolute paths are never
stored here.

Validation:

```powershell
python .\registry\verify_registry.py
```
