-- Create user memories table
create table public.user_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users on delete cascade,
  memory_type text not null check (memory_type in ('episodic', 'semantic', 'emotional', 'relationship', 'decision')),
  summary text not null,
  confidence numeric not null check (confidence >= 0.0 and confidence <= 1.0),
  importance numeric not null check (importance >= 0.0 and importance <= 1.0),
  relevance_score numeric not null default 1.0,
  evidence_refs jsonb not null default '[]'::jsonb, -- array of {source_type, source_id, timestamp}
  last_referenced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add standard triggers for updated_at on user_memories
create trigger on_memory_updated
  before update on public.user_memories
  for each row execute procedure public.handle_updated_at();

-- Enable RLS
alter table public.user_memories enable row level security;

-- Policies
create policy "Users can manage own memories" on public.user_memories
  for all using (auth.uid() = user_id);

-- Create optimized indices for lookup and decay pipelines
create index idx_user_memories_lookup on public.user_memories (user_id, memory_type);
create index idx_user_memories_relevance on public.user_memories (user_id, relevance_score desc, last_referenced_at desc);
