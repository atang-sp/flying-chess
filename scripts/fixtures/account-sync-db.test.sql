create role anon;
create role authenticated;
create schema auth;
create table auth.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb default '{}',
  raw_app_meta_data jsonb default '{}'
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

\ir ../../supabase-schema.sql
-- Verify repeated deployment of the incremental migration.
\ir ../../supabase-sync-upgrade.sql
\ir ../../supabase-sync-upgrade.sql

grant usage on schema public, auth to anon, authenticated;
grant select, insert, update on all tables in schema public to anon, authenticated;
insert into auth.users(id, email) values
  ('11111111-1111-4111-8111-111111111111', 'a@example.invalid'),
  ('22222222-2222-4222-8222-222222222222', 'b@example.invalid');
insert into public.user_configs(user_id, settings)
select id, '{}' from auth.users;
insert into public.game_progress(user_id, totals)
select id, '{"completedGames":5}' from auth.users;

set role anon;
do $$ begin
  if (select count(*) from public.profiles) <> 0
     or (select count(*) from public.user_configs) <> 0
     or (select count(*) from public.game_progress) <> 0 then
    raise exception 'Anonymous account rows are visible';
  end if;
end $$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);
do $$ begin
  if (select count(*) from public.user_configs) <> 1 then
    raise exception 'Authenticated user cannot read exactly its own config';
  end if;
  update public.game_progress set totals = '{"completedGames":99}'
    where user_id = '22222222-2222-4222-8222-222222222222';
  if found then raise exception 'Cross-account update allowed'; end if;
end $$;

-- Initial legacy rows can be upgraded; metadata-preserving writes remain allowed.
update public.game_progress
set totals = '{"completedGames":5,"__replica":{"version":2}}';
update public.game_progress
set totals = '{"completedGames":6,"__replica":{"version":2}}';
do $$ begin
  begin
    update public.game_progress set totals = '{"completedGames":4}';
    raise exception 'Legacy downgrade was allowed';
  exception when sqlstate '22023' then null;
  end;
  if (select totals->>'completedGames' from public.game_progress) <> '6' then
    raise exception 'Rejected downgrade changed persisted progress';
  end if;
  if (select updated_at from public.game_progress) is null then
    raise exception 'Server version timestamp missing';
  end if;
end $$;
reset role;
select 'PASS: RLS isolation, legacy upgrade, downgrade rejection, migration replay' as result;
