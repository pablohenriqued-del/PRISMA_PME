import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Zap, ArrowRight, Trash2, Play, Settings2, Activity } from "lucide-react";
import { toast } from "sonner";

const TRIGGERS = [
  { v: "novo_lead", l: "Novo lead no CRM" },
  { v: "fatura_vencida", l: "Fatura vencida" },
  { v: "proposta_enviada", l: "Proposta enviada (estágio muda)" },
  { v: "nova_conversa_wa", l: "Nova conversa WhatsApp (recebida)" },
];
const ACTIONS = [
  { v: "enviar_whatsapp", l: "Enviar WhatsApp" },
  { v: "enviar_email", l: "Enviar e-mail" },
  { v: "criar_tarefa", l: "Criar tarefa" },
  { v: "notificar_time", l: "Notificar equipe por e-mail" },
];
const LABEL = (arr, v) => arr.find((x) => x.v === v)?.l || v;

export default function Automacoes() {
  const [items, setItems] = useState([]);
  const [runs, setRuns] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", trigger: "novo_lead", action: "enviar_whatsapp", active: true, target: "", template: "" });

  const load = async () => {
    const [a, r] = await Promise.all([api.get("/automations"), api.get("/automations/runs")]);
    setItems(a.data.items); setRuns(r.data.items);
  };
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    await api.post("/automations", form);
    setForm({ name: "", trigger: "novo_lead", action: "enviar_whatsapp", active: true, target: "", template: "" });
    setOpen(false); load();
    toast.success("Automação criada");
  };
  const toggle = async (a) => {
    setItems((cur) => cur.map((x) => x.auto_id === a.auto_id ? { ...x, active: !a.active } : x));
    await api.patch(`/automations/${a.auto_id}`, { active: !a.active });
  };
  const del = async (id) => { await api.delete(`/automations/${id}`); load(); };
  const test = async (id) => {
    const r = await api.post(`/automations/${id}/test`);
    const status = r?.data?.result?.status || "executed";
    toast.success(`Teste: ${status}`);
    load();
  };
  const saveEdit = async () => {
    await api.patch(`/automations/${editing.auto_id}`, { target: editing.target, template: editing.template });
    toast.success("Salvo");
    setEditing(null); load();
  };

  const targetHint = (action) =>
    action === "enviar_whatsapp" ? "Telefone alvo (ex: +5511999999999) — vazio = usa telefone do contexto"
    : action === "enviar_email" ? "E-mail alvo — vazio = usa e-mail do contexto"
    : action === "criar_tarefa" ? "Título da tarefa (opcional)"
    : "Resumo da notificação (opcional)";

  return (
    <div className="space-y-8 fade-up" data-testid="automacoes-page">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="overline text-zinc-500">Automações</div>
          <h1 className="font-display text-4xl font-light tracking-tight mt-2">O trabalho invisível.</h1>
          <p className="text-zinc-400 mt-2 text-sm max-w-lg">Regras que rodam por você. Testadas com WhatsApp real (Twilio) e e-mail (Resend).</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="h-10 bg-gradient-to-r from-[#5E6AD2] to-[#8B5CF6] hover:opacity-90 text-white" data-testid="new-auto-btn"><Plus className="h-4 w-4 mr-2" />Nova automação</Button></DialogTrigger>
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
              <div>
                <Label>Alvo (opcional)</Label>
                <Input data-testid="auto-target" placeholder={targetHint(form.action)} value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} />
              </div>
              <div>
                <Label>Mensagem / template (opcional)</Label>
                <Textarea data-testid="auto-template" rows={3} placeholder="Deixe em branco para usar o texto padrão" value={form.template} onChange={(e) => setForm({ ...form, template: e.target.value })} />
              </div>
              <DialogFooter><Button type="submit" className="bg-gradient-to-r from-[#5E6AD2] to-[#8B5CF6] hover:opacity-90 text-white" data-testid="save-auto">Ativar</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="rules">
        <TabsList className="bg-transparent p-0 gap-1 border-b border-white/10 rounded-none w-full justify-start h-auto">
          <TabsTrigger value="rules" data-testid="tab-rules" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[hsl(var(--ink))] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4">Regras</TabsTrigger>
          <TabsTrigger value="runs" data-testid="tab-runs" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[hsl(var(--ink))] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4">Execuções · {runs.length}</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="mt-6 space-y-3">
          {items.map((a) => (
            <div key={a.auto_id} className="rounded-md border border-white/10 bg-[#121214] p-5 flex items-center gap-5" data-testid={`auto-${a.auto_id}`}>
              <div className="h-10 w-10 rounded-md flex items-center justify-center" style={{ background: a.active ? "hsl(32 95% 55% / 0.3)" : "hsl(220 13% 91%)" }}>
                <Zap className="h-5 w-5" strokeWidth={1.6} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display font-medium">{a.name}</div>
                <div className="mt-1 flex items-center gap-2 text-xs text-zinc-400 flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-[#121214]/5 font-mono">{LABEL(TRIGGERS, a.trigger)}</span>
                  <ArrowRight className="h-3 w-3" />
                  <span className="px-2 py-0.5 rounded bg-[#121214]/5 font-mono">{LABEL(ACTIONS, a.action)}</span>
                  {a.target && <span className="text-zinc-500">→ {a.target}</span>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-widest text-zinc-500">Execuções</div>
                  <div className="font-mono text-sm">{a.runs || 0}</div>
                </div>
                <Button size="sm" variant="outline" className="h-8 border-white/10" onClick={() => test(a.auto_id)} data-testid={`test-auto-${a.auto_id}`}>
                  <Play className="h-3 w-3 mr-1" /> Testar
                </Button>
                <Button size="sm" variant="outline" className="h-8 w-8 p-0 border-white/10" onClick={() => setEditing({ ...a })} data-testid={`edit-auto-${a.auto_id}`}>
                  <Settings2 className="h-3.5 w-3.5" />
                </Button>
                <Switch checked={a.active} onCheckedChange={() => toggle(a)} data-testid={`toggle-auto-${a.auto_id}`} />
                <button data-testid={`del-auto-${a.auto_id}`} onClick={() => del(a.auto_id)} className="text-zinc-500 hover:text-red-600 transition-colors"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
          {items.length === 0 && <div className="border border-dashed border-white/10 rounded-md p-10 text-center text-sm text-zinc-500">Sem automações</div>}
        </TabsContent>

        <TabsContent value="runs" className="mt-6">
          <div className="rounded-md border border-white/10 bg-[#121214] overflow-hidden">
            {runs.length === 0 ? (
              <div className="p-10 text-center text-sm text-zinc-500">Nenhuma execução ainda. Crie um lead ou clique em Testar.</div>
            ) : runs.map((r) => {
              const st = r?.result?.status || "unknown";
              const ok = st === "sent" || st === "created" || st === "notified";
              return (
                <div key={r.run_id} className="px-5 py-4 border-b border-white/5 flex items-center gap-4" data-testid={`run-${r.run_id}`}>
                  <div className={`h-2 w-2 rounded-full ${ok ? "bg-emerald-500" : "bg-amber-500"}`} />
                  <Activity className="h-3.5 w-3.5 text-zinc-500" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{LABEL(ACTIONS, r.action)}</div>
                    <div className="text-xs text-zinc-500 truncate">Gatilho: {r.trigger} · {r?.context?.name || ""}</div>
                  </div>
                  <div className="text-xs font-mono text-zinc-400">{st}</div>
                  <div className="text-[10px] font-mono text-zinc-500 hidden md:block">{new Date(r.created_at).toLocaleString("pt-BR")}</div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Configurar automação</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4 pt-2">
              <div>
                <Label>Alvo</Label>
                <Input value={editing.target || ""} placeholder={targetHint(editing.action)} onChange={(e) => setEditing({ ...editing, target: e.target.value })} data-testid="edit-target" />
              </div>
              <div>
                <Label>Mensagem / template</Label>
                <Textarea rows={4} value={editing.template || ""} onChange={(e) => setEditing({ ...editing, template: e.target.value })} data-testid="edit-template" />
              </div>
              <DialogFooter><Button onClick={saveEdit} className="bg-gradient-to-r from-[#5E6AD2] to-[#8B5CF6] hover:opacity-90 text-white" data-testid="save-edit">Salvar</Button></DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
