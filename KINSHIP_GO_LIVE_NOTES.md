# Kinship — Go-Live Notes

Things to review before Kinship goes live (beta cohort 2 or public launch, per `KINSHIP_2_OPERATIONALIZATION.md` §25 and §28). Add to this list as items come up.

| Added | What | Link | Status | Use it for |
|---|---|---|---|---|
| 2026-09-30 | MiroFish: multi-agent "synthetic audience" simulator | [github.com/666ghj/MiroFish](https://github.com/666ghj/MiroFish) · found via [Instagram reel](https://www.instagram.com/reel/DdeiU6Nuh2y/) | To try before launch | Pre-testing launch messaging, pricing and privacy copy |

---

## MiroFish

**What it is.** MiroFish is an open-source "swarm intelligence" engine: you give it seed material (a launch post, a price change, an ad) and a question. It generates thousands of AI personas, each with its own job, mood and memory, on a simulated social network. They react and argue over several rounds, then a report agent writes up how the thing landed.

**Repo facts (checked 30 Sep 2026):**
- About 75.5k stars, 11.6k forks.
- AGPL-3.0 licence.
- Python 3.11–3.12 with FastAPI, a Vue frontend, and GraphRAG knowledge graphs.
- Built on CAMEL-AI's OASIS simulation framework.
- Needs an OpenAI-compatible LLM API (the README recommends Qwen-plus) and Zep Cloud for agent memory.
- Self-hostable with Docker.
- Backed by Shanda Group.

The reel's claims (built by a student in about 10 days, #1 on GitHub in a day, $4M invested within 24 hours) come from the creator and weren't verified.

**Where it could help Kinship at launch:**
- **Positioning:** the product thesis and "What Kinship is not" copy (audit §E), tested for whether people read it as an AI friend, a CRM or surveillance.
- **Pricing:** D10 in `KINSHIP_2_DECISIONS.md`, free core vs a paid tier at $4–6, to see which features people object to paying for.
- **Privacy explainer and AI consent screen:** D2 and D3. Does the audience trust "sent to Anthropic, not used to train models"?
- **App Store copy and the launch post.**
- **Launch-day objections**, to prepare answers ahead of time.

**Guardrails:**
- **Never feed it real user data.** Captures, names and beta feedback stay out. Seed it only with public or draft marketing material. It sends everything to third-party APIs (the LLM provider and Zep Cloud).
- **Synthetic reactions are not evidence.** They're a cheap way to find objections to test. Beta interviews and the §30 gate criteria decide; MiroFish doesn't.
- **Keep it internal.** AGPL-3.0 means we don't embed or link its code into the Kinship app or backend.
- **Budget the API cost.** Thousands of agents over many rounds can burn tokens quickly, so start with a small run.
- **Privacy-sensitive option:** a community fork, [MiroFish-Offline](https://github.com/nikmcfly/MiroFish-Offline), runs locally with Ollama and Neo4j.

**When:** before beta cohort 2 or the public launch. It's an internal marketing tool with no product dependency.
