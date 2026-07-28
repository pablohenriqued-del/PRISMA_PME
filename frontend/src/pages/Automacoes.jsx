import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Zap, ArrowRight, Trash2 } from "lucide-react";
import { toast } from "sonner";

const TRIGGERS = [
  { v: "novo_lead", l: "Novo lead no CRM" },
  { v: "fatura_vencida", l: "Fatura vencida" },
  { v: "proposta_enviada", l: "Proposta enviada" },
  { v: "nova_conversa_wa", l: "Nova conversa WhatsApp" },
  { v: "tarefa_atrasada", l: "Tarefa atrasada" },
];
const ACTIONS = [
  { v: "enviar_whatsapp", l: "Enviar mensagem WhatsApp" },
  { v: "enviar_email", l: "Enviar e-mail" },
  { v: "criar_tarefa", l: "Criar tarefa" },
  { v: "notificar_time", l: "Notificar o time" },
];
const LABEL = (arr, v) => arr.find((x) => x.v === v)?.l || v;

export default function Automacoes() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", trigger: "novo_lead", action: "enviar_whatsapp", active: true });

  const load = async () => { const r = await api.get("/automations"); setItems(r.data.items); };
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    await api.post("/automations", form);
    setForm({ name: "", trigger: "novo_lead", action: "enviar_whatsapp", active: true });
    setOpen(false);
    load();
    toast.success("Automação criada");
  };
  const toggle = async (a) => {
    setItems((cur) => cur.map((x) => x.auto_id === a.auto_id ? { ...x, active: !a.active } : x));
    await api.patch(`/automations/${a.auto_id}`, { active: !a.active });
  };
  const del = async (id) => { await api.delete(`/automations/${id}`); load(); };

  return (
    <div className="space-y-8 fade-up" data-testid="automacoes-page">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="overline text-black/50">Automações</div>
          <h1 className="font-display text-4xl font-light tracking-tight mt-2">O trabalho invisível.</h1>
          <p className="text-black/60 mt-2 text-sm max-w-lg">Regras simples que rodam por você. Cada gatilho executa uma ação encadeada.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="h-10 bg-[hsl(var(--ink))] hover:bg-black text-[hsl(var(--paper))]" data-testid="new-auto-btn"><Plus className="h-4 w-4 mr-2" />Nova automação</Button></DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Nova automação</DialogTitle></DialogHeader>
            <form onSubmit={create} className="space-y-4 pt-2">
              <div><Label>Nome</Label><Input required data-testid="auto-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Quando (gatilho)</Label>
                <Select value={form.trigger} onValueChange={(v) => setForm({ ...form, trigger: v })}>
                  <SelectTrigger data-testid="auto-trigger"><SelectValue /></SelectTrigger>
                  <SelectContent>{TRIGGERS.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Então (ação)</Label>
                <Select value={form.action} onValueChange={(v) => setForm({ ...form, action: v })}>
                  <SelectTrigger data-testid="auto-action"><SelectValue /></SelectTrigger>
                  <SelectContent>{ACTIONS.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <DialogFooter><Button type="submit" className="bg-[hsl(var(--ink))] hover:bg-black text-[hsl(var(--paper))]" data-testid="save-auto">Ativar</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {items.map((a) => (
          <div key={a.auto_id} className="rounded-md border border-black/10 bg-white p-5 flex items-center gap-5" data-testid={`auto-${a.auto_id}`}>
            <div className="h-10 w-10 rounded-md flex items-center justify-center" style={{ background: a.active ? "hsl(32 95% 55% / 0.3)" : "hsl(220 13% 91%)" }}>
              <Zap className="h-5 w-5" strokeWidth={1.6} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display font-medium">{a.name}</div>
              <div className="mt-1 flex items-center gap-2 text-xs text-black/60 flex-wrap">
                <span className="px-2 py-0.5 rounded bg-black/5 font-mono">{LABEL(TRIGGERS, a.trigger)}</span>
                <ArrowRight className="h-3 w-3" />
                <span className="px-2 py-0.5 rounded bg-black/5 font-mono">{LABEL(ACTIONS, a.action)}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-widest text-black/50">Execuções</div>
                <div className="font-mono text-sm">{a.runs || 0}</div>
              </div>
              <Switch checked={a.active} onCheckedChange={() => toggle(a)} data-testid={`toggle-auto-${a.auto_id}`} />
              <button data-testid={`del-auto-${a.auto_id}`} onClick={() => del(a.auto_id)} className="text-black/40 hover:text-red-600 transition-colors"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="border border-dashed border-black/10 rounded-md p-10 text-center text-sm text-black/40">Sem automações ativas</div>}
      </div>
    </div>
  );
}
