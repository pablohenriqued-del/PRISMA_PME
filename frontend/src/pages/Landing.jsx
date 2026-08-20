import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import {
  ArrowRight, Sparkles, Check, MessageCircle, Users2, ClipboardList, Kanban,
  Wallet, FileText, Zap, Bot, ShieldCheck, CreditCard, Star, Command, Play,
} from "lucide-react";

const MODULES = [
  { icon: Users2, name: "CRM", desc: "Kanban de leads, drag-and-drop." },
  { icon: MessageCircle, name: "WhatsApp", desc: "Inbox real via Twilio." },
  { icon: ClipboardList, name: "Ordem de Serviço", desc: "OS + assinatura + PIX." },
  { icon: Kanban, name: "Projetos", desc: "Kanban · Lista · Calendário · Gantt." },
  { icon: Wallet, name: "Financeiro", desc: "Fluxo de caixa + cobrança PIX." },
  { icon: FileText, name: "Documentos", desc: "Propostas geradas por IA." },
  { icon: Zap, name: "Automações", desc: "Motor quando/então nativo." },
  { icon: Bot, name: "Copiloto IA", desc: "Tarefas, propostas, relatórios." },
];

const PLANS = [
  { key: "free", name: "Free", monthly: 0, tag: "Grátis pra sempre", cta: "Começar grátis",
    features: ["1 usuário", "CRM até 50 leads", "Copiloto 50 msgs/mês"] },
  { key: "starter", name: "Starter", monthly: 297, tag: "Solopreneur", cta: "Testar 30 dias",
    features: ["1 usuário", "CRM ilimitado", "Copiloto 500 msgs/mês", "Documentos 2 GB"],
    lookup: "prisma_starter_monthly" },
  { key: "growth", name: "Growth", monthly: 897, tag: "Recomendado", cta: "Testar 30 dias", highlight: true,
    features: ["Até 5 usuários", "WhatsApp real (Twilio)", "Copiloto ilimitado", "Automações ilimitadas"],
    lookup: "prisma_growth_monthly" },
  { key: "business", name: "Business", monthly: 2997, tag: "Times crescendo", cta: "Assinar Business",
    features: ["Usuários ilimitados", "SLA 4h", "Onboarding assistido", "API pública"],
    lookup: "prisma_business_monthly" },
];

const TESTIMONIALS = [
  { quote: "Substituí Trello, Pipedrive e uma agência de cobrança. Financeiro fecha em 2h.", author: "Marina Alves", role: "Padaria Bella · SP" },
  { quote: "Cliente assinou e pagou em 40 minutos pelo WhatsApp. Nunca vi isso.", author: "Ricardo Meira", role: "Estúdio 12 · RJ" },
  { quote: "O Copiloto gera relatório mensal em 8 segundos. Antes, meio dia.", author: "Camila Prado", role: "Contábil Prado · MG" },
  { quote: "PIX cai antes do café. Sério.", author: "Bruno Rocha", role: "Marmoraria Rocha · SC" },
];

const Logo = ({ className = "h-8 w-8" }) => (
  <div className={`${className} rounded-lg bg-gradient-to-br from-[#5E6AD2] to-[#8B5CF6] flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(94,106,210,0.5)]`}>
    <svg viewBox="0 0 44 44" fill="none" className="w-3/5 h-3/5"><path d="M22 4 L40 34 L4 34 Z" fill="white" strokeLinejoin="round"/></svg>
  </div>
);

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [founder, setFounder] = useState({ cap: 100, claimed: 0, remaining: 100 });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll);
    api.get("/public/founder-deal").then((r) => setFounder(r.data)).catch(() => {});
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const primaryCta = () => user ? navigate("/app") : navigate("/login");

  const startCheckout = async (lookup, opts = {}) => {
    try {
      const r = await api.post("/payments/checkout", { lookup_key: lookup, origin_url: window.location.origin, trial_days: opts.trial_days || 0 });
      window.location.href = r.data.checkout_url;
    } catch (e) { alert(e?.response?.data?.detail || "Falha ao iniciar checkout"); primaryCta(); }
  };
  const clickPlanCta = (p) => p.lookup ? startCheckout(p.lookup, { trial_days: 30 }) : primaryCta();
  const clickFounderCta = () => startCheckout("prisma_founder_deal");
  const founderPct = Math.min(100, Math.round((founder.claimed / (founder.cap || 100)) * 100));

  return (
    <div className="min-h-screen bg-[#08090A] text-zinc-100 antialiased overflow-x-hidden" data-testid="landing-page">
      {/* ============= NAV ============= */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-colors duration-300 ${scrolled ? "glass-nav" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo className="h-8 w-8" />
            <span className="font-display text-lg font-semibold tracking-tight">Prisma</span>
            <span className="hidden md:inline text-[10px] font-mono uppercase tracking-widest text-zinc-500 ml-1">v1.4</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-zinc-400">
            <a href="#modulos" className="hover:text-white transition-colors">Módulos</a>
            <a href="#precos" className="hover:text-white transition-colors">Preços</a>
            <a href="#clientes" className="hover:text-white transition-colors">Clientes</a>
            <Link to="/apresentacao" className="hover:text-white transition-colors">Apresentação</Link>
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <button data-testid="nav-app-btn" onClick={() => navigate("/app")} className="btn-primary">Abrir app <ArrowRight className="h-4 w-4" /></button>
            ) : (
              <>
                <Link to="/login" className="text-sm text-zinc-400 hover:text-white px-3 py-2 transition-colors" data-testid="nav-login">Entrar</Link>
                <button data-testid="nav-start-btn" onClick={primaryCta} className="btn-primary">Começar grátis <ArrowRight className="h-4 w-4" /></button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ============= HERO ============= */}
      <section className="relative pt-40 pb-32 bg-mesh noise-bg">
        <div className="max-w-6xl mx-auto px-6 relative">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="inline-flex items-center gap-2 h-8 px-3 rounded-full border border-white/10 bg-[#121214]/[0.03] text-[11px] font-mono uppercase tracking-widest text-zinc-400 mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Software brasileiro · IA nativa · PIX embutido
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }} className="font-display text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-semibold leading-[1.02] tracking-tight max-w-5xl">
            Sua PME rodando em <span className="text-gradient-brand">piloto automático</span>.
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="mt-8 text-lg md:text-xl text-zinc-400 max-w-2xl leading-relaxed">
            CRM, WhatsApp, Ordem de Serviço, Financeiro, Projetos e IA no mesmo painel.
            Do primeiro contato ao PIX cair, sem trocar de aba.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }} className="mt-10 flex items-center gap-3 flex-wrap">
            <button data-testid="hero-cta" onClick={primaryCta} className="btn-primary text-base h-12 px-6">Começar grátis <ArrowRight className="h-4 w-4" /></button>
            <a href="#fluxo" className="btn-secondary text-base h-12 px-6"><Play className="h-3.5 w-3.5" /> Ver como funciona</a>
            <div className="flex items-center gap-2 text-xs text-zinc-500 ml-2">
              <ShieldCheck className="h-3.5 w-3.5" /> Free vitalício · sem cartão
            </div>
          </motion.div>

          {/* Dashboard mockup */}
          <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.5 }} className="mt-20 relative">
            <div className="absolute -inset-x-20 -bottom-20 h-[400px] bg-gradient-to-t from-[#08090A] to-transparent z-10 pointer-events-none" />
            <div className="rounded-2xl border border-white/10 bg-[#0F0F12] shadow-[0_0_120px_rgba(94,106,210,0.15)] overflow-hidden">
              {/* Fake window chrome */}
              <div className="h-9 flex items-center gap-1.5 px-4 border-b border-white/5 bg-black/40">
                <span className="h-2.5 w-2.5 rounded-full bg-[#121214]/10" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#121214]/10" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#121214]/10" />
                <span className="ml-4 text-[11px] font-mono text-zinc-500">prisma.com.br/app</span>
              </div>
              <div className="grid grid-cols-12 min-h-[380px]">
                {/* Sidebar */}
                <div className="col-span-2 border-r border-white/5 bg-black/20 p-3 space-y-1">
                  {["Dashboard", "CRM", "OS", "WhatsApp", "Projetos", "Financeiro"].map((n, i) => (
                    <div key={n} className={`text-xs px-2.5 py-1.5 rounded flex items-center gap-2 ${i === 0 ? "bg-[#121214]/5 text-white" : "text-zinc-500"}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" /> {n}
                    </div>
                  ))}
                </div>
                {/* Main */}
                <div className="col-span-10 p-6">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">Dashboard</div>
                  <div className="text-2xl font-display font-medium mb-6">Boa tarde, Pablo</div>
                  <div className="grid grid-cols-4 gap-3 mb-6">
                    {[["Leads", "42", "+12%"], ["OS ativas", "8", "R$ 34k"], ["Faturado", "R$ 128k", "mês"], ["Tarefas", "17", "vencendo"]].map(([l, v, s]) => (
                      <div key={l} className="rounded-lg border border-white/5 bg-[#121214]/[0.02] p-3">
                        <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{l}</div>
                        <div className="text-lg font-display font-semibold mt-1">{v}</div>
                        <div className="text-[10px] text-emerald-400 mt-0.5">{s}</div>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-lg border border-white/5 bg-[#121214]/[0.02] h-40 relative overflow-hidden">
                    <svg viewBox="0 0 400 100" className="w-full h-full">
                      <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5E6AD2" stopOpacity="0.5"/><stop offset="1" stopColor="#5E6AD2" stopOpacity="0"/></linearGradient></defs>
                      <path d="M0,80 Q50,60 100,50 T200,30 T300,20 T400,10 L400,100 L0,100 Z" fill="url(#g1)"/>
                      <path d="M0,80 Q50,60 100,50 T200,30 T300,20 T400,10" stroke="#8B5CF6" strokeWidth="1.5" fill="none"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============= LOGOS MARQUEE ============= */}
      <section className="py-10 border-y border-white/5">
        <div className="text-center overline mb-6">Confiado por PMEs em todo o Brasil</div>
        <div className="marquee opacity-40">
          {[...Array(2)].flatMap((_, k) => ["Padaria Bella", "Estúdio 12", "Marmoraria Rocha", "Contábil Prado", "Ateliê Sofia", "Autoescola Rio", "Clínica Vitalis", "Advocacia Meira"].map((n, i) => (
            <span key={`${k}-${i}`} className="text-lg font-display font-medium text-zinc-500 whitespace-nowrap">{n}</span>
          )))}
        </div>
      </section>

      {/* ============= BENTO MODULES ============= */}
      <section id="modulos" className="max-w-6xl mx-auto px-6 py-24 md:py-32">
        <div className="overline mb-3">8 módulos · 1 login</div>
        <h2 className="font-display text-4xl md:text-5xl font-semibold tracking-tight max-w-3xl text-gradient">
          Tudo o que sua PME precisa,<br/>no mesmo painel.
        </h2>

        <div className="mt-14 grid grid-cols-12 gap-4">
          {/* CRM big */}
          <div className="col-span-12 md:col-span-6 row-span-2 card-bento p-8 relative overflow-hidden group" data-testid="bento-crm">
            <div className="absolute right-6 top-6"><Users2 className="h-5 w-5 text-[#5E6AD2]" /></div>
            <div className="overline">CRM</div>
            <h3 className="font-display text-3xl mt-3 tracking-tight">Leads em kanban.<br/>Fechados em minutos.</h3>
            <p className="text-zinc-400 mt-3 text-sm max-w-md">Drag-and-drop, telefone em E.164, histórico completo do cliente. WhatsApp integrado.</p>
            {/* Mini kanban */}
            <div className="mt-8 grid grid-cols-3 gap-2">
              {[["Novo", 4], ["Negociando", 3], ["Fechado", 5]].map(([n, c]) => (
                <div key={n} className="rounded-lg border border-white/5 bg-[#121214]/[0.02] p-2">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 flex items-center justify-between mb-2">{n}<span>{c}</span></div>
                  <div className="space-y-1.5">
                    {[...Array(c)].map((_, i) => (
                      <div key={i} className="h-6 rounded bg-[#121214]/[0.03] border border-white/5" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* WhatsApp */}
          <div className="col-span-12 md:col-span-6 card-bento p-8 relative overflow-hidden" data-testid="bento-whatsapp">
            <div className="absolute right-6 top-6"><MessageCircle className="h-5 w-5 text-emerald-400" /></div>
            <div className="overline">WhatsApp</div>
            <h3 className="font-display text-2xl mt-3 tracking-tight">Inbox único.<br/>Copiloto responde.</h3>
            <div className="mt-6 space-y-2">
              <div className="rounded-lg bg-[#121214]/[0.03] p-3 max-w-[70%]">
                <div className="text-[10px] text-zinc-500 mb-1">Cliente · agora</div>
                <div className="text-sm">Oi, tudo bem? Quanto sai um site?</div>
              </div>
              <div className="rounded-lg bg-gradient-to-br from-[#5E6AD2]/20 to-[#8B5CF6]/20 border border-[#5E6AD2]/30 p-3 max-w-[70%] ml-auto">
                <div className="text-[10px] text-[#8B5CF6] mb-1 font-mono">COPILOTO</div>
                <div className="text-sm">Enviei uma proposta com PIX. Assine em 30s: prisma.com.br/os/…</div>
              </div>
            </div>
          </div>

          {/* Copiloto */}
          <div className="col-span-12 md:col-span-6 card-bento p-8 relative" data-testid="bento-copilot">
            <div className="absolute right-6 top-6"><Sparkles className="h-5 w-5 text-[#8B5CF6]" /></div>
            <div className="overline">Copiloto IA</div>
            <h3 className="font-display text-2xl mt-3 tracking-tight">Fale. Ele executa.</h3>
            <p className="text-zinc-400 mt-3 text-sm">"Gere uma proposta para a Padaria Bella cobrando R$ 4.500." Pronto.</p>
            <div className="mt-6 rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-[11px] text-zinc-400">
              <span className="text-[#8B5CF6]">$</span> gerar proposta padaria bella 4500<br/>
              <span className="text-emerald-400">✓</span> proposta.md salva em Documentos<br/>
              <span className="text-emerald-400">✓</span> link do portal enviado por WhatsApp
            </div>
          </div>

          {/* OS + PIX */}
          <div className="col-span-12 md:col-span-6 card-bento p-8 relative overflow-hidden" data-testid="bento-os">
            <div className="absolute right-6 top-6"><ClipboardList className="h-5 w-5 text-amber-400" /></div>
            <div className="overline">Ordem de Serviço + PIX</div>
            <h3 className="font-display text-2xl mt-3 tracking-tight">Do orçamento ao PIX.<br/>7 minutos.</h3>
            <div className="mt-6 flex items-center gap-2 flex-wrap">
              {["Lead", "OS", "Assinatura", "PIX", "Projeto"].map((s, i) => (
                <React.Fragment key={s}>
                  <div className="text-[11px] font-mono px-2 py-1 rounded bg-[#121214]/5 border border-white/10">{s}</div>
                  {i < 4 && <ArrowRight className="h-3 w-3 text-zinc-600" />}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* small tiles */}
          {[
            { icon: Kanban, name: "Projetos", desc: "4 views: Kanban · Lista · Calendário · Gantt", color: "text-cyan-400" },
            { icon: Wallet, name: "Financeiro", desc: "Fluxo de caixa + cobrança PIX recorrente", color: "text-emerald-400" },
            { icon: FileText, name: "Documentos", desc: "Propostas e relatórios gerados por IA", color: "text-zinc-300" },
            { icon: Zap, name: "Automações", desc: "Motor quando/então nativo", color: "text-amber-400" },
          ].map((m) => (
            <div key={m.name} className="col-span-12 sm:col-span-6 md:col-span-3 card-bento p-6" data-testid={`bento-${m.name.toLowerCase()}`}>
              <m.icon className={`h-4 w-4 ${m.color}`} />
              <div className="font-display font-medium mt-3">{m.name}</div>
              <div className="text-xs text-zinc-500 mt-1">{m.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ============= FLUXO ============= */}
      <section id="fluxo" className="border-y border-white/5 py-24 md:py-32 bg-mesh-soft">
        <div className="max-w-6xl mx-auto px-6">
          <div className="overline mb-3">Como funciona</div>
          <h2 className="font-display text-4xl md:text-5xl font-semibold tracking-tight max-w-3xl text-gradient">Em 3 passos, do lead ao caixa.</h2>
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { n: "01", t: "Cliente chega no WhatsApp", d: "Vira card no CRM. Copiloto lê o histórico e sugere a proposta." },
              { n: "02", t: "OS enviada em 1 clique", d: "E-mail + WhatsApp com portal de assinatura e PIX embutido." },
              { n: "03", t: "Cliente assina e paga", d: "Assinatura eletrônica (Lei 14.063). PIX cai. Projeto abre sozinho." },
            ].map((s) => (
              <div key={s.n} className="card-bento p-8">
                <div className="font-mono text-xs text-[#5E6AD2]">{s.n}</div>
                <h3 className="font-display text-xl mt-3 tracking-tight">{s.t}</h3>
                <p className="text-zinc-400 text-sm mt-2 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============= NUMBERS ============= */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[["24h", "por semana", "menos planilha"], ["3×", "para fechar", "OS + PIX no mesmo link"], ["7min", "lead → PIX", "IA + assinatura embutida"], ["R$ 0", "para começar", "30 dias grátis"]].map(([n, l, s]) => (
            <div key={n} className="card-bento p-6">
              <div className="font-display text-4xl md:text-5xl font-semibold text-gradient">{n}</div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mt-3">{l}</div>
              <div className="text-sm text-zinc-400 mt-1">{s}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ============= TESTIMONIALS ============= */}
      <section id="clientes" className="max-w-6xl mx-auto px-6 py-24">
        <div className="overline mb-3">Quem já usa</div>
        <h2 className="font-display text-4xl md:text-5xl font-semibold tracking-tight text-gradient max-w-3xl">PMEs reais. Resultados reais.</h2>
        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {TESTIMONIALS.map((t, i) => (
            <motion.blockquote key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05, duration: 0.6 }} className="card-bento p-6 flex flex-col">
              <div className="flex gap-0.5">{[...Array(5)].map((_, k) => <Star key={k} className="h-3 w-3 fill-amber-400 text-amber-400" />)}</div>
              <p className="mt-4 text-sm text-zinc-300 leading-relaxed flex-1">"{t.quote}"</p>
              <footer className="mt-6 pt-4 border-t border-white/5 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#5E6AD2] to-[#8B5CF6] flex items-center justify-center text-xs font-semibold text-white">{t.author.split(" ").map(w => w[0]).join("").slice(0, 2)}</div>
                <div>
                  <div className="text-xs font-medium">{t.author}</div>
                  <div className="text-[10px] text-zinc-500">{t.role}</div>
                </div>
              </footer>
            </motion.blockquote>
          ))}
        </div>
      </section>

      {/* ============= PRICING ============= */}
      <section id="precos" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center max-w-3xl mx-auto">
          <div className="overline mb-3">Planos · em Reais</div>
          <h2 className="font-display text-4xl md:text-5xl font-semibold tracking-tight text-gradient">Comece grátis. Cresça depois.</h2>
          <p className="mt-4 text-zinc-400">Sem pegadinha, sem lockin. 30 dias para testar tudo.</p>
        </div>
        <div className="mt-14 grid grid-cols-1 md:grid-cols-4 gap-4">
          {PLANS.map((p) => (
            <div key={p.key} data-testid={`plan-${p.key}`} className={`rounded-2xl p-6 relative ${p.highlight ? "bg-gradient-to-b from-[#1a1b3a] to-[#0F0F12] border border-[#5E6AD2] glow-primary" : "card-bento"}`}>
              {p.highlight && <div className="absolute -top-3 left-6 text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-full bg-gradient-to-r from-[#5E6AD2] to-[#8B5CF6]">Recomendado</div>}
              <div className="text-[11px] font-mono uppercase tracking-widest text-zinc-500">{p.tag}</div>
              <h3 className="font-display text-2xl mt-2">{p.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="font-display text-4xl font-semibold">R$ {p.monthly}</span>
                {p.monthly > 0 && <span className="text-zinc-500 text-sm">/mês</span>}
              </div>
              <ul className="mt-6 space-y-2 text-sm min-h-[130px]">
                {p.features.map((f) => (<li key={f} className="flex gap-2"><Check className={`h-4 w-4 mt-0.5 shrink-0 ${p.highlight ? "text-[#8B5CF6]" : "text-emerald-400"}`} /><span className="text-zinc-300">{f}</span></li>))}
              </ul>
              <button onClick={() => clickPlanCta(p)} data-testid={`plan-cta-${p.key}`} className={`mt-6 w-full ${p.highlight ? "btn-primary" : "btn-secondary"} justify-center`}>{p.cta}</button>
            </div>
          ))}
        </div>

        {/* Founder Deal */}
        <div className="mt-6 rounded-2xl border-2 border-dashed border-amber-500/40 bg-gradient-to-br from-amber-500/[0.05] to-transparent p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-6" data-testid="founder-deal-card">
          <div className="flex-1">
            <div className="text-[11px] font-mono uppercase tracking-widest text-amber-400 mb-2">Founder Deal · vagas limitadas</div>
            <div className="font-display text-2xl md:text-3xl">R$ 4.997 <span className="text-sm text-zinc-500">à vista · 3 anos de Growth</span></div>
            <p className="mt-2 text-sm text-zinc-400 max-w-2xl">Trave o preço agora. Depois vira Growth normal em 36 meses.</p>
            <div className="mt-3 flex items-center gap-2 text-[11px] font-mono">
              <div className="h-1 w-32 rounded-full bg-[#121214]/10 overflow-hidden"><div className="h-full bg-amber-400" style={{ width: `${founderPct}%` }} /></div>
              <span data-testid="founder-remaining" className="text-zinc-400">{founder.remaining} vagas restantes</span>
            </div>
          </div>
          <button onClick={clickFounderCta} data-testid="founder-cta" className="btn-primary text-sm h-12 px-6 whitespace-nowrap"><CreditCard className="h-4 w-4" /> Reservar via PIX</button>
        </div>
      </section>

      {/* ============= FINAL CTA ============= */}
      <section className="max-w-6xl mx-auto px-6 py-24 md:py-32">
        <div className="relative rounded-3xl overflow-hidden bg-mesh border border-white/10 p-12 md:p-20 text-center noise-bg">
          <div className="relative">
            <h2 className="font-display text-4xl md:text-6xl font-semibold tracking-tight text-gradient max-w-3xl mx-auto">Sua PME merece rodar sozinha.</h2>
            <p className="mt-6 text-zinc-400 text-lg max-w-xl mx-auto">Teste 30 dias grátis. Se não gostar, é só sair. Se gostar, você não larga mais.</p>
            <div className="mt-10 flex items-center justify-center gap-3 flex-wrap">
              <button data-testid="cta-final-btn" onClick={primaryCta} className="btn-primary text-base h-12 px-6">Começar grátis <ArrowRight className="h-4 w-4" /></button>
              <Link to="/apresentacao" className="btn-secondary text-base h-12 px-6">Ver apresentação</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-3">
            <Logo className="h-6 w-6" />
            <span className="font-display font-medium text-zinc-300">Prisma</span>
            <span>· painel de controle da PME</span>
          </div>
          <div className="flex items-center gap-6">
            <span>pablohenriqued@gmail.com</span>
            <span>(21) 97211-5110</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
