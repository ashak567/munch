-- Alter decisions table to add importance column
alter table public.decisions 
  add column if not exists importance text;
