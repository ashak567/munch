-- Create missing performance indexes on foreign key columns
create index if not exists idx_decisions_user_id on public.decisions(user_id);
create index if not exists idx_options_decision_id on public.options(decision_id);
