import React, { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, X, Zap, ListChecks, FileSignature, BarChart3, Sparkles, Loader2, ClipboardCopy } from "lucide-react";
import { API_BASE } from "@/lib/api";
import api from "@/lib/api";
import { toast } from "sonner";

const SUGGESTIONS = [
  "Resuma os leads em Negociação",
  "Sugira automações para meu financeiro",
  "Modelo de mensagem de cobrança no WhatsApp",
  "Como estruturar meu funil de vendas?",
];

// --- Quick action dialogs ---
function TaskDialog({ open, onOpenChange, onDone }) {
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    api.get("/projects").then((r) => setProjects(r.data.items)).catch(() => {});
    setTitle(""); setAssignee(""); setDueDate(""); setProjectId("");
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/copilot/create-task", { title, assignee, due_date: dueDate, project_id: projectId || null });
      toast.success("Tarefa criada pelo copiloto");
      onOpenChange(false);
      onDone?.({ action: "task", title });
    } catch { toast.error("Falha ao criar tarefa"); }
    finally { setLoading(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="copilot-task-dialog">
        <DialogHeader><DialogTitle>Criar tarefa</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4 pt-2">
          <div><Label>Título</Label><Input required data-testid="cop-task-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Ligar para o cliente amanhã" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Responsável</Label><Input data-testid="cop-task-assignee" value={assignee} onChange={(e) => setAssignee(e.target.value)} /></div>
            <div><Label>Prazo</Label><Input type="date" data-testid="cop-task-due" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
          </div>
          {projects.length > 0 && (
            <div>
              <Label>Projeto</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger data-testid="cop-task-project"><SelectValue placeholder="Auto" /></SelectTrigger>
                <SelectContent>{projects.map((p) => <SelectItem key={p.project_id} value={p.project_id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter><Button type="submit" disabled={loading} data-testid="cop-task-submit" className="bg-[hsl(var(--ink))] text-[hsl(var(--paper))] hover:bg-black">{loading ? "Criando…" : "Criar tarefa"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProposalDialog({ open, onOpenChange, onDone }) {
  const [leads, setLeads] = useState([]);
  const [leadId, setLeadId] = useState("");
  const [scope, setScope] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!open) return;
    api.get("/crm/leads").then((r) => setLeads(r.data.items)).catch(() => {});
    setLeadId(""); setScope(""); setResult(null);
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setResult(null);
    try {
      const r = await api.post("/copilot/generate-proposal", { lead_id: leadId || null, scope });
      setResult(r.data);
      toast.success("Proposta gerada e salva em Documentos");
      onDone?.({ action: "proposal", client: r.data.client });
    } catch { toast.error("Falha ao gerar proposta"); }
    finally { setLoading(false); }
  };
  const copy = () => { if (result?.proposal) { navigator.clipboard.writeText(result.proposal); toast.success("Copiado"); } };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="copilot-proposal-dialog">
        <DialogHeader><DialogTitle>Gerar proposta comercial</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4 pt-2">
          <div>
            <Label>Lead (opcional)</Label>
            <Select value={leadId || "none"} onValueChange={(v) => setLeadId(v === "none" ? "" : v)}>
              <SelectTrigger data-testid="cop-prop-lead"><SelectValue placeholder="Selecione um lead" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— sem lead —</SelectItem>
                {leads.map((l) => <SelectItem key={l.lead_id} value={l.lead_id}>{l.name}{l.company ? ` · ${l.company}` : ""}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Escopo / contexto extra</Label><textarea data-testid="cop-prop-scope" value={scope} onChange={(e) => setScope(e.target.value)} rows={4} className="w-full rounded-md border border-black/15 p-2 text-sm" placeholder="Descreva o serviço, entregas e prazos…" /></div>
          {!result && <DialogFooter><Button type="submit" disabled={loading} data-testid="cop-prop-submit" className="bg-[hsl(var(--ink))] text-[hsl(var(--paper))] hover:bg-black">{loading ? "Gerando…" : "Gerar proposta"}</Button></DialogFooter>}
        </form>
        {result && (
          <div className="mt-2">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-black/50">Cliente: {result.client}</div>
              <button onClick={copy} className="text-xs text-black/60 hover:text-black flex items-center gap-1" data-testid="cop-prop-copy"><ClipboardCopy className="h-3 w-3" /> Copiar</button>
            </div>
            <pre className="whitespace-pre-wrap text-xs bg-black/[0.03] rounded-md p-4 border border-black/10 leading-relaxed">{result.proposal}</pre>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ReportDialog({ open, onOpenChange, onDone }) {
  const [type, setType] = useState("geral");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => { if (open) { setType("geral"); setResult(null); } }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setResult(null);
    try {
      const r = await api.post("/copilot/generate-report", { type });
      setResult(r.data);
      toast.success("Relatório gerado");
      onDone?.({ action: "report", type });
    } catch { toast.error("Falha ao gerar relatório"); }
    finally { setLoading(false); }
  };
  const copy = () => { if (result?.report) { navigator.clipboard.writeText(result.report); toast.success("Copiado"); } };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="copilot-report-dialog">
        <DialogHeader><DialogTitle>Gerar relatório</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4 pt-2">
          <div>
            <Label>Tipo</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger data-testid="cop-report-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="geral">Geral (CRM + Financeiro + Projetos)</SelectItem>
                <SelectItem value="crm">CRM</SelectItem>
                <SelectItem value="financeiro">Financeiro</SelectItem>
                <SelectItem value="projetos">Projetos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {!result && <DialogFooter><Button type="submit" disabled={loading} data-testid="cop-report-submit" className="bg-[hsl(var(--ink))] text-[hsl(var(--paper))] hover:bg-black">{loading ? "Gerando…" : "Gerar relatório"}</Button></DialogFooter>}
        </form>
        {result && (
          <div className="mt-2">
            <div className="flex justify-end mb-2"><button onClick={copy} className="text-xs text-black/60 hover:text-black flex items-center gap-1" data-testid="cop-report-copy"><ClipboardCopy className="h-3 w-3" /> Copiar</button></div>
            <pre className="whitespace-pre-wrap text-xs bg-black/[0.03] rounded-md p-4 border border-black/10 leading-relaxed">{result.report}</pre>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function Copilot({ open, onOpenChange, moduleName }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [sessionId] = useState(() => "cop_" + Math.random().toString(36).slice(2, 12));
  const [taskOpen, setTaskOpen] = useState(false);
  const [proposalOpen, setProposalOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, streaming]);

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || streaming) return;
    // Intent-based shortcuts
    const lower = msg.toLowerCase();
    if (/^(cri(e|ar)|nova)\s+(tarefa|task)/.test(lower)) { setTaskOpen(true); return; }
    if (/^(ger(e|ar)|criar?|fazer?)\s+(uma )?propost/.test(lower)) { setProposalOpen(true); return; }
    if (/^(ger(e|ar)|criar?|fazer?)\s+(um )?relatori/.test(lower)) { setReportOpen(true); return; }

    setInput("");
    setMessages((m) => [...m, { role: "user", content: msg }, { role: "assistant", content: "" }]);
    setStreaming(true);
    try {
      const res = await fetch(`${API_BASE}/copilot/chat`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, session_id: sessionId, context: moduleName }),
      });
      if (!res.ok || !res.body) throw new Error("stream falhou");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const events = buf.split("\n\n");
        buf = events.pop();
        for (const ev of events) {
          const line = ev.split("\n").find((l) => l.startsWith("data:"));
          if (!line) continue;
          const chunk = line.slice(5).replace(/^ /, "");
          if (chunk === "[DONE]") continue;
          setMessages((m) => {
            const copy = [...m];
            copy[copy.length - 1] = { role: "assistant", content: (copy[copy.length - 1].content || "") + chunk };
            return copy;
          });
        }
      }
    } catch (e) {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: "assistant", content: "Ops, não consegui responder agora. Tente novamente." };
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  };

  const onActionDone = (info) => {
    const label = info.action === "task"
      ? `✓ Tarefa criada: ${info.title}`
      : info.action === "proposal"
        ? `✓ Proposta gerada para ${info.client} e salva em Documentos.`
        : `✓ Relatório ${info.type} gerado e salvo em Documentos.`;
    setMessages((m) => [...m, { role: "assistant", content: label }]);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        data-testid="copilot-panel"
        className="w-full sm:max-w-[480px] p-0 border-l border-black/10 bg-white/90 backdrop-blur-2xl"
      >
        <div className="flex flex-col h-full">
          <div className="h-16 px-5 flex items-center gap-3 border-b border-black/10">
            <div className="h-8 w-8 rounded-md bg-[hsl(var(--ink))] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 44 44" fill="none" aria-hidden="true">
                <path d="M22 4 L40 34 L4 34 Z" fill="#F5F1EA" stroke="#F5F1EA" strokeWidth="1" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="italic text-base" style={{ fontFamily: "'Fraunces', serif" }}>Copiloto Prisma</div>
              <div className="text-[11px] text-black/50">operacional · contexto: {moduleName}</div>
            </div>
            <button data-testid="close-copilot" onClick={() => onOpenChange(false)} className="h-8 w-8 rounded-md hover:bg-black/5 flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Quick actions */}
          <div className="px-5 py-3 border-b border-black/10 bg-black/[0.02]">
            <div className="overline text-black/50 mb-2">ações rápidas</div>
            <div className="flex flex-wrap gap-2">
              <button data-testid="cop-quick-task" onClick={() => setTaskOpen(true)} className="text-xs px-3 h-8 rounded-md bg-white border border-black/10 hover:border-black/40 flex items-center gap-1.5">
                <ListChecks className="h-3.5 w-3.5" /> Criar tarefa
              </button>
              <button data-testid="cop-quick-proposal" onClick={() => setProposalOpen(true)} className="text-xs px-3 h-8 rounded-md bg-white border border-black/10 hover:border-black/40 flex items-center gap-1.5">
                <FileSignature className="h-3.5 w-3.5" /> Gerar proposta
              </button>
              <button data-testid="cop-quick-report" onClick={() => setReportOpen(true)} className="text-xs px-3 h-8 rounded-md bg-white border border-black/10 hover:border-black/40 flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5" /> Gerar relatório
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6 space-y-4">
            {messages.length === 0 && (
              <div className="space-y-6">
                <div>
                  <div className="overline text-black/50 mb-3">Como posso ajudar?</div>
                  <h3 className="font-display text-2xl font-light tracking-tight">
                    Vamos avançar em <span className="font-medium">{moduleName.toLowerCase()}</span>.
                  </h3>
                  <p className="text-xs text-black/50 mt-2">Dica: peça &quot;crie uma tarefa…&quot;, &quot;gere uma proposta para…&quot; ou &quot;gere um relatório…&quot; e eu abro a ação certa.</p>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      data-testid={`copilot-suggest`}
                      className="text-left border border-black/10 rounded-md px-4 py-3 text-sm hover:bg-black/5 transition-colors flex items-center gap-2"
                    >
                      <Zap className="h-3.5 w-3.5 text-[hsl(var(--amber))]" />
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""} fade-up`}>
                {m.role === "assistant" && (
                  <div className="h-7 w-7 rounded-md bg-[hsl(var(--ink))] flex items-center justify-center shrink-0">
                    <svg width="14" height="14" viewBox="0 0 44 44" fill="none" aria-hidden="true">
                      <path d="M22 4 L40 34 L4 34 Z" fill="#F5F1EA" stroke="#F5F1EA" strokeWidth="1" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-md px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-[hsl(var(--ink))] text-[hsl(var(--paper))]"
                      : "bg-black/5 text-black"
                  }`}
                >
                  {m.content || (streaming && i === messages.length - 1 ? "…" : "")}
                </div>
              </div>
            ))}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="p-4 border-t border-black/10 bg-white/70 backdrop-blur"
          >
            <div className="flex items-end gap-2 rounded-md border border-black/10 bg-white px-3 py-2">
              <textarea
                data-testid="copilot-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                }}
                placeholder="Pergunte ou peça uma ação ao copiloto…"
                rows={1}
                className="flex-1 resize-none bg-transparent outline-none text-sm py-1.5 min-h-[28px] max-h-40"
              />
              <Button
                type="submit"
                size="sm"
                data-testid="copilot-send"
                disabled={streaming || !input.trim()}
                className="h-8 rounded-md bg-[hsl(var(--ink))] hover:bg-black text-[hsl(var(--paper))]"
              >
                {streaming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              </Button>
            </div>
            <div className="mt-2 text-[10px] text-black/40 flex items-center gap-2">
              <span>Enter para enviar</span>
              <span>·</span>
              <span>Shift+Enter para nova linha</span>
            </div>
          </form>
        </div>
      </SheetContent>
      <TaskDialog open={taskOpen} onOpenChange={setTaskOpen} onDone={onActionDone} />
      <ProposalDialog open={proposalOpen} onOpenChange={setProposalOpen} onDone={onActionDone} />
      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} onDone={onActionDone} />
    </Sheet>
  );
}
