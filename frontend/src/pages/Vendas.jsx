import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Send, Copy, ExternalLink, Download, Eye, FileText, TrendingUp, MessageCircle, Mail } from "lucide-react";

const brl = (n) => (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const timeAgo = (iso) => {
  if (!iso) return "—";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "agora";
  if (s < 3600) return `${Math.floor(s / 60)}min`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
};

const EMPTY = { cliente: "", valor: "", email: "", phone: "", note: "" };

export default function Vendas() {
  const [form, setForm] = useState(EMPTY);
  const [links, setLinks] = useState(null); // { page_url, pdf_url, whatsapp?, email? }
  const [busy, setBusy] = useState(false);
  const [analytics, setAnalytics] = useState({ items: [], totals: { sends: 0, pdf_opens: 0, page_views: 0 }, recent_sends: [] });

  const loadAnalytics = async () => {
    try { const r = await api.get("/sales/analytics"); setAnalytics(r.data); } catch (_) { /* ignore */ }
  };
  useEffect(() => { loadAnalytics(); }, []);

  const generate = async (channels) => {
    if (!form.cliente.trim()) { toast.error("Preencha o nome do cliente"); return; }
    setBusy(true);
    try {
      const r = await api.post("/sales/link", {
        cliente: form.cliente.trim(),
        valor: form.valor ? Number(form.valor) : null,
        email: form.email || null,
        phone: form.phone || null,
        channels,
        origin_url: window.location.origin,
        note: form.note || null,
      });
      setLinks(r.data);
      if (channels.includes("whatsapp")) {
        const w = r.data.whatsapp;
        if (w?.status === "sent") toast.success("WhatsApp enviado");
        else if (w?.status === "error") toast.error(w.hint || "Falha no WhatsApp");
      }
      if (channels.includes("email")) {
        const e = r.data.email;
        if (e?.status === "sent") toast.success("E-mail enviado");
        else if (e?.status === "error") toast.error("Falha no e-mail");
      }
      if (!channels.length) toast.success("Link gerado");
      loadAnalytics();
    } catch (e) {
      toast.error("Falha ao gerar link");
    } finally { setBusy(false); }
  };

  const copy = (url) => { navigator.clipboard.writeText(url); toast.success("Link copiado"); };

  return (
    <div className="space-y-6 fade-up" data-testid="vendas-page">
      <div>
        <div className="overline text-zinc-500">Vendas</div>
        <h1 className="font-display text-4xl font-semibold tracking-tight mt-2 text-gradient">Nova apresentação</h1>
        <p className="text-zinc-400 mt-2 text-sm">Gere link personalizado + PDF one-page e envie por WhatsApp/e-mail em 1 clique.</p>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="card-bento p-5">
          <div className="overline flex items-center gap-1.5"><Send className="h-3.5 w-3.5" /> Envios totais</div>
          <div className="font-display text-3xl font-semibold mt-2 text-zinc-100">{analytics.totals.sends}</div>
        </div>
        <div className="card-bento p-5">
          <div className="overline flex items-center gap-1.5 text-[#8B5CF6]"><FileText className="h-3.5 w-3.5" /> PDF baixado</div>
          <div className="font-display text-3xl font-semibold mt-2 text-[#c9c2ff]">{analytics.totals.pdf_opens}</div>
        </div>
        <div className="card-bento p-5">
          <div className="overline flex items-center gap-1.5 text-emerald-400"><Eye className="h-3.5 w-3.5" /> Página aberta</div>
          <div className="font-display text-3xl font-semibold mt-2 text-emerald-400">{analytics.totals.page_views}</div>
        </div>
      </div>

      {/* Form + Result side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card-bento p-6 space-y-4">
          <div className="overline">Personalização</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Cliente</Label><Input data-testid="sales-cliente" placeholder="Ex: Padaria Bella" value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} /></div>
            <div><Label>Valor (R$)</Label><Input type="number" data-testid="sales-valor" placeholder="4500" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} /></div>
            <div><Label>Telefone (WhatsApp)</Label><Input data-testid="sales-phone" placeholder="+5521987654321" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="col-span-2"><Label>E-mail</Label><Input type="email" data-testid="sales-email" placeholder="cliente@empresa.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="col-span-2"><Label>Mensagem extra (opcional)</Label><Textarea rows={2} data-testid="sales-note" placeholder="Como conversamos, envio a proposta..." value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
          </div>
          <div className="flex items-center gap-2 flex-wrap pt-2">
            <Button onClick={() => generate([])} disabled={busy} data-testid="gen-link-btn" className="btn-secondary">
              <FileText className="h-4 w-4" /> Só gerar link
            </Button>
            <Button onClick={() => generate(["whatsapp"])} disabled={busy || !form.phone} data-testid="gen-wa-btn"
                    className="h-10 px-4 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 flex items-center gap-2 text-sm">
              <MessageCircle className="h-4 w-4" /> Enviar WhatsApp
            </Button>
            <Button onClick={() => generate(["email"])} disabled={busy || !form.email} data-testid="gen-mail-btn"
                    className="h-10 px-4 rounded-md bg-[#5E6AD2]/15 border border-[#5E6AD2]/30 text-[#c9c2ff] hover:bg-[#5E6AD2]/25 flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4" /> Enviar E-mail
            </Button>
            <Button onClick={() => generate(["whatsapp", "email"])} disabled={busy || (!form.phone && !form.email)} data-testid="gen-both-btn" className="btn-primary">
              <Send className="h-4 w-4" /> Enviar tudo
            </Button>
          </div>
        </div>

        <div className="card-bento p-6 space-y-3">
          <div className="overline">Resultado</div>
          {!links ? (
            <div className="h-full flex items-center justify-center text-xs text-zinc-500 py-16 text-center">
              Preencha os dados ao lado.<br />O link personalizado aparece aqui.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                <div className="overline text-emerald-400 mb-1 flex items-center gap-1.5"><Eye className="h-3 w-3" /> Página online</div>
                <div className="font-mono text-[11px] text-zinc-400 truncate" title={links.page_url}>{links.page_url}</div>
                <div className="mt-2 flex items-center gap-2">
                  <button onClick={() => copy(links.page_url)} data-testid="copy-page-btn" className="text-xs px-2 py-1 rounded border border-white/10 hover:bg-white/[0.05] flex items-center gap-1"><Copy className="h-3 w-3" /> Copiar</button>
                  <a href={links.page_url} target="_blank" rel="noopener noreferrer" className="text-xs px-2 py-1 rounded border border-white/10 hover:bg-white/[0.05] flex items-center gap-1"><ExternalLink className="h-3 w-3" /> Abrir</a>
                </div>
              </div>
              <div className="rounded-lg border border-[#5E6AD2]/25 bg-[#5E6AD2]/[0.06] p-3">
                <div className="overline text-[#8B5CF6] mb-1 flex items-center gap-1.5"><FileText className="h-3 w-3" /> PDF one-page</div>
                <div className="font-mono text-[11px] text-zinc-400 truncate" title={links.pdf_url}>{links.pdf_url}</div>
                <div className="mt-2 flex items-center gap-2">
                  <button onClick={() => copy(links.pdf_url)} data-testid="copy-pdf-btn" className="text-xs px-2 py-1 rounded border border-white/10 hover:bg-white/[0.05] flex items-center gap-1"><Copy className="h-3 w-3" /> Copiar</button>
                  <a href={links.pdf_url} target="_blank" rel="noopener noreferrer" className="text-xs px-2 py-1 rounded border border-white/10 hover:bg-white/[0.05] flex items-center gap-1"><Download className="h-3 w-3" /> Baixar</a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Analytics table */}
      <div className="card-bento overflow-hidden">
        <div className="p-4 border-b border-white/10 overline flex items-center justify-between">
          <span>Engajamento por apresentação</span>
          <span className="text-[11px] text-zinc-500 normal-case tracking-normal font-sans">
            Mais aberturas = mais interesse
          </span>
        </div>
        <table className="w-full text-sm" data-testid="analytics-table">
          <thead className="bg-white/[0.02]">
            <tr className="text-left text-[10px] font-mono uppercase tracking-widest text-zinc-500">
              <th className="p-3">Cliente</th>
              <th className="p-3">Valor</th>
              <th className="p-3 text-center">PDF</th>
              <th className="p-3 text-center">Página</th>
              <th className="p-3">Tempo médio</th>
              <th className="p-3">Última abertura</th>
            </tr>
          </thead>
          <tbody>
            {analytics.items.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-zinc-500 text-xs">Nenhuma apresentação foi aberta ainda.</td></tr>
            )}
            {analytics.items.map((a, i) => {
              const heat = a.pdf_opens + a.page_views;
              const hot = heat >= 3;
              return (
                <tr key={i} className="border-t border-white/5">
                  <td className="p-3 font-medium text-zinc-100 flex items-center gap-2">
                    {hot && <TrendingUp className="h-3.5 w-3.5 text-amber-400" title="Cliente engajado" />}
                    {a.cliente}
                  </td>
                  <td className="p-3 font-mono text-xs text-zinc-400">{a.valor ? brl(a.valor) : "—"}</td>
                  <td className="p-3 text-center">
                    <span className={`inline-block min-w-[28px] px-2 py-0.5 rounded text-xs font-mono ${a.pdf_opens ? "bg-[#5E6AD2]/15 text-[#c9c2ff] border border-[#5E6AD2]/30" : "text-zinc-600"}`}>{a.pdf_opens}</span>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`inline-block min-w-[28px] px-2 py-0.5 rounded text-xs font-mono ${a.page_views ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25" : "text-zinc-600"}`}>{a.page_views}</span>
                  </td>
                  <td className="p-3 font-mono text-xs text-zinc-400">
                    {a.avg_time_ms ? `${(a.avg_time_ms / 1000).toFixed(0)}s` : "—"}
                  </td>
                  <td className="p-3 font-mono text-xs text-zinc-400">{timeAgo(a.last_open)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
