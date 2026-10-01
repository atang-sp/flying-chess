-- ============================================================
-- 飞行棋 · Supabase 数据库 Schema
-- 执行位置：Supabase Dashboard → SQL Editor
-- ============================================================

-- ----------------------------------------------------------------
-- 0. 扩展（UUID 生成）
-- ----------------------------------------------------------------
create extension if not exists "uuid-ossp";

-- ================================================================
-- 1. profiles 表 — 账号基础信息
-- ================================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nickname    text,
  avatar_url  text,
  provider    text,           -- 'email' | 'x' | 'twitter' | 'discourse'
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is '账号基础信息，与 auth.users 1:1';

-- 自动创建 profile：用户注册时触发
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nickname, avatar_url, provider)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email),
    new.raw_user_meta_data->>'avatar_url',
    new.raw_app_meta_data->>'provider'
  )
  on conflict (id) do update
    set nickname   = excluded.nickname,
        avatar_url = excluded.avatar_url,
        provider   = excluded.provider,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ================================================================
-- 2. user_configs 表 — 游戏偏好与自定义配置
-- ================================================================
create table if not exists public.user_configs (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  settings     jsonb not null default '{}',   -- 棋盘配置、惩罚配置、陷阱配置等
  updated_at   timestamptz not null default now()
);

comment on table public.user_configs is '玩家游戏配置（对应 ludo_game_config）';
comment on column public.user_configs.settings is '完整的 CachedConfig 结构（JSON）';

-- ================================================================
-- 3. game_progress 表 — 成就与耻辱墙统计
-- ================================================================
create table if not exists public.game_progress (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  totals        jsonb not null default '{}',        -- LocalProgressTotals
  shame_records jsonb not null default '{}',        -- Record<string, LocalPlayerProgress>
  updated_at    timestamptz not null default now()
);

comment on table public.game_progress is '成就进度与耻辱墙（对应 flying-chess-local-progress-v1）';
comment on column public.game_progress.totals is 'LocalProgressTotals 对象';
comment on column public.game_progress.shame_records is '玩家名 → LocalPlayerProgress 映射';

-- ================================================================
-- 4. Row Level Security (RLS)
-- ================================================================

-- profiles
alter table public.profiles enable row level security;

create policy "用户只能读取自己的 profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "用户只能更新自己的 profile"
  on public.profiles for update
  using (auth.uid() = id);

-- user_configs
alter table public.user_configs enable row level security;

create policy "用户只能读取自己的配置"
  on public.user_configs for select
  using (auth.uid() = user_id);

create policy "用户只能写入自己的配置"
  on public.user_configs for insert
  with check (auth.uid() = user_id);

create policy "用户只能更新自己的配置"
  on public.user_configs for update
  using (auth.uid() = user_id);

-- game_progress
alter table public.game_progress enable row level security;

create policy "用户只能读取自己的进度"
  on public.game_progress for select
  using (auth.uid() = user_id);

create policy "用户只能写入自己的进度"
  on public.game_progress for insert
  with check (auth.uid() = user_id);

create policy "用户只能更新自己的进度"
  on public.game_progress for update
  using (auth.uid() = user_id);

-- ================================================================
-- 5. updated_at 自动更新触发器
-- ================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_user_configs_updated_at
  before update on public.user_configs
  for each row execute procedure public.set_updated_at();

create trigger set_game_progress_updated_at
  before update on public.game_progress
  for each row execute procedure public.set_updated_at();

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- 6. Protect device-counter metadata against old clients.
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
