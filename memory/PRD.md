# Prisma — PRD

## Problema
Plataforma modular para PMEs brasileiras. Une CRM, WhatsApp, Projetos, Financeiro, Documentos, Ordem de Serviço, Automações, Copiloto IA e Portal do Cliente com pagamento PIX.

## Módulos (v1.3 — 2026-02-28)
- **Copiloto IA operacional** — Claude Sonnet 4.5 streaming + ações (criar tarefa, gerar proposta, gerar relatório).
- **CRM** — Kanban de leads.
- **Ordem de Serviço** — Do orçamento à entrega. Custom fields, recorrência (semanal/mensal/trimestral), templates reutilizáveis, envio por e-mail + WhatsApp, portal público, assinatura eletrônica com hash SHA-256, PDF do comprovante, cobrança PIX/cartão.
- **Portal do Cliente (público, sem login)** — `/os/publica/{token}`. Cliente vê a proposta, aceita/assina, paga PIX. Lista outras propostas do mesmo e-mail.
- **WhatsApp** — Inbox + Twilio (send/webhook) com fallback modo simulação.
- **Projetos** — Kanban de tarefas + **time tracker** (start/stop/log manual) + **custom fields** por tarefa.
- **Financeiro** — Fluxo de caixa, status vencida dispara automação.
- **Documentos** — Upload real + guarda propostas/relatórios do Copiloto.
- **Automações** — Motor real (novo_lead, fatura_vencida, proposta_enviada, nova_conversa_wa).
- **Equipe** — Convites por e-mail, papéis.
- **Dashboards** — KPIs + gráficos.
- **Landing** — Checkout Stripe direto (Starter/Growth/Business + Founder Deal) com contador ao vivo.

## Arquitetura
- Backend FastAPI (`/app/backend/server.py`, ~1900 linhas) — MongoDB. Rotas `/api/*` + `/api/public/*`.
- Frontend React 19 + Tailwind + Shadcn + Recharts + framer-motion.
- Auth: Emergent Google Auth (cookie httpOnly + Bearer).
- IA: `emergentintegrations` (Claude Sonnet 4.6) — texto e ações.
- Email: Resend (Emergent-managed).
- WhatsApp: Twilio (`+19788384904`).
- Pagamentos: Stripe Flow A (sandbox claimable). PIX tentado com fallback automático para cartão.
- PDF: `reportlab` para comprovante de assinatura.
- Assinatura eletrônica: SHA-256 (nome + e-mail + IP + timestamp + os_id) — MP 2.200-2 / Lei 14.063/2020.
- Multi-tenant: `org_id` em toda query.

## Estado (2026-02-28)
- Backend endpoints: 30+ rotas, todas com pytest cobrindo casos principais.
- Frontend: OS pública em produção, cronômetro nas tarefas, custom fields em OS e tarefas, templates, recorrência automática.
- Stripe catalog: 4 produtos × 7 preços BRL provisionados.

## Backlog priorizado
### P1
- WhatsApp: ativar número Twilio (Sandbox `+14155238886` ou Sender aprovado) → hoje envia por WhatsApp cai em erro gracioso.
- Rate-limit por org no motor de automações.
- Notificar dono por WhatsApp (não só e-mail) quando cliente assina/paga.

### P2
- Domínio `prisma.com.br`.
- Split de `server.py` em módulos.
- Modo escuro.
- Copilot: tool-calling nativo (function-calling) em vez de heurística no frontend.
- Comentários com @menções nas tarefas.
- Dependências entre tarefas (aguarda X).
- Gantt/Timeline view em Projetos.
- Portal cliente: autenticação por magic-link para ver TODAS as OS (hoje já lista as do mesmo e-mail).
