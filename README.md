# UTM Site Docs System

Generates the **body** of your recurring site documents from a few facts, so you stop
hand-writing them. The **header, No. Rujukan, signatures stay in your template** (per your
SOP — never auto-generated).

Covers three documents:

| Document | Input | What's generated |
|---|---|---|
| **Memo** (7 types) | type + site story (+ .mpp for *kelewatan*) | numbered body paragraphs |
| **Minit Mesyuarat** | raw meeting points | numbered body sections |
| **Site Diary** | day notes + counts (+ .mpp for status) | narrative blocks, rendered into the print-ready form |

The 7 memo types: `kelewatan · denda · ketidakpatuhan · kerosakan · arahan · teknikal · pemakluman`.

---

## Architecture (Clean Architecture)

Dependencies point **inward**. The domain knows nothing about React, Supabase, the .mpp
library, or Claude — those live at the edges and are swappable.

```
web/src/
  domain/          entities, value objects, the 7 memo types, PORTS (interfaces)   ← no deps
  application/     use cases: parseProgramme, generateMemo, generateMinit, generateSiteDiary
  infrastructure/  adapters that implement the ports:
      backendGateway.ts        → ProgrammeParser + LlmGateway (calls the Python service)
      supabase/repositories.ts → ProjectRepository + DocumentRepository
      render/diaryTemplate.ts  → DiaryRenderer (your approved layout)
  composition.ts   the ONE place adapters get wired to ports
  ui/              React screens (DocumentStudio) — a thin driver over the use cases

backend/           Python service (FastAPI)
  app/programme/   mpp_reader.py  → parses .mpp via MPXJ  (TESTED on your 15 May file)
  app/generation/  prompts.py (house style) + gemini_client.py
  app/api.py       POST /programme/parse , POST /generate

supabase/schema.sql   projects + documents tables
```

**Why a separate Python service?** Two hard constraints:
1. The .mpp parser (MPXJ) needs a **JVM** — it can't run in the browser, on Cloudflare
   Workers, or in Supabase Edge (Deno). It needs a container with Java.
2. The Claude API key must stay **server-side**, never shipped to the browser.

So both `/programme/parse` and `/generate` live in the backend; the web app calls them.

### Data flow (memo / kelewatan)
```
.mpp ─▶ /programme/parse ─▶ ProgrammeSnapshot ┐
site story ─────────────────────────────────┤─▶ generateMemo ─▶ /generate (Claude) ─▶ body ─▶ save
```
Diary is the same, plus `renderDiary(data)` → print-ready HTML → PDF (browser print).

---

## Run it

### 1. Backend (the parser + generator)
```bash
cd backend
pip install -r requirements.txt          # needs Java 17+ on the machine (for MPXJ)
export GEMINI_API_KEY=...                # from aistudio.google.com — env var only, never in code
export GEMINI_MODEL=gemini-2.5-flash     # free-tier model
uvicorn app.api:app --reload --port 8000
```

> **Free-tier data note:** Google's free Gemini tier may use prompts/responses to improve their models, with possible human review, and their terms say not to send confidential info. For official UTM documents, consider enabling **paid Tier 1** (no training, very low cost) or confirm your department's data policy.
Test the parser alone:
```bash
curl -F "file=@/path/to/your.mpp" http://localhost:8000/programme/parse
```

### 2. Web
```bash
cd web
cp .env.example .env        # fill VITE_BACKEND_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

### 3. Supabase
Run `supabase/schema.sql` in the SQL editor. **Enable RLS + policies before production.**

---

## Deploy
- **web/** → Cloudflare Pages (your current setup). Static build, calls the backend over HTTPS.
- **backend/** → any host that runs a container with Java: Fly.io, Railway, Render, or Cloud
  Run. A `Dockerfile` (Java 21 + Python) is included. Set `GEMINI_API_KEY`,
  `GEMINI_MODEL`, and `CORS_ORIGINS` (your Pages URL) as env vars / secrets.

---

## Status — honest

**Done & verified**
- `.mpp` parser — tested against your 15 May programme; returns overall 99%/38%, all 15
  blocks with variances, and the not-started / in-progress / complete lists.
- Clean-architecture spine: domain, ports, use cases, composition root.
- Backend `/generate` with house-style prompts per document type.
- Diary renderer = the layout you approved.

**You finish**
- Set your `GEMINI_API_KEY` / `GEMINI_MODEL` and Supabase keys (as host secrets).
- Project Profile screen (entity + repo exist; add the form UI).
- Printable HTML templates for memo & minit (diary's is done; same pattern).
- Auth + Supabase RLS policies.
- UI polish — `DocumentStudio` is a working but plain driver.

This is a runnable foundation, not a finished deployed product. The hard, novel piece (reading
.mpp and turning it + your notes into correct documents) is built and proven; the rest is
wiring and styling in territory you already work in daily.
