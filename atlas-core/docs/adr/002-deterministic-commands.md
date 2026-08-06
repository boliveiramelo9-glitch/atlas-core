# ADR 002 — IA interpreta; domínio executa

**Status:** aceito

## Decisão

O modelo só pode selecionar comandos com schema estrito. Ele não recebe acesso
SQL e não calcula estoque, CMV ou caixa.

## Motivo

Modelos são probabilísticos. Movimentos financeiros exigem validação,
transação, rastreabilidade e repetição segura.

## Consequências

- erros de entendimento não corrompem o banco;
- regras podem ser testadas sem API de IA;
- trocar o modelo não altera o domínio;
- cada novo comando exige contrato, executor e testes.
