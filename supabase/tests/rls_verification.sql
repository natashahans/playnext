-- PlayNext database security verification
-- This file is read-only: it checks configuration and does not modify data.
--
-- In the Supabase SQL Editor, highlight and run one numbered section at a time
-- so that you can view and save the result for each section separately.

-- ---------------------------------------------------------------------------
-- 1. ROW LEVEL SECURITY STATUS
-- Expected: seven rows and every row_level_security_enabled value is true.
-- ---------------------------------------------------------------------------

select
  c.relname as table_name,
  c.relrowsecurity as row_level_security_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'profiles',
    'games',
    'user_games',
    'user_preferences',
    'recommendation_sessions',
    'recommendations',
    'feedback'
  )
order by c.relname;

-- ---------------------------------------------------------------------------
-- 2. POLICY SUMMARY
-- Expected policy counts:
-- feedback 2, games 1, profiles 3, recommendation_sessions 2,
-- recommendations 2, user_games 4, user_preferences 3.
-- ---------------------------------------------------------------------------

select
  tablename,
  count(*) as policy_count,
  string_agg(cmd, ', ' order by cmd) as allowed_operations
from pg_policies
where schemaname = 'public'
  and tablename in (
    'profiles',
    'games',
    'user_games',
    'user_preferences',
    'recommendation_sessions',
    'recommendations',
    'feedback'
  )
group by tablename
order by tablename;

-- ---------------------------------------------------------------------------
-- 3. FULL POLICY DEFINITIONS
-- Reviewable evidence that ownership checks use auth.uid().
-- The games SELECT policy intentionally uses true because catalogue metadata
-- is shared, while write access to that table is server-only.
-- ---------------------------------------------------------------------------

select
  tablename,
  policyname,
  roles,
  cmd,
  qual as using_expression,
  with_check as insert_or_update_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'profiles',
    'games',
    'user_games',
    'user_preferences',
    'recommendation_sessions',
    'recommendations',
    'feedback'
  )
order by tablename, cmd, policyname;

-- ---------------------------------------------------------------------------
-- 4. TABLE PRIVILEGES
-- Expected: no anon rows. Authenticated should have only:
-- feedback: INSERT, SELECT
-- games: SELECT
-- profiles: INSERT, SELECT, UPDATE
-- recommendation_sessions: INSERT, SELECT
-- recommendations: INSERT, SELECT
-- user_games: DELETE, INSERT, SELECT, UPDATE
-- user_preferences: INSERT, SELECT, UPDATE
-- ---------------------------------------------------------------------------

select
  grantee,
  table_name,
  string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'profiles',
    'games',
    'user_games',
    'user_preferences',
    'recommendation_sessions',
    'recommendations',
    'feedback'
  )
  and grantee in ('anon', 'authenticated')
group by grantee, table_name
order by grantee, table_name;

-- ---------------------------------------------------------------------------
-- 5. EXISTING-DATA CONSTRAINT AUDIT
-- Expected: all invalid_rows values are 0.
-- ---------------------------------------------------------------------------

select 'user_games_status_allowed' as check_name, count(*) as invalid_rows
from public.user_games
where status is not null
  and status not in ('backlog', 'playing', 'completed', 'dropped')

union all

select 'feedback_type_allowed', count(*)
from public.feedback
where feedback_type is not null
  and feedback_type not in (
    'liked',
    'not_in_mood',
    'too_long',
    'too_difficult',
    'not_interested',
    'already_played'
  )

union all

select 'recommendation_score_range', count(*)
from public.recommendations
where score is not null
  and score not between 0 and 100

union all

select 'session_available_time_range', count(*)
from public.recommendation_sessions
where available_time is not null
  and available_time not between 5 and 720

union all

select 'feedback_reason_length', count(*)
from public.feedback
where reason is not null
  and char_length(reason) > 240

union all

select 'session_recommendation_mode_allowed', count(*)
from public.recommendation_sessions
where recommendation_mode is null
  or recommendation_mode not in ('collection', 'discovery');

-- Must return zero. If it does not, review duplicate rows before adding the
-- one-response-per-recommendation constraint; do not delete research data blindly.
select 'duplicate_feedback_per_recommendation' as check_name, count(*) as invalid_rows
from (
  select recommendation_id
  from public.feedback
  group by recommendation_id
  having count(*) > 1
) duplicates;

-- ---------------------------------------------------------------------------
-- 6. CONSTRAINT VALIDATION STATUS
-- Expected: six check constraints with validated=true. The unique feedback
-- constraint should also be present when the duplicate audit returned zero.
-- ---------------------------------------------------------------------------

select
  conrelid::regclass as table_name,
  conname as constraint_name,
  convalidated as validated
from pg_constraint
where connamespace = 'public'::regnamespace
  and conname in (
    'user_games_status_allowed',
    'feedback_type_allowed',
    'recommendation_score_range',
    'session_available_time_range',
    'feedback_reason_length',
    'session_recommendation_mode_allowed',
    'feedback_one_response_per_recommendation'
  )
order by table_name, constraint_name;
