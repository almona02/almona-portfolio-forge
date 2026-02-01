-- Create analytics tables used by performance monitoring
-- Safe to run multiple times
create table if not exists public.feature_usage_metrics (
  id uuid primary key default gen_random_uuid(),
  feature_name text not null,
  action text,
  user_id text,
  session_id text,
  timestamp timestamptz not null,
  context jsonb,
  success boolean,
  error_message text,
  performance_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists feature_usage_metrics_feature_name_idx
  on public.feature_usage_metrics (feature_name);

create table if not exists public.user_satisfaction_metrics (
  id uuid primary key default gen_random_uuid(),
  page text not null,
  rating integer,
  feedback text,
  user_id text,
  timestamp timestamptz not null,
  context jsonb,
  created_at timestamptz not null default now()
);

create index if not exists user_satisfaction_metrics_page_idx
  on public.user_satisfaction_metrics (page);
