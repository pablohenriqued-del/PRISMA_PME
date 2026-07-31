# Prisma — PRD

## Problema
Plataforma modular para PMEs brasileiras com IA nativa, automações, WhatsApp, cobrança PIX e ordem de serviço — resolve o dia a dia numa única tela.

## Módulos (v1.2 — 2026-02-28)
- **IA Copiloto** — Claude Sonnet 4.5 streaming + **ações operacionais** (criar tarefas, gerar propostas, gerar relatórios) via LLM → grava em Documentos.
- **CRM** — Kanban de leads, drag-and-drop, phone E.164.
- **Ordem de Serviço (novo)** — Do orçamento à execução. Cria OS a partir de Lead do CRM, vira Projeto num clique, cobrança **PIX + cartão** via Stripe (valor variável).
- **WhatsApp** — Inbox + Twilio real (send/webhook) com fallback modo simulação.
- **Projetos** — Kanban de tarefas multi-projeto.
- **Financeiro** — Fluxo de caixa, status vencida dispara automação.
- **Documentos** — Upload real via Emergent Object Storage; guarda propostas/relatórios gerados pelo Copiloto.
- **Automações** — Motor real (novo_lead, fatura_vencida, proposta_enviada, nova_conversa_wa).
- **Equipe** — Convites por e-mail (Resend), papéis owner/admin/comercial/financeiro.
- **Dashboards** — KPIs + gráficos.
- **Landing (público)** — Checkout Stripe direto nos planos (Starter, Growth, Business) e no **Founder Deal** com contador ao vivo de vagas.

## Arquitetura
- Backend FastAPI (`/app/backend/server.py`) — rotas `/api/*`, MongoDB.
- Frontend React 19 + Tailwind + Shadcn + Recharts + framer-motion.
- Auth: Emergent Google Auth (cookie httpOnly + Bearer).
- IA: `emergentintegrations` (Claude Sonnet 4.6) + `LlmChat.send_message` para geração one-shot.
- WhatsApp: Twilio (`+19788384904`).
- Email: Resend (Emergent-managed).
- Storage: Emergent Object Storage.
- **Pagamentos: Stripe (Flow A — sandbox claimable)** — PIX + cartão, BRL. Tax mode: **DIY** (empresa emite NF por conta própria, formato padrão do mercado BR).
- Multi-tenant: `org_id` em toda query.

## Estado (2026-02-28)
- **Backend**: 14/14 rotas core ✅ + módulo OS (list/create/patch/delete/from-lead/to-project) + Stripe/PIX (checkout, status, webhook, os-checkout) + Copilot ops (create-task, generate-proposal, generate-report, reports) + public founder-deal.
- **Frontend**: 100% ✅ + nova página OrdemServico, PaymentSuccess/Cancel, Copiloto com ações rápidas, Landing com checkout Stripe e contador ao vivo.
- **Stripe catalog**: 4 produtos × 7 preços (BRL) provisionados no sandbox.

## Backlog priorizado
### P0
- Ativar WhatsApp no número Twilio (via Sandbox `+14155238886` ou aprovar Sender).
- Validação `X-Twilio-Signature` no webhook antes de produção.

### P1
- Configurar domínio `prisma.com.br` no Emergent.
- Rate-limit por org no motor de automações.
- OS: envio automático da proposta/OS para o cliente por e-mail (usar Resend).

### P2
- Split de `server.py` em módulos (auth/crm/wa/docs/team/autos/os/pay/copilot).
- Modo escuro.
- Copilot: tool-calling nativo (function-calling) em vez de heurística no frontend.
- Habilitar PIX nativo (quando o sandbox for reivindicado por uma conta BR — hoje faz fallback para cartão).
