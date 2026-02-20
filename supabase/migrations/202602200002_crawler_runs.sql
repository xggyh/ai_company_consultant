create table if not exists crawler_runs (
  id text primary key,
  started_at timestamptz not null,
  finished_at timestamptz,
  status text not null check (status in ('success', 'partial', 'failed')),
  model_persisted int not null default 0,
  article_persisted int not null default 0,
  error_message text
);

alter table models
  add column if not exists crawl_run_id text,
  add column if not exists last_crawled_at timestamptz;

alter table articles
  add column if not exists crawl_run_id text,
  add column if not exists last_crawled_at timestamptz;
