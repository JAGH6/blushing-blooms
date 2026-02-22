-- Tetris Family Competition schema (Supabase/Postgres)
-- Run in Supabase SQL editor or via migration.

-- Players: identity and display name
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  phone text unique,
  display_name text not null default 'Player',
  created_at timestamptz not null default now(),
  constraint email_or_phone check (
    (email is not null and phone is null) or (phone is not null and email is null)
  )
);

create index if not exists players_email on players(email) where email is not null;
create index if not exists players_phone on players(phone) where phone is not null;

-- One-time auth codes (email or phone)
create table if not exists auth_codes (
  id uuid primary key default gen_random_uuid(),
  email_or_phone text not null,
  code text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists auth_codes_lookup on auth_codes(email_or_phone, code);

-- One score per player per calendar day (best run; update if better)
create table if not exists daily_scores (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  date date not null,
  score integer not null,
  completion_time_seconds integer not null,
  level_reached integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(player_id, date)
);

create index if not exists daily_scores_date on daily_scores(date);
create index if not exists daily_scores_player_date on daily_scores(player_id, date);

-- Family phone numbers that receive the daily SMS (admin-managed or env)
create table if not exists family_phones (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  label text,
  created_at timestamptz not null default now()
);

-- v1: players avatar + theme (email-only sign-in supported; phone kept for compatibility)
alter table players add column if not exists avatar_url text;
alter table players add column if not exists theme text default 'classic';

-- daily_scores: trivia bonus earned
alter table daily_scores add column if not exists trivia_bonus_earned boolean default false;

-- Daily trivia: one question per day, 6 options, correct index
create table if not exists daily_trivia (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  question_text text not null,
  options jsonb not null,
  correct_index smallint not null,
  created_at timestamptz not null default now()
);

-- Daily notes (family journal)
create table if not exists daily_notes (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  date date not null,
  note_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(player_id, date)
);
create index if not exists daily_notes_date on daily_notes(date);

-- Achievements
create table if not exists achievements (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  achievement_key text not null,
  earned_at timestamptz not null default now(),
  unique(player_id, achievement_key)
);
create index if not exists achievements_player on achievements(player_id);

-- Player streaks (current and longest)
create table if not exists player_streaks (
  player_id uuid primary key references players(id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_played_date date,
  updated_at timestamptz not null default now()
);

-- AI feedback per game
create table if not exists game_feedback (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  date date not null,
  feedback_text text,
  created_at timestamptz not null default now(),
  unique(player_id, date)
);
create index if not exists game_feedback_player_date on game_feedback(player_id, date);

-- Replay clips (JSON frames)
create table if not exists replay_clips (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  date date not null,
  replay_data jsonb not null,
  created_at timestamptz not null default now(),
  unique(player_id, date)
);

-- Weekly themes
create table if not exists weekly_themes (
  id uuid primary key default gen_random_uuid(),
  week_start_date date not null unique,
  theme_key text not null,
  label text not null,
  config jsonb default '{}',
  created_at timestamptz not null default now()
);

-- Collaborative milestones
create table if not exists milestones (
  id uuid primary key default gen_random_uuid(),
  milestone_key text not null unique,
  config jsonb default '{}',
  unlocked_at timestamptz not null default now()
);
