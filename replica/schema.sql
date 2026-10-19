-- MotoNav schema (Postgres). Access rule: row level security on Supabase,
-- every table with user_id is readable and writable only by that user.

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  default_vehicle text not null default 'motorcycle'
    check (default_vehicle in ('car','motorcycle')),
  default_preference text not null default 'fastest'
    check (default_preference in ('fastest','shortest')),
  locale text not null default 'tr',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  address text not null,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  phone text,
  email text,
  grp text,
  note text,
  photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on addresses (user_id, name);
create index on addresses (user_id, grp);

create table routes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  vehicle text not null default 'motorcycle' check (vehicle in ('car','motorcycle')),
  preference text not null default 'fastest' check (preference in ('fastest','shortest')),
  start_mode text not null default 'current_location'
    check (start_mode in ('current_location','first_stop','stop')),
  start_stop_id uuid,
  end_stop_id uuid,
  end_auto boolean not null default false,
  total_distance_m integer,
  total_duration_s integer,
  planned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on routes (user_id, created_at desc);

create table stops (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references routes(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  address_id uuid references addresses(id) on delete set null,
  label text not null,
  address text not null,
  lat double precision not null,
  lng double precision not null,
  note text,
  position integer not null,
  status text not null default 'pending' check (status in ('pending','done','failed')),
  visited_at timestamptz,
  created_at timestamptz not null default now(),
  unique (route_id, position) deferrable initially deferred
);
create index on stops (route_id, position);
create index on stops (user_id);
create index on stops (address_id);

alter table routes
  add foreign key (start_stop_id) references stops(id) on delete set null,
  add foreign key (end_stop_id) references stops(id) on delete set null;

-- A route holds at most 300 stops (product limit).
create function enforce_stop_limit() returns trigger language plpgsql as $$
begin
  if (select count(*) from stops where route_id = new.route_id) >= 300 then
    raise exception 'route has the maximum of 300 stops';
  end if;
  return new;
end $$;
create trigger stops_limit before insert on stops
  for each row execute function enforce_stop_limit();

create table visits (
  id uuid primary key default gen_random_uuid(),
  stop_id uuid not null references stops(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  note text,
  photo_paths text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index on visits (stop_id);
create index on visits (user_id, created_at desc);

create table message_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index on message_templates (user_id);
create unique index on message_templates (user_id) where is_default;

-- Money and credits (slice 3; own pricing).
create table credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  delta integer not null,
  reason text not null check (reason in ('free_grant','ad','purchase','optimise','refund')),
  external_ref text,
  created_at timestamptz not null default now(),
  unique (external_ref)
);
create index on credit_ledger (user_id, created_at desc);

-- Row level security, one policy pattern for every user-owned table.
do $$ declare t text; begin
  foreach t in array array['addresses','routes','stops','visits','message_templates','credit_ledger'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I using (user_id = auth.uid()) with check (user_id = auth.uid())', t||'_owner', t);
  end loop;
end $$;
alter table profiles enable row level security;
create policy profiles_owner on profiles using (id = auth.uid()) with check (id = auth.uid());
