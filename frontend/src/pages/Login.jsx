import React, { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";

const CHIPS = [
  "CRM", "WhatsApp", "Financeiro", "Projetos", "Documentos", "Automações", "Copiloto",
];

const SPECTRUM = ["#7C5CFF", "#E940A0", "#FF6A55", "#F5A623", "#A8D62F"];

function PrismMark({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="p-face" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <path d="M22 4 L40 34 L4 34 Z" fill="url(#p-face)" stroke="#fff" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}

export default function Login() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => (n + 1) % CHIPS.length), 1600);
    return () => clearInterval(t);
  }, []);

  const handleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/app";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen w-full flex bg-[#0A0A14] text-white relative overflow-hidden">
      {/* Global chromatic spectrum line */}
      <div className="absolute top-0 inset-x-0 h-[3px] flex z-30" aria-hidden="true">
        {SPECTRUM.map((c, i) => <div key={c} style={{ background: c, flex: 1, opacity: 0.9 - i * 0.05 }} />)}
      </div>

      {/* LEFT — dark editorial hero */}
      <div className="hidden lg:flex flex-col justify-between w-[58%] p-14 xl:p-16 relative overflow-hidden">
        {/* Ambient prism beams */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full" style={{
            background: "radial-gradient(closest-side, rgba(124,92,255,0.35), transparent 70%)",
          }} />
          <div className="absolute top-1/3 -right-40 w-[520px] h-[520px] rounded-full" style={{
            background: "radial-gradient(closest-side, rgba(255,106,85,0.25), transparent 70%)",
          }} />
          <div className="absolute bottom-0 left-1/3 w-[420px] h-[420px] rounded-full" style={{
            background: "radial-gradient(closest-side, rgba(168,214,47,0.18), transparent 70%)",
          }} />
          {/* Fine grid */}
          <div className="absolute inset-0 opacity-[0.08]" style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }} />
          {/* Refracted beam SVG */}
          <svg className="absolute top-16 right-10 w-[360px] h-[280px]" viewBox="0 0 360 280" fill="none" aria-hidden="true">
            {/* Incoming white beam */}
            <line x1="0" y1="90" x2="150" y2="140" stroke="rgba(255,255,255,0.85)" strokeWidth="1.2" />
            {/* Prism triangle */}
            <path d="M150 60 L200 200 L100 200 Z" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.6)" strokeWidth="1" strokeLinejoin="round" />
            {/* Refracted spectrum */}
            {SPECTRUM.map((c, i) => (
              <line
                key={c}
                x1="200"
                y1={195 - i * 3}
                x2={360}
                y2={110 + i * 28}
                stroke={c}
                strokeWidth="1.2"
                opacity={0.85}
              />
            ))}
          </svg>
        </div>

        {/* TOP: brand row */}
        <div className="relative z-10 flex items-center gap-3">
          <PrismMark size={36} />
          <div>
            <div className="font-display italic text-lg leading-none tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>Prisma</div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-white/50 mt-1">plataforma para PMEs</div>
          </div>
          <div className="ml-auto hidden xl:flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-white/40">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            v1.1 · fev 2026
          </div>
        </div>

        {/* MIDDLE: massive display */}
        <div className="relative z-10 max-w-[720px]">
          <div className="overline text-white/40 mb-6">o sistema operacional</div>
          <h1
            className="font-light tracking-[-0.03em] leading-[0.95] text-white"
            style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(64px, 8vw, 128px)" }}
          >
            Um <em className="italic font-normal" style={{
              backgroundImage: `linear-gradient(90deg, ${SPECTRUM.join(",")})`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}>prisma</em>
            <br />
            para a sua<br />
            operação.
          </h1>
          <p className="mt-8 text-white/60 text-base leading-relaxed max-w-md">
            Uma única superfície onde vendas, atendimento, finanças e automações se refratam em ações — e uma IA orquestra tudo por trás.
          </p>
        </div>

        {/* BOTTOM: modules ticker */}
        <div className="relative z-10">
          <div className="overline text-white/40 mb-4">o que se ilumina</div>
          <div className="flex flex-wrap gap-2 items-center">
            {CHIPS.map((c, i) => {
              const isLive = i === tick;
              return (
                <div
                  key={c}
                  className={`px-3.5 py-2 rounded-full border text-xs transition-all duration-500 ${
                    isLive
                      ? "border-white/70 bg-white/10 text-white"
                      : "border-white/15 bg-white/[0.03] text-white/60"
                  }`}
                  style={isLive ? { boxShadow: `0 0 24px ${SPECTRUM[i % SPECTRUM.length]}55` } : undefined}
                >
                  {c}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIGHT — paper login panel */}
      <div className="flex-1 flex items-center justify-center px-6 lg:px-14 py-14 relative bg-[#F5F1EA] text-[#0A0A14]">
        {/* Chromatic hairline on the seam */}
        <div className="hidden lg:block absolute left-0 top-0 bottom-0 w-px" aria-hidden="true">
          <div className="h-full w-full" style={{ background: `linear-gradient(180deg, transparent, ${SPECTRUM[0]}, ${SPECTRUM[2]}, ${SPECTRUM[4]}, transparent)`, opacity: 0.7 }} />
        </div>

        <div className="absolute top-6 right-6 flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-black/50">
          <span>pt-br</span><span>·</span><span>beta</span>
        </div>

        <div className="w-full max-w-[420px] fade-up">
          {/* Mobile brand */}
          <div className="lg:hidden mb-10 flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-[#0A0A14] flex items-center justify-center">
              <div className="[filter:invert(1)]"><PrismMark size={22} /></div>
            </div>
            <div className="font-display italic text-lg" style={{ fontFamily: "'Fraunces', serif" }}>Prisma</div>
          </div>

          <div className="overline text-black/50 mb-4">acesso</div>
          <h2
            className="font-light tracking-[-0.02em] leading-tight"
            style={{ fontFamily: "'Fraunces', serif", fontSize: "48px" }}
          >
            Entre com o
            <br />
            <em className="italic">seu Google.</em>
          </h2>
          <p className="text-black/60 text-sm mt-4 max-w-sm leading-relaxed">
            Sem senha para lembrar. Sua organização é criada no primeiro acesso — se você foi convidado, entra direto no espaço do time.
          </p>

          {/* CTA */}
          <button
            data-testid="google-login-btn"
            onClick={handleLogin}
            className="group mt-10 w-full relative overflow-hidden rounded-md bg-[#0A0A14] text-[#F5F1EA] h-14 px-6 flex items-center justify-between transition-transform active:scale-[0.99]"
          >
            {/* Chromatic underline that animates in on hover */}
            <span className="absolute left-0 right-0 bottom-0 h-[3px] flex opacity-70 group-hover:opacity-100 transition-opacity">
              {SPECTRUM.map((c) => <span key={c} className="flex-1" style={{ background: c }} />)}
            </span>
            <span className="flex items-center gap-3">
              <svg className="h-5 w-5" viewBox="0 0 48 48" fill="none">
                <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.4 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.4 7.1 29.5 5 24 5 16.3 5 9.6 9.2 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 44c5.3 0 10.1-2 13.7-5.3l-6.3-5.2c-2 1.5-4.6 2.5-7.4 2.5-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.4 39.6 16.1 44 24 44z"/>
                <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.6l6.3 5.2C41 35.4 44 30.2 44 24c0-1.3-.1-2.6-.4-3.9z"/>
              </svg>
              <span className="font-medium text-base">Continuar com Google</span>
            </span>
            <ArrowUpRight className="h-4 w-4 opacity-70 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>

          {/* Numbered value props */}
          <div className="mt-14 pt-8 border-t border-black/10 space-y-4">
            {[
              ["01", "IA que conhece seu contexto", "Um copiloto Claude 4.5 sempre à mão em cada módulo."],
              ["02", "WhatsApp real, não um imitador", "Conectado ao Twilio, respondendo pelo número da sua empresa."],
              ["03", "Automações que executam sozinhas", "Do lead novo até o e-mail de cobrança — 24/7."],
            ].map(([n, t, d]) => (
              <div key={n} className="flex gap-4">
                <div className="text-[10px] font-mono text-black/40 mt-1 w-6 shrink-0">{n}</div>
                <div className="min-w-0">
                  <div className="text-sm font-medium leading-tight">{t}</div>
                  <div className="text-xs text-black/50 mt-0.5">{d}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 text-[10px] uppercase tracking-[0.25em] text-black/40">
            © 2026 · Prisma · SaaS operacional
          </div>
        </div>
      </div>
    </div>
  );
}
