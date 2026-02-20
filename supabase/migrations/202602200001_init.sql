create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  company_name text,
  company_industry text,
  company_scale text,
  created_at timestamptz not null default now()
);

create table if not exists models (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  provider text not null,
  description text,
  cost_input numeric,
  cost_output numeric,
  api_url text,
  docs_url text,
  business_scenarios text[] default '{}',
  release_date date,
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,
  content text,
  source text,
  url text unique,
  tags text[] default '{}',
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  model_id uuid references models(id) on delete cascade,
  article_id uuid references articles(id) on delete cascade,
  created_at timestamptz not null default now(),
  check ((model_id is not null) <> (article_id is not null))
);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null,
  content text not null,
  agent_type text,
  created_at timestamptz not null default now()
);

create table if not exists solutions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  conversation_id uuid not null references conversations(id) on delete cascade,
  title text not null,
  content jsonb not null,
  pdf_url text,
  created_at timestamptz not null default now()
);
