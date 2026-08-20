import React, { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, TrendingUp, TrendingDown, Trash2, Check, Download, Repeat, Wallet, AlertTriangle, Clock, PiggyBank, CreditCard, Upload } from "lucide-react";
import { toast } from "sonner";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RTooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";

const brl = (n) => (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
const firstOfMonth = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); };

const CATEGORIES = ["Assinaturas", "Consultoria", "Serviços", "Produtos", "Folha", "Impostos", "Marketing", "Software (SaaS)", "Aluguel", "Fornecedores", "Comissões", "Outros"];
const DONUT_COLORS = ["#5E6AD2", "#8B5CF6", "#00E5FF", "#10B981", "#F59E0B", "#EF4444", "#EC4899", "#84CC16", "#A855F7", "#F97316", "#14B8A6", "#71717A"];

const EMPTY = {
  description: "", amount: 0, kind: "receita",
  date: today(), due_date: today(), paid_date: "",
  status: "pago", category: "Serviços", client_name: "", notes: "",
  recurrence: { enabled: false, interval: "monthly", next_at: "" },
};

const STATUS_STYLE = {
  pago:      "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
  pendente:  "bg-amber-500/10 text-amber-400 border-amber-500/25",
  vencido:   "bg-red-500/10 text-red-400 border-red-500/25",
};

const PERIOD_PRESETS = [
  { key: "month", label: "Mês atual", from: firstOfMonth(), to: today() },
  { key: "30d",   label: "Últimos 30d", from: addDays(today(), -30), to: today() },
  { key: "90d",   label: "Últimos 90d", from: addDays(today(), -90), to: today() },
  { key: "year",  label: "Ano",       from: `${new Date().getFullYear()}-01-01`, to: today() },
  { key: "all",   label: "Tudo",      from: "", to: "" },
];

export default function Financeiro() {
  const [data, setData] = useState({ items: [], receita: 0, despesa: 0, saldo: 0, a_receber: 0, a_pagar: 0, categories: [] });
  const [summary, setSummary] = useState(null);
  const [period, setPeriod] = useState("month");
  const [filterKind, setFilterKind] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const pp = PERIOD_PRESETS.find((p) => p.key === period);
  const params = useMemo(() => {
    const q = new URLSearchParams();
    if (pp?.from) q.set("date_from", pp.from);
    if (pp?.to) q.set("date_to", pp.to);
    if (filterKind) q.set("kind", filterKind);
    if (filterStatus) q.set("status", filterStatus);
    return q.toString();
  }, [pp, filterKind, filterStatus]);

  const load = async () => {
    const r = await api.get(`/finance${params ? `?${params}` : ""}`);
    setData(r.data);
    const s = await api.get("/finance/summary");
    setSummary(s.data);
  };
  useEffect(() => { load(); }, [params]);

  const create = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      amount: Number(form.amount) || 0,
      due_date: form.due_date || null,
      paid_date: form.status === "pago" ? (form.paid_date || form.date) : null,
      recurrence: form.recurrence?.enabled ? form.recurrence : null,
    };
    try {
      await api.post("/finance", payload);
      toast.success("Lançamento adicionado");
      setForm(EMPTY);
      setOpen(false);
      load();
    } catch (err) { toast.error("Falha ao salvar"); }
  };

  const markPaid = async (tx) => {
    try { await api.patch(`/finance/${tx.tx_id}`, { status: "pago", paid_date: today() }); load(); toast.success("Marcado como pago"); }
    catch { toast.error("Falha ao atualizar"); }
  };
  const del = async (id) => { if (!window.confirm("Excluir lançamento?")) return; await api.delete(`/finance/${id}`); load(); };

  const [pixOpen, setPixOpen] = useState(false);
  const [pixTx, setPixTx] = useState(null);
  const [pixForm, setPixForm] = useState({ email: "", phone: "" });
  const openPix = (tx) => { setPixTx(tx); setPixForm({ email: "", phone: "" }); setPixOpen(true); };
  const sendPix = async (channels) => {
    if (!pixTx) return;
    try {
      const r = await api.post(`/finance/${pixTx.tx_id}/send-pix`, {
        email: pixForm.email || null, phone: pixForm.phone || null, channels,
        origin_url: window.location.origin,
      });
      if (channels.includes("whatsapp")) {
        if (r.data.whatsapp?.status === "sent") toast.success("WhatsApp enviado");
        else if (r.data.whatsapp?.status === "error") toast.error(r.data.whatsapp.hint || "Falha WhatsApp");
      }
      if (channels.includes("email")) {
        if (r.data.email?.status === "sent") toast.success("E-mail enviado");
        else if (r.data.email?.status === "error") toast.error("Falha e-mail");
      }
      if (!channels.length) {
        navigator.clipboard.writeText(r.data.checkout_url);
        toast.success("Link PIX copiado");
      }
      setPixOpen(false); load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Falha ao gerar PIX");
    }
  };

  const importCsv = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData(); fd.append("file", file);
    try {
      const r = await api.post("/finance/import-csv", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success(`${r.data.inserted} lançamentos importados`);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Falha ao importar CSV");
    }
    e.target.value = "";
  };

  // Series for area chart
  const series = useMemo(() => {
    const map = {};
    data.items.forEach((t) => {
      map[t.date] = map[t.date] || { date: t.date, receita: 0, despesa: 0 };
      map[t.date][t.kind] += t.amount;
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [data.items]);

  const monthDelta = summary
    ? {
        rec: summary.current_month.receita - summary.previous_month.receita,
        desp: summary.current_month.despesa - summary.previous_month.despesa,
        lucro: summary.current_month.lucro - summary.previous_month.lucro,
      }
    : null;

  const exportCsv = () => {
    const url = `${process.env.REACT_APP_BACKEND_URL}/api/finance/export.csv`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6 fade-up" data-testid="financeiro-page">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="overline text-zinc-500">Financeiro</div>
          <h1 className="font-display text-4xl font-semibold tracking-tight mt-2 text-gradient">Fluxo de caixa completo.</h1>
          <p className="text-zinc-400 mt-2 text-sm">A receber, a pagar, DRE mensal, categorias e fluxo projetado 90 dias.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="h-10 px-3 rounded-md border border-white/10 bg-white/[0.02] text-zinc-200 hover:bg-white/[0.06] cursor-pointer inline-flex items-center gap-2 text-sm" data-testid="import-csv-label">
            <Upload className="h-4 w-4" /> Importar CSV
            <input type="file" accept=".csv" onChange={importCsv} className="hidden" data-testid="import-csv-input" />
          </label>
          <Button variant="outline" onClick={exportCsv} data-testid="export-csv" className="h-10 border-white/10 bg-white/[0.02] text-zinc-200 hover:bg-white/[0.06]">
            <Download className="h-4 w-4 mr-2" /> Exportar CSV
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="h-10 btn-primary" data-testid="new-tx-btn">
                <Plus className="h-4 w-4" />Novo lançamento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Novo lançamento</DialogTitle></DialogHeader>
              <form onSubmit={create} className="space-y-4 pt-2">
                <div><Label>Descrição</Label><Input required data-testid="tx-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Tipo</Label>
                    <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
                      <SelectTrigger data-testid="tx-kind"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="receita">Receita (a receber)</SelectItem>
                        <SelectItem value="despesa">Despesa (a pagar)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Categoria</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger data-testid="tx-category"><SelectValue /></SelectTrigger>
                      <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Valor (R$)</Label><Input type="number" step="0.01" required data-testid="tx-amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
                  <div><Label>Cliente/Fornecedor</Label><Input data-testid="tx-client" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Competência</Label><Input type="date" data-testid="tx-date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
                  <div><Label>Vencimento</Label><Input type="date" data-testid="tx-due" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
                  <div><Label>Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger data-testid="tx-status"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pago">Pago</SelectItem>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="vencido">Vencido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {/* Recurrence */}
                <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        data-testid="tx-recurrent"
                        checked={form.recurrence?.enabled || false}
                        onChange={(e) => setForm({ ...form, recurrence: { ...form.recurrence, enabled: e.target.checked } })}
                        className="accent-[#5E6AD2]"
                      />
                      <Repeat className="h-3.5 w-3.5 text-[#8B5CF6]" /> Lançamento recorrente
                    </label>
                    {form.recurrence?.enabled && (
                      <Select value={form.recurrence.interval} onValueChange={(v) => setForm({ ...form, recurrence: { ...form.recurrence, interval: v } })}>
                        <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Semanal</SelectItem>
                          <SelectItem value="monthly">Mensal</SelectItem>
                          <SelectItem value="quarterly">Trimestral</SelectItem>
                          <SelectItem value="yearly">Anual</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
                <div><Label>Notas</Label><Textarea rows={2} data-testid="tx-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                <DialogFooter>
                  <Button type="submit" className="btn-primary" data-testid="save-tx">Salvar</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* PIX Dialog */}
      <Dialog open={pixOpen} onOpenChange={setPixOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Cobrar via PIX</DialogTitle></DialogHeader>
          {pixTx && (
            <div className="space-y-4 pt-2">
              <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                <div className="text-xs text-zinc-500">Lançamento</div>
                <div className="font-medium text-zinc-100 mt-1">{pixTx.description}</div>
                <div className="mt-2 font-mono text-2xl text-emerald-400">{brl(pixTx.amount)}</div>
              </div>
              <div><Label>E-mail do cliente</Label><Input type="email" data-testid="pix-email" value={pixForm.email} onChange={(e) => setPixForm({ ...pixForm, email: e.target.value })} placeholder="cliente@empresa.com" /></div>
              <div><Label>WhatsApp do cliente</Label><Input data-testid="pix-phone" value={pixForm.phone} onChange={(e) => setPixForm({ ...pixForm, phone: e.target.value })} placeholder="+5521987654321" /></div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button onClick={() => sendPix([])} data-testid="pix-only-link" className="btn-secondary">Só copiar link</Button>
                <Button onClick={() => sendPix(["whatsapp"])} disabled={!pixForm.phone} data-testid="pix-wa"
                        className="h-10 px-4 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 text-sm">
                  WhatsApp
                </Button>
                <Button onClick={() => sendPix(["email"])} disabled={!pixForm.email} data-testid="pix-mail"
                        className="h-10 px-4 rounded-md bg-[#5E6AD2]/15 border border-[#5E6AD2]/30 text-[#c9c2ff] hover:bg-[#5E6AD2]/25 text-sm">
                  E-mail
                </Button>
                <Button onClick={() => sendPix(["whatsapp", "email"])} disabled={!pixForm.phone && !pixForm.email} data-testid="pix-both" className="btn-primary ml-auto">
                  Enviar tudo
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI icon={TrendingUp}   label="Receita no período" value={data.receita} tone="emerald" delta={monthDelta?.rec} data-testid="kpi-rec" />
        <KPI icon={TrendingDown} label="Despesa no período" value={data.despesa} tone="rose"    delta={monthDelta?.desp} inverse data-testid="kpi-desp" />
        <KPI icon={Wallet}       label="Saldo"              value={data.saldo}   tone="primary" delta={monthDelta?.lucro} data-testid="kpi-saldo" />
        <KPI icon={AlertTriangle} label="A vencer / vencido" value={data.a_receber + data.a_pagar} tone="amber" hint={`${brl(data.a_receber)} a receber · ${brl(data.a_pagar)} a pagar`} data-testid="kpi-alert" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {PERIOD_PRESETS.map((p) => (
          <button key={p.key} onClick={() => setPeriod(p.key)} data-testid={`period-${p.key}`}
                  className={`h-8 px-3 rounded-md text-xs font-mono uppercase tracking-widest border transition-colors ${period === p.key ? "bg-[#5E6AD2] text-white border-[#5E6AD2]" : "bg-white/[0.02] border-white/10 text-zinc-400 hover:text-white hover:border-white/20"}`}>
            {p.label}
          </button>
        ))}
        <div className="w-px h-6 bg-white/10 mx-2" />
        <Select value={filterKind || "all"} onValueChange={(v) => setFilterKind(v === "all" ? "" : v)}>
          <SelectTrigger className="w-36 h-8 text-xs" data-testid="filter-kind"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="receita">Só receitas</SelectItem>
            <SelectItem value="despesa">Só despesas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus || "all"} onValueChange={(v) => setFilterStatus(v === "all" ? "" : v)}>
          <SelectTrigger className="w-36 h-8 text-xs" data-testid="filter-status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="vencido">Vencido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Chart row: area (2/3) + donut (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card-bento p-6">
          <div className="overline">Movimentação · {pp?.label}</div>
          <div className="h-56 mt-3">
            <ResponsiveContainer>
              <AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
                <defs>
                  <linearGradient id="rec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="des" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EF4444" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#EF4444" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#71717A" }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#71717A" }} />
                <RTooltip contentStyle={{ backgroundColor: "#121214", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12, color: "#EDEDED" }} formatter={(v) => brl(v)} />
                <Area type="monotone" dataKey="receita" stroke="#10B981" strokeWidth={2} fill="url(#rec)" />
                <Area type="monotone" dataKey="despesa" stroke="#EF4444" strokeWidth={2} fill="url(#des)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card-bento p-6">
          <div className="overline">Despesas por categoria</div>
          {data.categories?.length ? (
            <div className="h-56 mt-3">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={data.categories} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} stroke="#08090A" strokeWidth={2}>
                    {data.categories.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                  </Pie>
                  <RTooltip contentStyle={{ backgroundColor: "#121214", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12, color: "#EDEDED" }} formatter={(v) => brl(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center text-xs text-zinc-500">Sem despesas no período</div>
          )}
          <div className="mt-2 space-y-1.5 max-h-24 overflow-y-auto">
            {data.categories?.slice(0, 5).map((c, i) => (
              <div key={c.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                  <span className="text-zinc-300">{c.name}</span>
                </div>
                <span className="font-mono text-zinc-400">{brl(c.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* DRE + Projection */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card-bento p-6">
            <div className="overline mb-3">DRE · mês vs. mês anterior</div>
            <div className="space-y-2 text-sm">
              <DreLine label="Receita bruta"   cur={summary.current_month.receita} prev={summary.previous_month.receita} />
              <DreLine label="(–) Despesas"    cur={summary.current_month.despesa} prev={summary.previous_month.despesa} negative />
              <div className="h-px bg-white/10 my-2" />
              <DreLine label="Lucro líquido"   cur={summary.current_month.lucro}   prev={summary.previous_month.lucro} bold />
            </div>
          </div>
          <div className="card-bento p-6">
            <div className="overline mb-3 flex items-center gap-1.5"><Clock className="h-3 w-3" /> Fluxo projetado · próximos 90 dias</div>
            <div className="grid grid-cols-3 gap-3">
              <ForecastBox label="A receber" value={summary.projection_90d.receita} tone="emerald" />
              <ForecastBox label="A pagar"   value={summary.projection_90d.despesa} tone="rose" />
              <ForecastBox label="Saldo"     value={summary.projection_90d.saldo}   tone={summary.projection_90d.saldo >= 0 ? "primary" : "rose"} icon={PiggyBank} />
            </div>
            <p className="mt-4 text-[11px] text-zinc-500">Baseado em lançamentos pendentes/vencidos com vencimento nos próximos 90 dias.</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card-bento overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="overline">Lançamentos · {data.items.length}</div>
          <div className="text-xs text-zinc-500 font-mono">{brl(data.saldo)} líquido</div>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((t) => (
              <TableRow key={t.tx_id} data-testid={`tx-row-${t.tx_id}`} className="border-white/5">
                <TableCell className="font-medium text-zinc-100 max-w-[260px] truncate">
                  <div className="flex items-center gap-2">
                    {t.recurrence?.enabled && <Repeat className="h-3 w-3 text-[#8B5CF6]" title="Recorrente" />}
                    {t.description}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-zinc-400">{t.category || "—"}</TableCell>
                <TableCell className="text-xs text-zinc-400 max-w-[160px] truncate">{t.client_name || "—"}</TableCell>
                <TableCell className="font-mono text-xs text-zinc-400">{t.due_date || t.date}</TableCell>
                <TableCell>
                  <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border ${STATUS_STYLE[t.status] || STATUS_STYLE.pendente}`}>
                    {t.status}
                  </span>
                </TableCell>
                <TableCell className={`text-right font-mono ${t.kind === "receita" ? "text-emerald-400" : "text-rose-400"}`}>
                  {t.kind === "despesa" ? "- " : ""}{brl(t.amount)}
                </TableCell>
                <TableCell className="w-24">
                  <div className="flex items-center justify-end gap-1">
                    {t.kind === "receita" && t.status !== "pago" && (
                      <button data-testid={`pix-${t.tx_id}`} onClick={() => openPix(t)}
                              title="Cobrar via PIX"
                              className="p-1.5 rounded hover:bg-[#5E6AD2]/15 text-[#8B5CF6] transition-colors">
                        <CreditCard className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {t.status !== "pago" && (
                      <button data-testid={`mark-paid-${t.tx_id}`} onClick={() => markPaid(t)}
                              title="Marcar como pago"
                              className="p-1.5 rounded hover:bg-emerald-500/10 text-emerald-400 transition-colors">
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button data-testid={`del-tx-${t.tx_id}`} onClick={() => del(t.tx_id)}
                            className="p-1.5 rounded hover:bg-rose-500/10 text-zinc-500 hover:text-rose-400 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {data.items.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-sm text-zinc-500 py-12">Nenhum lançamento no filtro atual.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

const KPI = ({ icon: Icon, label, value, tone, delta, inverse, hint, ...rest }) => {
  const toneClass = {
    emerald: "text-emerald-400",
    rose: "text-rose-400",
    primary: "text-[#8B5CF6]",
    amber: "text-amber-400",
  }[tone] || "text-zinc-100";
  const isUp = delta != null && (inverse ? delta < 0 : delta > 0);
  const isDown = delta != null && (inverse ? delta > 0 : delta < 0);
  return (
    <div className="card-bento p-5" {...rest}>
      <div className="flex items-center gap-2 overline">
        <Icon className={`h-3.5 w-3.5 ${toneClass}`} /> {label}
      </div>
      <div className={`font-display text-3xl font-semibold mt-3 tracking-tight ${toneClass}`}>{brl(value)}</div>
      {delta != null && !hint && (
        <div className={`mt-1 text-[11px] font-mono ${isUp ? "text-emerald-400" : isDown ? "text-rose-400" : "text-zinc-500"}`}>
          {delta > 0 ? "+" : ""}{brl(delta)} vs. mês anterior
        </div>
      )}
      {hint && <div className="mt-1 text-[11px] text-zinc-500 truncate" title={hint}>{hint}</div>}
    </div>
  );
};

const DreLine = ({ label, cur, prev, negative, bold }) => {
  const delta = cur - prev;
  const pct = prev !== 0 ? ((delta / Math.abs(prev)) * 100) : 0;
  return (
    <div className={`flex items-center justify-between ${bold ? "font-semibold text-zinc-100" : "text-zinc-300"}`}>
      <div>{label}</div>
      <div className="flex items-center gap-3">
        <span className="font-mono">{negative ? "- " : ""}{brl(cur)}</span>
        <span className={`text-[10px] font-mono w-16 text-right ${delta === 0 ? "text-zinc-500" : (delta > 0 ? (negative ? "text-rose-400" : "text-emerald-400") : (negative ? "text-emerald-400" : "text-rose-400"))}`}>
          {prev !== 0 ? `${delta > 0 ? "+" : ""}${pct.toFixed(0)}%` : "—"}
        </span>
      </div>
    </div>
  );
};

const ForecastBox = ({ label, value, tone, icon: Icon }) => {
  const toneClass = {
    emerald: "text-emerald-400 border-emerald-500/25 bg-emerald-500/[0.06]",
    rose:    "text-rose-400 border-rose-500/25 bg-rose-500/[0.06]",
    primary: "text-[#8B5CF6] border-[#5E6AD2]/25 bg-[#5E6AD2]/[0.06]",
  }[tone];
  return (
    <div className={`rounded-lg border p-3 ${toneClass}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest opacity-80">
        {Icon && <Icon className="h-3 w-3" />} {label}
      </div>
      <div className="font-display text-lg font-semibold mt-1 tracking-tight">{brl(value)}</div>
    </div>
  );
};
