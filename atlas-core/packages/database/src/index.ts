import type {
  BusinessOperation,
  DashboardSummary,
  IncomingMessage,
  OperationResult,
  PurchaseOperation,
  SaleOperation,
} from "@atlas/contracts";
import {
  asOperationResult,
  DomainError,
  normalizeTerm,
  weightedAverageCost,
} from "@atlas/core";
import pg, { type PoolClient, type QueryResultRow } from "pg";

const { Pool } = pg;

export interface DatabaseOptions {
  connectionString: string;
  ssl?: boolean;
  timezone?: string;
}

interface ProductRow extends QueryResultRow {
  id: string;
  name: string;
  sale_price: string;
}

interface IngredientRow extends QueryResultRow {
  id: string;
  name: string;
  stock_unit: string;
  current_stock: string;
  minimum_stock: string;
  average_cost: string;
}

interface RecipeRow extends QueryResultRow {
  ingredient_id: string;
  ingredient_name: string;
  quantity: string;
  current_stock: string;
  average_cost: string;
  stock_unit: string;
}

export class AtlasDatabase {
  private readonly pool: pg.Pool;
  private readonly timezone: string;

  constructor(options: DatabaseOptions) {
    this.timezone = options.timezone ?? "America/Fortaleza";
    this.pool = new Pool({
      connectionString: options.connectionString,
      ssl: options.ssl ? { rejectUnauthorized: false } : undefined,
      max: 10,
    });
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async healthcheck(): Promise<void> {
    await this.pool.query("select 1");
  }

  async executeOperation(
    message: IncomingMessage,
    operation: BusinessOperation,
  ): Promise<OperationResult> {
    return this.withTransaction(async (client) => {
      const claimed = await client.query<{ id: string }>(
        `insert into inbound_events
          (business_id, provider, provider_event_id, sender_phone, raw_text, status)
         values ($1, $2, $3, $4, $5, 'processing')
         on conflict (provider, provider_event_id) do nothing
         returning id`,
        [
          message.businessId,
          message.provider,
          message.eventId,
          message.phone,
          message.text,
        ],
      );

      if (claimed.rowCount === 0) {
        const previous = await client.query<{
          operation_payload: BusinessOperation;
          result_payload: OperationResult | null;
          status: string;
        }>(
          `select operation_payload, result_payload, status
             from inbound_events
            where provider = $1 and provider_event_id = $2
            for update`,
          [message.provider, message.eventId],
        );
        const row = previous.rows[0];
        if (row?.status === "completed" && row.result_payload) {
          return { ...row.result_payload, replayed: true };
        }
        throw new DomainError(
          "Esta mensagem já está sendo processada. Tente novamente em instantes.",
          "INVALID_OPERATION",
        );
      }

      let data: Record<string, unknown> = {};
      if (operation.type === "register_sale") {
        data = await this.registerSale(client, message.businessId, operation);
      } else if (operation.type === "register_purchase") {
        data = await this.registerPurchase(
          client,
          message.businessId,
          operation,
        );
      } else if (operation.type === "get_summary") {
        data = {
          summary: await this.getSummaryWithClient(
            client,
            message.businessId,
            operation.period,
          ),
        };
      }

      const result = asOperationResult(operation, data);
      await client.query(
        `insert into messages
          (business_id, direction, sender_phone, provider_event_id, body, operation_type, payload)
         values
          ($1, 'inbound', $2, $3, $4, $5, $6::jsonb),
          ($1, 'outbound', $2, $3, $7, $5, $8::jsonb)`,
        [
          message.businessId,
          message.phone,
          message.eventId,
          message.text,
          operation.type,
          JSON.stringify(operation),
          result.reply,
          JSON.stringify(data),
        ],
      );
      await client.query(
        `update inbound_events
            set status = 'completed',
                operation_payload = $3::jsonb,
                result_payload = $4::jsonb,
                completed_at = now()
          where provider = $1 and provider_event_id = $2`,
        [
          message.provider,
          message.eventId,
          JSON.stringify(operation),
          JSON.stringify(result),
        ],
      );
      return result;
    });
  }

  async getSummary(
    businessId: string,
    period: "today" | "week" | "month" = "today",
  ): Promise<DashboardSummary> {
    const client = await this.pool.connect();
    try {
      return await this.getSummaryWithClient(client, businessId, period);
    } finally {
      client.release();
    }
  }

  private async registerSale(
    client: PoolClient,
    businessId: string,
    operation: SaleOperation,
  ): Promise<Record<string, unknown>> {
    const resolvedItems: Array<{
      product: ProductRow;
      quantity: number;
      recipes: RecipeRow[];
    }> = [];

    for (const item of operation.items) {
      const product = await this.resolveProduct(
        client,
        businessId,
        item.productName,
      );
      const recipes = await client.query<RecipeRow>(
        `select
           pr.ingredient_id,
           i.name as ingredient_name,
           pr.quantity,
           i.current_stock,
           i.average_cost,
           i.stock_unit
         from product_recipes pr
         join ingredients i on i.id = pr.ingredient_id
        where pr.product_id = $1
        order by i.name
        for update of i`,
        [product.id],
      );
      if (recipes.rowCount === 0) {
        throw new DomainError(
          `O produto "${product.name}" ainda não possui ficha técnica.`,
          "INVALID_OPERATION",
        );
      }
      resolvedItems.push({
        product,
        quantity: item.quantity,
        recipes: recipes.rows,
      });
    }

    let total = 0;
    let costOfGoods = 0;
    for (const item of resolvedItems) {
      total += Number(item.product.sale_price) * item.quantity;
      for (const recipe of item.recipes) {
        const needed = Number(recipe.quantity) * item.quantity;
        if (Number(recipe.current_stock) < needed) {
          throw new DomainError(
            `Estoque insuficiente de ${recipe.ingredient_name}: precisa de ${needed}${recipe.stock_unit}, mas há ${Number(recipe.current_stock)}${recipe.stock_unit}.`,
            "INSUFFICIENT_STOCK",
          );
        }
        costOfGoods += needed * Number(recipe.average_cost);
      }
    }

    const sale = await client.query<{ id: string }>(
      `insert into sales
        (business_id, source, payment_method, total_amount, cost_of_goods, status)
       values ($1, 'whatsapp', $2, $3, $4, 'completed')
       returning id`,
      [businessId, operation.paymentMethod, total, costOfGoods],
    );
    const saleId = sale.rows[0]?.id;
    if (!saleId) {
      throw new DomainError(
        "Não foi possível criar a venda.",
        "INVALID_OPERATION",
      );
    }

    for (const item of resolvedItems) {
      const unitPrice = Number(item.product.sale_price);
      const itemCost = item.recipes.reduce(
        (sum, recipe) =>
          sum + Number(recipe.quantity) * Number(recipe.average_cost),
        0,
      );
      await client.query(
        `insert into sale_items
          (sale_id, product_id, product_name, quantity, unit_price, unit_cost, line_total)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [
          saleId,
          item.product.id,
          item.product.name,
          item.quantity,
          unitPrice,
          itemCost,
          unitPrice * item.quantity,
        ],
      );

      for (const recipe of item.recipes) {
        const consumed = Number(recipe.quantity) * item.quantity;
        await client.query(
          `update ingredients
              set current_stock = current_stock - $2,
                  updated_at = now()
            where id = $1`,
          [recipe.ingredient_id, consumed],
        );
        await client.query(
          `insert into inventory_movements
            (business_id, ingredient_id, movement_type, quantity, unit_cost, reference_type, reference_id)
           values ($1, $2, 'sale', $3, $4, 'sale', $5)`,
          [
            businessId,
            recipe.ingredient_id,
            -consumed,
            Number(recipe.average_cost),
            saleId,
          ],
        );
      }
    }

    await client.query(
      `insert into cash_movements
        (business_id, direction, category, amount, payment_method, reference_type, reference_id, description)
       values ($1, 'income', 'sale', $2, $3, 'sale', $4, 'Venda via WhatsApp')`,
      [businessId, total, operation.paymentMethod, saleId],
    );

    return { saleId, total, costOfGoods };
  }

  private async registerPurchase(
    client: PoolClient,
    businessId: string,
    operation: PurchaseOperation,
  ): Promise<Record<string, unknown>> {
    const resolvedItems: Array<{
      ingredient: IngredientRow;
      quantity: number;
      totalCost: number;
    }> = [];

    for (const item of operation.items) {
      const ingredient = await this.resolveIngredient(
        client,
        businessId,
        item.ingredientName,
      );
      if (normalizeUnit(item.unit) !== normalizeUnit(ingredient.stock_unit)) {
        throw new DomainError(
          `A unidade de ${ingredient.name} é "${ingredient.stock_unit}", mas a mensagem informou "${item.unit}".`,
          "UNIT_MISMATCH",
        );
      }
      resolvedItems.push({
        ingredient,
        quantity: item.quantity,
        totalCost: item.totalCost,
      });
    }

    const total = resolvedItems.reduce((sum, item) => sum + item.totalCost, 0);
    const purchase = await client.query<{ id: string }>(
      `insert into purchases
        (business_id, supplier_name, payment_method, total_amount, status)
       values ($1, $2, $3, $4, 'completed')
       returning id`,
      [
        businessId,
        operation.supplierName ?? null,
        operation.paymentMethod,
        total,
      ],
    );
    const purchaseId = purchase.rows[0]?.id;
    if (!purchaseId) {
      throw new DomainError(
        "Não foi possível criar a compra.",
        "INVALID_OPERATION",
      );
    }

    for (const item of resolvedItems) {
      const unitCost = item.totalCost / item.quantity;
      const nextAverageCost = weightedAverageCost(
        Number(item.ingredient.current_stock),
        Number(item.ingredient.average_cost),
        item.quantity,
        item.totalCost,
      );
      await client.query(
        `insert into purchase_items
          (purchase_id, ingredient_id, ingredient_name, quantity, unit, unit_cost, line_total)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [
          purchaseId,
          item.ingredient.id,
          item.ingredient.name,
          item.quantity,
          item.ingredient.stock_unit,
          unitCost,
          item.totalCost,
        ],
      );
      await client.query(
        `update ingredients
            set current_stock = current_stock + $2,
                average_cost = $3,
                updated_at = now()
          where id = $1`,
        [item.ingredient.id, item.quantity, nextAverageCost],
      );
      await client.query(
        `insert into inventory_movements
          (business_id, ingredient_id, movement_type, quantity, unit_cost, reference_type, reference_id)
         values ($1, $2, 'purchase', $3, $4, 'purchase', $5)`,
        [businessId, item.ingredient.id, item.quantity, unitCost, purchaseId],
      );
    }

    await client.query(
      `insert into cash_movements
        (business_id, direction, category, amount, payment_method, reference_type, reference_id, description)
       values ($1, 'expense', 'purchase', $2, $3, 'purchase', $4, 'Compra via WhatsApp')`,
      [businessId, total, operation.paymentMethod, purchaseId],
    );

    return { purchaseId, total };
  }

  private async resolveProduct(
    client: PoolClient,
    businessId: string,
    informedName: string,
  ): Promise<ProductRow> {
    const term = normalizeTerm(informedName);
    const result = await client.query<ProductRow>(
      `select id, name, sale_price
         from products
        where business_id = $1
          and active = true
          and (
            normalized_name = $2
            or $2 = any(search_terms)
            or normalized_name like '%' || $2 || '%'
          )
        order by
          case when normalized_name = $2 then 0
               when $2 = any(search_terms) then 1
               else 2 end,
          name
        limit 2`,
      [businessId, term],
    );
    if (result.rowCount === 0) {
      throw new DomainError(
        `Não encontrei o produto "${informedName}" no cadastro.`,
        "NOT_FOUND",
      );
    }
    if (result.rowCount && result.rowCount > 1) {
      throw new DomainError(
        `Encontrei mais de um produto para "${informedName}". Informe o nome completo.`,
        "AMBIGUOUS",
      );
    }
    return result.rows[0]!;
  }

  private async resolveIngredient(
    client: PoolClient,
    businessId: string,
    informedName: string,
  ): Promise<IngredientRow> {
    const term = normalizeTerm(informedName);
    const result = await client.query<IngredientRow>(
      `select id, name, stock_unit, current_stock, minimum_stock, average_cost
         from ingredients
        where business_id = $1
          and active = true
          and (
            normalized_name = $2
            or $2 = any(search_terms)
            or normalized_name like '%' || $2 || '%'
          )
        order by
          case when normalized_name = $2 then 0
               when $2 = any(search_terms) then 1
               else 2 end,
          name
        limit 2
        for update`,
      [businessId, term],
    );
    if (result.rowCount === 0) {
      throw new DomainError(
        `Não encontrei o insumo "${informedName}" no cadastro.`,
        "NOT_FOUND",
      );
    }
    if (result.rowCount && result.rowCount > 1) {
      throw new DomainError(
        `Encontrei mais de um insumo para "${informedName}". Informe o nome completo.`,
        "AMBIGUOUS",
      );
    }
    return result.rows[0]!;
  }

  private async getSummaryWithClient(
    client: PoolClient,
    businessId: string,
    period: "today" | "week" | "month",
  ): Promise<DashboardSummary> {
    const periodStart =
      period === "today" ? "day" : period === "week" ? "week" : "month";
    const metrics = await client.query<{
      business_name: string;
      gross_revenue: string;
      cost_of_goods: string;
      sales_count: string;
      cash_balance: string;
      low_stock_count: string;
    }>(
      `with selected_business as (
         select id, name from businesses where id = $1
       ),
       sales_metrics as (
         select
           coalesce(sum(total_amount), 0) as gross_revenue,
           coalesce(sum(cost_of_goods), 0) as cost_of_goods,
           count(*) as sales_count
         from sales
        where business_id = $1
          and status = 'completed'
          and created_at >= (
            date_trunc($2, timezone($3, now())) at time zone $3
          )
       ),
       cash_metrics as (
         select coalesce(sum(
           case when direction = 'income' then amount else -amount end
         ), 0) as cash_balance
         from cash_movements
        where business_id = $1
       ),
       stock_metrics as (
         select count(*) as low_stock_count
         from ingredients
        where business_id = $1
          and active = true
          and current_stock <= minimum_stock
       )
       select
         b.name as business_name,
         s.gross_revenue,
         s.cost_of_goods,
         s.sales_count,
         c.cash_balance,
         st.low_stock_count
       from selected_business b
       cross join sales_metrics s
       cross join cash_metrics c
       cross join stock_metrics st`,
      [businessId, periodStart, this.timezone],
    );
    const row = metrics.rows[0];
    if (!row) {
      throw new DomainError("Empresa não encontrada.", "NOT_FOUND");
    }

    const recentSales = await client.query<{
      id: string;
      created_at: Date;
      total_amount: string;
      source: string;
    }>(
      `select id, created_at, total_amount, source
         from sales
        where business_id = $1 and status = 'completed'
        order by created_at desc
        limit 6`,
      [businessId],
    );
    const lowStockItems = await client.query<IngredientRow>(
      `select id, name, stock_unit, current_stock, minimum_stock, average_cost
         from ingredients
        where business_id = $1
          and active = true
          and current_stock <= minimum_stock
        order by (minimum_stock - current_stock) desc, name
        limit 8`,
      [businessId],
    );

    const grossRevenue = Number(row.gross_revenue);
    const costOfGoods = Number(row.cost_of_goods);
    const grossProfit = grossRevenue - costOfGoods;
    return {
      businessName: row.business_name,
      period,
      grossRevenue,
      costOfGoods,
      grossProfit,
      marginPercentage:
        grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0,
      salesCount: Number(row.sales_count),
      cashBalance: Number(row.cash_balance),
      lowStockCount: Number(row.low_stock_count),
      recentSales: recentSales.rows.map((sale) => ({
        id: sale.id,
        createdAt: sale.created_at.toISOString(),
        total: Number(sale.total_amount),
        source: sale.source,
      })),
      lowStockItems: lowStockItems.rows.map((item) => ({
        id: item.id,
        name: item.name,
        currentStock: Number(item.current_stock),
        minimumStock: Number(item.minimum_stock),
        unit: item.stock_unit,
      })),
    };
  }

  private async withTransaction<T>(
    work: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const result = await work(client);
      await client.query("commit");
      return result;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }
}

function normalizeUnit(unit: string): string {
  const normalized = normalizeTerm(unit);
  if (["quilo", "quilos", "kilograma", "kilogramas"].includes(normalized)) {
    return "kg";
  }
  if (["unidade", "unidades"].includes(normalized)) return "un";
  if (["pacote", "pacotes"].includes(normalized)) return "pct";
  return normalized;
}
