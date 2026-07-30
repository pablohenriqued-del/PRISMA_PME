import React, { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Sparkles, Send, X, Zap } from "lucide-react";
import { API_BASE } from "@/lib/api";

const SUGGESTIONS = [
  "Resuma os leads em Negociação",
  "Sugira automações para meu financeiro",
  "Modelo de mensagem de cobrança no WhatsApp",
  "Como estruturar meu funil de vendas?",
];

export default function Copilot({ open, onOpenChange, moduleName }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [sessionId] = useState(() => "cop_" + Math.random().toString(36).slice(2, 12));
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, streaming]);

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || streaming) return;
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        data-testid="copilot-panel"
        className="w-full sm:max-w-[460px] p-0 border-l border-black/10 bg-white/90 backdrop-blur-2xl"
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
              <div className="text-[11px] text-black/50">Claude Sonnet · contexto: {moduleName}</div>
            </div>
            <button data-testid="close-copilot" onClick={() => onOpenChange(false)} className="h-8 w-8 rounded-md hover:bg-black/5 flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6 space-y-4">
            {messages.length === 0 && (
              <div className="space-y-6">
                <div>
                  <div className="overline text-black/50 mb-3">Como posso ajudar?</div>
                  <h3 className="font-display text-2xl font-light tracking-tight">
                    Vamos avançar em <span className="font-medium">{moduleName.toLowerCase()}</span>.
                  </h3>
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
                placeholder="Pergunte algo ao copiloto…"
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
                <Send className="h-3.5 w-3.5" />
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
    </Sheet>
  );
}
