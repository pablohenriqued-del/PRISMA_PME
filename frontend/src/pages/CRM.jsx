import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, GripVertical, Trash2, Mail, Phone, Building2 } from "lucide-react";
import { toast } from "sonner";

const STAGES = ["Lead", "Contato Feito", "Proposta", "Negociação", "Ganho", "Perdido"];
const STAGE_HUE = {
  "Lead": "hsl(220 13% 91%)",
  "Contato Feito": "hsl(78 60% 55% / 0.35)",
  "Proposta": "hsl(32 95% 55% / 0.35)",
  "Negociação": "hsl(245 60% 55% / 0.30)",
  "Ganho": "hsl(148 60% 45% / 0.30)",
  "Perdido": "hsl(8 84% 65% / 0.30)",
};

const brl = (n) => (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const EMPTY = { name: "", company: "", email: "", phone: "", value: 0, stage: "Lead", notes: "" };

export default function CRM() {
  const [leads, setLeads] = useState([]);
  const [openNew, setOpenNew] = useState(false);
  const [editing, setEditing] = useState(null); // full lead object being edited
  const [form, setForm] = useState(EMPTY);

  const load = async () => { const r = await api.get("/crm/leads"); setLeads(r.data.items); };
  useEffect(() => { load(); }, []);

  const createLead = async (e) => {
    e.preventDefault();
    await api.post("/crm/leads", { ...form, value: Number(form.value) || 0 });
    toast.success("Lead criado");
    setForm(EMPTY);
    setOpenNew(false);
    load();
  };

  const moveTo = async (lead, stage) => {
    setLeads((cur) => cur.map((l) => l.lead_id === lead.lead_id ? { ...l, stage } : l));
    try { await api.patch(`/crm/leads/${lead.lead_id}`, { stage }); }
    catch { toast.error("Falha ao mover"); load(); }
  };

  const onDragStart = (e, lead) => { e.dataTransfer.setData("text/plain", lead.lead_id); };
  const onDrop = (e, stage) => {
    const id = e.dataTransfer.getData("text/plain");
    const lead = leads.find((l) => l.lead_id === id);
    if (lead && lead.stage !== stage) moveTo(lead, stage);
  };

  const openEdit = (lead) => {
    setEditing({
      lead_id: lead.lead_id,
      name: lead.name || "",
      company: lead.company || "",
      email: lead.email || "",
      phone: lead.phone || "",
      value: lead.value ?? 0,
      stage: lead.stage || "Lead",
      notes: lead.notes || "",
    });
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editing) return;
    const payload = {
      name: editing.name,
      company: editing.company,
      email: editing.email,
      phone: editing.phone,
      value: Number(editing.value) || 0,
      stage: editing.stage,
      notes: editing.notes,
    };
    try {
      await api.patch(`/crm/leads/${editing.lead_id}`, payload);
      toast.success("Lead atualizado");
      setEditing(null);
      load();
    } catch { toast.error("Falha ao salvar"); }
  };

  const removeLead = async () => {
    if (!editing) return;
    if (!window.confirm(`Excluir o lead "${editing.name}"?`)) return;
    try {
      await api.delete(`/crm/leads/${editing.lead_id}`);
      toast.success("Lead excluído");
      setEditing(null);
      load();
    } catch { toast.error("Falha ao excluir"); }
  };

  const totalPipeline = leads.reduce((s, l) => s + (l.value || 0), 0);

  return (
    <div className="space-y-8 fade-up" data-testid="crm-page">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="overline text-zinc-500">CRM · pipeline</div>
          <h1 className="font-display text-4xl font-light tracking-tight mt-2">Vendas em movimento.</h1>
          <p className="text-zinc-400 mt-2 text-sm">Arraste os cards entre as colunas. Clique em um card para editar todos os campos.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="overline text-zinc-500">Total em pipeline</div>
            <div className="font-display text-2xl mt-1">{brl(totalPipeline)}</div>
          </div>
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button data-testid="new-lead-btn" className="h-10 rounded-md bg-gradient-to-r from-[#5E6AD2] to-[#8B5CF6] hover:opacity-90 text-white">
                <Plus className="h-4 w-4 mr-2" /> Novo lead
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Novo lead</DialogTitle></DialogHeader>
              <form onSubmit={createLead} className="space-y-4 pt-2">
                <div><Label>Nome</Label><Input required data-testid="lead-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Empresa</Label><Input data-testid="lead-company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Email</Label><Input type="email" data-testid="lead-email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                  <div><Label>WhatsApp (E.164)</Label><Input data-testid="lead-phone" placeholder="+5511999999999" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Valor (R$)</Label><Input type="number" data-testid="lead-value" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></div>
                  <div>
                    <Label>Estágio</Label>
                    <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v })}>
                      <SelectTrigger data-testid="lead-stage"><SelectValue /></SelectTrigger>
                      <SelectContent>{STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Notas</Label><Textarea rows={3} data-testid="lead-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                <DialogFooter><Button type="submit" data-testid="save-lead-btn" className="bg-gradient-to-r from-[#5E6AD2] to-[#8B5CF6] hover:opacity-90 text-white">Salvar</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {STAGES.map((stage) => {
            const col = leads.filter((l) => l.stage === stage);
            const sum = col.reduce((s, l) => s + (l.value || 0), 0);
            return (
              <div
                key={stage}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDrop(e, stage)}
                className="w-[280px] shrink-0 flex flex-col rounded-md border border-white/10 bg-[#121214]"
                data-testid={`col-${stage}`}
              >
                <div className="p-3 border-b border-white/10" style={{ background: STAGE_HUE[stage] }}>
                  <div className="flex items-center justify-between">
                    <div className="font-display font-medium text-sm">{stage}</div>
                    <div className="text-[11px] font-mono text-zinc-400">{col.length}</div>
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-1">{brl(sum)}</div>
                </div>
                <div className="p-2 flex-1 min-h-[200px] space-y-2">
                  {col.map((l) => (
                    <button
                      key={l.lead_id}
                      draggable
                      onDragStart={(e) => onDragStart(e, l)}
                      onClick={() => openEdit(l)}
                      data-testid={`lead-card-${l.lead_id}`}
                      className="group w-full text-left rounded-md border border-white/10 bg-[#121214] p-3 cursor-grab active:cursor-grabbing hover:border-white/20 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{l.name}</div>
                          <div className="text-xs text-zinc-500 truncate">{l.company || "—"}</div>
                        </div>
                        <GripVertical className="h-3.5 w-3.5 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="text-xs font-mono text-zinc-300">{brl(l.value)}</div>
                        <div className="flex items-center gap-1">
                          {l.email && <Mail className="h-3 w-3 text-zinc-600" />}
                          {l.phone && <Phone className="h-3 w-3 text-zinc-600" />}
                        </div>
                      </div>
                    </button>
                  ))}
                  {col.length === 0 && (
                    <div className="text-center text-xs text-zinc-500 border border-dashed border-white/10 rounded-md py-6">Arraste um card</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="sm:max-w-lg" data-testid="edit-lead-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-zinc-500" />
              Editar lead
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <form onSubmit={saveEdit} className="space-y-4 pt-2">
              <div><Label>Nome</Label><Input required data-testid="edit-name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div><Label>Empresa</Label><Input data-testid="edit-company" value={editing.company} onChange={(e) => setEditing({ ...editing, company: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Email</Label><Input type="email" data-testid="edit-email" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></div>
                <div><Label>WhatsApp</Label><Input data-testid="edit-phone" placeholder="+5511999999999" value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Valor (R$)</Label><Input type="number" data-testid="edit-value" value={editing.value} onChange={(e) => setEditing({ ...editing, value: e.target.value })} /></div>
                <div>
                  <Label>Estágio</Label>
                  <Select value={editing.stage} onValueChange={(v) => setEditing({ ...editing, stage: v })}>
                    <SelectTrigger data-testid="edit-stage"><SelectValue /></SelectTrigger>
                    <SelectContent>{STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Notas</Label><Textarea rows={4} data-testid="edit-notes" value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} placeholder="Contexto do relacionamento, próximos passos, objeções…" /></div>
              <DialogFooter className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={removeLead} data-testid="delete-lead-btn" className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 mr-auto">
                  <Trash2 className="h-4 w-4 mr-2" /> Excluir
                </Button>
                <Button type="button" variant="ghost" onClick={() => setEditing(null)} data-testid="cancel-edit-btn">Cancelar</Button>
                <Button type="submit" data-testid="save-edit-btn" className="bg-gradient-to-r from-[#5E6AD2] to-[#8B5CF6] hover:opacity-90 text-white">Salvar</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
