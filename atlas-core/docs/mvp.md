# Escopo de validação — Bruno Burger

## Hipótese

Um pequeno negócio consegue manter vendas, estoque e caixa atualizados quando
as operações são registradas em linguagem natural no WhatsApp.

## O que medir no piloto

| Indicador                                 | Meta inicial          |
| ----------------------------------------- | --------------------- |
| Operações registradas pelo WhatsApp       | 90% ou mais           |
| Mensagens que exigem correção             | menos de 10%          |
| Webhooks duplicados que geram duplicidade | zero                  |
| Diferença entre estoque físico e sistema  | abaixo de 5%          |
| Tempo médio para registrar uma operação   | abaixo de 20 segundos |

## Preparação obrigatória

1. Cadastrar o cardápio real e todos os apelidos usados pela equipe.
2. Cadastrar fichas técnicas por produto.
3. Fazer contagem inicial do estoque.
4. Conferir preços e custos.
5. Definir quem pode conversar com a IA operacional.
6. Rodar uma semana em paralelo com o controle atual.

## Comandos do piloto

- registrar venda;
- registrar compra;
- consultar resumo de hoje, semana ou mês;
- informar erro de produto, unidade ou estoque insuficiente.

## Próxima fatia

Depois que esses quatro comandos estiverem confiáveis:

1. cancelamento de venda com estorno;
2. perdas e ajustes de estoque;
3. contas a pagar e fechamento de caixa;
4. cadastro assistido de produto e ficha técnica;
5. autenticação e perfis;
6. alertas proativos de reposição.
