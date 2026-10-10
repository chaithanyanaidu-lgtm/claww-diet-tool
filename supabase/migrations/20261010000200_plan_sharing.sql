-- Read-only share links. A plan is shared while it has a share_token; anyone holding the token
-- can read its title and answers (the app rebuilds the numbers from the answers). Owners turn
-- sharing on and off through set_plan_sharing; there is still no general UPDATE grant.

alter table public.plans add column share_token text unique;

create function public.set_plan_sharing(plan_id uuid, enabled boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  token text;
begin
  update public.plans
     set share_token = case
           when enabled then coalesce(share_token, replace(gen_random_uuid()::text, '-', ''))
           else null
         end
   where id = plan_id
     and user_id = (select auth.uid())
  returning share_token into token;

  if not found then
    raise exception 'plan not found' using errcode = 'P0002';
  end if;
  return token;
end;
$$;

create function public.get_shared_plan(token text)
returns table (title text, input jsonb, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.title, p.input, p.created_at
    from public.plans p
   where token is not null
     and length(token) = 32
     and p.share_token = token;
$$;

revoke all on function public.set_plan_sharing(uuid, boolean) from public, anon;
grant execute on function public.set_plan_sharing(uuid, boolean) to authenticated;

revoke all on function public.get_shared_plan(text) from public;
grant execute on function public.get_shared_plan(text) to anon, authenticated;
