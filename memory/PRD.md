# Núcleo IA — PRD

## Problema
Plataforma modular para PMEs brasileiras com IA nativa, automações e integração ao WhatsApp — que **resolve tarefas do dia a dia** (não só oferece gestão).

## Módulos (MVP entregue em 2026-02)
- IA (Copiloto) — Claude Sonnet 4.5 via Emergent Universal Key, streaming SSE, contextualizado por módulo
- CRM — Kanban de leads (Lead → Contato Feito → Proposta → Negociação → Ganho/Perdido), CRUD, drag-and-drop
- WhatsApp — Inbox tipo dois painéis com envio/recebimento **em modo simulação (mock)**
- Projetos — Múltiplos projetos, quadro Kanban de tarefas (A fazer / Em progresso / Concluído)
- Financeiro — Receita/Despesa/Saldo, gráfico de fluxo, tabela de lançamentos
- Documentos — Grid categorizado (contrato/proposta/fiscal/geral)
- Automações — Trigger → Action com toggle ativo/inativo
- Dashboards — Bento com KPIs, receita por dia e pipeline
- Command Palette (⌘K) e atalho ⌘I para o Copiloto

## Arquitetura
- Backend FastAPI (`/app/backend/server.py`) — todas as rotas `/api/*`, MongoDB (Motor)
- Frontend React 19 + Tailwind + Shadcn + Recharts + framer-motion
- Auth: **Emergent-managed Google Auth** (cookie httpOnly + Bearer fallback)
- IA: `emergentintegrations.llm.chat.LlmChat` com `anthropic/claude-sonnet-4-6`
- Multi-tenant: isolamento por `org_id` em toda query

## Personas
- Fundador de PME operando entre múltiplas ferramentas
- Time comercial (CRM + WhatsApp)
- Financeiro/administrativo (Finanças + Documentos)

## Requisitos core (fixos)
1. Isolamento multi-tenant por organização
2. Copiloto sempre acessível (⌘I ou botão)
3. Command Palette global (⌘K)
4. UI premium, minimalista, tipografia Outfit + Manrope

## O que foi implementado (2026-02-28)
- Auth Google + criação automática de organização + seed de dados demo
- Todos os 8 módulos funcionais end-to-end
- Streaming SSE do Copiloto (Claude 4.5)
- Testes backend + frontend: 100% aprovados

## Backlog priorizado
### P0 — próximas iterações
- Integração real WhatsApp (Twilio ou Meta Business API)
- Upload real de documentos (object storage)
- Execução real de automações (webhook engine)
### P1
- Convite de membros da equipe / RBAC granular
- Filtros/busca avançada em CRM
- Anexos em conversas do WhatsApp
### P2
- Modo escuro (variáveis já preparadas)
- Relatórios exportáveis (PDF/CSV)
- Integrações externas (Google Calendar, Gmail)

## Estado
- Backend: ✅ 100%
- Frontend: ✅ 100%
- Deploy readiness: pendente (validar via `deployment_agent` quando solicitado)
