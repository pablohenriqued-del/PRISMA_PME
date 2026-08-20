import React, { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, X, Zap, ListChecks, FileSignature, BarChart3, Sparkles, Loader2, ClipboardCopy, FileText, Download, ExternalLink } from "lucide-react";
import { API_BASE } from "@/lib/api";
import api from "@/lib/api";
import { toast } from "sonner";

const SUGGESTIONS = [
  "Gere apresentação para Padaria Bella por 4500",
  "Resuma os leads em Negociação",
  "Sugira automações para meu financeiro",
  "Modelo de mensagem de cobrança no WhatsApp",
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
        <DialogHeader><DialogTitle>Criar tarefa</DialogTitle><DialogDescription>Copiloto salva a tarefa em um projeto existente ou cria o projeto &quot;Tarefas do Copiloto&quot;.</DialogDescription></DialogHeader>
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
          <DialogFooter><Button type="submit" disabled={loading} data-testid="cop-task-submit" className="bg-gradient-to-r from-[#5E6AD2] to-[#8B5CF6] text-white hover:opacity-90">{loading ? "Criando…" : "Criar tarefa"}</Button></DialogFooter>
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
  const copy = async () => {
    if (!result?.proposal) return;
    try { await navigator.clipboard.writeText(result.proposal); toast.success("Copiado"); }
    catch { window.prompt("Copie manualmente:", result.proposal.slice(0, 500)); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="copilot-proposal-dialog">
        <DialogHeader><DialogTitle>Gerar proposta comercial</DialogTitle><DialogDescription>Proposta gerada por IA (Claude Sonnet 4.5) e salva em Documentos.</DialogDescription></DialogHeader>
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
          <div><Label>Escopo / contexto extra</Label><textarea data-testid="cop-prop-scope" value={scope} onChange={(e) => setScope(e.target.value)} rows={4} className="w-full rounded-md border border-white/15 p-2 text-sm" placeholder="Descreva o serviço, entregas e prazos…" /></div>
          {!result && <DialogFooter><Button type="submit" disabled={loading} data-testid="cop-prop-submit" className="bg-gradient-to-r from-[#5E6AD2] to-[#8B5CF6] text-white hover:opacity-90">{loading ? "Gerando…" : "Gerar proposta"}</Button></DialogFooter>}
        </form>
        {result && (
          <div className="mt-2">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-zinc-500">Cliente: {result.client}</div>
              <button onClick={copy} className="text-xs text-zinc-400 hover:text-white flex items-center gap-1" data-testid="cop-prop-copy"><ClipboardCopy className="h-3 w-3" /> Copiar</button>
            </div>
            <pre className="whitespace-pre-wrap text-xs bg-[#121214]/[0.03] rounded-md p-4 border border-white/10 leading-relaxed">{result.proposal}</pre>
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
  const copy = async () => {
    if (!result?.report) return;
    try { await navigator.clipboard.writeText(result.report); toast.success("Copiado"); }
    catch { window.prompt("Copie manualmente:", result.report.slice(0, 500)); }
  };
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
          {!result && <DialogFooter><Button type="submit" disabled={loading} data-testid="cop-report-submit" className="bg-gradient-to-r from-[#5E6AD2] to-[#8B5CF6] text-white hover:opacity-90">{loading ? "Gerando…" : "Gerar relatório"}</Button></DialogFooter>}
        </form>
        {result && (
          <div className="mt-2">
            <div className="flex justify-end mb-2"><button onClick={copy} className="text-xs text-zinc-400 hover:text-white flex items-center gap-1" data-testid="cop-report-copy"><ClipboardCopy className="h-3 w-3" /> Copiar</button></div>
            <pre className="whitespace-pre-wrap text-xs bg-[#121214]/[0.03] rounded-md p-4 border border-white/10 leading-relaxed">{result.report}</pre>
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

    // Intent: "gere apresentacao para <cliente> [por/de/no valor de <valor>]"
    const presMatch = msg.match(/(?:ger[ae]|criar?|nova|fazer?|monta[re]?)\s+(?:uma\s+)?apresenta(?:c|ç)(?:a|ã)o(?:\s+comercial)?\s+(?:para|do|da|de)\s+(.+?)(?:\s+(?:por|no valor de|valor de|de|com|em)\s+R?\$?\s*([\d.,]+))?[.!?]?$/i);
    if (presMatch) {
      const cliente = presMatch[1].trim().replace(/\s+/g, " ").replace(/[.!?,]+$/, "");
      const rawValor = presMatch[2];
      let valor = null;
      if (rawValor) {
        const clean = rawValor.replace(/\./g, "").replace(",", ".");
        const n = parseFloat(clean);
        if (!isNaN(n)) valor = Math.round(n);
      }
      const params = new URLSearchParams({ para: cliente });
      if (valor) params.set("valor", String(valor));
      const pdfUrl = `${API_BASE}/public/apresentacao.pdf?${params.toString()}`;
      const pageUrl = `${window.location.origin}/apresentacao?${params.toString()}`;
      setInput("");
      setMessages((m) => [
        ...m,
        { role: "user", content: msg },
        { role: "assistant", type: "presentation", cliente, valor, pdfUrl, pageUrl },
      ]);
      toast.success(`Apresentação para ${cliente} pronta`);
      return;
    }

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
        className="w-full sm:max-w-[480px] p-0 border-l border-white/10 bg-[#121214]/90 backdrop-blur-2xl"
      >
        <div className="flex flex-col h-full">
          <div className="h-16 px-5 flex items-center gap-3 border-b border-white/10">
            <div className="h-8 w-8 rounded-md bg-gradient-to-r from-[#5E6AD2] to-[#8B5CF6] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 44 44" fill="none" aria-hidden="true">
                <path d="M22 4 L40 34 L4 34 Z" fill="#F5F1EA" stroke="#F5F1EA" strokeWidth="1" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="italic text-base" style={{ fontFamily: "'Fraunces', serif" }}>Copiloto Prisma</div>
              <div className="text-[11px] text-zinc-500">operacional · contexto: {moduleName}</div>
            </div>
            <button data-testid="close-copilot" onClick={() => onOpenChange(false)} className="h-8 w-8 rounded-md hover:bg-white/5 flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Quick actions */}
          <div className="px-5 py-3 border-b border-white/10 bg-[#121214]/[0.02]">
            <div className="overline text-zinc-500 mb-2">ações rápidas</div>
            <div className="flex flex-wrap gap-2">
              <button data-testid="cop-quick-task" onClick={() => setTaskOpen(true)} className="text-xs px-3 h-8 rounded-md bg-[#121214] border border-white/10 hover:border-white/20 flex items-center gap-1.5">
                <ListChecks className="h-3.5 w-3.5" /> Criar tarefa
              </button>
              <button data-testid="cop-quick-proposal" onClick={() => setProposalOpen(true)} className="text-xs px-3 h-8 rounded-md bg-[#121214] border border-white/10 hover:border-white/20 flex items-center gap-1.5">
                <FileSignature className="h-3.5 w-3.5" /> Gerar proposta
              </button>
              <button data-testid="cop-quick-report" onClick={() => setReportOpen(true)} className="text-xs px-3 h-8 rounded-md bg-[#121214] border border-white/10 hover:border-white/20 flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5" /> Gerar relatório
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6 space-y-4">
            {messages.length === 0 && (
              <div className="space-y-6">
                <div>
                  <div className="overline text-zinc-500 mb-3">Como posso ajudar?</div>
                  <h3 className="font-display text-2xl font-light tracking-tight">
                    Vamos avançar em <span className="font-medium">{moduleName.toLowerCase()}</span>.
                  </h3>
                  <p className="text-xs text-zinc-500 mt-2">Dica: peça &quot;crie uma tarefa…&quot;, &quot;gere uma proposta para…&quot;, &quot;gere um relatório…&quot; ou &quot;gere apresentação para X por Y&quot; e eu abro a ação certa.</p>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      data-testid={`copilot-suggest`}
                      className="text-left border border-white/10 rounded-md px-4 py-3 text-sm hover:bg-white/5 transition-colors flex items-center gap-2"
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
                  <div className="h-7 w-7 rounded-md bg-gradient-to-r from-[#5E6AD2] to-[#8B5CF6] flex items-center justify-center shrink-0">
                    <svg width="14" height="14" viewBox="0 0 44 44" fill="none" aria-hidden="true">
                      <path d="M22 4 L40 34 L4 34 Z" fill="#F5F1EA" stroke="#F5F1EA" strokeWidth="1" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
                {m.type === "presentation" ? (
                  <div
                    data-testid={`cop-presentation-${i}`}
                    className="max-w-[88%] w-full rounded-xl border border-[#5E6AD2]/30 bg-gradient-to-br from-[#5E6AD2]/[0.08] via-[#121214] to-[#121214] p-4 shadow-[0_0_24px_rgba(94,106,210,0.15)]"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4 text-[#8B5CF6]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Apresentação comercial</div>
                        <div className="text-sm font-medium text-zinc-100 mt-0.5 truncate">para {m.cliente}</div>
                        {m.valor != null && (
                          <div className="text-xs text-emerald-400 mt-1 font-medium">
                            R$ {m.valor.toLocaleString("pt-BR")} <span className="text-zinc-500 font-normal">· pré-preenchido no PDF</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-2">
                      <a
                        href={m.pdfUrl} target="_blank" rel="noopener noreferrer"
                        data-testid="cop-pres-pdf"
                        className="inline-flex items-center gap-2 h-9 px-3 rounded-md bg-gradient-to-r from-[#5E6AD2] to-[#8B5CF6] text-white text-xs justify-center hover:opacity-95 shadow-[0_0_16px_rgba(94,106,210,0.35)]"
                      >
                        <Download className="h-3.5 w-3.5" /> Baixar PDF one-page
                      </a>
                      <div className="grid grid-cols-2 gap-2">
                        <a
                          href={m.pageUrl} target="_blank" rel="noopener noreferrer"
                          data-testid="cop-pres-page"
                          className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-white/10 bg-white/[0.03] text-zinc-200 text-xs justify-center hover:bg-white/[0.06]"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> Página online
                        </a>
                        <button
                          type="button"
                          onClick={() => { navigator.clipboard.writeText(m.pageUrl); toast.success("Link copiado"); }}
                          data-testid="cop-pres-copy"
                          className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-white/10 bg-white/[0.03] text-zinc-300 text-xs justify-center hover:text-white hover:bg-white/[0.06]"
                        >
                          <ClipboardCopy className="h-3.5 w-3.5" /> Copiar link
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 text-[10px] text-zinc-500">Cliente vê no navegador ou baixa o PDF. Nada precisa ser instalado.</div>
                  </div>
                ) : (
                  <div
                    className={`max-w-[85%] rounded-md px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-gradient-to-r from-[#5E6AD2] to-[#8B5CF6] text-white"
                        : "bg-[#121214]/5 text-white"
                    }`}
                  >
                    {m.content || (streaming && i === messages.length - 1 ? "…" : "")}
                  </div>
                )}
              </div>
            ))}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="p-4 border-t border-white/10 bg-[#121214]/[0.02] backdrop-blur"
          >
            <div className="flex items-end gap-2 rounded-md border border-white/10 bg-[#121214] px-3 py-2">
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
                className="h-8 rounded-md bg-gradient-to-r from-[#5E6AD2] to-[#8B5CF6] hover:opacity-90 text-white"
              >
                {streaming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              </Button>
            </div>
            <div className="mt-2 text-[10px] text-zinc-500 flex items-center gap-2">
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
