# backend

Hono · Node · TypeScript API for Unwritten. Handles denial PDF/image parsing and voice transcription. Runs on port 8787.

```bash
# from the repo root:
pnpm dev:backend

# or directly:
pnpm --filter=backend dev
```

Copy `.env.example` to `.env` before starting:

```bash
cp backend/.env.example backend/.env
```

---

## Routes

### Core

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/` | Banner + capability summary |
| `GET` | `/health` | Liveness check — reports which LLM providers and transcription modes are configured |

### Auth (legacy bcrypt/JWT path)

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/v1/auth/signup` | Create account + return JWT |
| `POST` | `/v1/auth/login` | Login + return JWT |
| `GET` | `/v1/me` | Current user (JWT required) |

> The main app uses Clerk for auth. These routes exist for compatibility and local testing.

### Cases

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/v1/cases` | Create a new case |
| `GET` | `/v1/cases` | List cases for the authenticated user |
| `GET` | `/v1/cases/:id` | Fetch a single case |
| `PATCH` | `/v1/cases/:id` | Update case metadata |
| `POST` | `/v1/cases/:id/uploads` | Record upload metadata (binary lives in Cloudinary) |
| `POST` | `/v1/cases/:id/transcript` | Store voice transcript on a case |
| `POST` | `/v1/cases/:id/appeal/generate` | Generate a draft appeal letter |
| `POST` | `/v1/cases/:id/appeal/send` | Mark the final appeal as sent |

### Denial parsing

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/v1/denial/parse` | Parse a denial letter from a Cloudinary URL or raw text. LLM cascade: Anthropic vision → Gemini → OpenAI → heuristics |
| `POST` | `/v1/intake` | Compatibility intake route |
| `POST` | `/v1/appeal/generate` | Compatibility draft generation route |

### Transcription

Transcription runs automatically as part of the intake flow. The backend supports three modes, tried in order:

1. **Local Whisper** (`LOCAL_WHISPER=1`) — open-source `openai/whisper` running on this machine. No API cost.
2. **OpenAI Whisper API** — requires `OPENAI_API_KEY`.
3. **Gemini** — requires `GEMINI_API_KEY`.

Optionally, Claude polishes the raw STT transcript (fixes recognition errors) when `ANTHROPIC_API_KEY` is set.

---

## Key environment variables

| Variable | Purpose |
| --- | --- |
| `ANTHROPIC_API_KEY` | Primary denial parser (Claude vision + native PDF). Also used for optional transcript polish. |
| `GEMINI_API_KEY` | Fallback denial parser + optional model overrides. |
| `OPENAI_API_KEY` | Whisper API transcription + final parsing fallback. |
| `MONGO_URI` | MongoDB connection (defaults to `mongodb://127.0.0.1:27017/unwritten`). |
| `CORS_ORIGINS` | Comma-separated allowed CORS origins. |
| `CLOUDINARY_URL` | Signed Cloudinary fetch for raw/PDF assets that require auth. Paste the full `cloudinary://KEY:SECRET@CLOUD` line from the Cloudinary dashboard. |
| `LOCAL_WHISPER` | Set to `1` to use local Whisper instead of the API. Requires `ffmpeg` and `pip install openai-whisper`. |

See `.env.example` for the full list including optional model overrides (`GEMINI_MODEL`, `ANTHROPIC_PARSE_MODEL`, etc.).

---

## Source layout

```
src/
├── index.ts            — Hono app, route registration, CORS
├── env.ts              — Zod-validated env config
├── db.ts               — Mongoose connection helper
├── load-env.ts         — Loads .env before anything else
├── models/
│   ├── User.ts
│   └── Case.ts
├── lib/
│   └── auth.ts         — bcrypt + JWT helpers (legacy path)
├── denial/
│   ├── parse-handler.ts    — Orchestrates the LLM parse cascade
│   └── cloudinary-fetch.ts — Fetches assets from Cloudinary (signed or unsigned)
├── extraction/
│   └── types.ts        — DenialExtracted shared type
└── intake/
    ├── transcribe.ts       — Voice transcription dispatcher
    ├── whisper-local.ts    — Local Whisper subprocess runner
    └── gemini-transcribe.ts
```
