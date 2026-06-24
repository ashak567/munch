-- Create nickname affinity table
create table public.nickname_affinity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  nickname text not null,
  times_used integer not null default 0,
  user_reaction text check (user_reaction in ('love', 'okay', 'dislike')) default null,
  comfort_score numeric not null default 1.0 check (comfort_score >= 0.0 and comfort_score <= 10.0),
  is_active boolean not null default false,
  last_used_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, nickname)
);

-- Add updated_at trigger
create trigger on_nickname_affinity_updated
  before update on public.nickname_affinity
  for each row execute procedure public.handle_updated_at();

-- Enable RLS
alter table public.nickname_affinity enable row level security;

-- RLS policies
create policy "Users can manage own nickname affinities" on public.nickname_affinity
  for all using (auth.uid() = user_id);

-- Alter decisions table to add nickname_snapshot
alter table public.decisions
  add column if not exists nickname_snapshot text default null;

-- Add optimized index for lookup
create index idx_nickname_affinity_lookup on public.nickname_affinity (user_id, is_active);
create index idx_nickname_affinity_user_score on public.nickname_affinity (user_id, comfort_score desc);
