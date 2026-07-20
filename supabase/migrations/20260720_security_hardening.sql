-- PlayNext security hardening
-- Run this once in Supabase SQL Editor, then verify every table shows RLS enabled.

begin;

alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.user_games enable row level security;
alter table public.user_preferences enable row level security;
alter table public.recommendation_sessions enable row level security;
alter table public.recommendations enable row level security;
alter table public.feedback enable row level security;

-- Remove the earlier broad policies before recreating least-privilege policies.
drop policy if exists "Anyone can view games" on public.games;
drop policy if exists "Authenticated users can insert games" on public.games;
drop policy if exists "Authenticated users can update games" on public.games;

drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Users can view their own profile" on public.profiles;

drop policy if exists "Users can add games to their own collection" on public.user_games;
drop policy if exists "Users can remove games from their own collection" on public.user_games;
drop policy if exists "Users can update their own saved games" on public.user_games;
drop policy if exists "Users can view their own saved games" on public.user_games;

drop policy if exists "Users can create their own preferences" on public.user_preferences;
drop policy if exists "Users can delete their own preferences" on public.user_preferences;
drop policy if exists "Users can update their own preferences" on public.user_preferences;
drop policy if exists "Users can view their own preferences" on public.user_preferences;

drop policy if exists "Users can create their own recommendation sessions" on public.recommendation_sessions;
drop policy if exists "Users can delete their own recommendation sessions" on public.recommendation_sessions;
drop policy if exists "Users can update their own recommendation sessions" on public.recommendation_sessions;
drop policy if exists "Users can view their own recommendation sessions" on public.recommendation_sessions;

drop policy if exists "Users can create their own recommendations" on public.recommendations;
drop policy if exists "Users can delete their own recommendations" on public.recommendations;
drop policy if exists "Users can update their own recommendations" on public.recommendations;
drop policy if exists "Users can view their own recommendations" on public.recommendations;

drop policy if exists "Users can create their own feedback" on public.feedback;
drop policy if exists "Users can delete their own feedback" on public.feedback;
drop policy if exists "Users can update their own feedback" on public.feedback;
drop policy if exists "Users can view their own feedback" on public.feedback;

-- Shared catalogue data is readable by signed-in users but only the authenticated
-- server endpoint (service role) may create or modify canonical game metadata.
create policy "Authenticated users can read catalogue games"
on public.games for select
to authenticated
using (true);

create policy "Users can read their own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy "Users can create their own profile"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Users can read their own collection"
on public.user_games for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can add to their own collection"
on public.user_games for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own collection"
on public.user_games for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can remove from their own collection"
on public.user_games for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can read their own preferences"
on public.user_preferences for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own preferences"
on public.user_preferences for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own preferences"
on public.user_preferences for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can read their own recommendation sessions"
on public.recommendation_sessions for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own recommendation sessions"
on public.recommendation_sessions for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can read their own recommendations"
on public.recommendations for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create valid recommendations for themselves"
on public.recommendations for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.recommendation_sessions session
    where session.id = session_id
      and session.user_id = (select auth.uid())
  )
);

create policy "Users can read their own feedback"
on public.feedback for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create feedback for their own recommendation"
on public.feedback for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.recommendations recommendation
    where recommendation.id = recommendation_id
      and recommendation.user_id = (select auth.uid())
  )
);

-- Explicit grants complement RLS. Anonymous clients receive no table access.
revoke all on table public.profiles from anon;
revoke all on table public.games from anon;
revoke all on table public.user_games from anon;
revoke all on table public.user_preferences from anon;
revoke all on table public.recommendation_sessions from anon;
revoke all on table public.recommendations from anon;
revoke all on table public.feedback from anon;

revoke insert, update, delete on table public.games from authenticated;
grant select on table public.games to authenticated;
grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.user_games to authenticated;
grant select, insert, update on table public.user_preferences to authenticated;
grant select, insert on table public.recommendation_sessions to authenticated;
grant select, insert on table public.recommendations to authenticated;
grant select, insert on table public.feedback to authenticated;

-- Fast ownership checks and history queries.
create index if not exists user_games_user_id_idx on public.user_games (user_id);
create index if not exists recommendations_user_created_idx on public.recommendations (user_id, created_at desc);
create index if not exists recommendation_sessions_user_created_idx on public.recommendation_sessions (user_id, created_at desc);
create index if not exists feedback_user_created_idx on public.feedback (user_id, created_at desc);
create index if not exists feedback_recommendation_owner_idx on public.feedback (user_id, recommendation_id);

-- New writes are checked immediately. NOT VALID avoids breaking migration when
-- legacy rows need manual review; validate each constraint after reviewing them.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'user_games_status_allowed') then
    alter table public.user_games add constraint user_games_status_allowed
      check (status in ('backlog', 'playing', 'completed', 'dropped')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'feedback_type_allowed') then
    alter table public.feedback add constraint feedback_type_allowed
      check (feedback_type in ('liked', 'not_in_mood', 'too_long', 'too_difficult', 'not_interested', 'already_played')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'recommendation_score_range') then
    alter table public.recommendations add constraint recommendation_score_range
      check (score between 0 and 100) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'session_available_time_range') then
    alter table public.recommendation_sessions add constraint session_available_time_range
      check (available_time is null or available_time between 5 and 720) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'feedback_reason_length') then
    alter table public.feedback add constraint feedback_reason_length
      check (reason is null or char_length(reason) <= 240) not valid;
  end if;
end $$;

commit;
