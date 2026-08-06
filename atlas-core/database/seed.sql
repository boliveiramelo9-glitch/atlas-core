-- Catálogo demonstrativo do laboratório Bruno Burger.
-- Revise preços, estoques e fichas técnicas antes de usar em produção.

insert into businesses (id, name, slug, timezone)
values (
  '00000000-0000-4000-8000-000000000001',
  'Bruno Burger',
  'bruno-burger',
  'America/Fortaleza'
)
on conflict (id) do update set
  name = excluded.name,
  timezone = excluded.timezone,
  updated_at = now();

insert into ingredients (
  id, business_id, name, normalized_name, search_terms,
  stock_unit, current_stock, minimum_stock, average_cost
)
values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'Carne bovina', 'carne bovina', array['carne'], 'kg', 20, 5, 30),
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 'Pão brioche', 'pao brioche', array['pao'], 'un', 80, 20, 1.5),
  ('10000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', 'Queijo', 'queijo', array['fatia de queijo'], 'un', 100, 25, 1.2),
  ('10000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000001', 'Molho da casa', 'molho da casa', array['molho'], 'kg', 5, 1, 18),
  ('10000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000001', 'Batata congelada', 'batata congelada', array['batata'], 'kg', 15, 4, 12),
  ('10000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000001', 'Refrigerante lata', 'refrigerante lata', array['refri', 'refrigerante'], 'un', 60, 15, 3.5)
on conflict (id) do update set
  current_stock = excluded.current_stock,
  minimum_stock = excluded.minimum_stock,
  average_cost = excluded.average_cost,
  updated_at = now();

insert into products (
  id, business_id, name, normalized_name, search_terms, sale_price
)
values
  ('20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'Smash', 'smash', array['smash classico', 'hamburguer smash'], 22),
  ('20000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 'Combo Smash', 'combo smash', array['combo'], 32)
on conflict (id) do update set
  sale_price = excluded.sale_price,
  updated_at = now();

insert into product_recipes (product_id, ingredient_id, quantity)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 0.10),
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 1),
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', 1),
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000004', 0.03),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 0.10),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 1),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000003', 1),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000004', 0.03),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000005', 0.15),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000006', 1)
on conflict (product_id, ingredient_id) do update set
  quantity = excluded.quantity;
