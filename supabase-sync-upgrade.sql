-- Apply once before publishing the new device-counter client. Safe to reapply.
-- Existing legacy rows remain readable and are migrated by the first new client.
begin;

create or replace function public.prevent_progress_replica_downgrade()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if old.totals ? '__replica'
     and (not (new.totals ? '__replica')
          or jsonb_typeof(new.totals->'__replica') is distinct from 'object'
          or (new.totals->'__replica'->>'version') is distinct from '2') then
    raise exception 'Progress protocol downgrade rejected. Refresh this device before synchronizing.'
      using errcode = '22023';
  end if;
  return new;
end;
$$;

revoke all on function public.prevent_progress_replica_downgrade() from public;

drop trigger if exists prevent_progress_replica_downgrade on public.game_progress;
create trigger prevent_progress_replica_downgrade
  before update on public.game_progress
  for each row execute function public.prevent_progress_replica_downgrade();

commit;
