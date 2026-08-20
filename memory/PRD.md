# Prisma — PRD

## Original Problem Statement
Plataforma modular para PMEs (Prisma) com IA nativa (Copiloto), automações, WhatsApp, Projetos e CRM. Sistema atua como o "painel de controle" central da PME.

## Design System
- **Dark SaaS moderno** (Linear/Vercel style). Fundo `#08090A`, superfícies `#121214`, brand purple `#5E6AD2` → violet `#8B5CF6`. Fonte Outfit/Inter.
- Consultar `/app/design_guidelines.json` antes de qualquer mudança de UI.

## Users
- Pequenas e médias empresas brasileiras. Owner é `pablohenriqued@gmail.com`.

## Módulos Implementados
- **Dashboard**
- **CRM** com kanban, edit dialog, campo **Sistema oferecido** (BR PREDICT · PLENUS · PROVENANCE · M&A · CJUDI · PMO · PRISMA)
- **Ordem de Serviço** com recorrência, templates, portal público, assinatura eletrônica, Stripe PIX checkout, **auto-anexo do PDF one-page no e-mail**
- **WhatsApp** (Twilio Sandbox — `join swim-tie`)
- **Projetos** com Kanban · Lista · Calendário · Gantt · @mentions
- **Vendas · Nova apresentação** (`/app/vendas`) — gerador de link personalizado + PDF one-page + envio WhatsApp/e-mail + Analytics (opens do PDF, page views, tempo médio)
- **Financeiro completo**
  - Modelo expandido (due_date, paid_date, status pendente/pago/vencido, category, client_name, recurrence)
  - Filtros por período (Mês / 30d / 90d / Ano / Tudo) + kind + status
  - 4 KPIs com delta vs mês anterior
  - Gráfico de área (receita × despesa) + donut de categorias
  - DRE simplificado + Fluxo projetado 90 dias
  - **Cobrança PIX** (Stripe) por lançamento com envio WhatsApp/e-mail (fallback card se PIX não habilitado)
  - **Import CSV** (extrato bancário — auto-detecta delimitador e formato BR)
  - Export CSV com BOM UTF-8
- **Documentos** (upload + IA)
- **Automações** (motor quando/então)
- **Equipe** (roles owner/admin/member)
- **Copiloto IA** (Claude Sonnet 4.6 via Emergent LLM Key) — intents nativos incluindo `gere apresentação para <X> por <Y>` que devolve card com PDF + link página + copiar

## Rotas Públicas
- `/` — Landing (Dark SaaS)
- `/apresentacao?para=X&valor=Y` — One-page comercial personalizado (Dark SaaS) com tracking de view + duração
- `/api/public/apresentacao.pdf?para=X&valor=Y` — PDF Dark SaaS em ReportLab com fotos + depoimentos + tracking de aberturas
- `/os/publica/:token` — Portal do cliente

## Integrações 3rd Party
- OpenAI GPT-4o + Claude Sonnet 4.6 (Emergent LLM Key)
- Twilio (WhatsApp Sandbox) — user API key
- Stripe (Payments, PIX + Card) — test mode
- Resend (E-mail via Emergent) — auto attach PDF em OS/apresentação

## API Endpoints Recentes Adicionados
- `GET /api/public/apresentacao.pdf` (tracking + Dark PDF)
- `POST /api/public/apresentacao/track-view` (page view + duration_ms)
- `POST /api/sales/link` (gera link + envia WhatsApp/e-mail com PDF anexo)
- `GET /api/sales/analytics` (aberturas por cliente, tempo médio, envios recentes)
- `POST /api/finance/{tx_id}/send-pix` (cobrança PIX via Stripe + envio)
- `POST /api/finance/import-csv` (import extrato)
- `GET /api/finance` (com filtros date_from/to, kind, status, category)
- `PATCH /api/finance/{tx_id}` (marcar pago etc)
- `GET /api/finance/summary` (DRE + projeção 90d)
- `GET /api/finance/export.csv`
- Extended `POST /api/os/{os_id}/send` — agora auto-anexa PDF personalizado

## DB Collections
- `orgs`, `users`, `user_sessions`
- `leads` (com `system`), `os`, `os_templates`
- `finance` (com due_date, paid_date, status, category, client_name, recurrence, pix_checkout_url)
- `projects`, `tasks`, `comments`
- `documents`, `automations`, `whatsapp_messages`
- `sales_sends`, `apresentacao_opens` (analytics)

## Roadmap (P1/P2)
- Cobrança recorrente automática (worker que cria tx do próximo período quando marcar pago)
- Logo do cliente no PDF (upload por org + no PDF ao lado do Prisma)
- Import OFX bancário (extrair além de CSV)
- Analytics: geo/device breakdown das aberturas
- SaaS billing (assinatura Growth/Business real via Stripe subscriptions)
- Módulo BR PREDICT/PLENUS/PROVENANCE etc como whitelabel do Prisma

## Test Credentials
Ver `/app/memory/test_credentials.md`.
