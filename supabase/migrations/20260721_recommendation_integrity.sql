-- PlayNext recommendation and feedback integrity
-- Apply after 20260720_security_hardening.sql.
-- This migration fails safely instead of deleting or rewriting legacy data.

begin;

do $$
begin
  if exists (
    select 1
    from public.recommendation_sessions
    where recommendation_mode is null
      or recommendation_mode not in ('collection', 'discovery')
  ) then
    raise exception 'Invalid recommendation_mode rows exist. Review them before applying this migration.';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'session_recommendation_mode_allowed'
      and conrelid = 'public.recommendation_sessions'::regclass
  ) then
    alter table public.recommendation_sessions
      add constraint session_recommendation_mode_allowed
      check (recommendation_mode in ('collection', 'discovery'));
  end if;

  if exists (
    select recommendation_id
    from public.feedback
    group by recommendation_id
    having count(*) > 1
  ) then
    raise exception 'Duplicate feedback rows exist. Review them before applying this migration.';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'feedback_one_response_per_recommendation'
      and conrelid = 'public.feedback'::regclass
  ) then
    alter table public.feedback
      add constraint feedback_one_response_per_recommendation
      unique (recommendation_id);
  end if;
end $$;

commit;
