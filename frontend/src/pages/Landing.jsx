import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  ArrowUpRight, Check, Sparkles, MessageCircle, Users2, Wallet, Kanban,
  FileText, Zap, UserCog, Play, Volume2, VolumeX,
} from "lucide-react";

const SPECTRUM = ["#7C5CFF", "#E940A0", "#FF6A55", "#F5A623", "#A8D62F"];

const SHOTS = [
  { src: "/screenshots/dashboard.jpg", label: "Dashboard", desc: "Uma visão geral do dia com KPIs vivos, gráficos de receita e pipeline." },
  { src: "/screenshots/crm.jpg", label: "CRM", desc: "Kanban de leads com drag-and-drop e editor completo em um clique." },
  { src: "/screenshots/whatsapp.jpg", label: "WhatsApp", desc: "Inbox conectada ao Twilio conversando pelo número da sua empresa." },
  { src: "/screenshots/automacoes.jpg", label: "Automações", desc: "Trigger → ação, log de execuções e botão Testar em cada regra." },
];

const CAPTIONS = [
  { t: [0, 4],   step: 1, text: "Dashboard vivo — KPIs, receita e pipeline do dia" },
  { t: [4, 6],   step: 2, text: "Trocando para o CRM" },
  { t: [6, 15],  step: 2, text: "Editor completo · qualquer campo do lead em um clique" },
  { t: [15, 17], step: 3, text: "Abrindo o WhatsApp" },
  { t: [17, 25], step: 3, text: "Inbox real conectada ao Twilio · número da empresa" },
  { t: [25, 28], step: 4, text: "Automações — regras que rodam por você" },
  { t: [28, 36], step: 4, text: "Testando uma regra em tempo real" },
  { t: [36, 42], step: 4, text: "Log de execuções · auditoria completa" },
  { t: [42, 46], step: 5, text: "Voltando ao panorama" },
  { t: [46, 62], step: 6, text: "Copiloto Claude 4.5 respondendo em streaming" },
];

const STEPS = ["Dashboard", "CRM", "WhatsApp", "Automações", "Panorama", "Copiloto"];

function CopilotoPreview() {
  const question = "Como está meu pipeline hoje?";
  const answer = "Você tem 3 leads em Negociação totalizando R$ 62.900. O maior é Studio D — última interação foi há 4 dias.\n\nSugiro fazer um follow-up hoje pelo WhatsApp e mover Diego Alves para Proposta.";
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState("typing"); // typing | done

  useEffect(() => {
    let iv, restart, initial;
    const start = () => {
      setPhase("typing");
      setTyped("");
      let i = 0;
      iv = setInterval(() => {
        if (i < answer.length) {
          setTyped(answer.slice(0, i + 1));
          i += 1;
        } else {
          clearInterval(iv);
          setPhase("done");
          restart = setTimeout(start, 6500);
        }
      }, 22);
    };
    initial = setTimeout(start, 900);
    return () => { clearTimeout(initial); clearTimeout(restart); clearInterval(iv); };
  }, []);

  return (
    <div className="relative" data-testid="copiloto-preview">
      {/* soft ambient glow behind card */}
      <div className="absolute -inset-3 -z-10 rounded-2xl blur-2xl opacity-60" style={{
        background: "radial-gradient(closest-side, rgba(124,92,255,0.18), transparent 60%), radial-gradient(closest-side at 100% 100%, rgba(245,166,35,0.15), transparent 60%)",
      }} />
      <div className="rounded-xl border border-black/10 bg-white shadow-[0_30px_80px_-20px_rgba(10,10,20,0.22)] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-black/10 flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-[#0A0A14] flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 44 44" fill="none"><path d="M22 4 L40 34 L4 34 Z" fill="#F5F1EA" stroke="#F5F1EA" strokeWidth="1" strokeLinejoin="round" /></svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="italic leading-none" style={{ fontFamily: "'Fraunces', serif", fontSize: 16 }}>Copiloto Prisma</div>
            <div className="text-[11px] text-black/50 mt-1.5">Claude 4.5 · sempre à mão</div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] uppercase tracking-widest text-emerald-800 font-medium">ativo</span>
          </div>
        </div>

        {/* Conversation */}
        <div className="p-5 space-y-4 min-h-[280px]">
          <div className="flex justify-end">
            <div className="bg-[#0A0A14] text-[#F5F1EA] rounded-md rounded-tr-none px-4 py-2.5 text-sm max-w-[85%]">
              {question}
            </div>
          </div>
          <div className="flex gap-2.5">
            <div className="h-7 w-7 rounded-md bg-[#0A0A14] flex items-center justify-center shrink-0">
              <svg width="12" height="12" viewBox="0 0 44 44" fill="none"><path d="M22 4 L40 34 L4 34 Z" fill="#F5F1EA" stroke="#F5F1EA" strokeWidth="1" strokeLinejoin="round" /></svg>
            </div>
            <div className="text-sm text-black/85 leading-relaxed whitespace-pre-wrap min-h-[96px] flex-1">
              {typed}
              {phase === "typing" && <span className="inline-block w-[3px] h-4 bg-black/60 ml-0.5 align-middle animate-pulse" />}
            </div>
          </div>
        </div>

        {/* Footer stats */}
        <div className="px-5 py-3 border-t border-black/10 grid grid-cols-3 gap-2 bg-black/[0.02]">
          <div>
            <div className="text-[9px] uppercase tracking-widest text-black/50">Latência</div>
            <div className="text-xs font-mono mt-0.5">~ 340ms</div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-widest text-black/50">Contexto</div>
            <div className="text-xs font-mono mt-0.5">CRM · WA</div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-widest text-black/50">Modo</div>
            <div className="text-xs font-mono mt-0.5">streaming</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CaseVideo() {
  const ref = useRef(null);
  const [muted, setMuted] = useState(true);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(30);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const onTime = () => setTime(v.currentTime);
    const onMeta = () => setDuration(v.duration || 30);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onMeta);
    return () => { v.removeEventListener("timeupdate", onTime); v.removeEventListener("loadedmetadata", onMeta); };
  }, []);

  const toggleSound = () => {
    if (!ref.current) return;
    ref.current.muted = !ref.current.muted;
    setMuted(ref.current.muted);
    if (ref.current.paused) ref.current.play().catch(() => {});
  };

  const bigPlay = () => {
    if (!ref.current) return;
    ref.current.muted = false;
    setMuted(false);
    ref.current.currentTime = 0;
    ref.current.play().catch(() => {});
  };

  return (
    <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-8 items-stretch" data-testid="case-video-wrap">
      {/* Video card */}
      <div className="rounded-xl border border-black/10 shadow-[0_40px_100px_-25px_rgba(10,10,20,0.35)] overflow-hidden bg-black">
        <div className="h-9 bg-black/[0.06] border-b border-white/5 flex items-center gap-1.5 px-4">
          <div className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <div className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <div className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <div className="ml-4 text-[11px] font-mono text-white/40">prisma.app · case · marina salles · 30s</div>
          <div className="ml-auto flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-white/50">
            <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            ao vivo
          </div>
        </div>
        <div className="relative aspect-[16/9] bg-[#0A0A14]">
          <video
            ref={ref}
            data-testid="case-video"
            className="absolute inset-0 w-full h-full object-cover"
            src="/case-prisma.webm"
            poster="/case-prisma-poster.jpg"
            autoPlay muted loop playsInline preload="metadata"
          />
          {/* Marina identity badge on top-left */}
          <div className="absolute top-4 left-4 flex items-center gap-2.5 bg-black/60 backdrop-blur border border-white/10 rounded-full pl-1.5 pr-4 py-1.5 z-10">
            <div className="h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-medium" style={{ background: "hsl(32 95% 55% / 0.55)", fontFamily: "'Fraunces', serif" }}>MS</div>
            <div className="text-white text-xs">
              <div className="leading-none">Marina Salles</div>
              <div className="text-white/60 text-[10px] mt-1 uppercase tracking-widest">Studio Frame</div>
            </div>
          </div>
          {/* progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10 z-10">
            <div className="h-full transition-[width] duration-100 ease-linear" style={{
              width: `${Math.min(100, (time / (duration || 30)) * 100)}%`,
              background: `linear-gradient(90deg, ${SPECTRUM.join(",")})`,
            }} />
          </div>
          {/* Overlay CTA when muted */}
          {muted && (
            <button
              onClick={bigPlay}
              data-testid="case-unmute"
              className="absolute inset-0 flex items-center justify-center bg-black/25 hover:bg-black/40 transition-colors z-20"
            >
              <div className="flex items-center gap-3 px-5 py-3 rounded-full bg-white/95 text-[#0A0A14] text-sm font-medium shadow-lg">
                <Play className="h-4 w-4" fill="currentColor" />
                Reproduzir com áudio (pt-BR)
              </div>
            </button>
          )}
          {/* sound toggle */}
          <button
            onClick={toggleSound}
            data-testid="case-sound-toggle"
            className="absolute bottom-4 right-4 h-10 w-10 rounded-full bg-black/60 backdrop-blur text-white hover:bg-black/80 flex items-center justify-center transition-colors z-20"
            aria-label={muted ? "Ativar som" : "Desativar som"}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Side: founder card */}
      <div className="flex flex-col justify-between rounded-xl border border-black/10 bg-white p-6">
        <div>
          <div className="h-14 w-14 rounded-full flex items-center justify-center text-lg mb-4" style={{ background: "hsl(32 95% 55% / 0.3)", fontFamily: "'Fraunces', serif" }}>MS</div>
          <div className="font-medium text-base">Marina Salles</div>
          <div className="text-xs text-black/55 mt-0.5">Sócia · Studio Frame</div>
          <div className="text-xs text-black/40 mt-0.5">Design · São Paulo</div>
        </div>
        <div className="mt-6 pt-5 border-t border-black/10 space-y-2">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-black/45">Setor</div>
            <div className="text-sm">Agência de design</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-black/45">Cliente há</div>
            <div className="text-sm font-mono">4 meses</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-black/45">Time</div>
            <div className="text-sm font-mono">6 pessoas</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DemoVideo() {
  const ref = useRef(null);
  const [muted, setMuted] = useState(true);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(60);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const onTime = () => setTime(v.currentTime);
    const onMeta = () => setDuration(v.duration || 60);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onMeta);
    return () => { v.removeEventListener("timeupdate", onTime); v.removeEventListener("loadedmetadata", onMeta); };
  }, []);

  const current = CAPTIONS.find((c) => time >= c.t[0] && time < c.t[1]) || CAPTIONS[0];

  const toggleSound = () => {
    if (!ref.current) return;
    ref.current.muted = !ref.current.muted;
    setMuted(ref.current.muted);
    if (ref.current.paused) ref.current.play().catch(() => {});
  };

  const bigPlay = () => {
    if (!ref.current) return;
    ref.current.muted = false;
    setMuted(false);
    ref.current.currentTime = 0;
    ref.current.play().catch(() => {});
  };

  return (
    <div className="relative group" data-testid="demo-video-wrap">
      <div className="rounded-xl border border-black/10 shadow-[0_50px_100px_-20px_rgba(10,10,20,0.35)] overflow-hidden bg-black">
        <div className="h-9 bg-black/[0.06] border-b border-white/5 flex items-center gap-1.5 px-4">
          <div className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <div className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <div className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <div className="ml-4 text-[11px] font-mono text-white/40">prisma.app · walkthrough · {Math.round(duration)}s</div>
          <div className="ml-auto flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-white/50">
            <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            ao vivo
          </div>
        </div>

        <div className="relative aspect-[16/9] bg-black">
          <video
            ref={ref}
            data-testid="demo-video"
            className="absolute inset-0 w-full h-full object-cover"
            src="/prisma-demo.webm"
            poster="/screenshots/dashboard.jpg"
            autoPlay muted loop playsInline preload="metadata"
          />

          {/* Caption badge (bottom-left) */}
          <div className="absolute bottom-14 left-4 right-4 flex justify-start pointer-events-none z-10" data-testid="demo-caption-wrap">
            <div key={current.text} className="fade-up inline-flex items-center gap-3 bg-black/75 backdrop-blur-md text-white text-sm px-4 py-2.5 rounded-md max-w-[80%] border border-white/10">
              <div className="text-[10px] font-mono text-white/50 shrink-0">{String(current.step).padStart(2, "0")}</div>
              <div className="w-px h-4 bg-white/15" />
              <div data-testid="demo-caption">{current.text}</div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10 z-10">
            <div className="h-full transition-[width] duration-100 ease-linear" style={{
              width: `${Math.min(100, (time / (duration || 60)) * 100)}%`,
              background: `linear-gradient(90deg, ${SPECTRUM.join(",")})`,
            }} />
          </div>

          {/* Overlay CTA when muted */}
          {muted && (
            <button
              onClick={bigPlay}
              data-testid="demo-unmute"
              className="absolute inset-0 flex items-center justify-center bg-black/10 hover:bg-black/25 transition-colors z-20"
            >
              <div className="flex items-center gap-3 px-5 py-3 rounded-full bg-white/95 text-[#0A0A14] text-sm font-medium shadow-lg">
                <Play className="h-4 w-4" fill="currentColor" />
                Reproduzir com som
              </div>
            </button>
          )}

          {/* Sound toggle */}
          <button
            onClick={toggleSound}
            data-testid="demo-sound-toggle"
            className="absolute bottom-4 right-4 h-10 w-10 rounded-full bg-black/60 backdrop-blur text-white hover:bg-black/80 flex items-center justify-center transition-colors z-20"
            aria-label={muted ? "Ativar som" : "Desativar som"}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>

        {/* Step ticker under video */}
        <div className="bg-black text-white px-4 py-3 flex items-center justify-center gap-5 flex-wrap border-t border-white/5">
          {STEPS.map((label, i) => {
            const active = current.step === i + 1;
            return (
              <div key={label} data-testid={`demo-step-${i + 1}`} className={`flex items-center gap-2 text-[11px] transition-opacity ${active ? "opacity-100" : "opacity-30"}`}>
                <div className={`h-1.5 w-1.5 rounded-full ${active ? "bg-white" : "bg-white/40"}`} style={active ? { boxShadow: `0 0 12px ${SPECTRUM[i % SPECTRUM.length]}` } : undefined} />
                <span className="uppercase tracking-widest">{label}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="absolute -bottom-2 left-8 right-8 h-1 rounded-full opacity-60 flex overflow-hidden">
        {SPECTRUM.map((c) => <div key={c} style={{ background: c, flex: 1 }} />)}
      </div>
    </div>
  );
}

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
            <a href="#demo" className="hover:text-black transition-colors">Demo</a>
            <a href="#depoimentos" className="hover:text-black transition-colors">Depoimentos</a>
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
              <a href="#demo" data-testid="hero-demo-link" className="text-sm text-black/75 hover:text-black underline underline-offset-4 decoration-black/30 flex items-center gap-2">
                <Play className="h-3.5 w-3.5" fill="currentColor" />
                Assistir demo com áudio · 60s
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

      {/* DEMO VIDEO */}
      <section id="demo" className="py-24 border-t border-black/10 bg-white/60">
        <div className="max-w-6xl mx-auto px-6 lg:px-10">
          <div className="max-w-3xl mb-10">
            <div className="overline text-black/50 mb-4">demo · 60 segundos</div>
            <h2 className="tracking-[-0.02em] leading-[1.05]" style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(36px, 4.5vw, 60px)" }}>
              Veja o Prisma <em className="italic">em ação.</em>
            </h2>
            <p className="mt-5 text-black/70 max-w-xl">
              Um minuto passeando por CRM, WhatsApp, automações rodando e o copiloto respondendo — sem edição, é a plataforma real.
            </p>
          </div>
          <DemoVideo />
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

      {/* TESTIMONIALS — social proof */}
      <section id="depoimentos" className="py-24 border-t border-black/10">
        <div className="max-w-6xl mx-auto px-6 lg:px-10">
          <div className="max-w-3xl mb-14">
            <div className="overline text-black/50 mb-4">quem já usa</div>
            <h2 className="tracking-[-0.02em] leading-[1.05]" style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(38px, 4.5vw, 60px)" }}>
              Times que trocaram <em className="italic">6 abas por uma.</em>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                quote: "Antes eu vivia entre planilha, WhatsApp Web e três CRMs de teste. Em duas semanas de Prisma, meu time comercial voltou a fechar contrato antes do almoço.",
                name: "Marina Salles",
                role: "Sócia",
                company: "Studio Frame · design",
                initials: "MS",
                accent: "hsl(32 95% 55% / 0.30)",
              },
              {
                quote: "O copiloto virou meu gerente de operações. Todo dia às 8h ele me manda o que atrasou, quem tem que ser cobrado e qual proposta ainda não foi respondida.",
                name: "Ricardo Alencar",
                role: "Fundador",
                company: "Contabilidade Ponte",
                initials: "RA",
                accent: "hsl(245 60% 55% / 0.28)",
              },
              {
                quote: "A automação que manda mensagem no WhatsApp quando entra um lead novo pagou o plano no primeiro mês. Nunca mais perdi cliente por demorar pra responder.",
                name: "Juliana Prado",
                role: "Diretora comercial",
                company: "Clínica Vitalis",
                initials: "JP",
                accent: "hsl(148 60% 45% / 0.30)",
              },
            ].map((t, i) => (
              <div key={t.name} data-testid={`testimonial-${i}`} className="rounded-md border border-black/10 bg-white p-7 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 left-0 h-[3px] w-full" style={{ background: t.accent }} />
                <div className="text-3xl leading-none text-black/20" style={{ fontFamily: "'Fraunces', serif" }}>&ldquo;</div>
                <p className="mt-3 text-[15px] leading-relaxed text-black/80 flex-1" style={{ fontFamily: "'Fraunces', serif" }}>
                  {t.quote}
                </p>
                <div className="mt-6 pt-5 border-t border-black/10 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full flex items-center justify-center text-xs font-medium" style={{ background: t.accent }}>
                    {t.initials}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{t.name}</div>
                    <div className="text-xs text-black/55 truncate">{t.role} · {t.company}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Small trust ribbon */}
          <div className="mt-12 flex items-center justify-center gap-8 flex-wrap text-xs text-black/50 uppercase tracking-widest">
            <span>+ 40 pmes beta</span>
            <span className="text-black/20">·</span>
            <span>3 estados</span>
            <span className="text-black/20">·</span>
            <span>7 setores</span>
          </div>

          {/* CASE em VÍDEO */}
          <div className="mt-20 pt-14 border-t border-black/10" data-testid="case-video-block">
            <div className="max-w-3xl mb-8">
              <div className="overline text-black/50 mb-3">um case em vídeo · 30s</div>
              <h3 className="tracking-[-0.02em] leading-[1.05]" style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(30px, 3.4vw, 44px)" }}>
                Marina conta a mudança <em className="italic">na própria voz.</em>
              </h3>
            </div>
            <CaseVideo />
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
