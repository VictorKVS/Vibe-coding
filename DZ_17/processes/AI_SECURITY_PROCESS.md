# ALINA Analyst Core — процессы ИБ и защиты AI-систем

## 1. Цель

Защитить входные данные, AI/LLM-контур, модели, API, базы знаний, инфраструктуру и процесс принятия решений от компрометации, несанкционированных изменений, утечек и деградации качества.

Ключевой принцип:

```text
SECURITY CONTROL
не должен скрыто менять предметное знание,
но имеет право остановить/карантинировать поток.
```

---

# 2. Security pipeline

```mermaid
flowchart LR
 S[Source/Input]-->T[SEC1 Input Security Triage]
 T-->I{Risk?}
 I--safe-->P[Processing]
 I--suspicious-->Q[Quarantine]
 Q-->R[ИБ Review]
 R--allow-->P
 R--reject-->B[Blocked]
 P-->PI[SEC2 Prompt/Content Injection Check]
 PI-->M[Model Invocation]
 M-->O[Output Security Check]
 O-->K[KB Candidate]
 K-->KI[SEC8 KB Integrity/Poisoning Check]
 KI-->PUB[Publish]
```

---

# 3. SEC1 — Security Triage входа

Проверяется:

- file type/magic vs extension;
- размер;
- archive recursion/zip bomb risk;
- malware scan adapter when available;
- malformed parser payload;
- suspicious embedded objects/macros;
- external URL policy;
- metadata anomalies;
- unexpected executable/binary content;
- data classification;
- allowed workspace/domain scope.

Результат:

```json
{
  "decision":"allow|quarantine|reject",
  "severity":"low|medium|high|critical",
  "findings":[],
  "policy_version":"..."
}
```

---

# 4. SEC2 — Prompt Injection / hostile content

Документы и web-контент рассматриваются как **недоверенные данные**, а не как инструкции для системы.

Ищутся:

```text
ignore previous instructions
system prompt exfiltration attempts
tool-use coercion
credential requests
hidden instructions
encoded instructions
HTML/CSS/metadata injection
instructions embedded in OCR text
instructions embedded in retrieved KB records
```

Результат хранится отдельно от предметного анализа:

```text
content = evidence/data
instruction_trust = untrusted
security_finding = optional
```

Если контент подозрителен, его фактическая информация может быть проанализирована в безопасном режиме, но управляющие инструкции из источника не выполняются.

---

# 5. SEC3 — Data/Knowledge Poisoning

Сигналы:

- массовый приток однородных утверждений из связанных источников;
- резкое изменение известных отношений;
- источник с аномально высокой активностью;
- повторяющиеся формулировки/шаблоны;
- противоречие trusted sources;
- отсутствие provenance;
- попытка массовой публикации low-confidence facts;
- изменение KB через необычный actor/path;
- кластер новых фактов, основанный на одном capture.

Действия:

```text
flag candidate
lower trust score
require counter-evidence
require Senior Review
security_hold for high severity
Human/IB escalation when critical
```

---

# 6. SEC4/5 — Model Supply Chain и Integrity

Для каждой локальной модели хранится:

```text
model_id
filename/path
sha256
source_url/repository
publisher/author
format
quantization
capabilities
approved_status
first_seen
approved_at
approved_by
runtime_parameters
license metadata
benchmark status
security notes
```

Перед использованием:

```text
expected_hash == actual_hash
approved == true
runtime policy allows task/data class
```

Несоответствие hash:

```text
MODEL_DISABLED
SEC_MODEL_INTEGRITY
critical/high alert
```

---

# 7. SEC6 — Secret Leakage Prevention

Контроль применяется к:

- user input;
- uploaded documents where policy requires;
- prompts sent externally;
- logs;
- error messages;
- reports/exports;
- model output.

Типы секретов:

```text
API keys/tokens
password-like credentials
private keys/cert secrets
connection strings
session tokens
internal access links
other configured patterns
```

Для внешних моделей поддерживается policy:

```text
ALLOW
REDACT_THEN_SEND
LOCAL_ONLY
BLOCK
```

---

# 8. SEC7 — Access Control

Каждый запрос API проходит:

```text
Authenticate
→ Resolve user/service identity
→ Workspace membership
→ Role/permission
→ Object scope
→ Data classification policy
→ Allow / Deny
```

Запрет проверяется сервером; скрытие кнопки в UI не является security control.

---

# 9. SEC8 — KB Integrity

Verified KB защищается правилами:

```text
no direct update/delete verified fact
new knowledge = new version/event
correction = supersede old record
publication requires provenance
critical domain can require dual review
all publication actions are audited
```

Периодические проверки:

- broken provenance references;
- orphan records;
- duplicate conflicting facts;
- impossible version chain;
- hash mismatch original capture;
- bulk unexplained changes;
- unauthorized actor;
- graph anomaly.

---

# 10. SEC9 — Provenance Integrity

Каждый verified record должен иметь путь:

```text
VERIFIED RECORD
→ REVIEW DECISION
→ CANDIDATE
→ EVIDENCE
→ OBSERVATION
→ FRAGMENT
→ CAPTURE
→ SOURCE
```

Если путь разорван:

```text
status = integrity_warning / hold
severity = high for published fact
```

---

# 11. SEC10/11 — Security Monitoring и Incident Response

Состояния инцидента:

```text
NEW
→ TRIAGED
→ CONTAINED
→ INVESTIGATING
→ ERADICATED
→ RECOVERING
→ RESOLVED
→ LESSONS_LEARNED
```

Основной процесс:

```mermaid
flowchart LR
 A[Alert]-->T[Triage]
 T-->C{Security incident?}
 C--No-->CL[Close/technical issue]
 C--Yes-->H[Contain]
 H-->I[Investigate]
 I-->E[Eradicate]
 E-->R[Recover]
 R-->V[Validate integrity]
 V-->L[Lessons learned]
 L-->N[New rule/control/test]
```

Containment examples:

- block source;
- disable model;
- revoke credential;
- disable external provider;
- freeze KB publication;
- quarantine affected workspace;
- revoke suspicious session;
- pause export.

---

# 12. SEC12 — Vulnerability Management

Контур:

```text
asset inventory
→ dependency/runtime scan
→ finding
→ severity
→ remediation owner
→ fix
→ retest
→ close
```

Объекты:

- npm/python dependencies;
- container/base image when used;
- llama.cpp runtime;
- database;
- operating environment;
- exposed API;
- plugins/adapters;
- parser libraries.

---

# 13. SEC13 — Model Behavior / Drift

Контролируем:

```text
JSON/schema failure rate
hallucination/correction rate
Senior rejection rate
unsafe output rate
prompt injection susceptibility
latency/outlier behavior
confidence calibration
unexpected tool requests
```

Резкое ухудшение переводит модель из `approved` в `degraded/restricted`, после чего Model Manager меняет routing.

---

# 14. SEC14 — Export / Exfiltration Control

Перед экспортом:

```text
object scope
user permission
data classification
source restrictions
secrets check
volume anomaly
recipient/destination where applicable
```

Массовые или аномальные выгрузки создают security event.

---

# 15. ИБ-артефакты

```text
SecurityFinding
SecurityDecision
SecurityIncident
SecurityEvidence
ModelSecurityRecord
AccessDecision
IntegrityCheck
ExportDecision
RiskRecord
PolicyVersion
```

Все артефакты имеют `trace_id` и ссылки на affected objects.

---

# 16. Минимальные API ИБ

```text
GET  /api/security/overview
GET  /api/security/findings
GET  /api/security/findings/{id}
POST /api/security/findings/{id}/decision
GET  /api/security/incidents
POST /api/security/incidents
PATCH /api/security/incidents/{id}
GET  /api/security/models
POST /api/security/models/{id}/approve
POST /api/security/models/{id}/block
GET  /api/security/audit
GET  /api/security/integrity/kb/{kb_id}
POST /api/security/integrity/kb/{kb_id}/scan
```

---

# 17. Definition of Done для ИБ-P0

- вход может быть quarantined до парсинга;
- prompt injection finding сохраняется отдельно от факта;
- секреты не пишутся в обычный log;
- модель имеет hash/trust state;
- published KB record имеет end-to-end provenance;
- privileged actions журналируются;
- critical finding переводит affected flow в `blocked`;
- Admin и IB получают разные, ролевые представления события;
- ни Admin, ни IB не могут молча переписать verified knowledge.
