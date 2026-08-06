-- A Atlas acessa o PostgreSQL por uma conexao privada no backend.
-- Sem politicas, o RLS bloqueia o acesso pelas chaves publicas do Supabase.

alter table public.businesses enable row level security;
alter table public.ingredients enable row level security;
alter table public.products enable row level security;
alter table public.product_recipes enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.cash_movements enable row level security;
alter table public.inbound_events enable row level security;
alter table public.messages enable row level security;
