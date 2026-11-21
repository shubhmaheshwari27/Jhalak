-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run

create extension if not exists "pgcrypto";

create table if not exists sarees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text,                       -- barcode / SKU (optional for now)
  price numeric,
  photo_path text not null,        -- storage path of the labelled flat-lay photo
  spec jsonb,                      -- AI description used by Approach A
  spec_status text not null default 'pending',  -- pending | done | failed
  spec_error text,
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  label text,                      -- e.g. customer first name or "Test 3"
  customer_photo_path text not null,
  consent boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists tryons (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  saree_id uuid not null references sarees(id) on delete cascade,
  provider text not null,          -- openai | gemini
  approach text not null,          -- A (describe first) | B (direct photo)
  status text not null default 'pending',  -- pending | running | done | failed
  image_path text,
  error text,
  duration_ms integer,
  started_at timestamptz,
  rating_saree smallint,           -- 1-5: how accurately the saree design was copied
  rating_face smallint,            -- 1-5: does it still look like the same person
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists tryons_session_idx on tryons(session_id);

-- Lock tables: only the server (service role key) can read/write.
alter table sarees enable row level security;
alter table sessions enable row level security;
alter table tryons enable row level security;

-- Private storage bucket for all photos
insert into storage.buckets (id, name, public)
values ('cloakroom', 'cloakroom', false)
on conflict (id) do nothing;
