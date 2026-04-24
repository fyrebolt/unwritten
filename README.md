# Unwritten

*The appeal they never expected. The outcome that wasn't written yet.*

An AI legal advocate for patients denied by their insurer.

---

## Monorepo layout

```
./
├── frontend/   — Next.js 14 · TS · Tailwind · Framer Motion · Lenis
├── backend/    — Hono · TS (temporary scaffold)
├── package.json         — workspace root
├── pnpm-workspace.yaml  — pnpm workspaces
└── README.md
```

## Quick start

Requires **Node 20+** and **pnpm 10+** (`corepack enable` works).

```bash
pnpm install
pnpm dev              # runs frontend and backend in parallel
# or separately:
pnpm dev:frontend     # http://localhost:3000
pnpm dev:backend      # http://localhost:8787
```

## Scripts

| Script                 | Does                                            |
| ---------------------- | ----------------------------------------------- |
| `pnpm dev`             | Run frontend + backend concurrently             |
| `pnpm dev:frontend`    | Next.js dev server                              |
| `pnpm dev:backend`     | Hono dev server with tsx watch                  |
| `pnpm build`           | Recursive build across workspaces               |
| `pnpm typecheck`       | `tsc --noEmit` across workspaces                |

## Notes

The landing page is a **frame** — structure, styling, parallax, and copy.
Content can be placeholder. The visual execution is the deliverable.

Backend is a **temporary scaffold** — real routes will follow.
