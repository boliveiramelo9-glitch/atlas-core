create extension if not exists pgcrypto;

create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  timezone text not null default 'America/Fortaleza',
  currency char(3) not null default 'BRL',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ingredients (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  normalized_name text not null,
  search_terms text[] not null default '{}',
  stock_unit text not null,
  current_stock numeric(14, 4) not null default 0 check (current_stock >= 0),
  minimum_stock numeric(14, 4) not null default 0 check (minimum_stock >= 0),
  average_cost numeric(14, 4) not null default 0 check (average_cost >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, normalized_name)
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  normalized_name text not null,
  search_terms text[] not null default '{}',
  sale_price numeric(14, 2) not null check (sale_price >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, normalized_name)
);

create table if not exists product_recipes (
  product_id uuid not null references products(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id) on delete restrict,
  quantity numeric(14, 4) not null check (quantity > 0),
  primary key (product_id, ingredient_id)
);

create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete restrict,
  source text not null default 'manual',
  payment_method text not null default 'other',
  total_amount numeric(14, 2) not null check (total_amount >= 0),
  cost_of_goods numeric(14, 4) not null default 0 check (cost_of_goods >= 0),
  status text not null check (status in ('pending', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_name text not null,
  quantity numeric(14, 4) not null check (quantity > 0),
  unit_price numeric(14, 2) not null check (unit_price >= 0),
  unit_cost numeric(14, 4) not null default 0 check (unit_cost >= 0),
  line_total numeric(14, 2) not null check (line_total >= 0)
);

create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete restrict,
  supplier_name text,
  payment_method text not null default 'other',
  total_amount numeric(14, 2) not null check (total_amount >= 0),
  status text not null check (status in ('pending', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references purchases(id) on delete cascade,
  ingredient_id uuid references ingredients(id) on delete set null,
  ingredient_name text not null,
  quantity numeric(14, 4) not null check (quantity > 0),
  unit text not null,
  unit_cost numeric(14, 4) not null check (unit_cost >= 0),
  line_total numeric(14, 2) not null check (line_total >= 0)
);

create table if not exists inventory_movements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete restrict,
  ingredient_id uuid not null references ingredients(id) on delete restrict,
  movement_type text not null check (
    movement_type in ('purchase', 'sale', 'adjustment', 'loss', 'return')
  ),
  quantity numeric(14, 4) not null check (quantity <> 0),
  unit_cost numeric(14, 4) not null default 0 check (unit_cost >= 0),
  reference_type text,
  reference_id uuid,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists cash_movements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete restrict,
  direction text not null check (direction in ('income', 'expense')),
  category text not null,
  amount numeric(14, 2) not null check (amount >= 0),
  payment_method text not null default 'other',
  reference_type text,
  reference_id uuid,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists inbound_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete restrict,
  provider text not null,
  provider_event_id text not null,
  sender_phone text not null,
  raw_text text not null,
  status text not null check (status in ('processing', 'completed', 'failed')),
  operation_payload jsonb,
  result_payload jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (provider, provider_event_id)
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete restrict,
  direction text not null check (direction in ('inbound', 'outbound')),
  sender_phone text not null,
  provider_event_id text,
  body text not null,
  operation_type text,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_sales_business_created
  on sales (business_id, created_at desc);
create index if not exists idx_cash_business_created
  on cash_movements (business_id, created_at desc);
create index if not exists idx_inventory_business_created
  on inventory_movements (business_id, created_at desc);
create index if not exists idx_messages_business_created
  on messages (business_id, created_at desc);
