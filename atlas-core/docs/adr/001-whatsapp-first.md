# ADR 001 — WhatsApp como interface principal

**Status:** aceito

## Decisão

O WhatsApp é a interface operacional. O dashboard é uma superfície de consulta.

## Motivo

O maior risco do produto não é deixar de exibir um indicador; é exigir que o
pequeno empresário aprenda mais um sistema. A conversa reduz essa barreira e
permite validar valor antes de ampliar a interface.

## Consequências

- toda função essencial precisa de um comando conversacional;
- o dashboard não deve virar um ERP paralelo;
- mensagens precisam de idempotência, auditoria e respostas claras;
- operações ambíguas são bloqueadas em vez de inferidas.
