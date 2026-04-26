# Unwritten

*The appeal they never expected. The outcome that wasn't written yet.*

An AI legal advocate for patients denied by their insurer.

---

## Monorepo layout

```
./
├── frontend/        — Next.js 14 · TS · Tailwind · Framer Motion · Lenis
│                       Clerk auth, Mongo (Atlas) cases, Cloudinary uploads
├── backend/         — Hono · TS — denial PDF parse + Whisper transcription
├── agents/          — Python agent service (intake → policy → evidence → drafting)
├── package.json     — pnpm workspace root
└── README.md
```

## Quick start

Requires **Node 20+**, **pnpm 10+**, and (for the agents) **Python 3.11+**.

```bash
pnpm install
pnpm dev              # runs frontend (3000) + backend (8787) in parallel

# in another terminal, the Python agents:
cd agents && python -m agents.main_api      # http://127.0.0.1:8788
```

## Required environment

Copy `frontend/.env.example` → `frontend/.env.local` and fill in:

| Variable | Why |
| --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | Auth (Google + email magic link). Create at https://dashboard.clerk.com. |
| `MONGODB_URI` | Atlas connection string. M0 free tier is plenty for the hackathon. |
| `MONGODB_DB` | Defaults to `unwritten`. |
| `AGENTS_API_URL` | Where the Python agents service is listening (default `http://127.0.0.1:8788`). |
| `NEXT_PUBLIC_API_URL` | Where the Hono backend is listening (default `http://localhost:8787`). |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` / `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | Browser uploads denial PDFs/images to Cloudinary. Use an *unsigned* preset (e.g. `unwritten_denials`). Per-user folders (`users/<clerkUserId>/denials`) are set automatically. |

`backend/.env.example` covers the legacy bcrypt/JWT auth path and the
optional `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` for denial
parsing fallbacks.

## Architecture, in a paragraph

- **Clerk** owns identity. Every Mongo document is keyed on `clerkUserId`.
- **Mongo (Atlas)** stores `users` and `cases`. Per the spec, the `cases`
  document embeds the denial extraction, patient narrative, drafted appeal,
  delivery, and timeline — no joins.
- **Cloudinary** stores binaries (denial PDFs/images, future fax receipts).
  Mongo only ever sees the public id + secure URL.
- **Hono backend (`/backend`)** parses uploaded denial PDFs and images
  (Anthropic vision → Gemini → OpenAI → heuristics) and transcribes voice.
  Called directly from the browser.
- **Python agents (`/agents`)** runs the actual intake/policy/evidence/
  drafting agent loop. Called from `POST /api/cases/[id]/agents/run` —
  Next.js fetches the denial PDF from Cloudinary, forwards it to the
  agents service, and persists the returned letter + findings on the case.

## Scripts

| Script                 | Does                                            |
| ---------------------- | ----------------------------------------------- |
| `pnpm dev`             | Run frontend + backend concurrently             |
| `pnpm dev:frontend`    | Next.js dev server                              |
| `pnpm dev:backend`     | Hono dev server with tsx watch                  |
| `pnpm build`           | Recursive build across workspaces               |
| `pnpm typecheck`       | `tsc --noEmit` across workspaces                |

## Demo flow

1. Sign in with Clerk (Google or email magic link).
2. From the dashboard, **Begin** → drag in a denial PDF/image.
3. Cloudinary stores the file under `users/<your-clerk-id>/denials`.
4. The Hono backend OCRs/parses it; you confirm the extracted fields.
5. Hit **Begin drafting** → a Mongo `cases` doc is written, you land in the
   cinematic workspace at `/case/<id>`.
6. Tap **Live agents →** in the workspace top bar to switch to the real
   agents page (`/case/<id>/live`), then **Run agents** — Next.js posts
   the Cloudinary PDF + transcript to the Python service and renders the
   real drafted letter and findings.
