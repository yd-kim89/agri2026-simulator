-- ══════════════════════════════════════════════════════════════
-- agri2026-staging — 스테이징 DB 스키마 (스키마만, 데이터 없음)
-- Supabase 스테이징 프로젝트 SQL Editor에 통째로 붙여넣고 실행.
-- (= migrations/001_init.sql + 002_auth_multiuser.sql 병합본)
-- ══════════════════════════════════════════════════════════════

-- 1) 시뮬레이션 실행 로그
create table if not exists public.simulation_log (
  id uuid primary key default gen_random_uuid(),
  item_code text not null,
  item_name text not null,
  quantity numeric not null,
  target_date date,
  best_scenario text,
  scenarios jsonb,
  user_id text default 'anon',
  created_at timestamptz not null default now()
);

-- 2) 사후 검증
create table if not exists public.verification (
  id uuid primary key default gen_random_uuid(),
  sim_id uuid references public.simulation_log(id) on delete cascade,
  actual_price numeric,
  error_pct numeric,
  verdict text check (verdict in ('hit', 'near', 'miss')),
  verified_at timestamptz default now()
);

create index if not exists idx_simlog_item on public.simulation_log(item_code);
create index if not exists idx_simlog_created on public.simulation_log(created_at desc);

-- 3) 계정 귀속 컬럼 (멀티세션)
alter table public.simulation_log
  add column if not exists owner uuid references auth.users(id) on delete cascade;
create index if not exists idx_simlog_owner
  on public.simulation_log(owner, created_at desc);

-- 4) RLS
alter table public.simulation_log enable row level security;
alter table public.verification enable row level security;

-- 익명: owner is null 행만 insert/read
drop policy if exists "anon insert simlog" on public.simulation_log;
create policy "anon insert simlog" on public.simulation_log
  for insert to anon with check (owner is null);
drop policy if exists "anon read simlog" on public.simulation_log;
create policy "anon read simlog" on public.simulation_log
  for select to anon using (owner is null);

-- 로그인: 본인 행만
drop policy if exists "auth insert own simlog" on public.simulation_log;
create policy "auth insert own simlog" on public.simulation_log
  for insert to authenticated with check (owner = auth.uid());
drop policy if exists "auth read own simlog" on public.simulation_log;
create policy "auth read own simlog" on public.simulation_log
  for select to authenticated using (owner = auth.uid());
drop policy if exists "auth delete own simlog" on public.simulation_log;
create policy "auth delete own simlog" on public.simulation_log
  for delete to authenticated using (owner = auth.uid());
