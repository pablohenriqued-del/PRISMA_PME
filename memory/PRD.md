# Núcleo IA — PRD

## Problema
Plataforma modular para PMEs brasileiras com IA nativa, automações e WhatsApp — que **resolve tarefas do dia a dia**.

## Módulos (v1.1 — 2026-02-28)
- IA (Copiloto) — Claude Sonnet 4.5 streaming SSE, contextualizado por módulo
- CRM — Kanban de leads, drag-and-drop, phone E.164
- WhatsApp — Inbox + **Twilio real** (send/webhook) com fallback modo simulação
- Projetos — Kanban de tarefas multi-projeto
- Financeiro — Fluxo de caixa, status vencida dispara automação
- Documentos — **Upload real** via Emergent Object Storage (drag-and-drop, download)
- Automações — **Motor real** (novo_lead, fatura_vencida, proposta_enviada, nova_conversa_wa) → WhatsApp/Email/Tarefa/Notificar time; log de execuções + botão Testar
- Equipe — **Convites por e-mail** (Resend) com papéis (owner/admin/comercial/financeiro), attach automático no login
- Dashboards — KPIs + gráficos
- Command Palette (⌘K) e Copiloto (⌘I)

## Arquitetura
- Backend FastAPI (`/app/backend/server.py`) — rotas `/api/*`, MongoDB
- Frontend React 19 + Tailwind + Shadcn + Recharts + framer-motion
- Auth: Emergent Google Auth (cookie httpOnly + Bearer)
- IA: `emergentintegrations` (Claude Sonnet 4-6)
- WhatsApp: Twilio (from=+19788384904 do usuário)
- Email: Resend (Emergent-managed, `EMERGENT_EMAIL_KEY`)
- Storage: Emergent Object Storage (`{app}/{org_id}/{uuid}.ext`)
- Multi-tenant: `org_id` em toda query

## Estado (2026-02-28)
- **Backend: 14/14 ✅**  |  **Frontend: 100% ✅** (2 iterações de teste)
- Twilio configurado; o número `+19788384904` ainda precisa ser habilitado para WhatsApp no console Twilio (Sandbox ou Sender aprovado) para envio real chegar; fallback funciona.
- Resend + Object Storage: verificados end-to-end.

## Backlog priorizado
### P0
- Ativar WhatsApp no número Twilio (via Sandbox `+14155238886` ou aprovar Sender)
- Validação `X-Twilio-Signature` no webhook antes de produção
### P1
- Editar todos os campos do lead (não só stage/phone)
- Rate-limit por org no motor de automações
- Ações a11y: mostrar botões de download/deletar sempre em telas pequenas
### P2
- Split de `server.py` em módulos (auth/crm/wa/docs/team/autos)
- Modo escuro
- Relatórios exportáveis (PDF/CSV)
