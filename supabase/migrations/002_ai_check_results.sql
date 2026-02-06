-- AIチェック結果キャッシュ（申請ごとに1件。誰が開いても同じ結果）
create table if not exists public.ai_check_results (
  application_id text primary key,
  result jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_check_results_application_id
  on public.ai_check_results (application_id);
