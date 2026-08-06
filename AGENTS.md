# Atlas Core — convenções

- Preserve a proposta WhatsApp-first; o dashboard é uma superfície de consulta.
- A IA interpreta, mas não escreve diretamente no banco.
- Toda operação financeira ou de estoque deve ser transacional e idempotente.
- Nunca use valores monetários de ponto flutuante no banco; use `numeric`.
- Toda tabela operacional deve incluir `business_id`.
- Novas mensagens devem gerar comandos validados em `@atlas/contracts`.
- Não registre chaves, tokens, telefones completos ou payloads sensíveis em logs.
- Antes de concluir uma mudança, execute `npm test`, `npm run typecheck` e o
  build da aplicação afetada.
