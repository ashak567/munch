-- Alter decisions table to add personality engine fields
alter table public.decisions 
  add column if not exists reasoning text,
  add column if not exists encouragement text,
  add column if not exists follow_up_question text;
