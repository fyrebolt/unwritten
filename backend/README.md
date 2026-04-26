# backend

Mongo-backed API for Unwritten. Hono on Node.

```bash
pnpm --filter=backend dev   # http://localhost:8787
```

Create a `.env` in `backend/` from `.env.example`:

```bash
cp backend/.env.example backend/.env
```

Routes:

- `GET /` — banner
- `GET /health` — liveness
- `POST /v1/auth/signup` — create account + JWT
- `POST /v1/auth/login` — login + JWT
- `GET /v1/me` — current user
- `POST /v1/cases` — create case
- `GET /v1/cases` — list user cases
- `GET /v1/cases/:id` — fetch case
- `PATCH /v1/cases/:id` — update case metadata
- `POST /v1/cases/:id/uploads` — add upload metadata (file should live in object storage)
- `POST /v1/cases/:id/transcript` — store transcript
- `POST /v1/cases/:id/appeal/generate` — create draft appeal text
- `POST /v1/cases/:id/appeal/send` — mark final appeal sent
- `POST /v1/intake` — compatibility case intake route
- `POST /v1/denial/parse` — compatibility denial text route
- `POST /v1/appeal/generate` — compatibility draft generation route
