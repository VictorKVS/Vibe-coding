# GitHub as cloud knowledge storage for AI Travel Premium

GitHub repository `VictorKVS/Vibe-coding` is the source of truth for the MVP knowledge base, operational catalog, prompts and agent configuration.

## Runtime model
1. Google Colab starts.
2. Colab clones or pulls the repository.
3. The bot loads `data/` and `knowledge/` from the local clone.
4. A local search/RAG index is built for the current Colab session.
5. Telegram handlers call Travel Expert AI with retrieved knowledge plus structured tour data.

GitHub is therefore cloud storage/version control; Colab is the execution environment; Telegram is the user interface.

## Data separation
### `knowledge/`
Reference knowledge suitable for RAG: climate, culture, attractions, food, transport, FAQ, trekking and approved analytical summaries.

### `data/`
Operational structured data: tour code, duration, hotel, meal plan, price, currency, availability, rating and update status.

The LLM is not allowed to move facts from one trust class to another. In particular, a value mentioned in a narrative document must not become a live tour price.

## Trust statuses
- `VERIFIED` — checked against an authoritative external source and still within the defined freshness window.
- `INTERNAL_APPROVED` — approved internal business data.
- `INTERNAL_MVP` — deterministic demonstration data for the course MVP; may be shown only as an internal/demo catalog value.
- `RESEARCH` — collected material awaiting review.
- `STUB` / `UNVERIFIED` — placeholder; must not be presented as confirmed fact.

## Provenance
Every high-change factual item should retain at least:
`source_url`, `publisher`, `source_type`, `verified_at`, `trust`.

Research from blogs, public Telegram channels and review platforms must remain in a separate research/community layer until approved. Official rules, visa fees and permit requirements receive higher trust than community commentary.

## Update rule
Updating cloud knowledge means committing the reviewed file to GitHub. A new Colab run automatically receives the new version. During development an explicit `git pull` can refresh the local clone before rebuilding the index.

## Security
Never commit Telegram tokens, LLM credentials, API secrets, personal customer data or private CRM exports to GitHub. Colab Secrets are used for credentials. Customer applications are stored locally for the demo or in a dedicated protected backend in a later production version.
