-- Create conversation tables

-- 1. Create chats table
create table public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null check (status in ('active', 'archived')) default 'active',
  state text not null default 'Listening',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Create chat_messages table
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  sender text not null check (sender in ('user', 'mascot')),
  content text not null,
  mascot_character text default null,
  mascot_expression text default null,
  nlu_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 3. Create conversation_summaries table
create table public.conversation_summaries (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  summary text not null,
  emotional_arc jsonb not null default '[]'::jsonb,
  discovered_interests jsonb not null default '[]'::jsonb,
  unresolved_conflicts jsonb not null default '[]'::jsonb,
  decisions_made jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- 4. Create memory_candidates table
create table public.memory_candidates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  summary text not null,
  status text not null check (status in ('pending', 'approved', 'rejected')) default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add updated_at triggers
create trigger on_chat_updated
  before update on public.chats
  for each row execute procedure public.handle_updated_at();

create trigger on_memory_candidate_updated
  before update on public.memory_candidates
  for each row execute procedure public.handle_updated_at();

-- Enable RLS
alter table public.chats enable row level security;
alter table public.chat_messages enable row level security;
alter table public.conversation_summaries enable row level security;
alter table public.memory_candidates enable row level security;

-- Create RLS Policies
create policy "Users can manage own chats" on public.chats
  for all using (auth.uid() = user_id);

create policy "Users can manage messages of own chats" on public.chat_messages
  for all using (
    exists (
      select 1 from public.chats c
      where c.id = chat_id and c.user_id = auth.uid()
    )
  );

create policy "Users can manage summaries of own chats" on public.conversation_summaries
  for all using (
    exists (
      select 1 from public.chats c
      where c.id = chat_id and c.user_id = auth.uid()
    )
  );

create policy "Users can manage own memory candidates" on public.memory_candidates
  for all using (auth.uid() = user_id);

-- Create optimized indexes for performance
create index idx_chats_lookup on public.chats (user_id, status);
create index idx_chat_messages_lookup on public.chat_messages (chat_id, created_at asc);
create index idx_memory_candidates_lookup on public.memory_candidates (user_id, status);
