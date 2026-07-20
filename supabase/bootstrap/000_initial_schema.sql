-- PlayNext reproducible database bootstrap
--
-- Use this file only when creating a NEW, empty Supabase project. The current
-- production project already contains these tables and should continue using
-- the timestamped migrations in ../migrations instead.

begin;

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  rawg_id bigint not null unique,
  slug text not null unique,
  title text not null,
  background_image text,
  released date,
  rating numeric(3, 2),
  playtime integer,
  genres text[] not null default '{}',
  platforms text[] not null default '{}',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint games_rawg_id_positive check (rawg_id > 0),
  constraint games_title_length check (char_length(title) between 1 and 240),
  constraint games_rating_range check (rating is null or rating between 0 and 5),
  constraint games_playtime_nonnegative check (playtime is null or playtime >= 0)
);

create table if not exists public.user_games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  game_id uuid not null references public.games (id) on delete cascade,
  status text not null default 'backlog',
  added_at timestamptz not null default now(),
  constraint user_games_user_game_unique unique (user_id, game_id),
  constraint user_games_status_allowed check (status in ('backlog', 'playing', 'completed', 'dropped'))
);

create table if not exists public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  favorite_genres text[] not null default '{}',
  preferred_platforms text[] not null default '{}',
  play_style text,
  difficulty_preference text,
  session_length_preference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_preferences_genre_limit check (cardinality(favorite_genres) <= 5),
  constraint user_preferences_platform_limit check (cardinality(preferred_platforms) <= 12),
  constraint user_preferences_play_style_allowed check (
    play_style is null or play_style in ('story', 'gameplay', 'balanced')
  ),
  constraint user_preferences_difficulty_allowed check (
    difficulty_preference is null or difficulty_preference in ('easy', 'normal', 'hard')
  ),
  constraint user_preferences_session_length_allowed check (
    session_length_preference is null or session_length_preference in ('short', 'medium', 'long')
  )
);

create table if not exists public.recommendation_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  user_input text not null,
  mood text,
  available_time integer,
  energy_level text,
  desired_experience text,
  difficulty_preference text,
  preferred_genres text[] not null default '{}',
  reference_games text[] not null default '{}',
  recommendation_mode text not null default 'collection',
  created_at timestamptz not null default now(),
  constraint session_input_length check (char_length(user_input) between 1 and 4000),
  constraint session_available_time_range check (
    available_time is null or available_time between 5 and 720
  ),
  constraint session_recommendation_mode_allowed check (
    recommendation_mode in ('collection', 'discovery')
  )
);

create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.recommendation_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  game_id uuid not null references public.games (id) on delete restrict,
  score integer not null,
  explanation text not null,
  score_breakdown jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint recommendation_session_unique unique (session_id),
  constraint recommendation_score_range check (score between 0 and 100),
  constraint recommendation_explanation_length check (char_length(explanation) between 1 and 4000),
  constraint recommendation_breakdown_array check (jsonb_typeof(score_breakdown) = 'array')
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  recommendation_id uuid not null references public.recommendations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  feedback_type text not null,
  reason text,
  created_at timestamptz not null default now(),
  constraint feedback_one_response_per_recommendation unique (recommendation_id),
  constraint feedback_type_allowed check (
    feedback_type in ('liked', 'not_in_mood', 'too_long', 'too_difficult', 'not_interested', 'already_played')
  ),
  constraint feedback_reason_length check (reason is null or char_length(reason) <= 240)
);

create index if not exists user_games_user_id_idx
  on public.user_games (user_id);
create index if not exists recommendations_user_created_idx
  on public.recommendations (user_id, created_at desc);
create index if not exists recommendation_sessions_user_created_idx
  on public.recommendation_sessions (user_id, created_at desc);
create index if not exists feedback_user_created_idx
  on public.feedback (user_id, created_at desc);
create index if not exists feedback_recommendation_owner_idx
  on public.feedback (user_id, recommendation_id);

commit;
