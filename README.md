# WiseMatch

**Find roommates who match your vibe.** WiseMatch is a taste-first roommate finder for Bangalore. Instead of a 50-field questionnaire, an AI agent asks the fewest, most discriminating questions (Akinator-style) and ranks people by compatibility, grounded in the [Qloo](https://qloo.com) taste graph.

Built for the Qloo LLM Hackathon. MIT licensed.

## How it works

```
 basics (area, budget, who)            hard filters: gender pref, budget, intent
          │
          ▼
 ┌─────────────────────────────── the agent loop ───────────────────────────────┐
 │ 1. measure the live candidate pool (e.g. 444 people in Bangalore)            │
 │ 2. score every possible question by how evenly it splits that pool           │
 │      • lifestyle: diet, smoking, drinking, sleep, tidiness, noise, guests…   │
 │      • taste: tags like indie music, gaming, café hopping (from Qloo)        │
 │ 3. Qloo: pull entities that exemplify the taste question                     │
 │ 4. LLM (Groq): pick + phrase the best question, explain the split            │
 │ 5. user answers for "You" and "Them" → pool shrinks → repeat                 │
 └───────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
 ranked matches (95%, 91%, …) with reasons, AI summary, icebreakers and
 hangout spots both people would love (Qloo insights)
```

- **Deal-breakers remove people outright**: diet, smoking, drinking, gender preference, budget. Both sides' preferences are enforced.
- **Everything else is a soft penalty** that reshapes the compatibility score.
- **Scores start modest and rise** as the agent learns more about you (evidence shrinkage), so a 95% means something.
- Religion is an optional preference the user sets themselves. It only nudges the score and is never a hidden filter.

### Where Qloo is used

| Feature | Qloo call |
| --- | --- |
| Taste questions: example entities for each taste dimension | `GET /search` |
| Favourites search in your profile | `GET /search` |
| "Spots you'd both love" for a matched pair | `GET /v2/insights` (`filter.type=urn:entity:place`, `signal.interests.entities`, `filter.location.query=Bangalore`) |
| Taste profile → tags → compatibility score | entity tags from Qloo |

Without `QLOO_API_KEY` the app runs on a bundled offline taste graph with the same shapes, and every response is labelled **Taste graph** instead of **Qloo live** in the UI.

### Where the LLM is used (Groq, `openai/gpt-oss-120b`)

- Picks and phrases the next question (the agent's decision).
- Explains why two people match and writes icebreakers.
- Plays the demo profiles in chat so replies are live.

Every Qloo and Groq call is logged to an **Agent activity** feed in the UI with latency and source.

## Stack

| Layer | Tech |
| --- | --- |
| Frontend | Next.js 16 (App Router), React 19, Tailwind v4, Leaflet |
| Backend | FastAPI, SQLAlchemy 2, httpx |
| Database | Neon Postgres (SQLite fallback for local dev) |
| AI | Groq (OpenAI-compatible), Qloo API |

## Run locally

### 1. Backend

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate        # Windows (use `source .venv/bin/activate` on macOS/Linux)
pip install -r requirements.txt
cp .env.example .env          # then fill in the keys below
uvicorn app.main:app --port 8000
```

On first start the API creates the tables and seeds **650 Bangalore profiles** across 28 neighbourhoods (with room listings, taste graphs and habits). Re-seed any time with `python -m app.seed --reset`.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon connection string (`postgresql://…`). Empty uses a local SQLite file. |
| `QLOO_API_KEY` | Qloo hackathon key. Empty uses the offline taste graph. |
| `GROQ_API_KEY` | Groq key. Empty falls back to deterministic question picking and canned chat replies. |
| `GROQ_MODEL` | Defaults to `openai/gpt-oss-120b`. |
| `JWT_SECRET` | Any long random string. |
| `CORS_ORIGINS` | Comma-separated frontend origins. |

After adding your Qloo key, verify the live API shapes:

```bash
python -m app.check_qloo
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local    # NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

Open http://localhost:3000. Guest sign-in is one tap and everything is pre-filled.

## Deploy

- **Backend (Render):** `render.yaml` at the repo root defines the service. Set `DATABASE_URL`, `QLOO_API_KEY`, `GROQ_API_KEY`, `JWT_SECRET` and `CORS_ORIGINS` in the dashboard.
- **Frontend (Vercel):** import the repo, set the root directory to `frontend`, and set `NEXT_PUBLIC_API_URL` to the Render URL.
- **Database:** create a Neon project and paste its connection string into `DATABASE_URL`. The app creates and seeds the schema on first boot.

## Project layout

```
backend/app
  agent.py      question selection, answers, match explanations, chat personas
  engine.py     hard filters, split scoring, compatibility model
  qloo.py       Qloo client (live + offline fallback)
  llm.py        Groq client
  api.py        REST endpoints
  seed.py       650-profile Bangalore generator
  catalog.py    areas, taste graph, question bank
frontend/src
  app/          landing, basics wizard, agent onboarding, discover, profile, chat, settings
  components/   shell, match cards, map, agent feed
```

## License

[MIT](LICENSE)
