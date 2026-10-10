-- Supabase's default privileges grant everything on new public tables to anon and authenticated.
-- Row level security filters rows but does not cover TRUNCATE, so reset to exactly what the app uses.

revoke all on public.plans from anon, authenticated;
grant select, insert, delete on public.plans to authenticated;
