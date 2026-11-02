create extension if not exists btree_gist;

create table if not exists locations (
  id text primary key,
  name text not null,
  address text not null,
  maps_url text
);

create table if not exists services (
  id text primary key,
  category text not null,
  name text not null,
  description text not null default '',
  duration_min int not null check (duration_min > 0),
  price_cents int,
  variants text[] not null default '{}',
  variant_label text,
  resource text not null,
  sort int not null default 0,
  active boolean not null default true
);

create table if not exists schedule_windows (
  id serial primary key,
  location_id text not null references locations(id),
  weekday int check (weekday between 0 and 6),
  on_date date,
  start_time time not null,
  end_time time not null,
  categories text[],
  check ((weekday is null) <> (on_date is null)),
  check (end_time > start_time)
);

create table if not exists blocked_dates (
  on_date date primary key,
  reason text
);

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  service_id text not null references services(id),
  resource text not null,
  location_id text not null references locations(id),
  start_at timestamptz not null,
  end_at timestamptz not null,
  variant text,
  client_name text not null,
  client_phone text not null,
  notes text,
  status text not null default 'confirmed' check (status in ('confirmed', 'completed', 'no_show', 'cancelled')),
  source text not null default 'site',
  cancel_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  check (end_at > start_at),
  constraint appointments_no_overlap exclude using gist (
    resource with =,
    tstzrange(start_at, end_at) with &&
  ) where (status <> 'cancelled')
);

create index if not exists appointments_start_idx on appointments (start_at);
create index if not exists appointments_phone_idx on appointments (client_phone);

create table if not exists wa_messages (
  id bigserial primary key,
  phone text not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists wa_messages_phone_idx on wa_messages (phone, id);

create table if not exists wa_processed (
  message_id text primary key,
  created_at timestamptz not null default now()
);

create table if not exists wa_handoff (
  phone text primary key,
  until_at timestamptz not null,
  reason text
)
