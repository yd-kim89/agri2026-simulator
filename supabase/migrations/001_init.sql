-- agri2026 매입 시뮬레이터 — 데이터 모델 (PRD 08절)
-- Supabase SQL Editor 또는 `supabase db push`로 적용

-- 시뮬레이션 실행 로그 (매입 의향 데이터 = 양면 네트워크의 씨앗)
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

-- 사후 검증 (시뮬레이션 ↔ 실측 대조)
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

-- RLS: 베타 단계 — 익명 insert 허용, 개인정보 미수집(user_id는 임의 식별자)
alter table public.simulation_log enable row level security;
alter table public.verification enable row level security;

drop policy if exists "anon insert simlog" on public.simulation_log;
create policy "anon insert simlog" on public.simulation_log
  for insert to anon with check (true);

drop policy if exists "anon read simlog" on public.simulation_log;
create policy "anon read simlog" on public.simulation_log
  for select to anon using (true);
