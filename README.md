# Unwritten

*The appeal they never expected. The outcome that wasn't written yet.*

An AI legal advocate for patients denied by their insurer.

---

## Monorepo layout

```
./
├── frontend/        — Next.js 14 · TS · Tailwind · Framer Motion · Lenis
│                       Clerk auth · MongoDB (Atlas) · Cloudinary uploads
├── backend/         — Hono · Node · TS — denial PDF parse + voice transcription
│                       LLM cascade: Anthropic → Gemini → OpenAI → heuristics
├── agents/          — Python multi-agent service (Fetch.ai uagents)
│                       Intake → Policy → Evidence → Drafter pipeline
│                       Bureau (local) or Agentverse (remote) topology
├── package.json     — pnpm workspace root
└── pnpm-workspace.yaml
```

## Quick start

Requires **Node 20+**, **pnpm 10+**, and (for the agents) **Python 3.11+**.

```bash
# 1. Install JS dependencies
pnpm install

# 2. Copy and fill env files
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env

# 3. Run frontend (port 3000) + Hono backend (port 8787) in parallel
pnpm dev

# 4. In a separate terminal — set up the Python venv once:
python3 -m venv ~/.unwritten-venv
PYTHONPATH= ~/.unwritten-venv/bin/pip install -r agents/requirements.txt

# 5. Start the multi-agent pipeline:
pnpm dev:bureau       # uagents Bureau on port 8200 (all 5 agents)
pnpm dev:agents-api   # HTTP bridge on port 8788 (proxies Next.js → Bureau)
```

> **Offline / no Agentverse?** Set `AGENTS_LOCAL_BUREAU=1` in `backend/.env` to
> force all agents to run locally in one Bureau process without Agentverse
> registration.

## Environment variables

### `frontend/.env.local`

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | Clerk auth (Google OAuth + email magic link). Get at [dashboard.clerk.com](https://dashboard.clerk.com). |
| `MONGODB_URI` | Atlas connection string. M0 free tier is sufficient. |
| `MONGODB_DB` | Database name (defaults to `unwritten`). |
| `AGENTS_API_URL` | Python agents HTTP bridge (default `http://127.0.0.1:8788`). |
| `NEXT_PUBLIC_API_URL` | Hono backend URL (default `http://localhost:8787`). |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name for browser uploads. |
| `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | Unsigned upload preset (e.g. `unwritten_denials`). Per-user folders (`users/<clerkUserId>/denials`) are set at upload time. |

### `backend/.env`

| Variable | Purpose |
| --- | --- |
| `ANTHROPIC_API_KEY` | Primary LLM for denial PDF/image parsing (Claude vision). |
| `GEMINI_API_KEY` | Fallback denial parser + agent drafter (Gemini 2.0 Flash). |
| `OPENAI_API_KEY` | Whisper API for voice transcription + final parsing fallback. |
| `MONGO_URI` | MongoDB URI for the backend (defaults to local). |
| `CORS_ORIGINS` | Comma-separated allowed origins (default `http://localhost:3000`). |
| `CLOUDINARY_URL` | Signed Cloudinary fetch for raw/PDF assets (paste from dashboard). |
| `AGENTVERSE_API_KEY` | Fetch.ai Agentverse key for remote agent topology. |
| `AGENTS_LOCAL_BUREAU` | Set to `1` to force all agents to run locally (no Agentverse). |

See `.env.example` files in each directory for the full list of optional overrides.

## Architecture

- **Clerk** owns identity. Every MongoDB document is keyed on `clerkUserId`.
- **MongoDB (Atlas)** stores `users` and `cases`. The `cases` document embeds the denial extraction, patient narrative, drafted appeal, delivery status, and timeline — no joins.
- **Cloudinary** stores binaries (denial PDFs/images, future fax receipts). MongoDB only ever stores the public id and secure URL.
- **Hono backend (`/backend`)** parses uploaded denial PDFs and images using a cascading LLM chain (Anthropic → Gemini → OpenAI → heuristics) and transcribes voice recordings via Whisper. Called directly from the browser.
- **Python agents (`/agents`)** runs the intake → policy → evidence → drafting agent pipeline using Fetch.ai uagents. Two topologies:
  - **Local Bureau**: all five agents (`IntakeAgent`, `PolicyAgent`, `EvidenceAgent`, `DrafterAgent`, `BridgeAgent`) run in a single local process.
  - **Remote (Agentverse)**: only `BridgeAgent` runs locally; the pipeline agents are registered on Agentverse and receive messages over the Fetch.ai network.
  - `POST /api/cases/[id]/agents/run` in Next.js forwards the Cloudinary PDF + transcript to the HTTP bridge (`main_api.py`), which dispatches to the Bureau and persists the returned letter and findings on the case.

## Scripts

| Script | Does |
| --- | --- |
| `pnpm dev` | Run frontend + Hono backend concurrently |
| `pnpm dev:frontend` | Next.js dev server only |
| `pnpm dev:backend` | Hono dev server only (tsx watch) |
| `pnpm dev:bureau` | Start all 5 uagents in a local Bureau (port 8200) |
| `pnpm dev:agents-api` | Start the HTTP bridge between Next.js and the Bureau (port 8788) |
| `pnpm build` | Recursive build across all workspaces |
| `pnpm typecheck` | `tsc --noEmit` across all workspaces |
| `pnpm lint` | ESLint across all workspaces |

## Frontend routes

| Route | Description |
| --- | --- |
| `/` | Landing page |
| `/signin` · `/signup` | Clerk-hosted auth pages |
| `/dashboard` | Case list + new case entry point |
| `/case/new` | New-case wizard (upload denial, confirm extraction) |
| `/case/[id]` | Cinematic case workspace |
| `/case/[id]/detail` | Case detail / extracted denial fields |
| `/case/[id]/live` | Live agent run page (real-time agent output) |
| `/case/[id]/panels` | Multi-panel workspace view |
| `/case/[id]/review` | Review drafted appeal |
| `/case/[id]/send` | Send / deliver appeal |
| `/settings` | User settings |

## Demo flow

1. Sign in with Clerk (Google or email magic link).
2. From `/dashboard`, tap **Begin** → drag in a denial PDF or image.
3. Cloudinary stores the file under `users/<clerkUserId>/denials`. The Hono backend OCRs and parses it.
4. Confirm the extracted fields (insurer, denial reason, service, dates).
5. Tap **Begin drafting** → a MongoDB `cases` document is created; you land in the workspace at `/case/<id>`.
6. Tap **Live agents** in the workspace top bar → **Run agents** to dispatch the Cloudinary PDF + transcript through the Python pipeline.
7. The drafted appeal letter and supporting findings appear in the workspace. Review at `/case/<id>/review`, then send from `/case/<id>/send`.
