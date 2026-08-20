import React, { useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Sparkles, ArrowRight, ShieldCheck, Zap, MessageCircle, Users2, ClipboardList,
  Wallet, FileText, Kanban, CreditCard, Bot, Printer, Download, Check, X,
  Clock, TrendingUp, Layers, PhoneCall, Send, FileSignature, Repeat, Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/* --------------------------------------------------------------------------
   Prisma — Apresentação comercial (one-page) para PMEs
   Rota: /apresentacao  (público)
   Print: window.print() gera PDF via CSS @media print
-------------------------------------------------------------------------- */

const MODULES = [
  { icon: Users2, name: "CRM", desc: "Kanban de leads, funil visual, drag-and-drop." },
  { icon: MessageCircle, name: "WhatsApp", desc: "Inbox unificada. Automações no chat." },
  { icon: ClipboardList, name: "Ordem de Serviço", desc: "Orçamento → assinatura → PIX no mesmo link." },
  { icon: Kanban, name: "Projetos", desc: "Kanban · Lista · Calendário · Gantt. Cronômetro por tarefa." },
  { icon: Wallet, name: "Financeiro", desc: "Fluxo de caixa. Cobranças recorrentes." },
  { icon: FileText, name: "Documentos", desc: "Propostas e relatórios gerados por IA." },
  { icon: Zap, name: "Automações", desc: "Motor \"quando/então\" nativo." },
  { icon: Bot, name: "Copiloto IA", desc: "Cria tarefas, propostas e relatórios sob demanda." },
];

const STATS = [
  { n: "24h", label: "economizadas por semana", note: "menos planilhas, menos ferramenta." },
  { n: "3×", label: "mais rápido para fechar", note: "OS ↔ CRM ↔ PIX no mesmo link." },
  { n: "R$ 0", label: "para começar", note: "Free vitalício, sem cartão." },
  { n: "5min", label: "para o 1º lead entrar", note: "onboarding assistido no Copiloto." },
];

const COMP_ROWS = [
  { f: "CRM + WhatsApp integrados no mesmo painel", p: true, m: false, c: false, o: false },
  { f: "Ordem de Serviço com assinatura + PIX embutido", p: true, m: false, c: false, o: false },
  { f: "Copiloto IA que cria tarefas, propostas e relatórios", p: true, m: "limitado", c: "limitado", o: false },
  { f: "Portal do cliente sem login", p: true, m: false, c: false, o: false },
  { f: "4 views em Projetos (Kanban, Lista, Calendário, Gantt)", p: true, m: true, c: true, o: false },
  { f: "Preço em Reais (BRL), suporte em PT-BR", p: true, m: false, c: false, o: true },
  { f: "PIX nativo via Stripe", p: true, m: false, c: false, o: false },
];

const PLANS = [
  { name: "Free", price: "R$ 0", period: "para sempre", features: ["1 usuário", "CRM até 50 leads", "Copiloto 50 msgs/mês"] },
  { name: "Growth", price: "R$ 897", period: "/mês", features: ["Até 5 usuários", "WhatsApp real", "Copiloto ilimitado", "Automações ilimitadas"], highlight: true },
  { name: "Business", price: "R$ 2.997", period: "/mês", features: ["Usuários ilimitados", "SLA 4h", "Onboarding assistido", "API pública"] },
];

const TESTIMONIALS = [
  { quote: "Substituí Trello, Pipedrive e uma agência de cobrança. Meu financeiro fecha o mês em 2h agora.", author: "Marina Alves", role: "Padaria Bella · SP" },
  { quote: "Enviei uma proposta pelo WhatsApp e o cliente assinou e pagou em 40 minutos. Nunca vi isso.", author: "Ricardo Meira", role: "Estúdio 12 · RJ" },
  { quote: "O Copiloto gera o relatório mensal em 8 segundos. Antes era meio dia de contador.", author: "Camila Prado", role: "Contábil Prado · MG" },
];

const Logo = ({ className = "h-8 w-8" }) => (
  <div className={`${className} rounded-md bg-[#0A0A14] flex items-center justify-center shrink-0`}>
    <svg viewBox="0 0 44 44" fill="none" className="w-2/3 h-2/3">
      <path d="M22 4 L40 34 L4 34 Z" fill="#F5F1EA" stroke="#F5F1EA" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  </div>
);

const Section = ({ id, className = "", children }) => (
  <section id={id} className={`section-block max-w-6xl mx-auto px-6 md:px-10 ${className}`}>{children}</section>
);

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.6, ease: [0.22, 1, 0.36, 1] } }),
};

export default function Apresentacao() {
  const { scrollYProgress } = useScroll();
  const barWidth = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  const [dt] = useState(() => new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }));

  useEffect(() => { document.title = "Prisma · Apresentação"; }, []);

  return (
    <div className="min-h-screen bg-[#F5F1EA] text-[#0A0A14] antialiased" data-testid="apresentacao-page">
      {/* Reading progress bar */}
      <motion.div style={{ width: barWidth }} className="fixed top-0 left-0 h-[2px] bg-[#0A0A14] z-50 print:hidden" />

      {/* Sticky top bar (hidden on print) */}
      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-[#F5F1EA]/80 border-b border-black/10 print:hidden">
        <div className="max-w-6xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo className="h-8 w-8" />
            <div>
              <div className="italic text-base leading-none" style={{ fontFamily: "'Fraunces', serif" }}>Prisma</div>
              <div className="text-[10px] uppercase tracking-widest text-black/50 mt-0.5">apresentação · {dt}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              data-testid="print-btn"
              className="hidden sm:flex items-center gap-2 h-9 px-3 rounded-md border border-black/10 bg-white hover:bg-black/5 text-xs"
            >
              <Printer className="h-3.5 w-3.5" /> Baixar PDF
            </button>
            <Link
              to="/login"
              data-testid="try-btn"
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-[#0A0A14] text-[#F5F1EA] text-xs hover:bg-black"
            >
              Testar grátis <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ============== HERO ============== */}
      <Section className="pt-16 md:pt-24 pb-20 md:pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="inline-flex items-center gap-2 px-3 h-7 rounded-full border border-black/10 bg-white/60 text-[11px] uppercase tracking-widest text-black/60">
              <Sparkles className="h-3 w-3" /> Software brasileiro · pt-BR · PIX nativo
            </motion.div>
            <motion.h1
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}
              className="mt-6 font-display font-light tracking-tight text-5xl md:text-6xl lg:text-7xl leading-[1.02]"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              Sua PME rodando em <span className="italic">piloto automático</span>.
            </motion.h1>
            <motion.p
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={2}
              className="mt-6 text-lg md:text-xl text-black/70 max-w-2xl leading-relaxed"
            >
              CRM, WhatsApp, Ordem de Serviço, Financeiro, Projetos e IA em um só painel.
              Do primeiro contato ao PIX cair, sem trocar de aba.
            </motion.p>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={3} className="mt-10 flex items-center gap-3 flex-wrap">
              <Link to="/login" data-testid="hero-cta" className="inline-flex items-center gap-2 h-12 px-6 rounded-md bg-[#0A0A14] text-[#F5F1EA] text-sm hover:bg-black transition-colors">
                Testar 30 dias grátis <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#comparativo" className="inline-flex items-center gap-2 h-12 px-6 rounded-md border border-black/15 bg-white/40 hover:bg-white text-sm">
                Ver comparativo
              </a>
              <div className="flex items-center gap-2 text-xs text-black/50 ml-2">
                <ShieldCheck className="h-3.5 w-3.5" /> Free vitalício · sem cartão
              </div>
            </motion.div>
          </div>

          {/* Right — floating product cards */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-5 relative h-[420px]"
          >
            {/* Grain background */}
            <div className="absolute inset-0 rounded-2xl bg-[#0A0A14] overflow-hidden">
              <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(#F5F1EA 1px, transparent 1px)", backgroundSize: "5px 5px" }} />
              {/* Copiloto card */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-6 left-6 w-64 rounded-lg bg-white shadow-xl border border-black/10 p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Bot className="h-3.5 w-3.5" />
                  <div className="text-[10px] uppercase tracking-widest text-black/50">Copiloto Prisma</div>
                </div>
                <div className="text-sm">"Gere uma proposta para a Padaria Bella."</div>
                <div className="mt-3 h-1 bg-black/5 rounded overflow-hidden">
                  <motion.div animate={{ width: ["10%", "85%"] }} transition={{ duration: 3, repeat: Infinity }} className="h-full bg-[#0A0A14]" />
                </div>
              </motion.div>
              {/* OS card */}
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute bottom-8 right-6 w-72 rounded-lg bg-white shadow-xl border border-black/10 p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] uppercase tracking-widest text-black/50">OS · aprovada</div>
                  <div className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">Assinada</div>
                </div>
                <div className="font-display text-base">Website Bella</div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-xs text-black/50">Padaria Bella</div>
                  <div className="font-mono text-sm">R$ 4.500,00</div>
                </div>
                <button className="mt-3 w-full h-8 rounded-md bg-emerald-600 text-white text-xs flex items-center justify-center gap-1.5">
                  <CreditCard className="h-3 w-3" /> Pagar via PIX
                </button>
              </motion.div>
              {/* Small floating badges */}
              <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 5, repeat: Infinity, delay: 0.5 }} className="absolute top-40 right-10 h-10 w-10 rounded-full bg-[#F5F1EA] shadow-lg flex items-center justify-center">
                <MessageCircle className="h-4 w-4" />
              </motion.div>
              <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 4, repeat: Infinity, delay: 1.2 }} className="absolute bottom-40 left-16 h-10 w-10 rounded-full bg-[#F5F1EA] shadow-lg flex items-center justify-center">
                <Zap className="h-4 w-4" />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* Marquee of pain points */}
      <div className="border-y border-black/10 bg-white/40 py-4 overflow-hidden print:hidden">
        <div className="flex gap-16 animate-marquee whitespace-nowrap text-sm text-black/60">
          {["Planilha para tudo", "5 apps abertos ao mesmo tempo", "Cobrança esquecida", "Proposta em Word", "WhatsApp misturado com pessoal", "Sem histórico do cliente"].concat(["Planilha para tudo","5 apps abertos ao mesmo tempo","Cobrança esquecida","Proposta em Word","WhatsApp misturado com pessoal","Sem histórico do cliente"]).map((t, i) => (
            <span key={i} className="flex items-center gap-2"><X className="h-3.5 w-3.5 text-red-500" /> {t}</span>
          ))}
        </div>
      </div>

      {/* ============== PROBLEMA → SOLUÇÃO ============== */}
      <Section className="py-20 md:py-28">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
          <div>
            <div className="overline text-black/50 mb-4">O problema</div>
            <h2 className="font-display font-light text-3xl md:text-4xl tracking-tight leading-tight" style={{ fontFamily: "'Fraunces', serif" }}>
              PMEs perdem <span className="italic">horas por dia</span> pulando entre planilhas, WhatsApp e cobranças manuais.
            </h2>
            <ul className="mt-6 space-y-3 text-black/70">
              {["Lead veio pelo WhatsApp, mas o CRM não sabe.", "Proposta foi por e-mail. Cobrança, esquecida.", "Cronograma no Trello, financeiro no Excel, docs no Drive.", "Ninguém sabe quanto tempo foi gasto em qual cliente."].map((t) => (
                <li key={t} className="flex items-start gap-2"><X className="h-4 w-4 text-red-500 mt-0.5 shrink-0" /><span>{t}</span></li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-[#0A0A14] text-[#F5F1EA] p-8 md:p-10">
            <div className="overline text-white/50 mb-4">A solução</div>
            <h3 className="font-display font-light text-3xl md:text-4xl tracking-tight leading-tight" style={{ fontFamily: "'Fraunces', serif" }}>
              Um só painel. IA nativa. PIX embutido.
            </h3>
            <ul className="mt-6 space-y-3 text-white/80">
              {["Lead entra pelo WhatsApp e vira card no CRM em 1 clique.", "OS gerada por IA vai por WhatsApp+e-mail com link de assinatura e PIX.", "Cliente assina em 30 segundos. PIX cai. Projeto abre automático.", "Copiloto gera relatórios, propostas e organiza tarefas por você."].map((t) => (
                <li key={t} className="flex items-start gap-2"><Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" /><span>{t}</span></li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* ============== MÓDULOS ============== */}
      <Section id="modulos" className="py-20 md:py-28">
        <div className="max-w-3xl">
          <div className="overline text-black/50 mb-3">8 módulos, 1 login</div>
          <h2 className="font-display font-light text-3xl md:text-5xl tracking-tight leading-tight" style={{ fontFamily: "'Fraunces', serif" }}>
            Tudo que sua PME precisa, <span className="italic">no mesmo painel</span>.
          </h2>
        </div>
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {MODULES.map(({ icon: Icon, name, desc }, i) => (
            <motion.div
              key={name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05, duration: 0.5 }}
              className="rounded-xl border border-black/10 bg-white p-5 hover:border-black/30 transition-colors"
            >
              <div className="h-10 w-10 rounded-md bg-[#F5F1EA] flex items-center justify-center mb-4">
                <Icon className="h-4 w-4" />
              </div>
              <div className="font-display text-lg">{name}</div>
              <div className="mt-1 text-xs text-black/60 leading-relaxed">{desc}</div>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ============== FLUXO NARRATIVO ============== */}
      <Section id="fluxo" className="py-20 md:py-28">
        <div className="max-w-3xl">
          <div className="overline text-black/50 mb-3">Do primeiro "olá" ao PIX cair</div>
          <h2 className="font-display font-light text-3xl md:text-5xl tracking-tight leading-tight" style={{ fontFamily: "'Fraunces', serif" }}>
            <span className="italic">7 minutos</span> do lead ao pagamento.
          </h2>
        </div>
        <div className="mt-14 relative">
          <div className="hidden md:block absolute left-8 top-0 bottom-0 w-px bg-black/10" />
          <div className="space-y-10 md:space-y-14">
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
                transition={{ delay: i * 0.08, duration: 0.6 }}
                className="flex gap-6 items-start"
              >
                <div className="relative">
                  <div className="h-16 w-16 rounded-xl bg-[#0A0A14] text-[#F5F1EA] flex items-center justify-center shrink-0">
                    <step.icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="flex-1 pt-1">
                  <div className="text-[10px] uppercase tracking-widest text-black/40">{step.tag}</div>
                  <div className="font-display text-xl md:text-2xl mt-1">{step.t}</div>
                  <div className="mt-2 text-black/60 max-w-xl">{step.d}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ============== STATS ============== */}
      <Section className="py-20 md:py-28">
        <div className="rounded-2xl bg-[#0A0A14] text-[#F5F1EA] p-8 md:p-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
              >
                <div className="font-display font-light text-5xl md:text-6xl leading-none" style={{ fontFamily: "'Fraunces', serif" }}>{s.n}</div>
                <div className="mt-3 text-sm text-white/80">{s.label}</div>
                <div className="text-xs text-white/50 mt-1">{s.note}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ============== COMPARATIVO ============== */}
      <Section id="comparativo" className="py-20 md:py-28">
        <div className="max-w-3xl">
          <div className="overline text-black/50 mb-3">Comparativo honesto</div>
          <h2 className="font-display font-light text-3xl md:text-5xl tracking-tight leading-tight" style={{ fontFamily: "'Fraunces', serif" }}>
            Feito para PMEs <span className="italic">brasileiras</span>.
          </h2>
          <p className="mt-3 text-black/60">Monday e ClickUp são ótimos para times grandes gringos. Pipedrive é um bom CRM. Prisma é o único que roda o negócio inteiro em português, com PIX e WhatsApp de verdade.</p>
        </div>
        <div className="mt-10 rounded-xl border border-black/10 overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead className="bg-[#F5F1EA]">
              <tr className="text-left">
                <th className="p-4 font-medium text-[11px] uppercase tracking-widest text-black/50">Recurso</th>
                <th className="p-4 text-center font-medium">Prisma</th>
                <th className="p-4 text-center font-medium text-black/60">Monday</th>
                <th className="p-4 text-center font-medium text-black/60">ClickUp</th>
                <th className="p-4 text-center font-medium text-black/60">Pipedrive</th>
              </tr>
            </thead>
            <tbody>
              {COMP_ROWS.map((r, i) => (
                <tr key={i} className="border-t border-black/5">
                  <td className="p-4 text-black/80">{r.f}</td>
                  {[r.p, r.m, r.c, r.o].map((v, j) => (
                    <td key={j} className="p-4 text-center">
                      {v === true && <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-emerald-100 text-emerald-700"><Check className="h-3.5 w-3.5" /></span>}
                      {v === false && <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-black/5 text-black/30"><X className="h-3.5 w-3.5" /></span>}
                      {typeof v === "string" && <span className="text-[11px] px-2 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700">{v}</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ============== DEPOIMENTOS ============== */}
      <Section id="clientes" className="py-20 md:py-28">
        <div className="max-w-3xl">
          <div className="overline text-black/50 mb-3">Quem já usa</div>
          <h2 className="font-display font-light text-3xl md:text-5xl tracking-tight leading-tight" style={{ fontFamily: "'Fraunces', serif" }}>
            PMEs reais. Resultados <span className="italic">reais</span>.
          </h2>
        </div>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          {TESTIMONIALS.map((t, i) => (
            <motion.blockquote
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              className="rounded-xl border border-black/10 bg-white p-6 flex flex-col"
            >
              <div className="text-3xl leading-none text-black/20" style={{ fontFamily: "'Fraunces', serif" }}>&ldquo;</div>
              <p className="mt-2 text-sm text-black/80 leading-relaxed flex-1">{t.quote}</p>
              <footer className="mt-6 pt-4 border-t border-black/5">
                <div className="font-medium text-sm">{t.author}</div>
                <div className="text-xs text-black/50">{t.role}</div>
              </footer>
            </motion.blockquote>
          ))}
        </div>
      </Section>

      {/* ============== PRICING ============== */}
      <Section id="planos" className="py-20 md:py-28">
        <div className="max-w-3xl">
          <div className="overline text-black/50 mb-3">Planos simples · em Reais</div>
          <h2 className="font-display font-light text-3xl md:text-5xl tracking-tight leading-tight" style={{ fontFamily: "'Fraunces', serif" }}>
            Comece grátis. Cresça <span className="italic">quando fizer sentido</span>.
          </h2>
        </div>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((p, i) => (
            <div
              key={p.name}
              className={`rounded-xl p-6 border relative ${p.highlight ? "bg-[#0A0A14] text-[#F5F1EA] border-transparent" : "bg-white border-black/10"}`}
            >
              {p.highlight && (
                <div className="absolute -top-3 left-6 text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full bg-[#F5F1EA] text-[#0A0A14]">Recomendado</div>
              )}
              <div className="font-display text-xl">{p.name}</div>
              <div className="mt-3 flex items-baseline gap-1">
                <div className="font-display text-4xl" style={{ fontFamily: "'Fraunces', serif" }}>{p.price}</div>
                <div className={`text-xs ${p.highlight ? "text-white/60" : "text-black/50"}`}>{p.period}</div>
              </div>
              <ul className="mt-5 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2 items-start">
                    <Check className={`h-4 w-4 mt-0.5 shrink-0 ${p.highlight ? "text-emerald-400" : "text-emerald-600"}`} />
                    <span className={p.highlight ? "text-white/85" : "text-black/70"}>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-xl border-2 border-dashed border-[#0A0A14] bg-white p-6 flex items-center gap-4 flex-wrap justify-between">
          <div>
            <div className="overline text-black/50 mb-1">Founder Deal · vagas limitadas</div>
            <div className="font-display text-2xl">R$ 4.997 <span className="text-sm text-black/50">à vista · 3 anos de Growth</span></div>
            <div className="text-xs text-black/60 mt-1">Trave o preço agora. Depois vira Growth normal após 36 meses.</div>
          </div>
          <Link to="/#precos" className="inline-flex items-center gap-2 h-11 px-5 rounded-md bg-[#0A0A14] text-[#F5F1EA] text-sm hover:bg-black">
            Reservar minha vaga <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Section>

      {/* ============== CTA FINAL ============== */}
      <Section className="pb-24">
        <div className="rounded-2xl bg-[#0A0A14] text-[#F5F1EA] p-10 md:p-16 relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(#F5F1EA 1px, transparent 1px)", backgroundSize: "6px 6px" }} />
          <div className="relative">
            <div className="max-w-2xl">
              <h2 className="font-display font-light text-3xl md:text-5xl leading-tight" style={{ fontFamily: "'Fraunces', serif" }}>
                Sua PME merece <span className="italic">rodar sozinha</span>.
              </h2>
              <p className="mt-4 text-white/70 md:text-lg">Teste 30 dias grátis. Se não gostar, é só sair. Se gostar, você não larga mais.</p>
            </div>
            <div className="mt-10 flex items-center gap-3 flex-wrap">
              <Link to="/login" data-testid="cta-final-btn" className="inline-flex items-center gap-2 h-12 px-6 rounded-md bg-[#F5F1EA] text-[#0A0A14] text-sm hover:bg-white transition-colors">
                Começar agora <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="mailto:vendas@prisma.com.br" className="inline-flex items-center gap-2 h-12 px-6 rounded-md border border-white/20 text-white/80 text-sm hover:bg-white/10">
                Falar com o fundador
              </a>
              <button onClick={() => window.print()} className="hidden sm:inline-flex items-center gap-2 h-12 px-6 rounded-md border border-white/20 text-white/80 text-sm hover:bg-white/10">
                <Download className="h-4 w-4" /> Baixar PDF
              </button>
            </div>
          </div>
        </div>
      </Section>

      {/* Footer */}
      <footer className="border-t border-black/10 py-10 text-center text-xs text-black/40">
        <div className="max-w-6xl mx-auto px-6 md:px-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo className="h-6 w-6" />
            <span className="italic text-sm text-black/60" style={{ fontFamily: "'Fraunces', serif" }}>Prisma</span>
            <span>· painel de controle da PME</span>
          </div>
          <div>Feito no Brasil · pt-BR · {new Date().getFullYear()}</div>
        </div>
      </footer>

      <style>{`
        @keyframes marquee { 0% { transform: translateX(0) } 100% { transform: translateX(-50%) } }
        .animate-marquee { animation: marquee 40s linear infinite; }
        .overline { font-size: 10px; text-transform: uppercase; letter-spacing: .18em; }
        .font-display { font-family: 'Fraunces', serif; }

        @media print {
          @page { size: A4; margin: 12mm; }
          html, body { background: #F5F1EA !important; }
          .print\\:hidden { display: none !important; }
          .section-block { padding-top: 24px !important; padding-bottom: 24px !important; page-break-inside: avoid; }
          h1, h2 { page-break-after: avoid; }
          a[href^="http"]::after { content: "" !important; }
          .rounded-2xl, .rounded-xl { break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
