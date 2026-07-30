import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  ArrowUpRight, Check, Sparkles, MessageCircle, Users2, Wallet, Kanban,
  FileText, Zap, UserCog,
} from "lucide-react";

const SPECTRUM = ["#7C5CFF", "#E940A0", "#FF6A55", "#F5A623", "#A8D62F"];

const SHOTS = [
  { src: "/screenshots/dashboard.jpg", label: "Dashboard", desc: "Uma visão geral do dia com KPIs vivos, gráficos de receita e pipeline." },
  { src: "/screenshots/crm.jpg", label: "CRM", desc: "Kanban de leads com drag-and-drop e editor completo em um clique." },
  { src: "/screenshots/whatsapp.jpg", label: "WhatsApp", desc: "Inbox conectada ao Twilio conversando pelo número da sua empresa." },
  { src: "/screenshots/automacoes.jpg", label: "Automações", desc: "Trigger → ação, log de execuções e botão Testar em cada regra." },
];

function ScreenshotRotator() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % SHOTS.length), 4200);
    return () => clearInterval(t);
  }, []);
  const shot = SHOTS[i];
  return (
    <div className="relative">
      {/* Browser chrome */}
      <div className="rounded-xl border border-black/10 bg-white shadow-[0_40px_80px_-20px_rgba(10,10,20,0.35)] overflow-hidden">
        <div className="h-9 bg-black/[0.03] border-b border-black/10 flex items-center gap-1.5 px-4">
          <div className="h-2.5 w-2.5 rounded-full bg-black/15" />
          <div className="h-2.5 w-2.5 rounded-full bg-black/15" />
          <div className="h-2.5 w-2.5 rounded-full bg-black/15" />
          <div className="ml-4 text-[11px] font-mono text-black/40">prisma.app · {shot.label.toLowerCase()}</div>
        </div>
        <div className="relative aspect-[1600/900] bg-[#F5F1EA]">
          {SHOTS.map((s, idx) => (
            <img
              key={s.src}
              src={s.src}
              alt={`Prisma · ${s.label}`}
              data-testid={`shot-${s.label.toLowerCase()}`}
              loading={idx === 0 ? "eager" : "lazy"}
              className={`absolute inset-0 w-full h-full object-cover object-top transition-opacity duration-700 ${idx === i ? "opacity-100" : "opacity-0"}`}
            />
          ))}
        </div>
      </div>

      {/* Rotator caption + dots */}
      <div className="mt-6 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4 max-w-xl">
          <div className="overline text-black/50 w-24 shrink-0" data-testid="shot-label">{shot.label}</div>
          <div className="text-sm text-black/60">{shot.desc}</div>
        </div>
        <div className="flex items-center gap-2">
          {SHOTS.map((s, idx) => (
            <button
              key={s.src}
              onClick={() => setI(idx)}
              data-testid={`shot-dot-${idx}`}
              aria-label={`Ver ${s.label}`}
              className={`h-1.5 rounded-full transition-all ${idx === i ? "w-8 bg-[#0A0A14]" : "w-4 bg-black/20 hover:bg-black/40"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function PrismLogo({ size = 22, dark = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" aria-hidden="true">
      <path d="M22 4 L40 34 L4 34 Z" fill={dark ? "#F5F1EA" : "#0A0A14"} stroke={dark ? "#F5F1EA" : "#0A0A14"} strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}

const MODULES = [
  { icon: Sparkles, name: "Copiloto IA", desc: "Claude 4.5 contextual em cada tela. Resume, redige, sugere próximos passos." },
  { icon: Users2, name: "CRM", desc: "Kanban de leads com drag-and-drop, fields completos, pipeline visual." },
  { icon: MessageCircle, name: "WhatsApp", desc: "Inbox conectada ao Twilio. Automações mandam a primeira mensagem por você." },
  { icon: Kanban, name: "Projetos", desc: "Boards multi-projeto para times pequenos que odeiam ferramentas gigantes." },
  { icon: Wallet, name: "Financeiro", desc: "Fluxo de caixa vivo, contas a pagar/receber, faturas vencidas viram gatilho." },
  { icon: FileText, name: "Documentos", desc: "Drag-and-drop com storage gerenciado. Contratos, propostas, NFs em um lugar." },
  { icon: Zap, name: "Automações", desc: "Trigger → ação, com log de execuções. Do lead novo à cobrança semanal." },
  { icon: UserCog, name: "Equipe", desc: "Convites por e-mail com papéis. Comercial, financeiro e admin, cada um no seu lugar." },
];

const PLANS = [
  {
    name: "Starter", price: "R$ 900", per: "/mês",
    tag: "Solopreneur",
    features: ["1 usuário", "CRM + WhatsApp mock", "Copiloto 200 msgs/mês", "Documentos 1GB"],
    cta: "Começar grátis por 14 dias",
    highlight: false,
  },
  {
    name: "Growth", price: "R$ 2.500", per: "/mês",
    tag: "Recomendado",
    features: ["Até 5 usuários", "WhatsApp real (Twilio)", "Copiloto ilimitado", "Automações ilimitadas", "Documentos 20GB"],
    cta: "Assinar Growth",
    highlight: true,
  },
  {
    name: "Business", price: "R$ 6.000", per: "/mês",
    tag: "Times crescendo",
    features: ["Usuários ilimitados", "SLA de suporte", "Onboarding assistido", "API pública", "Documentos 200GB"],
    cta: "Falar com vendas",
    highlight: false,
  },
];

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll);
    const t = setInterval(() => setTick((n) => (n + 1) % MODULES.length), 1400);
    return () => { window.removeEventListener("scroll", onScroll); clearInterval(t); };
  }, []);

  const primaryCta = () => {
    if (user) navigate("/app");
    else navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[#F5F1EA] text-[#0A0A14]" data-testid="landing-page">
      {/* CHROMATIC TOP BAR */}
      <div className="fixed top-0 inset-x-0 h-[3px] z-50 flex" aria-hidden="true">
        {SPECTRUM.map((c, i) => <div key={c} style={{ background: c, flex: 1, opacity: 0.85 - i * 0.05 }} />)}
      </div>

      {/* NAV */}
      <nav className={`fixed top-[3px] inset-x-0 z-40 transition-colors ${scrolled ? "bg-[#F5F1EA]/85 backdrop-blur-xl border-b border-black/10" : ""}`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5" data-testid="nav-logo">
            <PrismLogo size={22} />
            <span className="italic text-lg" style={{ fontFamily: "'Fraunces', serif" }}>Prisma</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-black/70 ml-6">
            <a href="#modulos" className="hover:text-black transition-colors">Módulos</a>
            <a href="#manifesto" className="hover:text-black transition-colors">Manifesto</a>
            <a href="#precos" className="hover:text-black transition-colors">Preços</a>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {user ? (
              <button onClick={() => navigate("/app")} data-testid="nav-app-btn" className="h-10 px-5 rounded-md bg-[#0A0A14] text-[#F5F1EA] text-sm hover:bg-black transition-colors flex items-center gap-2">
                Abrir app <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <>
                <Link to="/login" className="text-sm text-black/70 hover:text-black transition-colors hidden sm:block" data-testid="nav-login">Entrar</Link>
                <button onClick={primaryCta} data-testid="nav-start-btn" className="h-10 px-5 rounded-md bg-[#0A0A14] text-[#F5F1EA] text-sm hover:bg-black transition-colors flex items-center gap-2">
                  Começar <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="pt-40 pb-24 lg:pt-52 lg:pb-32 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 relative">
          {/* Ambient gradient */}
          <div className="absolute -top-40 -right-20 w-[600px] h-[600px] rounded-full pointer-events-none" style={{
            background: "radial-gradient(closest-side, rgba(124,92,255,0.20), transparent 70%)",
          }} aria-hidden="true" />
          <div className="absolute top-40 -left-40 w-[500px] h-[500px] rounded-full pointer-events-none" style={{
            background: "radial-gradient(closest-side, rgba(255,106,85,0.15), transparent 70%)",
          }} aria-hidden="true" />

          <div className="relative z-10 max-w-4xl">
            <div className="overline text-black/50 mb-6">plataforma para pmes · beta</div>
            <h1 className="font-light tracking-[-0.03em] leading-[0.95]"
                style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(56px, 9vw, 132px)" }}>
              Uma luz.<br />
              <span className="italic" style={{
                backgroundImage: `linear-gradient(90deg, ${SPECTRUM.join(",")})`,
                WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
              }}>Muitas ações.</span>
            </h1>
            <p className="mt-8 text-lg text-black/70 leading-relaxed max-w-2xl">
              CRM, WhatsApp, financeiro, projetos, documentos e automações — refratados em uma única superfície onde uma IA orquestra o dia-a-dia da sua PME.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <button onClick={primaryCta} data-testid="hero-cta"
                className="group relative overflow-hidden rounded-md bg-[#0A0A14] text-[#F5F1EA] h-14 px-8 text-base flex items-center gap-3 hover:bg-black transition-colors">
                <span className="absolute left-0 right-0 bottom-0 h-[3px] flex opacity-80 group-hover:opacity-100">
                  {SPECTRUM.map((c) => <span key={c} className="flex-1" style={{ background: c }} />)}
                </span>
                Começar agora
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>
              <a href="#modulos" className="text-sm text-black/70 hover:text-black underline underline-offset-4 decoration-black/30">
                Ver módulos
              </a>
              <div className="flex items-center gap-2 text-xs text-black/50">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Sem cartão · 14 dias grátis
              </div>
            </div>
          </div>

          {/* Product mock — rotating real screenshots */}
          <div className="mt-16 lg:mt-24 relative">
            <ScreenshotRotator />
            {/* Chromatic underline shadow */}
            <div className="absolute -bottom-2 left-8 right-8 h-1 rounded-full opacity-60 flex overflow-hidden">
              {SPECTRUM.map((c) => <div key={c} style={{ background: c, flex: 1 }} />)}
            </div>
          </div>
        </div>
      </section>

      {/* MODULES */}
      <section id="modulos" className="py-24 border-t border-black/10 relative">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="max-w-3xl">
            <div className="overline text-black/50 mb-4">o que se ilumina</div>
            <h2 className="tracking-[-0.02em] leading-[1.05]" style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(40px, 5vw, 68px)" }}>
              Oito módulos. <em className="italic">Um só ritmo.</em>
            </h2>
            <p className="mt-6 text-black/70 max-w-xl">
              Cada módulo foi desenhado para resolver uma tarefa concreta — não apenas listar dados.
              O copiloto vê tudo isso ao mesmo tempo.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {MODULES.map((m, i) => {
              const isLive = i === tick;
              const c = SPECTRUM[i % SPECTRUM.length];
              return (
                <div key={m.name}
                     className="group rounded-md border border-black/10 bg-white p-6 hover:border-black/40 transition-all relative overflow-hidden"
                     data-testid={`module-${m.name.toLowerCase().replace(/\s+/g,"-")}`}>
                  <div className="absolute top-0 left-0 h-[3px] w-full transition-all"
                       style={{ background: c, opacity: isLive ? 1 : 0.35 }} />
                  <m.icon className="h-5 w-5 text-black/80" strokeWidth={1.5} />
                  <div className="mt-4 font-medium text-base" style={{ fontFamily: "'Fraunces', serif" }}>{m.name}</div>
                  <div className="mt-2 text-sm text-black/60 leading-relaxed">{m.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* MANIFESTO / Founder note */}
      <section id="manifesto" className="py-32 bg-[#0A0A14] text-white relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute -top-40 left-1/3 w-[600px] h-[600px] rounded-full" style={{
            background: "radial-gradient(closest-side, rgba(233,64,160,0.25), transparent 70%)",
          }} />
          <div className="absolute -bottom-40 right-1/4 w-[500px] h-[500px] rounded-full" style={{
            background: "radial-gradient(closest-side, rgba(168,214,47,0.15), transparent 70%)",
          }} />
        </div>
        <div className="max-w-4xl mx-auto px-6 lg:px-10 relative z-10">
          <div className="overline text-white/50 mb-6">manifesto</div>
          <blockquote>
            <p className="tracking-[-0.02em] leading-[1.15]"
               style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(30px, 4.2vw, 56px)" }}>
              &ldquo;A maioria das ferramentas para PMEs vende <em className="italic">gestão</em>.
              &nbsp;A gente construiu para vender <em className="italic" style={{
                backgroundImage: `linear-gradient(90deg, ${SPECTRUM.join(",")})`,
                WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
              }}>execução</em>.&rdquo;
            </p>
          </blockquote>

          <div className="mt-14 grid md:grid-cols-[80px_1fr] gap-6 items-start">
            <div className="h-16 w-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-lg italic" style={{ fontFamily: "'Fraunces', serif" }}>
              L
            </div>
            <div className="max-w-2xl text-white/80 leading-relaxed space-y-4 text-[15px]">
              <p>
                Passei 12 anos vendendo software para pequenas e médias empresas brasileiras. Ouvi 
                a mesma reclamação por anos: &ldquo;eu abro esse sistema, vejo relatório bonito, mas ninguém faz nada com ele&rdquo;.
              </p>
              <p>
                Prisma nasceu pra virar essa lógica de cabeça pra baixo. Cada tela existe para <b>reduzir uma tarefa</b>,
                não para adicionar mais um dashboard. O copiloto sabe do seu financeiro
                quando você abre o CRM. As automações não pedem permissão a cada passo — elas rodam.
              </p>
              <p>
                Se você tem uma PME que já rodou planilha, WhatsApp, CRM caro e mesmo assim está trocando abas o dia inteiro:
                a gente construiu o Prisma pensando em você.
              </p>
              <div className="pt-3 text-white/60 text-sm">
                — Fundador, Prisma
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="precos" className="py-24 border-t border-black/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="text-center max-w-2xl mx-auto">
            <div className="overline text-black/50 mb-4">preços</div>
            <h2 className="tracking-[-0.02em] leading-[1.05]" style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(40px, 5vw, 68px)" }}>
              Simples. <em className="italic">Como deveria ser.</em>
            </h2>
            <p className="mt-5 text-black/70">Comece grátis por 14 dias. Sem cartão. Cancele quando quiser.</p>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {PLANS.map((p, i) => (
              <div key={p.name}
                   data-testid={`plan-${p.name.toLowerCase()}`}
                   className={`relative rounded-lg p-8 flex flex-col ${
                     p.highlight
                       ? "bg-[#0A0A14] text-[#F5F1EA] shadow-[0_30px_60px_-15px_rgba(10,10,20,0.5)]"
                       : "bg-white border border-black/10"
                   }`}>
                {p.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-medium"
                       style={{
                         background: `linear-gradient(90deg, ${SPECTRUM.join(",")})`,
                         color: "#0A0A14",
                       }}>
                    {p.tag}
                  </div>
                )}
                <div className="text-xs uppercase tracking-widest opacity-60">{p.name}</div>
                <div className="mt-4 flex items-baseline gap-1.5">
                  <span style={{ fontFamily: "'Fraunces', serif", fontSize: 48 }} className="tracking-tight">{p.price}</span>
                  <span className="text-sm opacity-70">{p.per}</span>
                </div>
                {!p.highlight && <div className="text-xs text-black/50 mt-1">{p.tag}</div>}

                <ul className="mt-6 space-y-3 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm">
                      <div className={`h-4 w-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${p.highlight ? "bg-white/15" : "bg-black/5"}`}>
                        <Check className="h-3 w-3" strokeWidth={2.2} />
                      </div>
                      <span className={p.highlight ? "text-white/85" : "text-black/70"}>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={primaryCta}
                  data-testid={`plan-cta-${p.name.toLowerCase()}`}
                  className={`mt-8 h-11 rounded-md text-sm font-medium transition-colors ${
                    p.highlight
                      ? "bg-[#F5F1EA] text-[#0A0A14] hover:bg-white"
                      : "bg-[#0A0A14] text-[#F5F1EA] hover:bg-black"
                  }`}
                >
                  {p.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-28 border-t border-black/10 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: `linear-gradient(90deg, ${SPECTRUM.join(",")})`, opacity: 0.6 }} />
        </div>
        <div className="max-w-4xl mx-auto px-6 lg:px-10 text-center">
          <h3 className="tracking-[-0.02em] leading-[1.05]" style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(38px, 4.5vw, 64px)" }}>
            Pronto pra refratar<br />
            <em className="italic">o dia-a-dia da sua PME?</em>
          </h3>
          <button onClick={primaryCta}
                  data-testid="final-cta"
                  className="mt-10 group relative overflow-hidden rounded-md bg-[#0A0A14] text-[#F5F1EA] h-14 px-8 text-base inline-flex items-center gap-3 hover:bg-black transition-colors">
            <span className="absolute left-0 right-0 bottom-0 h-[3px] flex opacity-80 group-hover:opacity-100">
              {SPECTRUM.map((c) => <span key={c} className="flex-1" style={{ background: c }} />)}
            </span>
            Começar em 30 segundos
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
          <div className="mt-4 text-xs text-black/50">14 dias grátis · Sem cartão · Login com Google</div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-10 border-t border-black/10 bg-black/[0.02]">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 flex items-center justify-between text-xs text-black/50 flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <PrismLogo size={14} />
            <span>© 2026 Prisma · plataforma para PMEs</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-black">Termos</a>
            <a href="#" className="hover:text-black">Privacidade</a>
            <a href="mailto:hello@prisma.app" className="hover:text-black">Contato</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
