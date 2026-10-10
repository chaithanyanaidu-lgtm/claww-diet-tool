-- Saved plans. Each row belongs to one user; row level security keeps it that way.
-- `report` is always produced on the server by generatePlan(input); clients never write it directly.

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  input jsonb not null,
  report jsonb not null,
  engine_version text not null,
  created_at timestamptz not null default now()
);

create index plans_user_created_idx on public.plans (user_id, created_at desc);

alter table public.plans enable row level security;

create policy "Users read their own plans"
  on public.plans for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users save plans as themselves"
  on public.plans for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users delete their own plans"
  on public.plans for delete to authenticated
  using ((select auth.uid()) = user_id);

-- No update policy: a saved plan is a snapshot. Change the answers and save a new one.

revoke all on public.plans from anon;
grant select, insert, delete on public.plans to authenticated;
