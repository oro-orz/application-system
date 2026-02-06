-- AIチェック一括実行ジョブ（進捗管理・ブラウザ閉じても継続可能）
create table if not exists public.ai_check_jobs (
  id uuid primary key default gen_random_uuid(),
  month text not null,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  total int not null default 0,
  "offset" int not null default 0,
  processed int not null default 0,
  failed_count int not null default 0,
  errors jsonb not null default '[]',
  overwrite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_ai_check_jobs_status on public.ai_check_jobs (status);
create index if not exists idx_ai_check_jobs_created_at on public.ai_check_jobs (created_at desc);

comment on column public.ai_check_jobs.overwrite is 'true: 既存結果を上書き。false: 実行済みはスキップ';
