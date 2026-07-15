-- 两人共享打卡 数据库初始化
-- 用法：Supabase Dashboard -> SQL Editor -> New query，整份粘贴后点 Run
-- 可重复执行，不会破坏已有数据

-- 1. 用户资料表（关联 auth.users）
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  avatar_url text
);

-- 2. 模板表：每人 weekday/weekend 各最多一份
create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  day_type text not null check (day_type in ('weekday', 'weekend')),
  slots jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  unique (owner_id, day_type)
);

-- 3. 每日计划表：每人每天一条
create table if not exists public.day_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  date date not null,
  slots jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

-- 4. RLS：登录用户互相可读（全站只有两个账号），只能写自己的
alter table public.users enable row level security;
alter table public.templates enable row level security;
alter table public.day_plans enable row level security;

drop policy if exists "authed_read_users" on public.users;
create policy "authed_read_users" on public.users
  for select to authenticated using (true);

drop policy if exists "authed_read_templates" on public.templates;
create policy "authed_read_templates" on public.templates
  for select to authenticated using (true);

drop policy if exists "authed_read_day_plans" on public.day_plans;
create policy "authed_read_day_plans" on public.day_plans
  for select to authenticated using (true);

drop policy if exists "update_own_profile" on public.users;
create policy "update_own_profile" on public.users
  for update to authenticated using (auth.uid() = id);

drop policy if exists "insert_own_template" on public.templates;
create policy "insert_own_template" on public.templates
  for insert to authenticated with check (auth.uid() = owner_id);

drop policy if exists "update_own_template" on public.templates;
create policy "update_own_template" on public.templates
  for update to authenticated using (auth.uid() = owner_id);

drop policy if exists "delete_own_template" on public.templates;
create policy "delete_own_template" on public.templates
  for delete to authenticated using (auth.uid() = owner_id);

drop policy if exists "insert_own_day_plan" on public.day_plans;
create policy "insert_own_day_plan" on public.day_plans
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "update_own_day_plan" on public.day_plans;
create policy "update_own_day_plan" on public.day_plans
  for update to authenticated using (auth.uid() = user_id);

drop policy if exists "delete_own_day_plan" on public.day_plans;
create policy "delete_own_day_plan" on public.day_plans
  for delete to authenticated using (auth.uid() = user_id);

-- 5. auth 里新建用户时自动写入 public.users（name 取邮箱 @ 前缀，之后可改）
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 已存在的 auth 用户补录进 users 表
insert into public.users (id, name)
select id, split_part(email, '@', 1) from auth.users
on conflict (id) do nothing;

-- 6. 开启 day_plans 的 Realtime（幂等：已加过就跳过）
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'day_plans'
  ) then
    alter publication supabase_realtime add table public.day_plans;
  end if;
end
$$;

-- 7. PDCA周期目标与复盘表：每人每周一条，goals装两种目标(整体完成率/具体任务)，
-- review_note是Act阶段的自由文本复盘。不开Realtime，对方刷新页面即可看到最新。
create table if not exists public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  week_start date not null,
  goals jsonb not null default '[]'::jsonb,
  review_note text,
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

alter table public.weekly_reviews enable row level security;

drop policy if exists "authed_read_weekly_reviews" on public.weekly_reviews;
create policy "authed_read_weekly_reviews" on public.weekly_reviews
  for select to authenticated using (true);

drop policy if exists "insert_own_weekly_review" on public.weekly_reviews;
create policy "insert_own_weekly_review" on public.weekly_reviews
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "update_own_weekly_review" on public.weekly_reviews;
create policy "update_own_weekly_review" on public.weekly_reviews
  for update to authenticated using (auth.uid() = user_id);

drop policy if exists "delete_own_weekly_review" on public.weekly_reviews;
create policy "delete_own_weekly_review" on public.weekly_reviews
  for delete to authenticated using (auth.uid() = user_id);
