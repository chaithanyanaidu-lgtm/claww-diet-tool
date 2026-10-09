# CLAWW Diet

Next.js 16 (App Router, TypeScript strict) + Tailwind v4 + Supabase + Groq. Full spec lives in the PR description / `BUILD_SPEC.md` handed to the team.

@AGENTS.md

## Commands

- `npm run dev` – local dev server on :3000
- `npm run lint` / `npm run typecheck` / `npm test` – run all three before every commit
- `npm run fixtures:legacy` – regenerate `tests/fixtures/legacy-outputs.json` from `legacy/index.html`

## Folder map

- `app/` – routes (landing, `plan/new` wizard, `plan/preview`, `plan/[id]`, `plans`, `login`, `api/chat`)
- `components/` – `wizard/`, `results/`, `chat/`, `ui/`
- `lib/engine/` – the nutrition engine: pure, deterministic TypeScript; `generatePlan(input)` in `index.ts`
- `lib/schemas.ts` – Zod schemas shared by the client form and server actions
- `lib/supabase/`, `lib/ai/` – backend clients and the assistant's system prompt
- `supabase/migrations/` – SQL schema with RLS
- `tests/` – Vitest golden tests against the legacy engine, Playwright e2e
- `legacy/` – the original single-file app. Reference only: never edit, never import from app code.

## Rules

- Engine numbers are the source of truth. The AI explains plans; it never calculates or changes quantities.
- The server never trusts a client-sent report: re-run the engine from validated inputs.
- Keep engine behaviour identical to `legacy/index.html` unless the golden fixtures are deliberately regenerated.
- Never commit `.env*` files (only `.env.example`). The Groq model id comes only from `GROQ_MODEL`.
- Work on a branch and open a PR into `main`; never force-push to `main`.
