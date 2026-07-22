-- Phase 5 (PRD v4 — Day3 멀티유저·멀티세션)
-- simulation_log를 로그인 계정에 귀속. RLS로 본인 행만 읽고 쓴다.
-- Supabase SQL Editor에서 001_init.sql 이후 실행.

-- 1) 계정 귀속 컬럼 (비로그인 기록은 owner null 유지 — 하위 호환)
alter table public.simulation_log
  add column if not exists owner uuid references auth.users(id) on delete cascade;

create index if not exists idx_simlog_owner
  on public.simulation_log(owner, created_at desc);

-- 2) 익명(비로그인) 정책 강화: 익명 행(owner is null)만 쓰고 읽는다
--    (기존 using(true) 정책은 로그인 사용자 행까지 노출되므로 교체)
drop policy if exists "anon insert simlog" on public.simulation_log;
create policy "anon insert simlog" on public.simulation_log
  for insert to anon with check (owner is null);

drop policy if exists "anon read simlog" on public.simulation_log;
create policy "anon read simlog" on public.simulation_log
  for select to anon using (owner is null);

-- 3) 로그인 사용자: 본인 행만 삽입·조회 (멀티세션 — 어느 기기에서든 내 기록)
drop policy if exists "auth insert own simlog" on public.simulation_log;
create policy "auth insert own simlog" on public.simulation_log
  for insert to authenticated with check (owner = auth.uid());

drop policy if exists "auth read own simlog" on public.simulation_log;
create policy "auth read own simlog" on public.simulation_log
  for select to authenticated using (owner = auth.uid());

-- 4) 본인 기록 삭제(계정 데이터 소유권 — PRD S-004 개인정보 원칙)
drop policy if exists "auth delete own simlog" on public.simulation_log;
create policy "auth delete own simlog" on public.simulation_log
  for delete to authenticated using (owner = auth.uid());
