-- Create journal_entries table
create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  content text not null,
  reflection text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Enable Row Level Security (RLS)
alter table public.journal_entries enable row level security;

-- Policies for RLS
create policy "Users can view their own journal entries"
  on public.journal_entries for select
  using ( (select auth.uid()) = user_id );

create policy "Users can insert their own journal entries"
  on public.journal_entries for insert
  with check ( (select auth.uid()) = user_id );

create policy "Users can update their own journal entries"
  on public.journal_entries for update
  using ( (select auth.uid()) = user_id );

create policy "Users can delete their own journal entries"
  on public.journal_entries for delete
  using ( (select auth.uid()) = user_id );

-- Enable indexes for faster sorting and querying
create index if not exists journal_entries_user_id_idx on public.journal_entries(user_id);
create index if not exists journal_entries_created_at_idx on public.journal_entries(created_at desc);
