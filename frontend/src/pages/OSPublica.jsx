import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { API_BASE } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader2, CheckCircle2, FileSignature, Download, CreditCard, ShieldCheck, ArrowLeft, ChevronDown } from "lucide-react";
import { toast, Toaster } from "sonner";

const brl = (n) => (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
const dt = (iso) => (iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "—");

async function req(path, opts = {}) {
  const r = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || `Erro ${r.status}`);
  return r.json();
}

export default function OSPublica() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [os, setOs] = useState(null);
  const [brand, setBrand] = useState({ name: "Prisma" });
  const [related, setRelated] = useState([]);
  const [showRelated, setShowRelated] = useState(false);
  const [signOpen, setSignOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [accept, setAccept] = useState(false);
  const [signing, setSigning] = useState(false);
  const [paying, setPaying] = useState(false);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [main, rel] = await Promise.all([
        req(`/public/os/${token}`),
        req(`/public/os/${token}/related`).catch(() => ({ items: [] })),
      ]);
      setOs(main.os); setBrand(main.brand); setRelated(rel.items || []);
      setEmail(main.os.client_email || "");
      setFullName(main.os.client_name || "");
    } catch (e) {
      setError(e.message || "Não conseguimos carregar sua proposta.");
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [token]);

  const sign = async (e) => {
    e.preventDefault();
    if (!accept) { toast.error("Você precisa aceitar os termos"); return; }
    setSigning(true);
    try {
      await req(`/public/os/${token}/sign`, {
        method: "POST",
        body: JSON.stringify({ full_name: fullName, email, accept_terms: true }),
      });
      toast.success("Proposta assinada com sucesso!");
      setSignOpen(false);
      await load();
    } catch (e) { toast.error(e.message); }
    finally { setSigning(false); }
  };

  const pay = async () => {
    setPaying(true);
    try {
      const r = await req(`/public/os/${token}/checkout`, {
        method: "POST", body: JSON.stringify({ origin_url: window.location.origin }),
      });
      window.location.href = r.checkout_url;
    } catch (e) { toast.error(e.message); setPaying(false); }
  };

  const downloadReceipt = () => {
    window.open(`${API_BASE}/public/os/${token}/receipt`, "_blank");
  };

  const signed = !!os?.signed_at;
  const paid = os?.status === "aprovada" && !!os?.paid_at;
  const total = os?.total || 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F1EA] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-black/50" />
      </div>
    );
  }
  if (error || !os) {
    return (
      <div className="min-h-screen bg-[#F5F1EA] flex items-center justify-center p-6" data-testid="os-publica-error">
        <div className="max-w-md text-center bg-white rounded-lg border border-black/10 p-10">
          <div className="font-display text-2xl">Ops!</div>
          <p className="text-sm text-black/60 mt-2">{error || "Proposta não encontrada."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F1EA]" data-testid="os-publica-page">
      <Toaster position="bottom-right" richColors />
      {/* Header */}
      <div className="border-b border-black/10 bg-white/60 backdrop-blur">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-[#0A0A14] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 44 44" fill="none"><path d="M22 4 L40 34 L4 34 Z" fill="#F5F1EA" strokeLinejoin="round" /></svg>
            </div>
            <div className="italic text-lg" style={{ fontFamily: "'Fraunces', serif" }}>{brand.name || "Prisma"}</div>
          </div>
          <div className="text-xs text-black/50 font-mono">Proposta #{os.os_id?.slice(-6)}</div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="text-xs uppercase tracking-widest text-black/50">Ordem de serviço</div>
        <h1 className="font-display text-4xl md:text-5xl font-light tracking-tight mt-3">{os.title}</h1>
        <div className="mt-3 text-sm text-black/60">Para: <b className="text-black/80">{os.client_name}</b> · {os.client_email || "—"}</div>

        {/* Status badges */}
        <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
          {signed && <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Assinada em {dt(os.signed_at)}</span>}
          {paid && <span className="px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700">Paga em {dt(os.paid_at)}</span>}
          {!signed && <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700">Aguardando sua aprovação</span>}
        </div>

        {/* Itens */}
        <section className="mt-10 rounded-lg border border-black/10 bg-white p-6">
          <div className="overline text-black/50 mb-4">Itens</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-black/40">
                <th className="pb-3 font-medium">Descrição</th>
                <th className="pb-3 font-medium text-right">Qtd</th>
                <th className="pb-3 font-medium text-right">Valor unit.</th>
                <th className="pb-3 font-medium text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {(os.items || []).map((it, i) => (
                <tr key={i} className="border-t border-black/5">
                  <td className="py-3 pr-3">{it.description}</td>
                  <td className="py-3 pr-3 text-right font-mono text-xs">{Number(it.quantity) || 1}</td>
                  <td className="py-3 pr-3 text-right font-mono text-xs">{brl(it.unit_price)}</td>
                  <td className="py-3 text-right font-mono text-xs">{brl((Number(it.quantity) || 1) * (Number(it.unit_price) || 0))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-black/10">
                <td colSpan={3} className="pt-4 text-right text-sm">Total</td>
                <td className="pt-4 text-right font-display text-2xl">{brl(total)}</td>
              </tr>
            </tfoot>
          </table>
          {os.notes && <p className="mt-4 text-xs text-black/50 border-t border-black/5 pt-4 whitespace-pre-wrap">{os.notes}</p>}
        </section>

        {/* Custom fields */}
        {(os.custom_fields || []).length > 0 && (
          <section className="mt-6 rounded-lg border border-black/10 bg-white p-6">
            <div className="overline text-black/50 mb-3">Detalhes adicionais</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(os.custom_fields || []).map((cf, i) => (
                <div key={i} className="flex items-baseline gap-2">
                  <div className="text-xs text-black/50 min-w-[110px]">{cf.name}</div>
                  <div className="text-sm">{cf.type === "money" ? brl(cf.value) : String(cf.value ?? "—")}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CTAs */}
        <section className="mt-8 rounded-lg border border-black/10 bg-white p-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 justify-between">
            <div>
              <div className="font-display text-xl">Pronto para aprovar?</div>
              <div className="text-sm text-black/60 mt-1">Aceite a proposta com um clique e pague depois via PIX.</div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {!signed && <Button data-testid="sign-btn" onClick={() => setSignOpen(true)} className="bg-[#0A0A14] hover:bg-black text-[#F5F1EA] h-11 px-5">
                <FileSignature className="h-4 w-4 mr-2" /> Aceitar e assinar
              </Button>}
              {signed && (
                <Button variant="outline" onClick={downloadReceipt} data-testid="download-receipt" className="h-11 px-5">
                  <Download className="h-4 w-4 mr-2" /> Baixar comprovante
                </Button>
              )}
              {!paid && total > 0 && (
                <Button data-testid="pay-btn" disabled={paying} onClick={pay} className="bg-emerald-600 hover:bg-emerald-700 text-white h-11 px-5">
                  <CreditCard className="h-4 w-4 mr-2" /> {paying ? "Redirecionando…" : "Pagar via PIX"}
                </Button>
              )}
            </div>
          </div>
          {signed && (
            <div className="mt-4 text-xs text-black/50 border-t border-black/5 pt-3">
              Assinada por <b>{os.signed_by}</b> em {dt(os.signed_at)} · assinatura eletrônica válida (MP 2.200-2 / Lei 14.063/2020).
            </div>
          )}
        </section>

        {/* Related OS */}
        {related.length > 0 && (
          <section className="mt-10">
            <button onClick={() => setShowRelated((v) => !v)} className="w-full text-left flex items-center gap-2 mb-3 group" data-testid="toggle-related">
              <div className="overline text-black/50 group-hover:text-black">Outras propostas suas ({related.length})</div>
              <ChevronDown className={`h-3 w-3 text-black/40 transition-transform ${showRelated ? "rotate-180" : ""}`} />
            </button>
            {showRelated && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="related-list">
                {related.map((r) => (
                  <div key={r.os_id} className="rounded-md border border-black/10 bg-white p-4">
                    <div className="text-xs text-black/50">{dt(r.created_at)}</div>
                    <div className="font-display text-base mt-1">{r.title}</div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-[10px] uppercase tracking-widest text-black/40">{r.status}</div>
                      <div className="font-mono text-sm">{brl(r.total)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <div className="mt-16 text-center text-xs text-black/40">
          Enviado por <span className="italic" style={{ fontFamily: "'Fraunces', serif" }}>{brand.name}</span> · pagamento processado por Stripe · PIX + cartão
        </div>
      </div>

      {/* Sign dialog */}
      <Dialog open={signOpen} onOpenChange={setSignOpen}>
        <DialogContent className="sm:max-w-md" data-testid="sign-dialog">
          <DialogHeader>
            <DialogTitle>Assinar proposta</DialogTitle>
            <DialogDescription>Sua aceitação é registrada com nome, data, IP e hash SHA-256. Válida como assinatura eletrônica simples (Lei 14.063/2020).</DialogDescription>
          </DialogHeader>
          <form onSubmit={sign} className="space-y-4 pt-2">
            <div><Label>Nome completo</Label><Input required data-testid="sign-name" value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
            <div><Label>E-mail</Label><Input type="email" data-testid="sign-email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <label className="flex items-start gap-2 text-xs text-black/60">
              <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} data-testid="sign-accept" className="mt-0.5" />
              <span>Li e aceito os termos desta proposta comercial de <b>{brl(total)}</b>. Autorizo a coleta do meu IP e data/hora para fins de comprovação.</span>
            </label>
            <DialogFooter>
              <Button type="submit" data-testid="sign-submit" disabled={signing || !accept} className="bg-[#0A0A14] hover:bg-black text-[#F5F1EA]">
                {signing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar assinatura"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
