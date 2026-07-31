# Prisma — PRD

## Problema
Plataforma modular para PMEs brasileiras. Une CRM, WhatsApp, Projetos, Financeiro, Documentos, Ordem de Serviço, Automações, Copiloto IA e Portal do Cliente com pagamento PIX.

## Módulos (v1.4 — 2026-02-28)
- **Copiloto IA operacional** — Claude Sonnet 4.5 streaming + ações (criar tarefa, gerar proposta, gerar relatório).
- **CRM** — Kanban de leads.
- **Ordem de Serviço** — Custom fields, recorrência, templates, envio automático (email + WhatsApp), portal público, assinatura eletrônica com hash, PDF de comprovante, cobrança PIX/cartão.
- **Portal do Cliente (público)** — `/os/publica/{token}`.
- **WhatsApp** — Inbox + Twilio.
- **Projetos** — **4 views**: Kanban / Lista / Calendário / Gantt. Time tracker por tarefa. Custom fields. **Comentários com @menções** + notificações in-app e por e-mail.
- **Notificações** — Sino no header com contador ao vivo (polling 20s). Marca todas como lidas.
- **Financeiro** — Fluxo de caixa.
- **Documentos** — Upload + propostas/relatórios do Copiloto.
- **Automações** — Motor real (novo_lead, fatura_vencida, proposta_enviada, nova_conversa_wa).
- **Equipe** — Convites por e-mail, papéis.
- **Dashboards** — KPIs + gráficos.
- **Landing** — Checkout Stripe direto (Starter/Growth/Business + Founder Deal).

## Arquitetura
- Backend FastAPI (~2000 linhas). Coleções: users, orgs, leads, whatsapp_msgs, projects, tasks, finance, documents, automations, team_invites, ordem_servico, os_templates, payment_transactions, copilot_reports, notifications, comments, user_sessions.
- Auth: Emergent Google Auth.
- IA: `emergentintegrations` (Claude Sonnet 4.6).
- Email: Resend (Emergent-managed) — inclui e-mail de menção.
- WhatsApp: Twilio.
- Pagamentos: Stripe (Flow A sandbox). PIX com fallback para cartão.
- Assinatura: SHA-256 + IP + timestamp (Lei 14.063/2020). PDF via reportlab.

## Endpoints novos (v1.4)
- `GET /api/tasks/all` — lista TODAS as tarefas da org (para views Lista/Calendário/Gantt).
- `GET/POST/DELETE /api/tasks/{id}/comments` — comentários com @menções.
- `GET /api/notifications`, `POST /api/notifications/{id}/read`, `POST /api/notifications/read-all`.
- @menções geram notificação in-app + e-mail para o mencionado.

## Backlog priorizado
### P1
- Ativar WhatsApp Twilio de verdade.
- Notificar dono no WhatsApp quando cliente assina/paga.
- Notificação em tempo real via WebSocket (hoje polling 20s).

### P2
- Domínio prisma.com.br.
- Split de `server.py` em módulos.
- Modo escuro.
- Copilot tool-calling nativo.
- Dependências entre tarefas (aguarda X).
- Copiloto no WhatsApp do cliente (esteira comercial autônoma).
