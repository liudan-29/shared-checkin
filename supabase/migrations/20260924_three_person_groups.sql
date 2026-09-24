-- 三人小组迁移。只在 Supabase Dashboard -> SQL Editor 中执行。
-- 执行前把下面三个邮箱替换成真实账号邮箱；任何账号不存在都会整笔回滚。

begin;

create table if not exists public.checkin_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.checkin_groups alter column owner_id drop not null;
alter table public.checkin_groups drop constraint if exists checkin_groups_owner_id_fkey;
alter table public.checkin_groups add constraint checkin_groups_owner_id_fkey
  foreign key (owner_id) references public.users(id) on delete set null;

create table if not exists public.group_members (
  group_id uuid not null references public.checkin_groups(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id),
  unique (user_id)
);

create or replace function public.enforce_three_member_limit()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.group_id = old.group_id then
    return new;
  end if;
  if exists (
    select 1 from public.group_members
    where group_id = new.group_id and user_id = new.user_id
  ) then
    return new;
  end if;
  perform 1 from public.checkin_groups where id = new.group_id for update;
  if (select count(*) from public.group_members where group_id = new.group_id) >= 3 then
    raise exception '每个打卡小组最多只能有三位成员';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_three_member_limit on public.group_members;
create trigger enforce_three_member_limit
  before insert or update of group_id on public.group_members
  for each row execute function public.enforce_three_member_limit();

alter table public.templates add column if not exists group_id uuid references public.checkin_groups(id) on delete cascade;
alter table public.day_plans add column if not exists group_id uuid references public.checkin_groups(id) on delete cascade;
alter table public.messages add column if not exists group_id uuid references public.checkin_groups(id) on delete cascade;

-- 防止第三个账号早于自动同步触发器创建，确保外键目标完整。
insert into public.users (id, name)
select id, split_part(email, '@', 1) from auth.users
on conflict (id) do nothing;

do $$
declare
  member_emails text[] := array[
    'REPLACE_OWNER_EMAIL',
    'REPLACE_MEMBER_2_EMAIL',
    'REPLACE_MEMBER_3_EMAIL'
  ];
  member_ids uuid[];
  selected_group_id uuid;
  owner_user_id uuid;
begin
  select array_agg(lower(trim(email)) order by ord)
  into member_emails
  from unnest(member_emails) with ordinality as item(email, ord);

  if exists (select 1 from unnest(member_emails) email where email like 'REPLACE_%') then
    raise exception '请先把三个邮箱占位符替换为真实邮箱';
  end if;

  if cardinality(member_emails) <> 3 or (
    select count(distinct lower(email)) from unnest(member_emails) email
  ) <> 3 then
    raise exception '必须填写三个不同的邮箱';
  end if;

  select array_agg(id order by array_position(member_emails, lower(email)))
  into member_ids
  from auth.users
  where lower(email) = any(member_emails);

  if coalesce(cardinality(member_ids), 0) <> 3 then
    raise exception '没有找到全部三个Auth账号，请先在Authentication -> Users确认邮箱';
  end if;

  owner_user_id := member_ids[1];

  if exists (
    select 1 from public.group_members
    where user_id = any(member_ids)
    group by user_id
    having count(*) > 1
  ) then
    raise exception '指定账号已存在冲突的小组关系';
  end if;

  select group_id
  into selected_group_id
  from public.group_members
  where user_id = any(member_ids)
  order by joined_at
  limit 1;

  if selected_group_id is null then
    insert into public.checkin_groups (name, owner_id)
    values ('三人共享打卡', owner_user_id)
    returning id into selected_group_id;
  elsif exists (
    select 1 from public.group_members
    where user_id = any(member_ids) and group_id <> selected_group_id
  ) then
    raise exception '三个账号分属不同小组，迁移已取消';
  end if;

  update public.checkin_groups
  set owner_id = owner_user_id, name = '三人共享打卡'
  where id = selected_group_id;

  update public.group_members
  set role = 'member'
  where group_id = selected_group_id;

  insert into public.group_members (group_id, user_id, role)
  select
    selected_group_id,
    id,
    case when id = owner_user_id then 'owner' else 'member' end
  from unnest(member_ids) id
  on conflict (group_id, user_id) do update
    set role = excluded.role;

  update public.templates
  set group_id = selected_group_id
  where owner_id = any(member_ids) and group_id is null;

  update public.day_plans
  set group_id = selected_group_id
  where user_id = any(member_ids) and group_id is null;

  update public.messages
  set group_id = selected_group_id
  where sender_id = any(member_ids) and group_id is null;

  if exists (select 1 from public.templates where group_id is null)
    or exists (select 1 from public.day_plans where group_id is null)
    or exists (select 1 from public.messages where group_id is null) then
    raise exception '发现不属于这三个账号的旧数据，迁移已回滚，请先核对账号';
  end if;
end
$$;

alter table public.templates alter column group_id set not null;
alter table public.day_plans alter column group_id set not null;
alter table public.messages alter column group_id set not null;

create unique index if not exists templates_group_owner_day_type_key
  on public.templates(group_id, owner_id, day_type);
create unique index if not exists day_plans_group_user_date_key
  on public.day_plans(group_id, user_id, date);

create or replace function public.is_group_member(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_id = target_group_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_same_group_user(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members mine
    join public.group_members theirs on theirs.group_id = mine.group_id
    where mine.user_id = auth.uid() and theirs.user_id = target_user_id
  );
$$;

revoke all on function public.is_group_member(uuid) from public;
revoke all on function public.is_same_group_user(uuid) from public;
grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.is_same_group_user(uuid) to authenticated;

alter table public.checkin_groups enable row level security;
alter table public.group_members enable row level security;

drop policy if exists "group_members_read_group" on public.group_members;
create policy "group_members_read_group" on public.group_members
  for select to authenticated using (public.is_group_member(group_id));

drop policy if exists "groups_read_own" on public.checkin_groups;
create policy "groups_read_own" on public.checkin_groups
  for select to authenticated using (public.is_group_member(id));

drop policy if exists "authed_read_users" on public.users;
drop policy if exists "group_read_users" on public.users;
create policy "group_read_users" on public.users
  for select to authenticated using (id = auth.uid() or public.is_same_group_user(id));

drop policy if exists "authed_read_templates" on public.templates;
drop policy if exists "group_read_templates" on public.templates;
create policy "group_read_templates" on public.templates
  for select to authenticated using (public.is_group_member(group_id));

drop policy if exists "insert_own_template" on public.templates;
create policy "insert_own_template" on public.templates
  for insert to authenticated
  with check (auth.uid() = owner_id and public.is_group_member(group_id));

drop policy if exists "update_own_template" on public.templates;
create policy "update_own_template" on public.templates
  for update to authenticated
  using (auth.uid() = owner_id and public.is_group_member(group_id))
  with check (auth.uid() = owner_id and public.is_group_member(group_id));

drop policy if exists "delete_own_template" on public.templates;
create policy "delete_own_template" on public.templates
  for delete to authenticated using (auth.uid() = owner_id and public.is_group_member(group_id));

drop policy if exists "authed_read_day_plans" on public.day_plans;
drop policy if exists "group_read_day_plans" on public.day_plans;
create policy "group_read_day_plans" on public.day_plans
  for select to authenticated using (public.is_group_member(group_id));

drop policy if exists "insert_own_day_plan" on public.day_plans;
create policy "insert_own_day_plan" on public.day_plans
  for insert to authenticated
  with check (auth.uid() = user_id and public.is_group_member(group_id));

drop policy if exists "update_own_day_plan" on public.day_plans;
create policy "update_own_day_plan" on public.day_plans
  for update to authenticated
  using (auth.uid() = user_id and public.is_group_member(group_id))
  with check (auth.uid() = user_id and public.is_group_member(group_id));

drop policy if exists "delete_own_day_plan" on public.day_plans;
create policy "delete_own_day_plan" on public.day_plans
  for delete to authenticated using (auth.uid() = user_id and public.is_group_member(group_id));

drop policy if exists "authed_read_messages" on public.messages;
drop policy if exists "group_read_messages" on public.messages;
create policy "group_read_messages" on public.messages
  for select to authenticated using (public.is_group_member(group_id));

drop policy if exists "insert_own_message" on public.messages;
create policy "insert_own_message" on public.messages
  for insert to authenticated
  with check (auth.uid() = sender_id and public.is_group_member(group_id));

drop policy if exists "delete_own_message" on public.messages;
create policy "delete_own_message" on public.messages
  for delete to authenticated using (auth.uid() = sender_id and public.is_group_member(group_id));

drop policy if exists "authed_read_weekly_reviews" on public.weekly_reviews;
drop policy if exists "group_read_weekly_reviews" on public.weekly_reviews;
create policy "group_read_weekly_reviews" on public.weekly_reviews
  for select to authenticated using (public.is_same_group_user(user_id));

commit;
