import type { DashboardSummary } from "@atlas/contracts";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bot,
  Boxes,
  ChevronRight,
  CircleDollarSign,
  LayoutDashboard,
  Menu,
  MessageCircle,
  PackageSearch,
  ReceiptText,
  Settings,
  Sparkles,
  Store,
  TrendingUp,
  WalletCards,
} from "../components/icons";

export const dynamic = "force-dynamic";

const businessId =
  process.env.DEFAULT_BUSINESS_ID ??
  process.env.NEXT_PUBLIC_DEFAULT_BUSINESS_ID ??
  "00000000-0000-4000-8000-000000000001";

const emptySummary: DashboardSummary = {
  businessName: "Bruno Burger",
  period: "today",
  grossRevenue: 0,
  costOfGoods: 0,
  grossProfit: 0,
  marginPercentage: 0,
  salesCount: 0,
  cashBalance: 0,
  lowStockCount: 0,
  recentSales: [],
  lowStockItems: [],
};

async function loadSummary(): Promise<{
  summary: DashboardSummary;
  connected: boolean;
}> {
  const apiUrl = normalizeUrl(
    process.env.ATLAS_API_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      "http://localhost:3333",
  );
  try {
    const response = await fetch(
      `${apiUrl}/v1/dashboard?businessId=${businessId}&period=today`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(4_000),
      },
    );
    if (!response.ok) throw new Error("Dashboard indisponível");
    return {
      summary: (await response.json()) as DashboardSummary,
      connected: true,
    };
  } catch {
    return { summary: emptySummary, connected: false };
  }
}

export default async function DashboardPage() {
  const { summary, connected } = await loadSummary();
  const now = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: "America/Fortaleza",
  }).format(new Date());

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">A</div>
          <div>
            <strong>ATLAS</strong>
            <span>CORE</span>
          </div>
        </div>

        <nav aria-label="Navegação principal">
          <a className="nav-item active" href="#">
            <LayoutDashboard />
            <span>Visão geral</span>
          </a>
          <a className="nav-item" href="#vendas">
            <ReceiptText />
            <span>Vendas</span>
          </a>
          <a className="nav-item" href="#estoque">
            <Boxes />
            <span>Estoque</span>
            {summary.lowStockCount > 0 && (
              <small>{summary.lowStockCount}</small>
            )}
          </a>
          <a className="nav-item" href="#caixa">
            <WalletCards />
            <span>Financeiro</span>
          </a>
          <a className="nav-item" href="#ia">
            <Bot />
            <span>Atividade da IA</span>
          </a>
        </nav>

        <div className="sidebar-bottom">
          <a className="nav-item" href="#configuracoes">
            <Settings />
            <span>Configurações</span>
          </a>
          <div className="business-card">
            <div className="business-avatar">BB</div>
            <div>
              <strong>{summary.businessName}</strong>
              <span>Laboratório Atlas</span>
            </div>
            <ChevronRight />
          </div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <button className="menu-button" aria-label="Abrir menu">
            <Menu />
          </button>
          <div className="mobile-brand">ATLAS CORE</div>
          <div className="top-actions">
            <span className={`status-pill ${connected ? "online" : "offline"}`}>
              <i />
              {connected ? "Operação conectada" : "Aguardando API"}
            </span>
            <div className="operator">
              <span>EC</span>
              <div>
                <strong>Estefane</strong>
                <small>Administradora</small>
              </div>
            </div>
          </div>
        </header>

        <div className="content">
          <section className="hero">
            <div>
              <p className="eyebrow">
                <Sparkles /> inteligência operacional
              </p>
              <h1>Bom dia, Estefane.</h1>
              <p>
                Aqui está o pulso do Bruno Burger nesta{" "}
                <span>{capitalize(now)}</span>.
              </p>
            </div>
            <div className="hero-actions">
              <a className="ghost-button" href="#estoque">
                <PackageSearch /> Ver estoque
              </a>
              <a className="primary-button" href="#ia">
                <MessageCircle /> Abrir WhatsApp
              </a>
            </div>
          </section>

          {!connected && (
            <div className="connection-banner">
              <span>A base visual está pronta.</span> Conecte a API e o Supabase
              para carregar os números reais.
            </div>
          )}

          <section className="metrics" aria-label="Indicadores de hoje">
            <MetricCard
              label="Faturamento hoje"
              value={money(summary.grossRevenue)}
              detail={`${summary.salesCount} venda${summary.salesCount === 1 ? "" : "s"} registrada${summary.salesCount === 1 ? "" : "s"}`}
              icon={<CircleDollarSign />}
              tone="lime"
              trend="Receita bruta"
            />
            <MetricCard
              label="Lucro bruto"
              value={money(summary.grossProfit)}
              detail={`CMV de ${money(summary.costOfGoods)}`}
              icon={<TrendingUp />}
              tone="blue"
              trend={`${summary.marginPercentage.toFixed(1)}% de margem`}
            />
            <MetricCard
              label="Saldo de caixa"
              value={money(summary.cashBalance)}
              detail="Entradas menos saídas"
              icon={<WalletCards />}
              tone="violet"
              trend="Saldo acumulado"
            />
            <MetricCard
              label="Estoque crítico"
              value={String(summary.lowStockCount)}
              detail="Itens no ponto de reposição"
              icon={<Boxes />}
              tone="orange"
              trend={summary.lowStockCount ? "Requer atenção" : "Tudo em ordem"}
            />
          </section>

          <section className="dashboard-grid">
            <article className="panel sales-panel" id="vendas">
              <div className="panel-heading">
                <div>
                  <p className="panel-kicker">MOVIMENTO</p>
                  <h2>Vendas recentes</h2>
                </div>
                <span className="live-label">
                  <i /> ao vivo
                </span>
              </div>
              {summary.recentSales.length > 0 ? (
                <div className="sale-list">
                  {summary.recentSales.map((sale) => (
                    <div className="sale-row" key={sale.id}>
                      <div className="sale-icon">
                        <ArrowUpRight />
                      </div>
                      <div className="sale-main">
                        <strong>Venda pelo WhatsApp</strong>
                        <span>
                          {formatTime(sale.createdAt)} · {sale.source}
                        </span>
                      </div>
                      <strong className="sale-value">
                        + {money(sale.total)}
                      </strong>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<ReceiptText />}
                  title="Nenhuma venda hoje"
                  text='Envie "Vendi 2 Smash" no WhatsApp para registrar a primeira.'
                />
              )}
            </article>

            <article className="panel ai-panel" id="ia">
              <div className="ai-orb">
                <Bot />
                <span />
              </div>
              <p className="panel-kicker">ATLAS IA</p>
              <h2>A operação começa na conversa.</h2>
              <p>
                Registre uma venda, uma compra ou peça o resumo do dia sem abrir
                planilhas.
              </p>
              <div className="message-demo">
                <div className="message-bubble">
                  Vendi 2 Smash e 1 Combo no Pix.
                </div>
                <div className="message-result">
                  <i>✓</i>
                  <div>
                    <strong>Venda registrada</strong>
                    <span>Estoque, CMV e caixa atualizados</span>
                  </div>
                </div>
              </div>
            </article>

            <article className="panel stock-panel" id="estoque">
              <div className="panel-heading">
                <div>
                  <p className="panel-kicker">CONTROLE</p>
                  <h2>Estoque em atenção</h2>
                </div>
                <Store />
              </div>
              {summary.lowStockItems.length > 0 ? (
                <div className="stock-list">
                  {summary.lowStockItems.map((item) => {
                    const ratio =
                      item.minimumStock > 0
                        ? Math.min(
                            100,
                            (item.currentStock / item.minimumStock) * 100,
                          )
                        : 100;
                    return (
                      <div className="stock-row" key={item.id}>
                        <div className="stock-copy">
                          <strong>{item.name}</strong>
                          <span>
                            {item.currentStock.toLocaleString("pt-BR")}{" "}
                            {item.unit} disponíveis
                          </span>
                        </div>
                        <div className="stock-meter" aria-label={`${ratio}%`}>
                          <span style={{ width: `${ratio}%` }} />
                        </div>
                        <small>
                          mín. {item.minimumStock.toLocaleString("pt-BR")}{" "}
                          {item.unit}
                        </small>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={<Boxes />}
                  title="Estoque saudável"
                  text="Nenhum insumo atingiu o ponto mínimo."
                />
              )}
            </article>

            <article className="panel cash-panel" id="caixa">
              <div className="panel-heading">
                <div>
                  <p className="panel-kicker">CAIXA</p>
                  <h2>Leitura rápida</h2>
                </div>
                <WalletCards />
              </div>
              <div className="cash-summary">
                <div>
                  <span className="cash-icon income">
                    <ArrowDownLeft />
                  </span>
                  <div>
                    <small>Entradas hoje</small>
                    <strong>{money(summary.grossRevenue)}</strong>
                  </div>
                </div>
                <div>
                  <span className="cash-icon expense">
                    <ArrowUpRight />
                  </span>
                  <div>
                    <small>CMV vendido</small>
                    <strong>{money(summary.costOfGoods)}</strong>
                  </div>
                </div>
              </div>
              <div className="margin-track">
                <div>
                  <span>Margem bruta</span>
                  <strong>{summary.marginPercentage.toFixed(1)}%</strong>
                </div>
                <div className="track">
                  <span
                    style={{
                      width: `${Math.max(0, Math.min(100, summary.marginPercentage))}%`,
                    }}
                  />
                </div>
              </div>
            </article>
          </section>

          <footer>
            <span>Atlas Core · IA operacional para pequenos negócios</span>
            <span>Dados atualizados a cada consulta</span>
          </footer>
        </div>
      </section>
    </main>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon,
  tone,
  trend,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  tone: "lime" | "blue" | "violet" | "orange";
  trend: string;
}) {
  return (
    <article className={`metric-card ${tone}`}>
      <div className="metric-top">
        <span>{label}</span>
        <i>{icon}</i>
      </div>
      <strong>{value}</strong>
      <div className="metric-bottom">
        <span>{detail}</span>
        <small>{trend}</small>
      </div>
    </article>
  );
}

function EmptyState({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="empty-state">
      <i>{icon}</i>
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

function normalizeUrl(value: string): string {
  const url = /^https?:\/\//.test(value) ? value : `http://${value}`;
  return url.replace(/\/$/, "");
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function money(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Fortaleza",
  }).format(new Date(value));
}
