# Prisma — PRD

## Problema
Plataforma modular para PMEs brasileiras. Une CRM, WhatsApp, Projetos, Financeiro, Documentos, Ordem de Serviço, Automações, Copiloto IA e Portal do Cliente com pagamento PIX.

## Módulos (v2.0 — 2026-02-28 · Dark SaaS Redesign)
- **Copiloto IA operacional** — Claude Sonnet 4.5 streaming + ações (criar tarefa, gerar proposta, gerar relatório).
- **CRM** — Kanban de leads.
- **Ordem de Serviço** — Custom fields, recorrência, templates, envio automático (email + WhatsApp), portal público, assinatura eletrônica com hash, PDF de comprovante, cobrança PIX/cartão.
- **Portal do Cliente (público)** — `/os/publica/{token}`.
- **WhatsApp** — Inbox + Twilio Sandbox `whatsapp:+14155238886`.
- **Projetos** — 4 views (Kanban/Lista/Calendário/Gantt), time tracker, custom fields, comentários com @menções.
- **Notificações** — Sino no header com badge unread.
- **Financeiro** — Fluxo de caixa.
- **Documentos** — Upload + propostas/relatórios do Copiloto.
- **Automações** — Motor real.
- **Equipe** — Convites por e-mail.
- **Dashboards** — KPIs + gráficos.
- **Landing** — Redesenhada com dark SaaS moderno (Linear/Vercel style).
- **Apresentação /apresentacao** — one-page comercial.
- **PDF elegante /api/public/apresentacao.pdf** — reportlab + QR + ROI + Sem/Com Prisma.

## Design v2.0 (2026-02-28)
- **Tema**: Dark SaaS moderno (Linear/Vercel/Cursor inspired). Fonte Outfit + Inter + JetBrains Mono.
- **Paleta**: fundo `#08090A`, surface `#0F0F12`, primary gradiente `#5E6AD2 → #8B5CF6 → #00E5FF`.
- **Gradient meshes** na hero, glow effects, bento grid, marquee de logos.
- Todas as páginas migradas para dark theme via CSS variables + sed bulk transform.
- Landing.jsx e Login.jsx reescritos com bento grid, dashboard mockup animado, testimonial cards com estrelas.
- AppShell com sidebar dark, item ativo com barra gradient à esquerda, avatar com ring, botão Copiloto com gradiente sutil.

## Backlog priorizado
### P0 (próximas 5 features solicitadas)
- Logo do cliente no PDF (co-branded).
- Depoimentos com foto + resultado quantificado.
- Anexar PDF automaticamente no envio da OS.
- Tela "Vendas → Nova apresentação" (gerador de link/PDF).
- Conectar geração de PDF ao Copiloto por linguagem natural.

### P1
- Ativar Twilio WhatsApp Sender dedicado (hoje Sandbox exige "join swim-tie").
- Notificar dono no WhatsApp quando cliente assina/paga.

### P2
- Domínio prisma.com.br.
- Split de `server.py` em módulos.
- Copilot tool-calling nativo.
- Portal do colaborador (link por tarefa).
