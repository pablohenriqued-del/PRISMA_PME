import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Check, Circle, Clock } from "lucide-react";
import { toast } from "sonner";

const COLS = [
  { key: "a_fazer", label: "A fazer", icon: Circle, tint: "hsl(220 13% 91%)" },
  { key: "em_progresso", label: "Em progresso", icon: Clock, tint: "hsl(32 95% 55% / 0.35)" },
  { key: "concluido", label: "Concluído", icon: Check, tint: "hsl(148 60% 45% / 0.30)" },
];

export default function Projetos() {
  const [projects, setProjects] = useState([]);
  const [active, setActive] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [openNewTask, setOpenNewTask] = useState(false);
  const [openNewProj, setOpenNewProj] = useState(false);
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
    setOpenNewTask(false);
    loadTasks(active.project_id);
    toast.success("Tarefa criada");
  };
  const createProject = async (e) => {
    e.preventDefault();
    const r = await api.post("/projects", proj);
    setProj({ name: "", description: "" });
    setOpenNewProj(false);
    setActive(r.data);
    loadProjects();
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
                    {col.map((t) => (
                      <div
                        key={t.task_id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("text/plain", t.task_id)}
                        data-testid={`task-${t.task_id}`}
                        className="rounded-md border border-black/10 p-3 bg-white hover:border-black/40 transition-colors cursor-grab active:cursor-grabbing"
                      >
                        <div className="text-sm font-medium">{t.title}</div>
                        {t.assignee && <div className="text-xs text-black/50 mt-1">{t.assignee}</div>}
                      </div>
                    ))}
                    {col.length === 0 && <div className="text-center text-xs text-black/40 border border-dashed border-black/10 rounded-md py-6">Sem tarefas</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
