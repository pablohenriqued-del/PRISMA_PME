import React, { useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Sparkles, ArrowRight, ShieldCheck, Zap, MessageCircle, Users2, ClipboardList,
  Wallet, FileText, Kanban, CreditCard, Bot, Printer, Download, Check, X,
  PhoneCall, Send, FileSignature, Star, TrendingUp, Quote,
} from "lucide-react";

/* --------------------------------------------------------------------------
   Prisma — Apresentação comercial (one-page) para PMEs
   Rota: /apresentacao  (público)
   Design: Dark SaaS moderno (Linear/Vercel), alinhado com Landing.jsx
-------------------------------------------------------------------------- */

const MODULES = [
  { icon: Users2, name: "CRM", desc: "Kanban de leads. Funil visual. Drag-and-drop.", span: "md:col-span-2 md:row-span-2", accent: "from-[#5E6AD2]/30 to-transparent" },
  { icon: MessageCircle, name: "WhatsApp", desc: "Inbox unificada via Twilio.", span: "md:col-span-2", accent: "from-emerald-500/20 to-transparent" },
  { icon: ClipboardList, name: "Ordem de Serviço", desc: "Orçamento → assinatura → PIX no mesmo link.", span: "md:col-span-2", accent: "from-[#8B5CF6]/25 to-transparent" },
  { icon: Kanban, name: "Projetos", desc: "Kanban · Lista · Calendário · Gantt.", span: "md:col-span-2", accent: "from-cyan-500/20 to-transparent" },
  { icon: Wallet, name: "Financeiro", desc: "Fluxo de caixa. Cobrança PIX recorrente.", span: "md:col-span-2", accent: "from-amber-500/15 to-transparent" },
  { icon: Zap, name: "Automações", desc: "Motor quando/então nativo.", span: "md:col-span-1", accent: "from-pink-500/20 to-transparent" },
  { icon: Bot, name: "Copiloto IA", desc: "Cria tarefas, propostas e relatórios sob demanda.", span: "md:col-span-3", accent: "from-[#5E6AD2]/35 to-transparent" },
];

const STATS = [
  { n: "24h", label: "economizadas / semana", note: "menos planilha, mais IA" },
  { n: "3×", label: "mais rápido para fechar", note: "OS + PIX no mesmo link" },
  { n: "7min", label: "do lead ao PIX", note: "IA + assinatura embutida" },
  { n: "R$ 32.4k", label: "economia anual", note: "se paga no 1º mês" },
];

const COMP_ROWS = [
  { f: "CRM + WhatsApp integrados", p: true, m: false, c: false, o: false },
  { f: "OS com assinatura + PIX embutido", p: true, m: false, c: false, o: false },
  { f: "Copiloto IA nativo", p: true, m: "limitado", c: "limitado", o: false },
  { f: "Portal do cliente sem login", p: true, m: false, c: false, o: false },
  { f: "4 views em Projetos", p: true, m: true, c: true, o: false },
  { f: "Preço em BRL · suporte pt-BR", p: true, m: false, c: false, o: true },
  { f: "PIX nativo via Stripe", p: true, m: false, c: false, o: false },
];

const PLANS = [
  { name: "Free", price: "R$ 0", period: "para sempre", features: ["1 usuário", "CRM até 50 leads", "Copiloto 50 msgs/mês"] },
  { name: "Growth", price: "R$ 897", period: "/mês", features: ["Até 5 usuários", "WhatsApp real (Twilio)", "Copiloto ilimitado", "Automações ilimitadas"], highlight: true },
  { name: "Business", price: "R$ 2.997", period: "/mês", features: ["Usuários ilimitados", "SLA 4h · onboarding", "API pública", "Assinatura eletrônica"] },
];

const TESTIMONIALS = [
  {
    quote: "Substituí Trello, Pipedrive e uma agência de cobrança. Meu financeiro fecha o mês em 2h agora.",
    author: "Marina Alves", role: "Padaria Bella · São Paulo",
    photo: "https://randomuser.me/api/portraits/women/44.jpg",
    metric: "+40%", metricLabel: "de fechamento em 3 meses",
  },
  {
    quote: "Enviei uma proposta pelo WhatsApp e o cliente assinou e pagou em 40 minutos. Nunca vi isso.",
    author: "Ricardo Meira", role: "Estúdio 12 · Rio de Janeiro",
    photo: "https://randomuser.me/api/portraits/men/32.jpg",
    metric: "40min", metricLabel: "do lead ao PIX cair",
  },
  {
    quote: "O Copiloto gera o relatório mensal em 8 segundos. Antes era meio dia de contador.",
    author: "Camila Prado", role: "Contábil Prado · Belo Horizonte",
    photo: "https://randomuser.me/api/portraits/women/68.jpg",
    metric: "12×", metricLabel: "mais rápido nos relatórios",
  },
];

const Logo = ({ className = "h-8 w-8" }) => (
  <div className={`${className} rounded-lg bg-gradient-to-br from-[#5E6AD2] to-[#8B5CF6] flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(94,106,210,0.5)]`}>
    <svg viewBox="0 0 44 44" fill="none" className="w-3/5 h-3/5">
      <path d="M22 4 L40 34 L4 34 Z" fill="white" strokeLinejoin="round" />
    </svg>
  </div>
);

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.55, ease: [0.22, 1, 0.36, 1] } }),
};

export default function Apresentacao() {
  const { scrollYProgress } = useScroll();
  const barWidth = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  const [dt] = useState(() => new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }));

  useEffect(() => { document.title = "Prisma · Apresentação Comercial"; }, []);

  const PDF_URL = `${process.env.REACT_APP_BACKEND_URL}/api/public/apresentacao.pdf`;

  return (
    <div className="min-h-screen bg-[#08090A] text-zinc-100 antialiased overflow-x-hidden" data-testid="apresentacao-page">
      {/* Progress bar */}
      <motion.div style={{ width: barWidth }} className="fixed top-0 left-0 h-[2px] bg-gradient-to-r from-[#5E6AD2] via-[#8B5CF6] to-[#00E5FF] z-50 print:hidden shadow-[0_0_10px_rgba(94,106,210,0.6)]" />

      {/* NAV */}
      <nav className="sticky top-0 z-40 glass-nav print:hidden">
        <div className="max-w-6xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5" data-testid="nav-logo">
            <Logo className="h-8 w-8" />
            <div className="flex flex-col leading-none">
              <span className="font-display text-base font-semibold tracking-tight">Prisma</span>
              <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 mt-1">apresentação · {dt}</span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <a
              href={PDF_URL} target="_blank" rel="noopener"
              data-testid="download-pdf-btn"
              className="hidden sm:inline-flex items-center gap-2 h-9 px-3 rounded-md border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/20 text-xs text-zinc-300 transition-colors"
            >
              <Download className="h-3.5 w-3.5" /> PDF one-page
            </a>
            <Link to="/login" data-testid="try-btn" className="btn-primary text-xs h-9 px-4">
              Testar grátis <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ============== HERO ============== */}
      <section className="relative bg-mesh noise-bg overflow-hidden">
        {/* huge glow */}
        <div className="absolute inset-x-0 top-0 h-[720px] pointer-events-none">
          <div className="absolute left-1/2 -translate-x-1/2 top-[-200px] w-[1100px] h-[1100px] rounded-full opacity-40 blur-[130px]"
               style={{ background: "radial-gradient(circle, rgba(94,106,210,0.55), transparent 60%)" }} />
          <div className="absolute left-[70%] top-[100px] w-[500px] h-[500px] rounded-full opacity-30 blur-[100px]"
               style={{ background: "radial-gradient(circle, rgba(139,92,246,0.4), transparent 60%)" }} />
        </div>
        <div className="relative max-w-6xl mx-auto px-6 md:px-10 pt-20 md:pt-28 pb-24 md:pb-32">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7">
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                          className="inline-flex items-center gap-2 px-3 h-7 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-sm text-[10px] uppercase tracking-[0.2em] font-mono text-zinc-400">
                <Sparkles className="h-3 w-3 text-[#8B5CF6]" /> Software brasileiro · IA nativa · PIX embutido
              </motion.div>
              <motion.h1
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}
                className="mt-6 font-display font-semibold tracking-tighter text-5xl md:text-6xl lg:text-7xl leading-[1.02] text-gradient"
              >
                Sua PME rodando em<br />
                <span className="text-gradient-brand">piloto automático.</span>
              </motion.h1>
              <motion.p
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={2}
                className="mt-7 text-lg md:text-xl text-zinc-400 max-w-2xl leading-relaxed"
              >
                CRM, WhatsApp, Ordem de Serviço, Financeiro, Projetos e IA em <span className="text-zinc-200">um único painel</span>.
                Do primeiro contato ao PIX cair, sem trocar de aba.
              </motion.p>
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={3}
                          className="mt-10 flex items-center gap-3 flex-wrap">
                <Link to="/login" data-testid="hero-cta" className="btn-primary glow-button-hover">
                  Testar 30 dias grátis <ArrowRight className="h-4 w-4" />
                </Link>
                <a href="#comparativo" className="btn-secondary">Ver comparativo</a>
                <div className="flex items-center gap-2 text-xs text-zinc-500 ml-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Cancele quando quiser
                </div>
              </motion.div>
            </div>

            {/* Right: floating product mock */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="lg:col-span-5 relative h-[440px] hidden lg:block"
            >
              <div className="absolute inset-0 rounded-3xl border border-white/5 overflow-hidden bg-gradient-to-br from-[#0F0F14] via-[#0A0A0F] to-[#08090A]">
                <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
                {/* Copiloto card */}
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute top-6 left-6 right-16 rounded-xl bg-[#121214]/95 backdrop-blur border border-white/10 p-4 shadow-2xl"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-6 w-6 rounded-md bg-gradient-to-br from-[#5E6AD2] to-[#8B5CF6] flex items-center justify-center">
                      <Bot className="h-3 w-3 text-white" />
                    </div>
                    <div className="text-[10px] uppercase tracking-widest font-mono text-zinc-500">Copiloto Prisma</div>
                  </div>
                  <div className="text-sm text-zinc-200 leading-relaxed">"Gere uma proposta de R$ 4.500 para a Padaria Bella."</div>
                  <div className="mt-3 h-1 bg-white/5 rounded overflow-hidden">
                    <motion.div animate={{ width: ["10%", "85%"] }} transition={{ duration: 3, repeat: Infinity }} className="h-full bg-gradient-to-r from-[#5E6AD2] to-[#8B5CF6]" />
                  </div>
                </motion.div>
                {/* OS card */}
                <motion.div
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className="absolute bottom-8 left-10 right-6 rounded-xl bg-[#121214]/95 backdrop-blur border border-white/10 p-4 shadow-2xl"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[10px] uppercase tracking-widest font-mono text-zinc-500">OS · aprovada</div>
                    <div className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium">Assinada</div>
                  </div>
                  <div className="font-display text-base font-medium text-zinc-100">Website Padaria Bella</div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-xs text-zinc-500">Cliente confirmou às 14:32</div>
                    <div className="font-mono text-sm text-zinc-100">R$ 4.500,00</div>
                  </div>
                  <button className="mt-3 w-full h-8 rounded-md bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(16,185,129,0.35)]">
                    <CreditCard className="h-3 w-3" /> PIX pago · 03s
                  </button>
                </motion.div>
                {/* Floating badges */}
                <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 5, repeat: Infinity, delay: 0.5 }}
                            className="absolute top-40 right-6 h-11 w-11 rounded-xl bg-[#08090A] border border-white/10 shadow-lg flex items-center justify-center">
                  <MessageCircle className="h-4 w-4 text-emerald-400" />
                </motion.div>
                <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 4, repeat: Infinity, delay: 1.2 }}
                            className="absolute top-52 left-6 h-11 w-11 rounded-xl bg-[#08090A] border border-white/10 shadow-lg flex items-center justify-center">
                  <Zap className="h-4 w-4 text-amber-400" />
                </motion.div>
              </div>
            </motion.div>
          </div>

          {/* Stats strip */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl overflow-hidden bg-white/5 border border-white/5">
            {STATS.map((s, i) => (
              <div key={s.n} className="bg-[#08090A] p-6">
                <div className="font-display text-3xl md:text-4xl font-semibold text-gradient-brand">{s.n}</div>
                <div className="mt-2 text-sm text-zinc-300">{s.label}</div>
                <div className="text-xs text-zinc-500 mt-1">{s.note}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Marquee of pain points */}
      <div className="border-y border-white/5 bg-[#0A0A0C] py-4 overflow-hidden print:hidden">
        <div className="marquee whitespace-nowrap text-sm text-zinc-500">
          {["Planilha para tudo", "5 apps abertos", "Cobrança esquecida", "Proposta em Word", "WhatsApp misturado com pessoal", "Sem histórico do cliente"].concat(["Planilha para tudo", "5 apps abertos", "Cobrança esquecida", "Proposta em Word", "WhatsApp misturado com pessoal", "Sem histórico do cliente"]).map((t, i) => (
            <span key={i} className="flex items-center gap-2 shrink-0"><X className="h-3.5 w-3.5 text-red-500/70" /> {t}</span>
          ))}
        </div>
      </div>

      {/* ============== PROBLEMA → SOLUÇÃO ============== */}
      <section className="max-w-6xl mx-auto px-6 md:px-10 py-24 md:py-32">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                      className="card-bento p-8 md:p-10">
            <div className="overline mb-4">O problema</div>
            <h2 className="font-display font-medium text-3xl md:text-4xl tracking-tight leading-tight text-zinc-100">
              PMEs perdem <span className="text-red-400/90">horas por dia</span> pulando entre planilhas, WhatsApp e cobranças manuais.
            </h2>
            <ul className="mt-6 space-y-3 text-zinc-400">
              {["Lead veio pelo WhatsApp, mas o CRM não sabe.", "Proposta foi por e-mail. Cobrança, esquecida.", "Cronograma no Trello, financeiro no Excel.", "Ninguém sabe quanto tempo foi gasto em qual cliente."].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <div className="mt-1 h-5 w-5 rounded-md bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                    <X className="h-3 w-3 text-red-400" />
                  </div>
                  <span className="leading-relaxed">{t}</span>
                </li>
              ))}
            </ul>
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}
                      className="relative rounded-2xl overflow-hidden p-8 md:p-10 border border-[#5E6AD2]/30 bg-gradient-to-br from-[#5E6AD2]/[0.08] via-[#121214] to-[#121214]">
            <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full opacity-30 blur-3xl bg-[#5E6AD2]" />
            <div className="relative">
              <div className="overline text-[#8B5CF6] mb-4">A solução</div>
              <h3 className="font-display font-medium text-3xl md:text-4xl tracking-tight leading-tight text-zinc-100">
                Um só painel. IA nativa. <span className="text-gradient-brand">PIX embutido.</span>
              </h3>
              <ul className="mt-6 space-y-3 text-zinc-300">
                {["Lead entra pelo WhatsApp e vira card no CRM em 1 clique.", "OS gerada por IA vai por WhatsApp+e-mail com link de assinatura e PIX.", "Cliente assina em 30 segundos. PIX cai. Projeto abre automático.", "Copiloto gera relatórios e propostas em segundos."].map((t) => (
                  <li key={t} className="flex items-start gap-3">
                    <div className="mt-1 h-5 w-5 rounded-md bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                      <Check className="h-3 w-3 text-emerald-400" />
                    </div>
                    <span className="leading-relaxed">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============== BENTO MÓDULOS ============== */}
      <section id="modulos" className="max-w-6xl mx-auto px-6 md:px-10 py-24 md:py-32">
        <div className="max-w-3xl mb-14">
          <div className="overline mb-3">8 módulos, 1 login</div>
          <h2 className="font-display font-semibold text-4xl md:text-5xl tracking-tighter leading-tight text-gradient">
            Tudo que sua PME precisa,<br />no mesmo painel.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 auto-rows-[180px] gap-4">
          {MODULES.map(({ icon: Icon, name, desc, span, accent }, i) => (
            <motion.div
              key={name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.55 }}
              className={`card-bento relative overflow-hidden p-6 group ${span || "md:col-span-1"}`}
            >
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br ${accent}`} />
              <div className="relative flex flex-col h-full">
                <div className="h-10 w-10 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center mb-4 group-hover:border-white/25 transition-colors">
                  <Icon className="h-4 w-4 text-zinc-100" />
                </div>
                <div className="font-display text-lg font-medium text-zinc-100">{name}</div>
                <div className="mt-1.5 text-sm text-zinc-500 leading-relaxed">{desc}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ============== FLUXO NARRATIVO ============== */}
      <section id="fluxo" className="max-w-6xl mx-auto px-6 md:px-10 py-24 md:py-32">
        <div className="max-w-3xl mb-14">
          <div className="overline mb-3">Do primeiro "olá" ao PIX cair</div>
          <h2 className="font-display font-semibold text-4xl md:text-5xl tracking-tighter leading-tight text-gradient">
            <span className="text-gradient-brand">7 minutos</span> do lead ao pagamento.
          </h2>
        </div>
        <div className="relative">
          <div className="hidden md:block absolute left-8 top-4 bottom-4 w-px bg-gradient-to-b from-[#5E6AD2]/50 via-white/10 to-transparent" />
          <div className="space-y-8">
            {[
              { icon: PhoneCall, t: "0:00 · Lead chega no WhatsApp", d: "Cliente manda mensagem. Aparece no inbox e vira card no CRM automaticamente.", tag: "CRM + WhatsApp" },
              { icon: Bot, t: "0:30 · Copiloto propõe orçamento", d: "\"Gere uma proposta para X\". IA cria a OS com itens e valor, salva em Documentos.", tag: "Copiloto IA" },
              { icon: Send, t: "1:00 · OS enviada", d: "Um clique dispara e-mail + WhatsApp com o link do portal do cliente.", tag: "Ordem de Serviço" },
              { icon: FileSignature, t: "3:00 · Cliente assina", d: "Assinatura eletrônica válida (Lei 14.063/2020) direto no navegador dele.", tag: "Portal do Cliente" },
              { icon: CreditCard, t: "5:00 · PIX cai", d: "Stripe gera QR PIX. Confirmação em segundos. Notificação chega no seu app.", tag: "Financeiro" },
              { icon: Kanban, t: "7:00 · Projeto abre sozinho", d: "OS vira Projeto com tarefas por item. Time recebe menção no card.", tag: "Projetos" },
            ].map((step, i) => (
              <motion.div
                key={step.t}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.55 }}
                className="flex gap-6 items-start"
              >
                <div className="relative shrink-0">
                  <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-[#5E6AD2] to-[#8B5CF6] text-white flex items-center justify-center shadow-[0_0_24px_rgba(94,106,210,0.35)]">
                    <step.icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="flex-1 pt-1">
                  <div className="overline">{step.tag}</div>
                  <div className="font-display text-xl md:text-2xl mt-2 font-medium text-zinc-100">{step.t}</div>
                  <div className="mt-2 text-zinc-400 max-w-xl leading-relaxed">{step.d}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== COMPARATIVO ============== */}
      <section id="comparativo" className="max-w-6xl mx-auto px-6 md:px-10 py-24 md:py-32">
        <div className="max-w-3xl mb-10">
          <div className="overline mb-3">Comparativo honesto</div>
          <h2 className="font-display font-semibold text-4xl md:text-5xl tracking-tighter leading-tight text-gradient">
            Feito para PMEs <span className="text-gradient-brand">brasileiras</span>.
          </h2>
          <p className="mt-4 text-zinc-400 leading-relaxed">
            Monday e ClickUp são ótimos para times grandes gringos. Pipedrive é um bom CRM. Prisma é o único que roda
            o negócio inteiro em português, com PIX e WhatsApp de verdade.
          </p>
        </div>
        <div className="rounded-2xl border border-white/5 overflow-hidden bg-[#0F0F12]">
          <table className="w-full text-sm">
            <thead className="bg-[#08090A]">
              <tr className="text-left">
                <th className="p-4 font-mono uppercase tracking-widest text-[10px] text-zinc-500">Recurso</th>
                <th className="p-4 text-center font-medium text-zinc-100">Prisma</th>
                <th className="p-4 text-center font-medium text-zinc-500">Monday</th>
                <th className="p-4 text-center font-medium text-zinc-500">ClickUp</th>
                <th className="p-4 text-center font-medium text-zinc-500">Pipedrive</th>
              </tr>
            </thead>
            <tbody>
              {COMP_ROWS.map((r, i) => (
                <tr key={i} className="border-t border-white/5">
                  <td className="p-4 text-zinc-300">{r.f}</td>
                  {[r.p, r.m, r.c, r.o].map((v, j) => (
                    <td key={j} className="p-4 text-center">
                      {v === true && <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-emerald-500/10 border border-emerald-500/25"><Check className="h-3.5 w-3.5 text-emerald-400" /></span>}
                      {v === false && <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-white/[0.03] border border-white/5"><X className="h-3.5 w-3.5 text-zinc-600" /></span>}
                      {typeof v === "string" && <span className="text-[10px] px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 font-medium uppercase tracking-wide">{v}</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ============== DEPOIMENTOS ============== */}
      <section id="clientes" className="max-w-6xl mx-auto px-6 md:px-10 py-24 md:py-32">
        <div className="max-w-3xl mb-14">
          <div className="overline mb-3">Prova social</div>
          <h2 className="font-display font-semibold text-4xl md:text-5xl tracking-tighter leading-tight text-gradient">
            PMEs reais. Resultados <span className="text-gradient-brand">reais.</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <motion.article
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.55 }}
              className="relative card-bento p-6 flex flex-col group hover:border-[#5E6AD2]/40"
            >
              <Quote className="absolute top-6 right-6 h-5 w-5 text-[#5E6AD2]/40" />
              {/* Metric callout */}
              <div className="mb-5 pb-5 border-b border-white/5">
                <div className="flex items-baseline gap-2">
                  <span className="font-display font-semibold text-4xl text-gradient-brand tracking-tighter">{t.metric}</span>
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="text-xs text-zinc-500 mt-1">{t.metricLabel}</div>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed flex-1">"{t.quote}"</p>
              <footer className="mt-6 pt-5 border-t border-white/5 flex items-center gap-3">
                <img
                  src={t.photo}
                  alt={t.author}
                  loading="lazy"
                  className="h-11 w-11 rounded-full object-cover border border-white/10"
                />
                <div>
                  <div className="font-medium text-sm text-zinc-100">{t.author}</div>
                  <div className="text-xs text-zinc-500">{t.role}</div>
                </div>
                <div className="ml-auto flex items-center gap-0.5">
                  {[...Array(5)].map((_, k) => <Star key={k} className="h-3 w-3 fill-amber-400 text-amber-400" />)}
                </div>
              </footer>
            </motion.article>
          ))}
        </div>
      </section>

      {/* ============== PRICING ============== */}
      <section id="planos" className="max-w-6xl mx-auto px-6 md:px-10 py-24 md:py-32">
        <div className="max-w-3xl mb-14">
          <div className="overline mb-3">Planos simples · em reais</div>
          <h2 className="font-display font-semibold text-4xl md:text-5xl tracking-tighter leading-tight text-gradient">
            Comece grátis. Cresça <span className="text-gradient-brand">quando fizer sentido</span>.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`relative rounded-2xl p-7 border ${
                p.highlight
                  ? "bg-gradient-to-br from-[#5E6AD2]/[0.15] via-[#121214] to-[#121214] border-[#5E6AD2]/40 shadow-[0_0_40px_rgba(94,106,210,0.2)]"
                  : "bg-[#0F0F12] border-white/5"
              }`}
            >
              {p.highlight && (
                <div className="absolute -top-3 left-6 text-[10px] font-mono uppercase tracking-widest px-3 py-1 rounded-full bg-gradient-to-r from-[#5E6AD2] to-[#8B5CF6] text-white shadow-[0_0_16px_rgba(94,106,210,0.5)]">
                  Recomendado
                </div>
              )}
              <div className="font-display text-lg font-medium text-zinc-100">{p.name}</div>
              <div className="mt-4 flex items-baseline gap-1.5">
                <div className="font-display font-semibold text-4xl text-zinc-100 tracking-tight">{p.price}</div>
                <div className="text-xs text-zinc-500">{p.period}</div>
              </div>
              <ul className="mt-6 space-y-2.5 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2.5 items-start">
                    <div className="mt-0.5 h-4 w-4 rounded-md bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shrink-0">
                      <Check className="h-2.5 w-2.5 text-emerald-400" />
                    </div>
                    <span className="text-zinc-300">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {/* Founder Deal strip */}
        <div className="mt-8 rounded-2xl border border-amber-500/25 bg-gradient-to-r from-amber-500/[0.06] via-[#121214] to-[#121214] p-6 flex items-center gap-6 flex-wrap justify-between">
          <div>
            <div className="overline text-amber-400 mb-2">Founder Deal · vagas limitadas</div>
            <div className="font-display text-2xl font-semibold text-zinc-100">R$ 4.997 <span className="text-sm text-zinc-500 font-normal">à vista · 3 anos de Growth</span></div>
            <div className="text-xs text-zinc-500 mt-1">Trave o preço agora. Depois vira Growth normal após 36 meses.</div>
          </div>
          <Link to="/#precos" className="btn-primary" data-testid="founder-deal-btn">
            Reservar minha vaga <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ============== CTA FINAL ============== */}
      <section className="relative max-w-6xl mx-auto px-6 md:px-10 py-24">
        <div className="relative rounded-3xl bg-gradient-to-br from-[#0F0F14] via-[#121214] to-[#08090A] border border-white/5 p-10 md:p-16 overflow-hidden">
          {/* Glow */}
          <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full opacity-30 blur-[120px]"
               style={{ background: "radial-gradient(circle, rgba(94,106,210,0.5), transparent 60%)" }} />
          <div className="relative">
            <div className="max-w-2xl">
              <h2 className="font-display font-semibold text-4xl md:text-6xl tracking-tighter leading-none text-gradient">
                Sua PME merece<br /><span className="text-gradient-brand">rodar sozinha.</span>
              </h2>
              <p className="mt-6 text-zinc-400 md:text-lg leading-relaxed">
                Teste 30 dias grátis. Se não gostar, é só sair. Se gostar, você não larga mais.
              </p>
            </div>
            <div className="mt-10 flex items-center gap-3 flex-wrap">
              <Link to="/login" data-testid="cta-final-btn" className="btn-primary glow-button-hover">
                Começar agora <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="mailto:pablohenriqued@gmail.com" className="btn-secondary" data-testid="cta-mail-btn">
                Falar com o fundador
              </a>
              <a
                href={PDF_URL} target="_blank" rel="noopener"
                data-testid="cta-pdf-btn"
                className="btn-secondary hidden sm:inline-flex"
              >
                <Download className="h-4 w-4" /> Baixar PDF
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-10">
        <div className="max-w-6xl mx-auto px-6 md:px-10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-3">
            <Logo className="h-6 w-6" />
            <span className="font-display text-sm text-zinc-300 font-medium">Prisma</span>
            <span>· painel de controle da PME</span>
          </div>
          <div className="font-mono">Feito no Brasil · pt-BR · {new Date().getFullYear()}</div>
        </div>
      </footer>

      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          html, body { background: #08090A !important; color-adjust: exact; -webkit-print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          section { padding-top: 20px !important; padding-bottom: 20px !important; page-break-inside: avoid; }
          h1, h2 { page-break-after: avoid; }
        }
      `}</style>
    </div>
  );
}
