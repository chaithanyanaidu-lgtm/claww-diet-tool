// Checks the plans table's row level security against the live database, acting as two
// signed-in users and as an anonymous visitor. Everything runs in one transaction that is
// always rolled back, so it leaves no data behind.
//
// Usage: node --env-file=.env.local scripts/db-rls-check.mjs
// Needs SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF.

const { SUPABASE_ACCESS_TOKEN: token, SUPABASE_PROJECT_REF: ref } = process.env;
if (!token || !ref) {
  console.error("Set SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF.");
  process.exit(1);
}

const A = "00000000-0000-4000-a000-00000000000a";
const B = "00000000-0000-4000-a000-00000000000b";

// The DO block raises at the end on purpose: that rolls everything back and carries the result out.
const query = `
do $$
declare
  n int;
  plan_a uuid;
  token text;
begin
  insert into auth.users (id, aud, role, email) values
    ('${A}', 'authenticated', 'authenticated', 'rls-a@example.test'),
    ('${B}', 'authenticated', 'authenticated', 'rls-b@example.test');

  -- user A saves a plan
  perform set_config('request.jwt.claims', '{"sub":"${A}","role":"authenticated"}', true);
  set local role authenticated;
  insert into public.plans (title, input, report, engine_version)
    values ('A plan', '{}', '{}', 'test') returning id into plan_a;
  select count(*) into n from public.plans;
  if n <> 1 then raise exception 'FAIL: A should see 1 plan, saw %', n; end if;

  -- A cannot save a plan in B's name
  begin
    insert into public.plans (user_id, title, input, report, engine_version)
      values ('${B}', 'forged', '{}', '{}', 'test');
    raise exception 'FAIL: A inserted a plan owned by B';
  exception when insufficient_privilege then null;
  end;

  -- user B sees nothing of A's and cannot delete or change it
  reset role;
  perform set_config('request.jwt.claims', '{"sub":"${B}","role":"authenticated"}', true);
  set local role authenticated;
  select count(*) into n from public.plans;
  if n <> 0 then raise exception 'FAIL: B saw % of A''s plans', n; end if;
  delete from public.plans where id = plan_a;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: B deleted A''s plan'; end if;
  begin
    update public.plans set title = 'hijacked' where id = plan_a;
    raise exception 'FAIL: B could run an update';
  exception when insufficient_privilege then null;
  end;

  -- anonymous visitors get nothing
  reset role;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  begin
    select count(*) into n from public.plans;
    raise exception 'FAIL: anon could read plans (% rows)', n;
  exception when insufficient_privilege then null;
  end;

  -- sharing: nobody but the owner can share, anon can't call the setter
  begin
    perform public.set_plan_sharing(plan_a, true);
    raise exception 'FAIL: anon could call set_plan_sharing';
  exception when insufficient_privilege then null;
  end;
  select count(*) into n from public.get_shared_plan('00000000000000000000000000000000');
  if n <> 0 then raise exception 'FAIL: a made-up share token returned a plan'; end if;

  reset role;
  perform set_config('request.jwt.claims', '{"sub":"${B}","role":"authenticated"}', true);
  set local role authenticated;
  begin
    perform public.set_plan_sharing(plan_a, true);
    raise exception 'FAIL: B shared A''s plan';
  exception when no_data_found then null;
  end;

  -- A shares; the link is stable and readable by anyone, and only through the function
  reset role;
  perform set_config('request.jwt.claims', '{"sub":"${A}","role":"authenticated"}', true);
  set local role authenticated;
  token := public.set_plan_sharing(plan_a, true);
  if token is null or length(token) <> 32 then raise exception 'FAIL: bad share token %', token; end if;
  if public.set_plan_sharing(plan_a, true) <> token then raise exception 'FAIL: share token changed on re-share'; end if;

  reset role;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  select count(*) into n from public.get_shared_plan(token);
  if n <> 1 then raise exception 'FAIL: anon could not open a shared plan'; end if;

  reset role;
  perform set_config('request.jwt.claims', '{"sub":"${B}","role":"authenticated"}', true);
  set local role authenticated;
  select count(*) into n from public.plans;
  if n <> 0 then raise exception 'FAIL: sharing exposed the plans table to B'; end if;

  -- A stops sharing; the old link no longer works
  reset role;
  perform set_config('request.jwt.claims', '{"sub":"${A}","role":"authenticated"}', true);
  set local role authenticated;
  if public.set_plan_sharing(plan_a, false) is not null then raise exception 'FAIL: unshare kept a token'; end if;
  reset role;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  select count(*) into n from public.get_shared_plan(token);
  if n <> 0 then raise exception 'FAIL: link still worked after unsharing'; end if;

  -- A can still delete its own plan
  reset role;
  perform set_config('request.jwt.claims', '{"sub":"${A}","role":"authenticated"}', true);
  set local role authenticated;
  delete from public.plans where id = plan_a;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: A could not delete its own plan'; end if;

  reset role;
  raise exception 'RLS_CHECK_PASSED';
end $$;`;

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query }),
});
const text = await res.text();
if (text.includes("RLS_CHECK_PASSED")) {
  console.log("RLS check passed: users see and delete only their own plans; anon sees none; only owners share, and unsharing revokes the link.");
} else {
  console.error("RLS check failed:", text);
  process.exit(1);
}
