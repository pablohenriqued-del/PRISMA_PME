import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const brl = (cents, currency) => ((cents || 0) / 100).toLocaleString("pt-BR", {
  style: "currency", currency: (currency || "BRL").toUpperCase(),
});

export function PaymentSuccess() {
  const loc = useLocation();
  const navigate = useNavigate();
  const [state, setState] = useState({ status: "polling", data: null, attempts: 0 });

  useEffect(() => {
    const params = new URLSearchParams(loc.search);
    const sessionId = params.get("session_id");
    if (!sessionId) { setState({ status: "error", data: null }); return; }

    let cancelled = false;
    let attempts = 0;
    const poll = async () => {
      attempts += 1;
      try {
        const r = await api.get(`/payments/status/${sessionId}`);
        if (cancelled) return;
        if (r.data.payment_status === "paid") {
          setState({ status: "paid", data: r.data });
          return;
        }
        if (attempts >= 12) { setState({ status: "pending", data: r.data }); return; }
        setState((s) => ({ ...s, attempts }));
        setTimeout(poll, 2500);
      } catch {
        if (!cancelled) setState({ status: "error", data: null });
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [loc.search]);

  return (
    <div className="min-h-screen bg-[#08090A] flex items-center justify-center p-6" data-testid="payment-success-page">
      <div className="max-w-md w-full text-center rounded-lg border border-white/10 bg-[#121214] p-10">
        {state.status === "polling" && (
          <>
            <Loader2 className="h-10 w-10 mx-auto animate-spin text-zinc-500" />
            <div className="mt-6 font-display text-2xl">Confirmando o pagamento…</div>
            <div className="mt-2 text-sm text-zinc-400">Pagamentos PIX podem levar alguns segundos.</div>
          </>
        )}
        {state.status === "paid" && (
          <>
            <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-600" />
            <div className="mt-6 font-display text-3xl">Pagamento confirmado</div>
            <div className="mt-2 text-zinc-400">{state.data ? brl(state.data.amount, state.data.currency) : ""}</div>
            <div className="mt-8 flex gap-3 justify-center">
              <Button onClick={() => navigate("/app")} data-testid="go-app-btn" className="bg-gradient-to-r from-[#5E6AD2] to-[#8B5CF6] text-white hover:opacity-90">Ir para o app</Button>
              <Button variant="outline" onClick={() => navigate("/")}>Voltar</Button>
            </div>
          </>
        )}
        {state.status === "pending" && (
          <>
            <Loader2 className="h-10 w-10 mx-auto text-amber-600" />
            <div className="mt-6 font-display text-2xl">Aguardando confirmação</div>
            <div className="mt-2 text-sm text-zinc-400">Seu pagamento ainda não foi confirmado. Você receberá um e-mail assim que compensar.</div>
            <div className="mt-8"><Button onClick={() => navigate("/")}>Voltar</Button></div>
          </>
        )}
        {state.status === "error" && (
          <>
            <XCircle className="h-12 w-12 mx-auto text-red-600" />
            <div className="mt-6 font-display text-2xl">Ops!</div>
            <div className="mt-2 text-sm text-zinc-400">Não conseguimos verificar seu pagamento agora.</div>
            <div className="mt-8"><Button onClick={() => navigate("/")}>Voltar</Button></div>
          </>
        )}
      </div>
    </div>
  );
}

export function PaymentCancel() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#08090A] flex items-center justify-center p-6" data-testid="payment-cancel-page">
      <div className="max-w-md w-full text-center rounded-lg border border-white/10 bg-[#121214] p-10">
        <XCircle className="h-12 w-12 mx-auto text-zinc-500" />
        <div className="mt-6 font-display text-3xl">Pagamento cancelado</div>
        <div className="mt-2 text-sm text-zinc-400">Tudo bem, você pode tentar novamente a qualquer momento.</div>
        <div className="mt-8"><Button onClick={() => navigate("/")} className="bg-gradient-to-r from-[#5E6AD2] to-[#8B5CF6] text-white">Voltar</Button></div>
      </div>
    </div>
  );
}
