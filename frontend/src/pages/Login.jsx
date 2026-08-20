import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ArrowRight, Sparkles, ShieldCheck } from "lucide-react";

const Logo = () => (
  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#5E6AD2] to-[#8B5CF6] flex items-center justify-center shadow-[0_0_24px_rgba(94,106,210,0.5)]">
    <svg viewBox="0 0 44 44" fill="none" className="w-6 h-6"><path d="M22 4 L40 34 L4 34 Z" fill="white" strokeLinejoin="round"/></svg>
  </div>
);

export default function Login() {
  const { loginWithGoogle } = useAuth();

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center p-6 noise-bg" data-testid="login-page">
      {/* subtle grid bg */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

      <div className="relative w-full max-w-sm">
        <Link to="/" className="flex items-center justify-center gap-3 mb-10">
          <Logo />
        </Link>
        <div className="card-bento p-8 backdrop-blur-xl">
          <div className="text-center">
            <div className="overline mb-3">Bem-vindo(a) de volta</div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-gradient">Entre no Prisma</h1>
            <p className="mt-3 text-sm text-zinc-400">Use sua conta Google · 1 clique · sem senha</p>
          </div>

          <button
            data-testid="google-login-btn"
            onClick={loginWithGoogle}
            className="mt-8 w-full h-12 rounded-lg bg-[#121214] text-white font-medium text-sm flex items-center justify-center gap-3 hover:bg-zinc-100 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.15-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.85 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.82-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.67 2.84c.86-2.6 3.29-4.53 6.15-4.53z"/></svg>
            Continuar com Google
          </button>

          <div className="mt-8 flex items-center gap-2 text-[11px] text-zinc-500 justify-center">
            <ShieldCheck className="h-3 w-3" />
            <span>Criptografia ponta-a-ponta · seus dados são seus</span>
          </div>
        </div>

        <div className="text-center mt-6 text-xs text-zinc-500">
          Novo por aqui? <Link to="/" className="text-[#5E6AD2] hover:text-[#8B5CF6] transition-colors">Voltar para o site</Link>
        </div>
      </div>
    </div>
  );
}
