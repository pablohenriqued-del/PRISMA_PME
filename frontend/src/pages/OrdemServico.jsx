import React, { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ArrowRight, ClipboardList, CreditCard, KanbanSquare, Wand2, Send, Repeat, Copy, BookmarkPlus, ChevronDown, ChevronUp, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const STATUSES = [
  { key: "orcamento", label: "Orçamento", tint: "hsl(220 13% 91%)" },
  { key: "aprovada", label: "Aprovada", tint: "hsl(148 60% 45% / 0.28)" },
  { key: "em_execucao", label: "Em execução", tint: "hsl(32 95% 55% / 0.35)" },
  { key: "concluida", label: "Concluída", tint: "hsl(245 60% 55% / 0.28)" },
  { key: "cancelada", label: "Cancelada", tint: "hsl(8 84% 65% / 0.28)" },
];

const FIELD_TYPES = [
  { key: "text", label: "Texto" },
  { key: "number", label: "Número" },
  { key: "money", label: "R$ (moeda)" },
  { key: "date", label: "Data" },
];

const RECURRENCE_INTERVALS = [
  { key: "weekly", label: "Semanal" },
  { key: "monthly", label: "Mensal" },
  { key: "quarterly", label: "Trimestral" },
];

const brl = (n) => (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

const EMPTY_ITEM = { description: "", quantity: 1, unit_price: 0 };
const EMPTY = {
  title: "", client_name: "", client_email: "", client_phone: "",
  lead_id: null, notes: "", due_date: "", status: "orcamento",
  items: [{ ...EMPTY_ITEM }], custom_fields: [], recurrence: null,
};

export default function OrdemServico() {
  const [items, setItems] = useState([]);
  const [leads, setLeads] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [openNew, setOpenNew] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [filter, setFilter] = useState("todos");
  const [expandedId, setExpandedId] = useState(null);
  const [sendingId, setSendingId] = useState(null);
  const [saveTplOpen, setSaveTplOpen] = useState(false);
  const [tplName, setTplName] = useState("");

  const load = async () => {
    const [r1, r2, r3] = await Promise.all([api.get("/os"), api.get("/crm/leads"), api.get("/os/templates")]);
    setItems(r1.data.items); setLeads(r2.data.items); setTemplates(r3.data.items);
  };
  useEffect(() => { load(); }, []);

  const total = (its) => (its || []).reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0);

  const create = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      items: form.items.map((i) => ({ description: i.description, quantity: Number(i.quantity) || 1, unit_price: Number(i.unit_price) || 0 })),
      custom_fields: form.custom_fields.map((c) => ({ ...c, value: c.type === "number" || c.type === "money" ? (Number(c.value) || 0) : c.value })),
    };
    await api.post("/os", payload);
    toast.success("OS criada");
    setForm(EMPTY); setOpenNew(false); load();
  };

  const fromLead = async (leadId) => {
    if (!leadId) return;
    try {
      await api.post("/os/from-lead", { lead_id: leadId, items: [] });
      toast.success("OS criada a partir do lead"); load();
    } catch { toast.error("Falha ao criar OS"); }
  };

  const fromTemplate = async (tplId) => {
    if (!tplId) return;
    const tpl = templates.find((t) => t.template_id === tplId);
    const name = window.prompt(`Nome do cliente para "${tpl?.name || "template"}":`);
    if (!name) return;
    try {
      await api.post("/os/from-template", { template_id: tplId, client_name: name });
      toast.success("OS criada a partir do template"); load();
    } catch { toast.error("Falha"); }
  };

  const saveAsTemplate = async (o) => {
    setSaveTplOpen(false);
    if (!tplName) return;
    try {
      await api.post("/os/templates", {
        name: tplName, title: o.title, items: o.items || [],
        custom_fields: o.custom_fields || [], notes: o.notes || "",
      });
      toast.success("Template salvo");
      setTplName("");
      const r = await api.get("/os/templates"); setTemplates(r.data.items);
    } catch { toast.error("Falha ao salvar template"); }
  };

  const toProject = async (osId) => {
    try {
      const r = await api.post(`/os/${osId}/to-project`);
      toast.success(r.data.already ? "Projeto já existente" : "Projeto criado a partir da OS"); load();
    } catch { toast.error("Falha ao converter"); }
  };

  const payOS = async (o) => {
    if ((o.total || 0) <= 0) { toast.error("Defina um valor total antes de cobrar"); return; }
    try {
      const r = await api.post("/payments/os-checkout", { os_id: o.os_id, origin_url: window.location.origin });
      window.location.href = r.data.checkout_url;
    } catch (e) { toast.error(e?.response?.data?.detail || "Falha ao gerar cobrança"); }
  };

  const sendOS = async (o) => {
    if (!o.client_email && !o.client_phone) { toast.error("Adicione e-mail ou WhatsApp do cliente"); return; }
    setSendingId(o.os_id);
    try {
      const r = await api.post(`/os/${o.os_id}/send`, { channels: ["email", "whatsapp"], origin_url: window.location.origin });
      const parts = [];
      if (r.data.email?.status === "sent") parts.push("e-mail");
      if (r.data.whatsapp?.status === "sent") parts.push("WhatsApp");
      toast.success(parts.length ? `Enviado por ${parts.join(" + ")}` : "Link do portal atualizado");
      load();
    } catch { toast.error("Falha ao enviar"); }
    finally { setSendingId(null); }
  };

  const copyLink = (o) => {
    const url = `${window.location.origin}/os/publica/${o.public_token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link do portal copiado");
  };

  const updateStatus = async (o, status) => {
    setItems((c) => c.map((x) => x.os_id === o.os_id ? { ...x, status } : x));
    try { await api.patch(`/os/${o.os_id}`, { status }); }
    catch { toast.error("Falha"); load(); }
  };

  const removeOS = async (o) => {
    if (!window.confirm(`Excluir OS "${o.title}"?`)) return;
    await api.delete(`/os/${o.os_id}`); toast.success("OS excluída"); load();
  };

  const setItem = (idx, patch) => setForm((f) => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, ...patch } : it) }));
  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }));
  const rmItem = (idx) => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const setCField = (idx, patch) => setForm((f) => ({ ...f, custom_fields: f.custom_fields.map((c, i) => i === idx ? { ...c, ...patch } : c) }));
  const addCField = () => setForm((f) => ({ ...f, custom_fields: [...f.custom_fields, { name: "", type: "text", value: "" }] }));
  const rmCField = (idx) => setForm((f) => ({ ...f, custom_fields: f.custom_fields.filter((_, i) => i !== idx) }));

  const toggleRecurrence = () => setForm((f) => ({ ...f, recurrence: f.recurrence?.enabled ? null : { enabled: true, interval: "monthly" } }));

  const filtered = filter === "todos" ? items : items.filter((o) => o.status === filter);
  const totalPipeline = useMemo(() => items.reduce((s, o) => s + (o.total || 0), 0), [items]);

  return (
    <div className="space-y-8 fade-up" data-testid="ordem-servico-page">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="overline text-black/50">Ordem de serviço</div>
          <h1 className="font-display text-4xl font-light tracking-tight mt-2">Do orçamento à entrega.</h1>
          <p className="text-black/60 mt-2 text-sm">Envio automático por e-mail + WhatsApp, assinatura eletrônica e cobrança PIX no mesmo link.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="text-right">
            <div className="overline text-black/50">Total em OS</div>
            <div className="font-display text-2xl mt-1">{brl(totalPipeline)}</div>
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[150px] h-10" data-testid="os-filter"><SelectValue /></SelectTrigger>
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
              <DialogHeader><DialogTitle>Nova ordem de serviço</DialogTitle><DialogDescription>Preencha os dados e itens. Você pode enviar e cobrar depois.</DialogDescription></DialogHeader>
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
                  <div><Label>WhatsApp</Label><Input data-testid="os-phone" value={form.client_phone} onChange={(e) => setForm({ ...form, client_phone: e.target.value })} placeholder="+55 11 99999-0000" /></div>
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

                {/* Custom fields */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Campos personalizados</Label>
                    <button type="button" onClick={addCField} className="text-xs text-black/60 hover:text-black flex items-center gap-1" data-testid="add-custom-field"><Plus className="h-3 w-3" /> campo</button>
                  </div>
                  {form.custom_fields.length === 0 && <div className="text-xs text-black/40">Ex.: número da NF, código do cliente, prazo de garantia…</div>}
                  <div className="space-y-2">
                    {form.custom_fields.map((cf, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2">
                        <Input className="col-span-4" placeholder="Nome do campo" value={cf.name} onChange={(e) => setCField(i, { name: e.target.value })} />
                        <Select value={cf.type} onValueChange={(v) => setCField(i, { type: v })}>
                          <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                          <SelectContent>{FIELD_TYPES.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}</SelectContent>
                        </Select>
                        <Input className="col-span-4" type={cf.type === "date" ? "date" : (cf.type === "number" || cf.type === "money") ? "number" : "text"} placeholder="Valor" value={cf.value || ""} onChange={(e) => setCField(i, { value: e.target.value })} />
                        <button type="button" onClick={() => rmCField(i)} className="col-span-1 text-black/40 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recurrence */}
                <div className="border border-black/10 rounded-md p-3">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={!!form.recurrence?.enabled} onChange={toggleRecurrence} data-testid="os-recurrence-toggle" />
                      <Repeat className="h-3.5 w-3.5" />
                      Recorrente
                    </label>
                    {form.recurrence?.enabled && (
                      <Select value={form.recurrence.interval || "monthly"} onValueChange={(v) => setForm((f) => ({ ...f, recurrence: { ...f.recurrence, interval: v } }))}>
                        <SelectTrigger className="w-[160px] h-9" data-testid="os-recurrence-interval"><SelectValue /></SelectTrigger>
                        <SelectContent>{RECURRENCE_INTERVALS.map((r) => <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>)}</SelectContent>
                      </Select>
                    )}
                  </div>
                  {form.recurrence?.enabled && <p className="text-xs text-black/50 mt-2">Uma nova OS será criada automaticamente {form.recurrence.interval === "weekly" ? "toda semana" : form.recurrence.interval === "quarterly" ? "a cada 3 meses" : "todo mês"}.</p>}
                </div>

                <div><Label>Observações</Label><Textarea rows={3} data-testid="os-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                <DialogFooter><Button type="submit" data-testid="save-os-btn" className="bg-[hsl(var(--ink))] hover:bg-black text-[hsl(var(--paper))]">Criar OS</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Quick shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {leads.length > 0 && (
          <div className="rounded-md border border-black/10 bg-white p-4 flex items-center gap-3 flex-wrap">
            <Wand2 className="h-4 w-4 text-black/50" />
            <div className="text-sm text-black/70">A partir de um lead</div>
            <Select onValueChange={(v) => fromLead(v)}>
              <SelectTrigger className="h-9 flex-1 min-w-[200px]" data-testid="quick-fromlead"><SelectValue placeholder="Selecione o lead…" /></SelectTrigger>
              <SelectContent>{leads.map((l) => <SelectItem key={l.lead_id} value={l.lead_id}>{l.name}{l.company ? ` · ${l.company}` : ""}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
        {templates.length > 0 && (
          <div className="rounded-md border border-black/10 bg-white p-4 flex items-center gap-3 flex-wrap">
            <BookmarkPlus className="h-4 w-4 text-black/50" />
            <div className="text-sm text-black/70">A partir de um template</div>
            <Select onValueChange={(v) => fromTemplate(v)}>
              <SelectTrigger className="h-9 flex-1 min-w-[200px]" data-testid="quick-fromtpl"><SelectValue placeholder="Selecione o template…" /></SelectTrigger>
              <SelectContent>{templates.map((t) => <SelectItem key={t.template_id} value={t.template_id}>{t.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-testid="os-list">
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 text-black/50 border border-dashed border-black/15 rounded-md">
            <ClipboardList className="h-6 w-6 mx-auto mb-2 opacity-60" />
            Nenhuma OS ainda. Crie a primeira para acompanhar do orçamento à execução.
          </div>
        )}
        {filtered.map((o) => {
          const status = STATUSES.find((s) => s.key === o.status) || STATUSES[0];
          const isExpanded = expandedId === o.os_id;
          return (
            <div key={o.os_id} data-testid={`os-card-${o.os_id}`} className="rounded-md border border-black/10 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-black/50">
                    {o.client_name}
                    {o.recurrence?.enabled && <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700"><Repeat className="h-3 w-3" />{RECURRENCE_INTERVALS.find(r => r.key === o.recurrence.interval)?.label}</span>}
                    {o.signed_at && <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700"><ShieldCheck className="h-3 w-3" />Assinada</span>}
                    {o.sent_at && !o.signed_at && <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700">Enviada</span>}
                  </div>
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

              {isExpanded && (
                <>
                  {(o.items || []).length > 0 && (
                    <ul className="mt-4 space-y-1 text-sm border-t border-black/5 pt-3">
                      {o.items.map((it, i) => (
                        <li key={i} className="flex items-center justify-between text-black/70">
                          <span className="truncate">{it.description}</span>
                          <span className="font-mono text-xs text-black/60">{Number(it.quantity) || 1} × {brl(it.unit_price)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {(o.custom_fields || []).length > 0 && (
                    <div className="mt-3 border-t border-black/5 pt-3">
                      <div className="overline text-black/50 mb-2">Campos personalizados</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {o.custom_fields.map((cf, i) => (
                          <div key={i}><span className="text-black/50">{cf.name}: </span><b>{cf.type === "money" ? brl(cf.value) : String(cf.value ?? "—")}</b></div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <Button size="sm" variant="outline" className="h-8" onClick={() => sendOS(o)} disabled={sendingId === o.os_id} data-testid={`send-os-${o.os_id}`}>
                  <Send className="h-3.5 w-3.5 mr-1.5" /> {sendingId === o.os_id ? "Enviando…" : "Enviar"}
                </Button>
                <Button size="sm" variant="outline" className="h-8" onClick={() => copyLink(o)} data-testid={`copy-link-${o.os_id}`}>
                  <Copy className="h-3.5 w-3.5 mr-1.5" /> Link
                </Button>
                <Button size="sm" variant="outline" className="h-8" onClick={() => toProject(o.os_id)} data-testid={`to-project-${o.os_id}`}>
                  <KanbanSquare className="h-3.5 w-3.5 mr-1.5" /> Projeto <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
                <Button size="sm" className="h-8 bg-[hsl(var(--ink))] hover:bg-black text-[hsl(var(--paper))]" onClick={() => payOS(o)} data-testid={`pay-os-${o.os_id}`}>
                  <CreditCard className="h-3.5 w-3.5 mr-1.5" /> PIX
                </Button>
                <button
                  onClick={() => { setSaveTplOpen(true); setTplName(o.title || ""); window._tplSource = o; }}
                  className="text-xs text-black/50 hover:text-black flex items-center gap-1"
                  data-testid={`save-tpl-${o.os_id}`}
                  title="Salvar como template">
                  <BookmarkPlus className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setExpandedId(isExpanded ? null : o.os_id)} className="ml-auto text-black/40 hover:text-black text-xs flex items-center gap-1" data-testid={`toggle-${o.os_id}`}>
                  {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />} {isExpanded ? "Recolher" : "Detalhes"}
                </button>
                <button onClick={() => removeOS(o)} className="text-black/40 hover:text-red-600 text-xs" data-testid={`del-os-${o.os_id}`} title="Excluir">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Save as template dialog */}
      <Dialog open={saveTplOpen} onOpenChange={setSaveTplOpen}>
        <DialogContent className="sm:max-w-md" data-testid="save-tpl-dialog">
          <DialogHeader><DialogTitle>Salvar como template</DialogTitle><DialogDescription>Ficará disponível no atalho &quot;A partir de um template&quot; para reusar itens e campos.</DialogDescription></DialogHeader>
          <div className="space-y-3 pt-2">
            <div><Label>Nome do template</Label><Input value={tplName} onChange={(e) => setTplName(e.target.value)} placeholder="Ex.: Website institucional PMEs" data-testid="tpl-name" /></div>
            <DialogFooter>
              <Button onClick={() => saveAsTemplate(window._tplSource || {})} className="bg-[hsl(var(--ink))] text-[hsl(var(--paper))] hover:bg-black" data-testid="tpl-save-btn">Salvar template</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
