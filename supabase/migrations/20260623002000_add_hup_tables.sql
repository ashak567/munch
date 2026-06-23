-- Create raw observations table
create table public.user_observations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users on delete cascade,
  source_type text not null check (source_type in ('decision', 'feedback', 'conversation', 'interaction')),
  source_id uuid not null, -- references decisions.id or feedback.id
  dimension text not null, -- identity, relationship, values, communication, decision_pattern, comfort, interests, emotional_pattern, narrative, growth, uncertainty, memory_reference
  key text not null, -- specific attribute key
  observed_value jsonb not null,
  confidence numeric not null check (confidence >= 0.0 and confidence <= 1.0),
  context text, -- contextual description
  created_at timestamptz not null default now()
);

-- Create aggregated beliefs table (profile single source of truth)
create table public.user_beliefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users on delete cascade,
  dimension text not null,
  key text not null,
  value jsonb not null,
  confidence numeric not null check (confidence >= 0.0 and confidence <= 1.0),
  evidence_count integer not null default 0,
  evidence_refs jsonb not null default '[]'::jsonb, -- array of {observation_id, source_type, timestamp}
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, dimension, key)
);

-- Add standard triggers for updated_at on user_beliefs
create trigger on_belief_updated
  before update on public.user_beliefs
  for each row execute procedure public.handle_updated_at();

-- Enable RLS
alter table public.user_observations enable row level security;
alter table public.user_beliefs enable row level security;

-- Policies
create policy "Users can manage own observations" on public.user_observations
  for all using (auth.uid() = user_id);

create policy "Users can manage own beliefs" on public.user_beliefs
  for all using (auth.uid() = user_id);

-- Create optimized indices
create index idx_user_observations_lookup on public.user_observations (user_id, dimension, key);
create index idx_user_beliefs_lookup on public.user_beliefs (user_id, dimension, key);
