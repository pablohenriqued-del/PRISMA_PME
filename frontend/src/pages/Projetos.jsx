import React, { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Check, Circle, Clock, Play, Square, Timer, Trash2 } from "lucide-react";
import { toast } from "sonner";

const COLS = [
  { key: "a_fazer", label: "A fazer", icon: Circle, tint: "hsl(220 13% 91%)" },
  { key: "em_progresso", label: "Em progresso", icon: Clock, tint: "hsl(32 95% 55% / 0.35)" },
  { key: "concluido", label: "Concluído", icon: Check, tint: "hsl(148 60% 45% / 0.30)" },
];

const FIELD_TYPES = [
  { key: "text", label: "Texto" },
  { key: "number", label: "Número" },
  { key: "date", label: "Data" },
];

const fmtSec = (s) => {
  s = Math.max(0, Math.floor(s || 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : m > 0 ? `${m}m ${String(sec).padStart(2, "0")}s` : `${sec}s`;
};

// Live tick for running timers (task has open time_log)
const useTick = () => {
  const [, setT] = useState(0);
  useEffect(() => { const id = setInterval(() => setT((v) => v + 1), 1000); return () => clearInterval(id); }, []);
};

const activeLog = (task) => (task.time_logs || []).find((l) => !l.end_at);
const liveSeconds = (task) => {
  const total = task.total_seconds || 0;
  const a = activeLog(task);
  if (!a) return total;
  const start = new Date(a.start_at).getTime();
  return total + Math.max(0, Math.floor((Date.now() - start) / 1000));
};

export default function Projetos() {
  useTick();
  const [projects, setProjects] = useState([]);
  const [active, setActive] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [openNewTask, setOpenNewTask] = useState(false);
  const [openNewProj, setOpenNewProj] = useState(false);
  const [openTask, setOpenTask] = useState(null); // task detail modal
  const [task, setTask] = useState({ title: "", status: "a_fazer", assignee: "" });
  const [proj, setProj] = useState({ name: "", description: "" });

  const loadProjects = async () => {
    const r = await api.get("/projects");
    setProjects(r.data.items);
    if (!active && r.data.items.length) setActive(r.data.items[0]);
  };
  const loadTasks = async (id) => { const r = await api.get(`/projects/${id}/tasks`); setTasks(r.data.items); };

  useEffect(() => { loadProjects(); }, []);
  useEffect(() => { if (active) loadTasks(active.project_id); }, [active]);

  const createTask = async (e) => {
    e.preventDefault();
    await api.post(`/projects/${active.project_id}/tasks`, task);
    setTask({ title: "", status: "a_fazer", assignee: "" });
    setOpenNewTask(false); loadTasks(active.project_id);
    toast.success("Tarefa criada");
  };
  const createProject = async (e) => {
    e.preventDefault();
    const r = await api.post("/projects", proj);
    setProj({ name: "", description: "" });
    setOpenNewProj(false); setActive(r.data); loadProjects();
  };

  const move = async (t, status) => {
    setTasks((c) => c.map((x) => x.task_id === t.task_id ? { ...x, status } : x));
    try { await api.patch(`/tasks/${t.task_id}`, { status }); }
    catch { toast.error("Falha ao mover"); loadTasks(active.project_id); }
  };

  const onDrop = (e, status) => {
    const id = e.dataTransfer.getData("text/plain");
    const t = tasks.find((x) => x.task_id === id);
    if (t && t.status !== status) move(t, status);
  };

  // Time tracking
  const toggleTimer = async (t) => {
    const running = !!activeLog(t);
    try {
      if (running) {
        await api.post(`/tasks/${t.task_id}/time/stop`);
      } else {
        // stop any other running timer first
        for (const other of tasks) {
          if (other.task_id !== t.task_id && activeLog(other)) {
            await api.post(`/tasks/${other.task_id}/time/stop`);
          }
        }
        await api.post(`/tasks/${t.task_id}/time/start`);
      }
      await loadTasks(active.project_id);
    } catch { toast.error("Falha no cronômetro"); }
  };

  return (
    <div className="space-y-8 fade-up" data-testid="projetos-page">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="overline text-black/50">Projetos</div>
          <h1 className="font-display text-4xl font-light tracking-tight mt-2">Foco em execução.</h1>
        </div>
        <div className="flex items-center gap-3">
          <Select value={active?.project_id || ""} onValueChange={(v) => setActive(projects.find((p) => p.project_id === v))}>
            <SelectTrigger className="w-[220px] h-10" data-testid="project-select"><SelectValue placeholder="Selecionar projeto" /></SelectTrigger>
            <SelectContent>{projects.map((p) => <SelectItem key={p.project_id} value={p.project_id}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
          <Dialog open={openNewProj} onOpenChange={setOpenNewProj}>
            <DialogTrigger asChild><Button variant="outline" className="h-10 border-black/10" data-testid="new-project-btn"><Plus className="h-4 w-4 mr-2" />Projeto</Button></DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Novo projeto</DialogTitle></DialogHeader>
              <form onSubmit={createProject} className="space-y-4 pt-2">
                <div><Label>Nome</Label><Input required data-testid="project-name" value={proj.name} onChange={(e) => setProj({ ...proj, name: e.target.value })} /></div>
                <div><Label>Descrição</Label><Input data-testid="project-desc" value={proj.description} onChange={(e) => setProj({ ...proj, description: e.target.value })} /></div>
                <DialogFooter><Button type="submit" className="bg-[hsl(var(--ink))] hover:bg-black text-[hsl(var(--paper))]" data-testid="save-project">Criar</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={openNewTask} onOpenChange={setOpenNewTask}>
            <DialogTrigger asChild><Button className="h-10 bg-[hsl(var(--ink))] hover:bg-black text-[hsl(var(--paper))]" disabled={!active} data-testid="new-task-btn"><Plus className="h-4 w-4 mr-2" />Nova tarefa</Button></DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Nova tarefa</DialogTitle></DialogHeader>
              <form onSubmit={createTask} className="space-y-4 pt-2">
                <div><Label>Título</Label><Input required data-testid="task-title" value={task.title} onChange={(e) => setTask({ ...task, title: e.target.value })} /></div>
                <div><Label>Responsável</Label><Input data-testid="task-assignee" value={task.assignee} onChange={(e) => setTask({ ...task, assignee: e.target.value })} /></div>
                <div><Label>Status</Label>
                  <Select value={task.status} onValueChange={(v) => setTask({ ...task, status: v })}>
                    <SelectTrigger data-testid="task-status"><SelectValue /></SelectTrigger>
                    <SelectContent>{COLS.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <DialogFooter><Button type="submit" className="bg-[hsl(var(--ink))] hover:bg-black text-[hsl(var(--paper))]" data-testid="save-task">Salvar</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {active && (
        <div>
          <div className="mb-4">
            <div className="font-display text-2xl">{active.name}</div>
            <div className="text-sm text-black/50">{active.description || "—"}</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {COLS.map(({ key, label, icon: Icon, tint }) => {
              const col = tasks.filter((t) => t.status === key);
              return (
                <div
                  key={key}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => onDrop(e, key)}
                  className="rounded-md border border-black/10 bg-white flex flex-col min-h-[300px]"
                  data-testid={`task-col-${key}`}
                >
                  <div className="p-3 border-b border-black/10 flex items-center gap-2" style={{ background: tint }}>
                    <Icon className="h-4 w-4" />
                    <div className="font-display text-sm font-medium">{label}</div>
                    <div className="ml-auto text-[11px] font-mono text-black/60">{col.length}</div>
                  </div>
                  <div className="p-2 space-y-2 flex-1">
                    {col.map((t) => {
                      const running = !!activeLog(t);
                      const secs = liveSeconds(t);
                      return (
                        <div
                          key={t.task_id}
                          draggable
                          onDragStart={(e) => e.dataTransfer.setData("text/plain", t.task_id)}
                          data-testid={`task-${t.task_id}`}
                          className={`rounded-md border p-3 bg-white hover:border-black/40 transition-colors cursor-grab active:cursor-grabbing ${running ? "border-emerald-400" : "border-black/10"}`}
                        >
                          <div className="text-sm font-medium">{t.title}</div>
                          {t.assignee && <div className="text-xs text-black/50 mt-1">{t.assignee}</div>}
                          {(t.custom_fields || []).slice(0, 2).map((cf, i) => (
                            <div key={i} className="text-[10px] text-black/50 mt-0.5">{cf.name}: <b className="text-black/70">{String(cf.value ?? "—")}</b></div>
                          ))}
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1 text-[11px] text-black/60"><Timer className="h-3 w-3" />{fmtSec(secs)}</div>
                            <div className="flex gap-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleTimer(t); }}
                                data-testid={`timer-${t.task_id}`}
                                className={`h-7 w-7 rounded-md flex items-center justify-center ${running ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-black/5 hover:bg-black/10"}`}
                                title={running ? "Parar cronômetro" : "Iniciar cronômetro"}
                              >
                                {running ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setOpenTask(t); }}
                                data-testid={`open-task-${t.task_id}`}
                                className="h-7 w-7 rounded-md bg-black/5 hover:bg-black/10 flex items-center justify-center"
                                title="Detalhes"
                              >
                                <Plus className="h-3 w-3 rotate-45" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {col.length === 0 && <div className="text-center text-xs text-black/40 border border-dashed border-black/10 rounded-md py-6">Sem tarefas</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Task detail modal — custom fields */}
      {openTask && (
        <TaskDetail
          task={openTask}
          onClose={() => setOpenTask(null)}
          onSaved={async () => { setOpenTask(null); await loadTasks(active.project_id); }}
        />
      )}
    </div>
  );
}

function TaskDetail({ task, onClose, onSaved }) {
  const [fields, setFields] = useState(task.custom_fields || []);
  const [manualMin, setManualMin] = useState("");
  const [saving, setSaving] = useState(false);
  const addField = () => setFields((f) => [...f, { name: "", type: "text", value: "" }]);
  const setField = (i, patch) => setFields((f) => f.map((c, idx) => idx === i ? { ...c, ...patch } : c));
  const rmField = (i) => setFields((f) => f.filter((_, idx) => idx !== i));
  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/tasks/${task.task_id}`, { custom_fields: fields });
      toast.success("Tarefa atualizada"); onSaved();
    } catch { toast.error("Falha ao salvar"); }
    finally { setSaving(false); }
  };
  const addManualTime = async () => {
    const sec = Math.round((Number(manualMin) || 0) * 60);
    if (sec <= 0) return;
    try {
      await api.post(`/tasks/${task.task_id}/time/log`, { seconds: sec, note: "manual" });
      toast.success("Tempo lançado"); setManualMin(""); onSaved();
    } catch { toast.error("Falha"); }
  };
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto" data-testid="task-detail-modal">
        <DialogHeader><DialogTitle>{task.title}</DialogTitle><DialogDescription>Campos personalizados e tempo registrado.</DialogDescription></DialogHeader>
        <div className="pt-2 space-y-4">
          <div className="rounded-md border border-black/10 p-3">
            <div className="flex items-center justify-between mb-2 text-sm">
              <div className="flex items-center gap-2 text-black/70"><Timer className="h-4 w-4" /> Tempo total</div>
              <div className="font-mono">{fmtSec(task.total_seconds || 0)}</div>
            </div>
            <div className="flex items-center gap-2">
              <Input type="number" placeholder="min" value={manualMin} onChange={(e) => setManualMin(e.target.value)} className="h-9 flex-1" data-testid="manual-min" />
              <Button size="sm" onClick={addManualTime} className="h-9 bg-[hsl(var(--ink))] text-[hsl(var(--paper))]" data-testid="add-manual-time">+ Lançar</Button>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Campos personalizados</Label>
              <button type="button" onClick={addField} className="text-xs text-black/60 hover:text-black flex items-center gap-1" data-testid="task-add-field"><Plus className="h-3 w-3" /> campo</button>
            </div>
            <div className="space-y-2">
              {fields.length === 0 && <div className="text-xs text-black/40">Adicione campos para categorizar melhor essa tarefa.</div>}
              {fields.map((cf, i) => (
                <div key={i} className="grid grid-cols-12 gap-2">
                  <Input className="col-span-4" placeholder="Nome" value={cf.name} onChange={(e) => setField(i, { name: e.target.value })} />
                  <Select value={cf.type} onValueChange={(v) => setField(i, { type: v })}>
                    <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                    <SelectContent>{FIELD_TYPES.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input className="col-span-4" type={cf.type === "date" ? "date" : cf.type === "number" ? "number" : "text"} placeholder="Valor" value={cf.value || ""} onChange={(e) => setField(i, { value: e.target.value })} />
                  <button onClick={() => rmField(i)} className="col-span-1 text-black/40 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter><Button disabled={saving} onClick={save} className="bg-[hsl(var(--ink))] hover:bg-black text-[hsl(var(--paper))]" data-testid="save-task-detail">{saving ? "Salvando…" : "Salvar"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
