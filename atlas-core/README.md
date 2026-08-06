# Atlas Core

Plataforma de IA para gestão de pequenas empresas via WhatsApp.

O `atlas-core` não tenta reproduzir um ERP dentro de uma conversa. A IA
interpreta a linguagem natural e a camada de domínio executa operações
determinísticas e auditáveis no PostgreSQL.

## Primeiro fluxo entregue

```text
WhatsApp (Evolution API)
        ↓
apps/whatsapp
        ↓
apps/api → packages/ai
        ↓
packages/database → PostgreSQL/Supabase
        ↓
apps/dashboard
```

O MVP já entende e executa:

- `Vendi 2 Smash e 1 Combo no Pix.`
- `Comprei 20kg de carne por R$600 em dinheiro.`
- `Como estão as vendas da semana?`

Uma venda registra os itens, calcula o total, salva o CMV, baixa a ficha
técnica, movimenta o estoque e registra a entrada no caixa na mesma transação.
Uma compra atualiza estoque, custo médio e saída de caixa.

## Estrutura

```text
apps/
  api/          API operacional
  dashboard/    painel Next.js somente para consulta
  whatsapp/     adaptador de webhook da Evolution API
packages/
  ai/           interpretação com OpenAI e fallback local
  contracts/    contratos e validação compartilhados
  core/         regras puras do domínio
  database/     transações PostgreSQL
database/
  migrations/   esquema versionado
  seed.sql      laboratório Bruno Burger
docs/
  adr/          decisões arquiteturais
```

## Executar localmente

Pré-requisitos: Node.js 22+ e PostgreSQL 16+.

```bash
cp .env.example .env
npm install
docker compose up -d
npm run db:migrate
npm run db:seed
npm run dev
```

Sem Docker, use um projeto Supabase e coloque a connection string em
`DATABASE_URL`.

Serviços locais:

- Dashboard: `http://localhost:3000`
- API: `http://localhost:3333`
- Webhook Evolution: `http://localhost:3334/webhooks/evolution`

Se `OPENAI_API_KEY` estiver vazio, a API ativa um interpretador local limitado.
Isso permite testar os exemplos principais sem consumir API. Em produção,
configure a chave e mantenha `OPENAI_MODEL=gpt-5.6-terra` como opção de menor
custo para interpretação operacional; faça uma avaliação antes de trocar o
modelo.

## Testar sem WhatsApp

```bash
curl -X POST http://localhost:3333/v1/messages \
  -H "content-type: application/json" \
  -d '{
    "businessId": "00000000-0000-4000-8000-000000000001",
    "eventId": "manual-001",
    "phone": "5588999999999",
    "text": "Vendi 2 Smash e 1 Combo no Pix",
    "provider": "manual"
  }'
```

Use um `eventId` novo em cada teste. Repetir o mesmo ID retorna o resultado
anterior sem duplicar venda, estoque ou caixa.

## Conectar a Evolution API

1. Crie/conecte a instância `bruno-burger`.
2. Configure o evento `MESSAGES_UPSERT`.
3. Aponte o webhook para
   `https://SEU-ATLAS-WHATSAPP/webhooks/evolution`.
4. Adicione o header `x-atlas-secret` com o valor de
   `EVOLUTION_WEBHOOK_SECRET`.
5. Preencha `EVOLUTION_API_URL`, `EVOLUTION_API_KEY` e
   `EVOLUTION_INSTANCE_BUSINESS_MAP`.

Mensagens do próprio número, grupos, status e eventos sem texto são ignorados.

## Banco e dados demonstrativos

O seed cria um catálogo **demonstrativo** para o Bruno Burger:

- Smash: R$ 22
- Combo Smash: R$ 32
- estoque e fichas técnicas de exemplo

Esses valores não devem ser usados na operação real. Antes do piloto, substitua
preços, custos, estoque inicial e quantidades das receitas pelos dados oficiais.

## Qualidade

```bash
npm test
npm run typecheck
npm run build
```

## Deploy

`render.yaml` descreve os três serviços. Configure no Render os segredos
marcados com `sync: false`, execute a migração e o seed uma única vez, e então
cadastre a URL pública do serviço `atlas-whatsapp` na Evolution API.

O banco recomendado para o piloto é Supabase PostgreSQL. O código usa SQL
portável e não depende de APIs proprietárias do Supabase.

## Limites conscientes do MVP

- não há autenticação de usuários no dashboard;
- não há confirmação humana para toda operação — erros ou ambiguidades são
  bloqueados e devolvidos ao WhatsApp;
- unidades precisam coincidir com a unidade de estoque cadastrada;
- cancelamentos, perdas, devoluções e fechamento de caixa estão modelados, mas
  ainda não têm comandos conversacionais;
- observabilidade avançada e fila assíncrona entram depois da validação do
  laboratório.

Veja [docs/mvp.md](docs/mvp.md) e
[docs/architecture.md](docs/architecture.md) para a sequência recomendada.
