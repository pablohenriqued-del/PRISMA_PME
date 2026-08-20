import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Check, Circle, Clock, Play, Square, Timer, Trash2, KanbanSquare, List as ListIcon, Calendar as CalendarIcon, GanttChart, MessageSquare, AtSign, Send } from "lucide-react";
import { toast } from "sonner";

const COLS = [
  { key: "a_fazer", label: "A fazer", icon: Circle, tint: "hsl(220 13% 91%)" },
  { key: "em_progresso", label: "Em progresso", icon: Clock, tint: "hsl(32 95% 55% / 0.35)" },
  { key: "concluido", label: "Concluído", icon: Check, tint: "hsl(148 60% 45% / 0.30)" },
];

const VIEWS = [
  { key: "kanban", label: "Kanban", icon: KanbanSquare },
  { key: "lista", label: "Lista", icon: ListIcon },
  { key: "calendario", label: "Calendário", icon: CalendarIcon },
  { key: "gantt", label: "Gantt", icon: GanttChart },
];

const FIELD_TYPES = [
  { key: "text", label: "Texto" }, { key: "number", label: "Número" }, { key: "date", label: "Data" },
];

const fmtSec = (s) => {
  s = Math.max(0, Math.floor(s || 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : m > 0 ? `${m}m ${String(sec).padStart(2, "0")}s` : `${sec}s`;
};
const activeLog = (task) => (task.time_logs || []).find((l) => !l.end_at);
const liveSeconds = (task) => {
  const total = task.total_seconds || 0;
  const a = activeLog(task);
  if (!a) return total;
  return total + Math.max(0, Math.floor((Date.now() - new Date(a.start_at).getTime()) / 1000));
};
const parseISO = (s) => { try { return s ? new Date(s) : null; } catch { return null; } };
const daysBetween = (a, b) => Math.max(1, Math.round((b - a) / 86400000));
const dtBR = (d) => (d ? new Date(d).toLocaleDateString("pt-BR") : "—");

const useTick = () => { const [, s] = useState(0); useEffect(() => { const i = setInterval(() => s((v) => v + 1), 1000); return () => clearInterval(i); }, []); };

export default function Projetos() {
  useTick();
  const [projects, setProjects] = useState([]);
  const [active, setActive] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [openNewTask, setOpenNewTask] = useState(false);
  const [openNewProj, setOpenNewProj] = useState(false);
  const [openTask, setOpenTask] = useState(null);
  const [task, setTask] = useState({ title: "", status: "a_fazer", assignee: "", due_date: "" });
  const [proj, setProj] = useState({ name: "", description: "" });
  const [view, setView] = useState("kanban");
  const [members, setMembers] = useState([]);

  const loadProjects = async () => {
    const r = await api.get("/projects");
    setProjects(r.data.items);
    if (!active && r.data.items.length) setActive(r.data.items[0]);
  };
  const loadTasks = async (id) => { const r = await api.get(`/projects/${id}/tasks`); setTasks(r.data.items); };
  const loadMembers = async () => { try { const r = await api.get("/team/members"); setMembers(r.data.members || []); } catch { /* noop */ } };

  useEffect(() => { loadProjects(); loadMembers(); }, []);
  useEffect(() => { if (active) loadTasks(active.project_id); }, [active]);

  const createTask = async (e) => {
    e.preventDefault();
    await api.post(`/projects/${active.project_id}/tasks`, task);
    setTask({ title: "", status: "a_fazer", assignee: "", due_date: "" });
    setOpenNewTask(false); loadTasks(active.project_id); toast.success("Tarefa criada");
  };
  const createProject = async (e) => {
    e.preventDefault();
    const r = await api.post("/projects", proj);
    setProj({ name: "", description: "" }); setOpenNewProj(false); setActive(r.data); loadProjects();
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
  const toggleTimer = async (t) => {
    const running = !!activeLog(t);
    try {
      if (running) await api.post(`/tasks/${t.task_id}/time/stop`);
      else {
        for (const other of tasks) if (other.task_id !== t.task_id && activeLog(other)) await api.post(`/tasks/${other.task_id}/time/stop`);
        await api.post(`/tasks/${t.task_id}/time/start`);
      }
      await loadTasks(active.project_id);
    } catch { toast.error("Falha no cronômetro"); }
  };

  return (
    <div className="space-y-8 fade-up" data-testid="projetos-page">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="overline text-zinc-500">Projetos</div>
          <h1 className="font-display text-4xl font-light tracking-tight mt-2">Foco em execução.</h1>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={active?.project_id || ""} onValueChange={(v) => setActive(projects.find((p) => p.project_id === v))}>
            <SelectTrigger className="w-[220px] h-10" data-testid="project-select"><SelectValue placeholder="Selecionar projeto" /></SelectTrigger>
            <SelectContent>{projects.map((p) => <SelectItem key={p.project_id} value={p.project_id}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
          <Dialog open={openNewProj} onOpenChange={setOpenNewProj}>
            <DialogTrigger asChild><Button variant="outline" className="h-10 border-white/10" data-testid="new-project-btn"><Plus className="h-4 w-4 mr-2" />Projeto</Button></DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Novo projeto</DialogTitle></DialogHeader>
              <form onSubmit={createProject} className="space-y-4 pt-2">
                <div><Label>Nome</Label><Input required data-testid="project-name" value={proj.name} onChange={(e) => setProj({ ...proj, name: e.target.value })} /></div>
                <div><Label>Descrição</Label><Input data-testid="project-desc" value={proj.description} onChange={(e) => setProj({ ...proj, description: e.target.value })} /></div>
                <DialogFooter><Button type="submit" className="bg-gradient-to-r from-[#5E6AD2] to-[#8B5CF6] hover:opacity-90 text-white" data-testid="save-project">Criar</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={openNewTask} onOpenChange={setOpenNewTask}>
            <DialogTrigger asChild><Button className="h-10 bg-gradient-to-r from-[#5E6AD2] to-[#8B5CF6] hover:opacity-90 text-white" disabled={!active} data-testid="new-task-btn"><Plus className="h-4 w-4 mr-2" />Nova tarefa</Button></DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Nova tarefa</DialogTitle></DialogHeader>
              <form onSubmit={createTask} className="space-y-4 pt-2">
                <div><Label>Título</Label><Input required data-testid="task-title" value={task.title} onChange={(e) => setTask({ ...task, title: e.target.value })} /></div>
                <div><Label>Responsável</Label><Input data-testid="task-assignee" value={task.assignee} onChange={(e) => setTask({ ...task, assignee: e.target.value })} /></div>
                <div><Label>Prazo</Label><Input type="date" data-testid="task-due" value={task.due_date} onChange={(e) => setTask({ ...task, due_date: e.target.value })} /></div>
                <div><Label>Status</Label>
                  <Select value={task.status} onValueChange={(v) => setTask({ ...task, status: v })}>
                    <SelectTrigger data-testid="task-status"><SelectValue /></SelectTrigger>
                    <SelectContent>{COLS.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <DialogFooter><Button type="submit" className="bg-gradient-to-r from-[#5E6AD2] to-[#8B5CF6] hover:opacity-90 text-white" data-testid="save-task">Salvar</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {active && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="font-display text-2xl">{active.name}</div>
              <div className="text-sm text-zinc-500">{active.description || "—"}</div>
            </div>
            <div className="inline-flex rounded-md border border-white/10 bg-[#121214] overflow-hidden" data-testid="view-switcher">
              {VIEWS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setView(key)}
                  data-testid={`view-${key}`}
                  className={`px-3 h-9 text-xs flex items-center gap-1.5 border-r border-white/5 last:border-r-0 ${view === key ? "bg-gradient-to-r from-[#5E6AD2] to-[#8B5CF6] text-white" : "hover:bg-white/5"}`}
                >
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              ))}
            </div>
          </div>

          {view === "kanban" && <KanbanView tasks={tasks} onDrop={onDrop} openTask={setOpenTask} toggleTimer={toggleTimer} />}
          {view === "lista" && <ListView tasks={tasks} move={move} openTask={setOpenTask} toggleTimer={toggleTimer} />}
          {view === "calendario" && <CalendarView tasks={tasks} openTask={setOpenTask} />}
          {view === "gantt" && <GanttView tasks={tasks} openTask={setOpenTask} />}
        </>
      )}

      {openTask && (
        <TaskDetail
          task={openTask}
          members={members}
          onClose={() => setOpenTask(null)}
          onSaved={async () => { setOpenTask(null); await loadTasks(active.project_id); }}
        />
      )}
    </div>
  );
}

/* ---------- KANBAN VIEW ---------- */
function KanbanView({ tasks, onDrop, openTask, toggleTimer }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {COLS.map(({ key, label, icon: Icon, tint }) => {
        const col = tasks.filter((t) => t.status === key);
        return (
          <div key={key} onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(e, key)} className="rounded-md border border-white/10 bg-[#121214] flex flex-col min-h-[300px]" data-testid={`task-col-${key}`}>
            <div className="p-3 border-b border-white/10 flex items-center gap-2" style={{ background: tint }}>
              <Icon className="h-4 w-4" />
              <div className="font-display text-sm font-medium">{label}</div>
              <div className="ml-auto text-[11px] font-mono text-zinc-400">{col.length}</div>
            </div>
            <div className="p-2 space-y-2 flex-1">
              {col.map((t) => <TaskCard key={t.task_id} t={t} openTask={openTask} toggleTimer={toggleTimer} />)}
              {col.length === 0 && <div className="text-center text-xs text-zinc-500 border border-dashed border-white/10 rounded-md py-6">Sem tarefas</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TaskCard({ t, openTask, toggleTimer }) {
  const running = !!activeLog(t);
  const secs = liveSeconds(t);
  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", t.task_id)}
      data-testid={`task-${t.task_id}`}
      className={`rounded-md border p-3 bg-[#121214] hover:border-white/20 transition-colors cursor-grab active:cursor-grabbing ${running ? "border-emerald-400" : "border-white/10"}`}
    >
      <div className="text-sm font-medium">{t.title}</div>
      {t.assignee && <div className="text-xs text-zinc-500 mt-1">{t.assignee}</div>}
      {t.due_date && <div className="text-[10px] text-zinc-500 mt-0.5">📅 {dtBR(t.due_date)}</div>}
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-[11px] text-zinc-400"><Timer className="h-3 w-3" />{fmtSec(secs)}</div>
        <div className="flex gap-1">
          <button onClick={(e) => { e.stopPropagation(); toggleTimer(t); }} data-testid={`timer-${t.task_id}`} className={`h-7 w-7 rounded-md flex items-center justify-center ${running ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-[#121214]/5 hover:bg-white/10"}`}>
            {running ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          </button>
          <button onClick={(e) => { e.stopPropagation(); openTask(t); }} data-testid={`open-task-${t.task_id}`} className="h-7 w-7 rounded-md bg-[#121214]/5 hover:bg-white/10 flex items-center justify-center">
            <Plus className="h-3 w-3 rotate-45" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- LIST VIEW ---------- */
function ListView({ tasks, move, openTask, toggleTimer }) {
  return (
    <div className="rounded-md border border-white/10 bg-[#121214] overflow-hidden" data-testid="list-view">
      <table className="w-full text-sm">
        <thead className="bg-[#121214]/[0.03]">
          <tr className="text-left text-[10px] uppercase tracking-widest text-zinc-500">
            <th className="p-3 font-medium">Tarefa</th>
            <th className="p-3 font-medium">Responsável</th>
            <th className="p-3 font-medium">Status</th>
            <th className="p-3 font-medium">Prazo</th>
            <th className="p-3 font-medium">Tempo</th>
            <th className="p-3 font-medium w-12"></th>
          </tr>
        </thead>
        <tbody>
          {tasks.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-zinc-500">Sem tarefas</td></tr>}
          {tasks.map((t) => {
            const running = !!activeLog(t);
            return (
              <tr key={t.task_id} className="border-t border-white/5 hover:bg-white/[0.02]" data-testid={`list-row-${t.task_id}`}>
                <td className="p-3">
                  <button onClick={() => openTask(t)} className="text-left hover:underline">{t.title}</button>
                </td>
                <td className="p-3 text-xs text-zinc-300">{t.assignee || "—"}</td>
                <td className="p-3">
                  <Select value={t.status} onValueChange={(v) => move(t, v)}>
                    <SelectTrigger className="h-7 w-[130px] text-[11px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{COLS.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </td>
                <td className="p-3 text-xs">{dtBR(t.due_date)}</td>
                <td className="p-3 text-xs">
                  <button onClick={() => toggleTimer(t)} className={`inline-flex items-center gap-1 px-2 h-6 rounded ${running ? "bg-emerald-600 text-white" : "bg-[#121214]/5 hover:bg-white/10"}`}>
                    {running ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />} {fmtSec(liveSeconds(t))}
                  </button>
                </td>
                <td className="p-3"><button onClick={() => openTask(t)} className="text-zinc-500 hover:text-white text-xs">Abrir</button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- CALENDAR VIEW ---------- */
function CalendarView({ tasks, openTask }) {
  const [cursor, setCursor] = useState(new Date());
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const startWeekday = (first.getDay() + 6) % 7; // Mon-first grid
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
  while (cells.length % 7 !== 0) cells.push(null);
  const bucket = new Map();
  tasks.forEach((t) => {
    const d = parseISO(t.due_date);
    if (!d) return;
    if (d.getMonth() === cursor.getMonth() && d.getFullYear() === cursor.getFullYear()) {
      const k = d.getDate();
      if (!bucket.has(k)) bucket.set(k, []);
      bucket.get(k).push(t);
    }
  });
  const monthName = cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return (
    <div className="rounded-md border border-white/10 bg-[#121214] p-4" data-testid="calendar-view">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="h-8 w-8 rounded hover:bg-white/5" data-testid="cal-prev">‹</button>
        <div className="font-display text-lg capitalize">{monthName}</div>
        <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="h-8 w-8 rounded hover:bg-white/5" data-testid="cal-next">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2 text-[10px] uppercase tracking-widest text-zinc-500 text-center">
        {["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"].map((d) => <div key={d} className="py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => (
          <div key={i} className={`min-h-[80px] rounded border ${d ? "border-white/5 bg-[#121214]" : "border-transparent"} p-1.5`}>
            {d && (
              <>
                <div className="text-[11px] text-zinc-500 mb-1">{d.getDate()}</div>
                <div className="space-y-0.5">
                  {(bucket.get(d.getDate()) || []).slice(0, 3).map((t) => (
                    <button key={t.task_id} onClick={() => openTask(t)} data-testid={`cal-task-${t.task_id}`}
                      className={`block w-full text-left text-[10px] px-1.5 py-1 rounded truncate ${
                        t.status === "concluido" ? "bg-emerald-50 text-emerald-800" :
                        t.status === "em_progresso" ? "bg-amber-50 text-amber-800" : "bg-[#121214]/[0.06] text-zinc-300"
                      } hover:opacity-80`}>
                      {t.title}
                    </button>
                  ))}
                  {(bucket.get(d.getDate()) || []).length > 3 && <div className="text-[9px] text-zinc-500">+{bucket.get(d.getDate()).length - 3}</div>}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- GANTT VIEW ---------- */
function GanttView({ tasks, openTask }) {
  const withDates = tasks.filter((t) => t.due_date && t.created_at);
  if (withDates.length === 0) {
    return <div className="rounded-md border border-dashed border-white/10 bg-[#121214] p-10 text-center text-zinc-500" data-testid="gantt-empty">
      Adicione um prazo às tarefas para vê-las no Gantt.
    </div>;
  }
  const min = withDates.reduce((m, t) => Math.min(m, new Date(t.created_at).getTime()), Infinity);
  const max = withDates.reduce((m, t) => Math.max(m, new Date(t.due_date).getTime()), 0);
  const startDate = new Date(min); startDate.setHours(0,0,0,0);
  const endDate = new Date(Math.max(max, startDate.getTime() + 7 * 86400000)); endDate.setHours(23,59,59);
  const totalDays = daysBetween(startDate, endDate);
  const colWidth = 32; // px per day
  const width = totalDays * colWidth;
  const days = Array.from({ length: totalDays }, (_, i) => new Date(startDate.getTime() + i * 86400000));
  return (
    <div className="rounded-md border border-white/10 bg-[#121214] overflow-hidden" data-testid="gantt-view">
      <div className="overflow-x-auto">
        <div style={{ width: 260 + width }}>
          {/* Header */}
          <div className="flex sticky top-0 bg-[#121214] z-10 border-b border-white/10">
            <div className="w-[260px] shrink-0 p-3 text-[10px] uppercase tracking-widest text-zinc-500">Tarefa</div>
            <div className="flex">
              {days.map((d, i) => {
                const isMonthStart = d.getDate() === 1 || i === 0;
                return (
                  <div key={i} className={`text-center text-[10px] py-2 border-l border-white/5 ${isMonthStart ? "font-medium text-white" : "text-zinc-500"}`} style={{ width: colWidth }}>
                    {isMonthStart ? d.toLocaleDateString("pt-BR", { month: "short" }) : d.getDate()}
                  </div>
                );
              })}
            </div>
          </div>
          {/* Rows */}
          {withDates.map((t) => {
            const s = new Date(t.created_at).getTime();
            const e = new Date(t.due_date).getTime();
            const startOffset = Math.max(0, Math.floor((s - startDate.getTime()) / 86400000));
            const durDays = Math.max(1, daysBetween(new Date(Math.max(s, startDate.getTime())), new Date(Math.max(e, s + 86400000))));
            const barColor = t.status === "concluido" ? "bg-emerald-500" : t.status === "em_progresso" ? "bg-amber-500" : "bg-gradient-to-r from-[#5E6AD2] to-[#8B5CF6]";
            return (
              <div key={t.task_id} className="flex border-b border-white/5 hover:bg-white/[0.02]" data-testid={`gantt-row-${t.task_id}`}>
                <button onClick={() => openTask(t)} className="w-[260px] shrink-0 p-3 text-left text-sm truncate hover:underline">{t.title}</button>
                <div className="relative flex" style={{ width }}>
                  {days.map((_, i) => <div key={i} className="border-l border-white/5" style={{ width: colWidth }} />)}
                  <button
                    onClick={() => openTask(t)}
                    data-testid={`gantt-bar-${t.task_id}`}
                    className={`absolute top-1/2 -translate-y-1/2 h-6 rounded ${barColor} text-white text-[10px] px-2 flex items-center hover:opacity-90`}
                    style={{ left: startOffset * colWidth + 2, width: durDays * colWidth - 4 }}
                    title={`${dtBR(t.created_at)} → ${dtBR(t.due_date)}`}
                  >
                    <span className="truncate">{t.assignee || t.status}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------- TASK DETAIL: custom fields + comments + @mentions ---------- */
function TaskDetail({ task, members, onClose, onSaved }) {
  const [fields, setFields] = useState(task.custom_fields || []);
  const [manualMin, setManualMin] = useState("");
  const [saving, setSaving] = useState(false);
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [mentions, setMentions] = useState([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [suggestQuery, setSuggestQuery] = useState("");
  const [suggestPos, setSuggestPos] = useState({ top: 0, left: 0 });
  const textareaRef = useRef(null);

  const loadComments = async () => {
    try { const r = await api.get(`/tasks/${task.task_id}/comments`); setComments(r.data.items); } catch { /* noop */ }
  };
  useEffect(() => { loadComments(); }, [task.task_id]);

  const filtered = useMemo(() => {
    const q = suggestQuery.toLowerCase();
    return members.filter((m) => (m.name || "").toLowerCase().includes(q) || (m.email || "").toLowerCase().includes(q)).slice(0, 6);
  }, [suggestQuery, members]);

  const onChangeText = (e) => {
    const v = e.target.value;
    setText(v);
    const cursor = e.target.selectionStart;
    const upTo = v.slice(0, cursor);
    const m = upTo.match(/@([^\s@]{0,20})$/);
    if (m) { setShowSuggest(true); setSuggestQuery(m[1]); }
    else { setShowSuggest(false); setSuggestQuery(""); }
  };

  const insertMention = (u) => {
    const el = textareaRef.current; if (!el) return;
    const cursor = el.selectionStart;
    const upTo = text.slice(0, cursor);
    const rest = text.slice(cursor);
    const replaced = upTo.replace(/@([^\s@]{0,20})$/, `@${u.name} `);
    const newText = replaced + rest;
    setText(newText);
    setMentions((m) => m.find((x) => x.user_id === u.user_id) ? m : [...m, { user_id: u.user_id, name: u.name }]);
    setShowSuggest(false); setSuggestQuery("");
    setTimeout(() => el.focus(), 0);
  };

  const sendComment = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    const mm = mentions.filter((m) => text.includes("@" + m.name));
    try {
      await api.post(`/tasks/${task.task_id}/comments`, { body: text.trim(), mentions: mm });
      setText(""); setMentions([]); loadComments();
      toast.success(mm.length ? `Comentário enviado — ${mm.length} mencionado(s)` : "Comentário enviado");
    } catch { toast.error("Falha ao comentar"); }
  };

  const deleteComment = async (c) => {
    if (!window.confirm("Excluir este comentário?")) return;
    try { await api.delete(`/tasks/${task.task_id}/comments/${c.comment_id}`); loadComments(); } catch { toast.error("Falha"); }
  };

  const addField = () => setFields((f) => [...f, { name: "", type: "text", value: "" }]);
  const setField = (i, patch) => setFields((f) => f.map((c, idx) => idx === i ? { ...c, ...patch } : c));
  const rmField = (i) => setFields((f) => f.filter((_, idx) => idx !== i));
  const save = async () => {
    setSaving(true);
    try { await api.patch(`/tasks/${task.task_id}`, { custom_fields: fields }); toast.success("Tarefa atualizada"); onSaved(); }
    catch { toast.error("Falha ao salvar"); } finally { setSaving(false); }
  };
  const addManualTime = async () => {
    const sec = Math.round((Number(manualMin) || 0) * 60);
    if (sec <= 0) return;
    try { await api.post(`/tasks/${task.task_id}/time/log`, { seconds: sec, note: "manual" }); toast.success("Tempo lançado"); setManualMin(""); onSaved(); }
    catch { toast.error("Falha"); }
  };

  const renderBody = (body) => {
    // Highlight @mentions
    const parts = body.split(/(@[\w À-ÿ]+)/g).filter(Boolean);
    return parts.map((p, i) => p.startsWith("@") ? <span key={i} className="text-blue-700 font-medium">{p.trim()}</span> : <span key={i}>{p}</span>);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="task-detail-modal">
        <DialogHeader><DialogTitle>{task.title}</DialogTitle><DialogDescription>Comentários, tempo e campos personalizados.</DialogDescription></DialogHeader>
        <div className="pt-2 space-y-5">
          {/* Time */}
          <div className="rounded-md border border-white/10 p-3">
            <div className="flex items-center justify-between mb-2 text-sm">
              <div className="flex items-center gap-2 text-zinc-300"><Timer className="h-4 w-4" /> Tempo total</div>
              <div className="font-mono">{fmtSec(task.total_seconds || 0)}</div>
            </div>
            <div className="flex items-center gap-2">
              <Input type="number" placeholder="min" value={manualMin} onChange={(e) => setManualMin(e.target.value)} className="h-9 flex-1" data-testid="manual-min" />
              <Button size="sm" onClick={addManualTime} className="h-9 bg-gradient-to-r from-[#5E6AD2] to-[#8B5CF6] text-white" data-testid="add-manual-time">+ Lançar</Button>
            </div>
          </div>

          {/* Comments */}
          <div>
            <div className="flex items-center gap-2 mb-2 text-sm text-zinc-300"><MessageSquare className="h-4 w-4" /> Comentários ({comments.length})</div>
            <div className="space-y-3 max-h-72 overflow-y-auto" data-testid="comments-list">
              {comments.length === 0 && <div className="text-xs text-zinc-500">Sem comentários ainda. Use <code>@nome</code> para marcar alguém.</div>}
              {comments.map((c) => (
                <div key={c.comment_id} className="rounded-md border border-white/10 p-3 bg-[#121214]" data-testid={`comment-${c.comment_id}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs"><b>{c.author_name}</b> <span className="text-zinc-500">· {new Date(c.created_at).toLocaleString("pt-BR")}</span></div>
                    <button onClick={() => deleteComment(c)} className="text-zinc-600 hover:text-red-600" data-testid={`del-comment-${c.comment_id}`}><Trash2 className="h-3 w-3" /></button>
                  </div>
                  <div className="text-sm text-zinc-200 whitespace-pre-wrap">{renderBody(c.body)}</div>
                </div>
              ))}
            </div>
            <form onSubmit={sendComment} className="relative mt-3">
              <textarea
                ref={textareaRef}
                data-testid="comment-input"
                value={text}
                onChange={onChangeText}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !showSuggest) { e.preventDefault(); sendComment(e); } }}
                placeholder="Escreva um comentário. Digite @ para mencionar…"
                rows={2}
                className="w-full rounded-md border border-white/15 p-2 text-sm resize-none"
              />
              {showSuggest && filtered.length > 0 && (
                <div className="absolute left-0 bottom-14 z-20 rounded-md border border-white/10 bg-[#121214] shadow-lg w-72 max-h-56 overflow-y-auto" data-testid="mention-suggest">
                  {filtered.map((u) => (
                    <button
                      key={u.user_id} type="button" onClick={() => insertMention(u)}
                      data-testid={`mention-${u.user_id}`}
                      className="w-full text-left px-3 py-2 hover:bg-white/5 flex items-center gap-2 text-sm"
                    >
                      <AtSign className="h-3 w-3 text-zinc-500" />
                      <span className="flex-1 truncate">{u.name}</span>
                      <span className="text-xs text-zinc-500 truncate">{u.email}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-2 flex justify-end">
                <Button size="sm" type="submit" data-testid="send-comment" className="h-9 bg-gradient-to-r from-[#5E6AD2] to-[#8B5CF6] text-white" disabled={!text.trim()}>
                  <Send className="h-3.5 w-3.5 mr-1.5" /> Comentar
                </Button>
              </div>
            </form>
          </div>

          {/* Custom fields */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Campos personalizados</Label>
              <button type="button" onClick={addField} className="text-xs text-zinc-400 hover:text-white flex items-center gap-1" data-testid="task-add-field"><Plus className="h-3 w-3" /> campo</button>
            </div>
            <div className="space-y-2">
              {fields.length === 0 && <div className="text-xs text-zinc-500">Adicione campos para categorizar melhor essa tarefa.</div>}
              {fields.map((cf, i) => (
                <div key={i} className="grid grid-cols-12 gap-2">
                  <Input className="col-span-4" placeholder="Nome" value={cf.name} onChange={(e) => setField(i, { name: e.target.value })} />
                  <Select value={cf.type} onValueChange={(v) => setField(i, { type: v })}>
                    <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                    <SelectContent>{FIELD_TYPES.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input className="col-span-4" type={cf.type === "date" ? "date" : cf.type === "number" ? "number" : "text"} placeholder="Valor" value={cf.value || ""} onChange={(e) => setField(i, { value: e.target.value })} />
                  <button onClick={() => rmField(i)} className="col-span-1 text-zinc-500 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter><Button disabled={saving} onClick={save} className="bg-gradient-to-r from-[#5E6AD2] to-[#8B5CF6] hover:opacity-90 text-white" data-testid="save-task-detail">{saving ? "Salvando…" : "Salvar campos"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
