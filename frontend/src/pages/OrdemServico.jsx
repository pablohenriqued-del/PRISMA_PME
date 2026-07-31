import React, { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ArrowRight, ClipboardList, CreditCard, KanbanSquare, Wand2 } from "lucide-react";
import { toast } from "sonner";

const STATUSES = [
  { key: "orcamento", label: "Orçamento", tint: "hsl(220 13% 91%)" },
  { key: "aprovada", label: "Aprovada", tint: "hsl(148 60% 45% / 0.28)" },
  { key: "em_execucao", label: "Em execução", tint: "hsl(32 95% 55% / 0.35)" },
  { key: "concluida", label: "Concluída", tint: "hsl(245 60% 55% / 0.28)" },
  { key: "cancelada", label: "Cancelada", tint: "hsl(8 84% 65% / 0.28)" },
];

const brl = (n) => (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

const EMPTY_ITEM = { description: "", quantity: 1, unit_price: 0 };
const EMPTY = {
  title: "", client_name: "", client_email: "", client_phone: "",
  lead_id: null, notes: "", due_date: "", status: "orcamento", items: [{ ...EMPTY_ITEM }],
};

export default function OrdemServico() {
  const [items, setItems] = useState([]);
  const [leads, setLeads] = useState([]);
  const [openNew, setOpenNew] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState("todos");

  const load = async () => {
    const [r1, r2] = await Promise.all([api.get("/os"), api.get("/crm/leads")]);
    setItems(r1.data.items);
    setLeads(r2.data.items);
  };
  useEffect(() => { load(); }, []);

  const total = (its) => (its || []).reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0);

  const create = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      items: form.items.map((i) => ({ description: i.description, quantity: Number(i.quantity) || 1, unit_price: Number(i.unit_price) || 0 })),
    };
    await api.post("/os", payload);
    toast.success("OS criada");
    setForm(EMPTY);
    setOpenNew(false);
    load();
  };

  const fromLead = async (leadId) => {
    if (!leadId) return;
    try {
      await api.post("/os/from-lead", { lead_id: leadId, items: [] });
      toast.success("OS criada a partir do lead");
      load();
    } catch { toast.error("Falha ao criar OS"); }
  };

  const toProject = async (osId) => {
    try {
      const r = await api.post(`/os/${osId}/to-project`);
      toast.success(r.data.already ? "Projeto já existente" : "Projeto criado a partir da OS");
      load();
    } catch { toast.error("Falha ao converter"); }
  };

  const payOS = async (o) => {
    if ((o.total || 0) <= 0) { toast.error("Defina um valor total antes de cobrar"); return; }
    try {
      const r = await api.post("/payments/os-checkout", {
        os_id: o.os_id,
        origin_url: window.location.origin,
      });
      window.location.href = r.data.checkout_url;
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Falha ao gerar cobrança");
    }
  };

  const updateStatus = async (o, status) => {
    setItems((c) => c.map((x) => x.os_id === o.os_id ? { ...x, status } : x));
    try { await api.patch(`/os/${o.os_id}`, { status }); }
    catch { toast.error("Falha"); load(); }
  };

  const removeOS = async (o) => {
    if (!window.confirm(`Excluir OS "${o.title}"?`)) return;
    await api.delete(`/os/${o.os_id}`);
    toast.success("OS excluída");
    load();
  };

  const setItem = (idx, patch) => setForm((f) => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, ...patch } : it) }));
  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }));
  const rmItem = (idx) => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const filtered = filter === "todos" ? items : items.filter((o) => o.status === filter);
  const totalPipeline = useMemo(() => items.reduce((s, o) => s + (o.total || 0), 0), [items]);

  return (
    <div className="space-y-8 fade-up" data-testid="ordem-servico-page">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="overline text-black/50">Ordem de serviço</div>
          <h1 className="font-display text-4xl font-light tracking-tight mt-2">Do orçamento à entrega.</h1>
          <p className="text-black/60 mt-2 text-sm">Cria OS a partir de leads no CRM e transforma em projeto num clique. Cobrança PIX nativa.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="overline text-black/50">Total em OS</div>
            <div className="font-display text-2xl mt-1">{brl(totalPipeline)}</div>
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[160px] h-10" data-testid="os-filter"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button data-testid="new-os-btn" className="h-10 rounded-md bg-[hsl(var(--ink))] hover:bg-black text-[hsl(var(--paper))]">
                <Plus className="h-4 w-4 mr-2" /> Nova OS
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Nova ordem de serviço</DialogTitle></DialogHeader>
              <form onSubmit={create} className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><Label>Título</Label><Input required data-testid="os-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex.: Website institucional — Padaria Bella" /></div>
                  <div><Label>Cliente</Label><Input required data-testid="os-client" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} /></div>
                  <div>
                    <Label>Vincular a lead (opcional)</Label>
                    <Select value={form.lead_id || "none"} onValueChange={(v) => {
                      if (v === "none") { setForm({ ...form, lead_id: null }); return; }
                      const l = leads.find((x) => x.lead_id === v);
                      setForm({ ...form, lead_id: v, client_name: l?.name || form.client_name, client_email: l?.email || form.client_email, client_phone: l?.phone || form.client_phone });
                    }}>
                      <SelectTrigger data-testid="os-lead"><SelectValue placeholder="Sem vínculo" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— sem vínculo —</SelectItem>
                        {leads.map((l) => <SelectItem key={l.lead_id} value={l.lead_id}>{l.name}{l.company ? ` · ${l.company}` : ""}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Email</Label><Input type="email" data-testid="os-email" value={form.client_email} onChange={(e) => setForm({ ...form, client_email: e.target.value })} /></div>
                  <div><Label>WhatsApp</Label><Input data-testid="os-phone" value={form.client_phone} onChange={(e) => setForm({ ...form, client_phone: e.target.value })} /></div>
                  <div><Label>Prazo</Label><Input type="date" data-testid="os-due" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Itens</Label>
                    <button type="button" onClick={addItem} className="text-xs text-black/60 hover:text-black flex items-center gap-1"><Plus className="h-3 w-3" /> item</button>
                  </div>
                  <div className="space-y-2">
                    {form.items.map((it, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2">
                        <Input className="col-span-6" placeholder="Descrição" data-testid={`os-item-desc-${i}`} value={it.description} onChange={(e) => setItem(i, { description: e.target.value })} />
                        <Input className="col-span-2" type="number" placeholder="Qtd" data-testid={`os-item-qty-${i}`} value={it.quantity} onChange={(e) => setItem(i, { quantity: e.target.value })} />
                        <Input className="col-span-3" type="number" placeholder="Valor unit." data-testid={`os-item-val-${i}`} value={it.unit_price} onChange={(e) => setItem(i, { unit_price: e.target.value })} />
                        <button type="button" onClick={() => rmItem(i)} className="col-span-1 text-black/40 hover:text-red-600" aria-label="remover"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-right text-sm text-black/60">Total: <b className="text-black">{brl(total(form.items))}</b></div>
                </div>
                <div><Label>Observações</Label><Textarea rows={3} data-testid="os-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                <DialogFooter><Button type="submit" data-testid="save-os-btn" className="bg-[hsl(var(--ink))] hover:bg-black text-[hsl(var(--paper))]">Criar OS</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* From-lead quick shortcut */}
      {leads.length > 0 && (
        <div className="rounded-md border border-black/10 bg-white p-4 flex items-center gap-3 flex-wrap">
          <Wand2 className="h-4 w-4 text-black/50" />
          <div className="text-sm text-black/70">Atalho: criar OS a partir de um lead</div>
          <Select onValueChange={(v) => fromLead(v)}>
            <SelectTrigger className="h-9 w-[280px]" data-testid="quick-fromlead"><SelectValue placeholder="Selecione o lead…" /></SelectTrigger>
            <SelectContent>
              {leads.map((l) => <SelectItem key={l.lead_id} value={l.lead_id}>{l.name}{l.company ? ` · ${l.company}` : ""}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-testid="os-list">
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 text-black/50 border border-dashed border-black/15 rounded-md">
            <ClipboardList className="h-6 w-6 mx-auto mb-2 opacity-60" />
            Nenhuma OS ainda. Crie a primeira para acompanhar do orçamento à execução.
          </div>
        )}
        {filtered.map((o) => {
          const status = STATUSES.find((s) => s.key === o.status) || STATUSES[0];
          return (
            <div key={o.os_id} data-testid={`os-card-${o.os_id}`} className="rounded-md border border-black/10 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-widest text-black/50">{o.client_name}</div>
                  <div className="font-display text-lg mt-1 truncate">{o.title}</div>
                  <div className="mt-2 text-xs text-black/50">
                    {o.lead_id && <span className="mr-2">CRM ↔</span>}
                    {o.project_id && <span>Projeto ↔</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono text-sm">{brl(o.total)}</div>
                  <div className="mt-1">
                    <Select value={o.status} onValueChange={(v) => updateStatus(o, v)}>
                      <SelectTrigger className="h-7 px-2 text-[11px]" style={{ background: status.tint }} data-testid={`os-status-${o.os_id}`}><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              {o.items?.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm">
                  {o.items.slice(0, 3).map((it, i) => (
                    <li key={i} className="flex items-center justify-between text-black/70">
                      <span className="truncate">{it.description}</span>
                      <span className="font-mono text-xs text-black/60">{Number(it.quantity) || 1} × {brl(it.unit_price)}</span>
                    </li>
                  ))}
                  {o.items.length > 3 && <li className="text-xs text-black/40">+{o.items.length - 3} itens</li>}
                </ul>
              )}
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <Button size="sm" variant="outline" className="h-8" onClick={() => toProject(o.os_id)} data-testid={`to-project-${o.os_id}`}>
                  <KanbanSquare className="h-3.5 w-3.5 mr-1.5" /> Virar projeto <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
                <Button size="sm" className="h-8 bg-[hsl(var(--ink))] hover:bg-black text-[hsl(var(--paper))]" onClick={() => payOS(o)} data-testid={`pay-os-${o.os_id}`}>
                  <CreditCard className="h-3.5 w-3.5 mr-1.5" /> Cobrar via PIX
                </Button>
                <button onClick={() => removeOS(o)} className="ml-auto text-black/40 hover:text-red-600 text-xs" data-testid={`del-os-${o.os_id}`}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
