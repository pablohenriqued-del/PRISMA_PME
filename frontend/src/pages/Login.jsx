import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Sparkles, Zap, MessageCircle, LineChart } from "lucide-react";

export default function Login() {
  const handleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/app";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen w-full flex bg-[hsl(var(--paper))] text-[hsl(var(--ink))]">
      {/* LEFT — brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-[46%] p-14 relative overflow-hidden border-r border-black/10">
        <div className="absolute -top-20 -left-20 w-[420px] h-[420px] rounded-full accent-gradient blur-3xl opacity-30" />
        <div className="absolute bottom-10 right-10 w-40 h-40 rounded-full bg-[hsl(var(--amber))] blur-2xl opacity-30" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-[hsl(var(--ink))] flex items-center justify-center">
            <span className="font-display font-bold text-[hsl(var(--paper))] text-lg leading-none">N</span>
          </div>
          <div>
            <div className="font-display font-semibold tracking-tight text-lg">Núcleo IA</div>
            <div className="text-xs text-black/60">Sistema operacional para PMEs</div>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <div className="overline text-black/50 mb-4">v1 · plataforma modular</div>
          <h1 className="font-display font-light text-5xl leading-[1.05] tracking-tight">
            Toda a operação da sua empresa,
            <span className="font-semibold"> orquestrada por IA.</span>
          </h1>
          <p className="mt-6 text-base text-black/70 leading-relaxed max-w-sm">
            CRM, WhatsApp, Projetos, Financeiro, Documentos e Automações — falando entre si com um copiloto sempre ao seu lado.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-3 max-w-md">
          {[
            { icon: Sparkles, label: "Copiloto IA" },
            { icon: MessageCircle, label: "WhatsApp" },
            { icon: LineChart, label: "Dashboards" },
            { icon: Zap, label: "Automações" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3 border border-black/10 bg-white/50 backdrop-blur px-4 py-3 rounded-md">
              <Icon className="h-4 w-4" strokeWidth={1.6} />
              <span className="text-sm font-medium">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT — auth */}
      <div className="flex-1 flex items-center justify-center px-6 lg:px-16 py-14 relative">
        <div className="absolute top-6 right-6 overline text-black/50">pt-br · beta</div>
        <div className="w-full max-w-md fade-up">
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-[hsl(var(--ink))] flex items-center justify-center">
              <span className="font-display font-bold text-[hsl(var(--paper))] text-lg leading-none">N</span>
            </div>
            <div className="font-display font-semibold">Núcleo IA</div>
          </div>

          <div className="overline text-black/50 mb-3">entrar</div>
          <h2 className="font-display text-4xl font-light tracking-tight">Bem-vindo de volta.</h2>
          <p className="text-black/60 mt-2 text-sm">Acesse com sua conta Google — leva 3 segundos.</p>

          <Button
            data-testid="google-login-btn"
            onClick={handleLogin}
            className="mt-10 w-full h-14 rounded-md bg-[hsl(var(--ink))] hover:bg-black text-[hsl(var(--paper))] group transition-colors"
          >
            <span className="flex items-center gap-3 w-full justify-center text-base font-medium">
              <svg className="h-5 w-5" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.4 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.4 7.1 29.5 5 24 5 16.3 5 9.6 9.2 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 44c5.3 0 10.1-2 13.7-5.3l-6.3-5.2c-2 1.5-4.6 2.5-7.4 2.5-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.4 39.6 16.1 44 24 44z"/>
                <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.6l6.3 5.2C41 35.4 44 30.2 44 24c0-1.3-.1-2.6-.4-3.9z"/>
              </svg>
              Continuar com Google
              <ArrowUpRight className="h-4 w-4 opacity-70 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          </Button>

          <div className="mt-8 pt-8 border-t border-black/10 text-xs text-black/50 leading-relaxed">
            Ao continuar, você concorda com nossos Termos e Política de Privacidade. Suas conversas do WhatsApp e dados da empresa ficam isolados por tenant.
          </div>
        </div>
      </div>
    </div>
  );
}
