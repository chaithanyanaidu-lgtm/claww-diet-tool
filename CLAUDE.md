# CLAWW Diet

Next.js 16 (App Router, TypeScript strict) + Tailwind v4 + Supabase + Groq. Full spec lives in the PR description / `BUILD_SPEC.md` handed to the team.

@AGENTS.md

## Commands

- `npm run dev` – local dev server on :3000
- `npm run lint` / `npm run typecheck` / `npm test` – run all three before every commit
- `npm run fixtures:legacy` – regenerate `tests/fixtures/legacy-outputs.json` from `legacy/index.html`
- `npm run db:migrate` – apply new files in `supabase/migrations` over HTTPS (Management API); `-- --dry-run` to preview
- `npm run db:rls-check` – prove against the live DB that users only see their own plans (rolls back, leaves no data)
- `npm run e2e:auth` – browser test of sign-in, saved and shared plans against a running app (`npm run build && npm start`); creates and deletes its own test users

These read `.env.local` (see `.env.example`). In cloud sandboxes Node needs `NODE_USE_ENV_PROXY=1` to reach the network (the SessionStart hook sets it), and direct Postgres connections are blocked, so use `db:migrate` rather than `supabase db push`.

## Folder map

- `app/` – routes (landing, `plan/new` wizard, `plan/preview`, `plan/[id]`, `plans`, `login`, `s/[token]` shared plans, `api/chat`)
- `components/` – `wizard/`, `results/`, `chat/`, `ui/`
- `lib/engine/` – the nutrition engine: pure, deterministic TypeScript; `generatePlan(input)` in `index.ts`
- `lib/schemas.ts` – Zod schemas shared by the client form and server actions
- `lib/supabase/` – Supabase clients (server, proxy)
- `lib/ai/` – the assistant: `instructions.ts` turns a plan into the facts and rules the model gets; `limits.ts`, `rate-limit.ts` guard `/api/chat`
- `lib/auth.ts`, `lib/plans.ts` – the data access layer: current user, and saved-plan reads/writes (all run as the user, so RLS applies)
- `proxy.ts` – Next 16's renamed middleware: refreshes the Supabase session, sends signed-out visitors on private pages to `/login`
- `supabase/migrations/` – SQL schema with RLS
- `tests/` – Vitest golden tests against the legacy engine, Playwright e2e
- `legacy/` – the original single-file app. Reference only: never edit, never import from app code.

## Rules

- Engine numbers are the source of truth. The AI explains plans; it never calculates or changes quantities. Anything the model might need to compute (e.g. plan vs targets) is computed in `planFacts` and handed to it.
- `/api/chat` rebuilds the plan from validated answers on every request. Groq's free tier allows ~8k tokens/minute per account (about 3 questions a minute); the route turns rate limits into a friendly message.
- Deploys: the Vercel project `claww-diet` is connected to this repo. Pushing to `main` deploys production (https://claww-diet.vercel.app); other branches get preview deployments. `vercel deploy --prod` still works for a manual deploy.
- The server never trusts a client-sent report: re-run the engine from validated inputs.
- Auth: use `getUser()` (verifies with Supabase), never `getSession()` on the server. With Cache Components on, anything reading the session must sit inside `<Suspense>`.
- Schema changes go in a new migration file; never edit one that has been applied.
- Keep engine behaviour identical to `legacy/index.html` unless the golden fixtures are deliberately regenerated.
- Never commit `.env*` files (only `.env.example`). The Groq model id comes only from `GROQ_MODEL`.
- Work on a branch and open a PR into `main`; never force-push to `main`.
