-- Supabase Nano Account Delta Schema (idempotent)
-- This migration adds only objects not covered by 001 to avoid conflicts.
-- Keep spare_parts, user_addresses, used_machines; add RLS & indexes.

-- User addresses
create table if not exists public.user_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  address_type varchar(20) check (address_type in ('workshop','billing','shipping')),
  street_address text,
  city varchar(50),
  governorate varchar(50),
  postal_code varchar(20),
  is_default boolean default false,
  created_at timestamp with time zone default now()
);

-- Spare parts (kept as a separate table by request)
create table if not exists public.spare_parts (
  id uuid primary key default gen_random_uuid(),
  name varchar(255) not null,
  description text,
  part_number varchar(100) unique not null,
  compatible_machines uuid[],
  price numeric(10,2) not null,
  original_price numeric(10,2),
  stock_quantity integer default 0,
  min_order_quantity integer default 1,
  weight_kg numeric(8,2),
  specifications jsonb default '{}'::jsonb,
  image_url text,
  is_critical boolean default false,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

do $$ begin
  create trigger spare_parts_updated_at
  before update on public.spare_parts
  for each row execute function update_updated_at_column();
exception when duplicate_object then null; end $$;

-- Used machines marketplace
create table if not exists public.used_machines (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references public.profiles(id) on delete set null,
  title varchar(255) not null,
  description text,
  machine_type varchar(50),
  brand varchar(100),
  model varchar(100),
  year integer,
  working_hours integer,
  condition varchar(20) check (condition in ('excellent','good','fair','poor')),
  price numeric(10,2) not null,
  location varchar(100),
  governorate varchar(50),
  images text[],
  is_verified boolean default false,
  is_sold boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

do $$ begin
  create trigger used_machines_updated_at
  before update on public.used_machines
  for each row execute function update_updated_at_column();
exception when duplicate_object then null; end $$;

-- RLS and indexes for new tables

-- user_addresses RLS
alter table public.user_addresses enable row level security;
do $$ begin
  execute 'drop policy if exists "Users manage own addresses" on public.user_addresses';
  execute 'create policy "Users manage own addresses" on public.user_addresses for all using (user_id = auth.uid()) with check (user_id = auth.uid())';
exception when others then null; end $$;
do $$ begin
  execute 'drop policy if exists "Admins manage addresses" on public.user_addresses';
  execute 'create policy "Admins manage addresses" on public.user_addresses for all using (exists (select 1 from public.profiles where id = auth.uid() and role in (''admin'',''sales_rep'')))';
exception when others then null; end $$;
create index if not exists idx_user_addresses_user_id on public.user_addresses(user_id);

-- spare_parts RLS (public read of active; owner/admin write via admin-only route if needed)
alter table public.spare_parts enable row level security;
do $$ begin
  execute 'drop policy if exists "Anyone can view active spare parts" on public.spare_parts';
  execute 'create policy "Anyone can view active spare parts" on public.spare_parts for select using (is_active = true)';
exception when others then null; end $$;
-- Optional admin manage policy; relies on profiles.role
do $$ begin
  execute 'drop policy if exists "Admins can manage spare parts" on public.spare_parts';
  execute 'create policy "Admins can manage spare parts" on public.spare_parts for all using (exists (select 1 from public.profiles where id = auth.uid() and role in (''admin'',''sales_rep'')))';
exception when others then null; end $$;
create index if not exists idx_spare_parts_active on public.spare_parts(is_active);
create index if not exists idx_spare_parts_part_number on public.spare_parts(part_number);

-- used_machines RLS
alter table public.used_machines enable row level security;
do $$ begin
  execute 'drop policy if exists "Public can view verified unsold listings" on public.used_machines';
  execute 'create policy "Public can view verified unsold listings" on public.used_machines for select using (is_verified = true and is_sold = false)';
exception when others then null; end $$;
do $$ begin
  execute 'drop policy if exists "Owners manage own listings" on public.used_machines';
  execute 'create policy "Owners manage own listings" on public.used_machines for all using (seller_id = auth.uid()) with check (seller_id = auth.uid())';
exception when others then null; end $$;
do $$ begin
  execute 'drop policy if exists "Admins manage all used_machines" on public.used_machines';
  execute 'create policy "Admins manage all used_machines" on public.used_machines for all using (exists (select 1 from public.profiles where id = auth.uid() and role in (''admin'',''sales_rep'')))';
exception when others then null; end $$;
create index if not exists idx_used_machines_seller_id on public.used_machines(seller_id);
create index if not exists idx_used_machines_status on public.used_machines(is_verified, is_sold);
