import React, { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Search, Phone, Info, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function WhatsAppInbox() {
  const [chats, setChats] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [openNew, setOpenNew] = useState(false);
  const [newChat, setNewChat] = useState({ name: "", phone: "" });
  const scrollRef = useRef(null);

  const loadChats = async () => {
    const r = await api.get("/wa/chats");
    setChats(r.data.items);
    if (!active && r.data.items.length) setActive(r.data.items[0]);
  };
  useEffect(() => { loadChats(); }, []);

  useEffect(() => {
    if (!active) return;
    api.get(`/wa/chats/${active.chat_id}/messages`).then((r) => setMessages(r.data.items));
  }, [active]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() || !active) return;
    const body = text.trim();
    setText("");
    setMessages((m) => [...m, { msg_id: "temp" + Date.now(), direction: "out", body, created_at: new Date().toISOString() }]);
    try {
      await api.post(`/wa/chats/${active.chat_id}/messages`, { body });
      loadChats();
    } catch { toast.error("Falha ao enviar"); }
  };

  const createChat = async (e) => {
    e.preventDefault();
    const r = await api.post("/wa/chats", newChat);
    setNewChat({ name: "", phone: "" });
    setOpenNew(false);
    setActive(r.data);
    loadChats();
  };

  const filtered = chats.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="flex flex-col fade-up" data-testid="whatsapp-page" style={{ height: "calc(100vh - 8rem)" }}>
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="overline text-black/50">WhatsApp · inbox</div>
          <h1 className="font-display text-4xl font-light tracking-tight mt-2">Conversas.</h1>
        </div>
        <div className="text-xs text-black/50">Modo simulação · integração oficial em breve</div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[340px_1fr] rounded-md border border-black/10 bg-white overflow-hidden">
        {/* left list */}
        <div className="border-r border-black/10 flex flex-col min-h-0">
          <div className="p-3 border-b border-black/10 flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-black/40" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar contato" className="pl-9 h-9" data-testid="wa-search" />
            </div>
            <Dialog open={openNew} onOpenChange={setOpenNew}>
              <DialogTrigger asChild>
                <Button size="icon" className="h-9 w-9 bg-[hsl(var(--ink))] hover:bg-black text-[hsl(var(--paper))]" data-testid="wa-new-chat">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader><DialogTitle>Nova conversa</DialogTitle></DialogHeader>
                <form onSubmit={createChat} className="space-y-4 pt-2">
                  <div><Label>Nome</Label><Input required data-testid="wa-chat-name" value={newChat.name} onChange={(e) => setNewChat({ ...newChat, name: e.target.value })} /></div>
                  <div><Label>Telefone</Label><Input required data-testid="wa-chat-phone" value={newChat.phone} onChange={(e) => setNewChat({ ...newChat, phone: e.target.value })} /></div>
                  <DialogFooter><Button type="submit" className="bg-[hsl(var(--ink))] hover:bg-black text-[hsl(var(--paper))]" data-testid="wa-save-chat">Criar</Button></DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.map((c) => (
              <button
                key={c.chat_id}
                onClick={() => setActive(c)}
                data-testid={`wa-chat-${c.chat_id}`}
                className={`w-full text-left px-4 py-3 border-b border-black/5 flex items-center gap-3 transition-colors ${active?.chat_id === c.chat_id ? "bg-black/5" : "hover:bg-black/5"}`}
              >
                <Avatar className="h-9 w-9"><AvatarFallback className="bg-[hsl(var(--lime)/0.35)] text-xs">{c.name?.[0]}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-sm truncate">{c.name}</div>
                    <div className="text-[10px] font-mono text-black/40 shrink-0">{c.phone?.replace(/\D+/g,"").slice(-4)}</div>
                  </div>
                  <div className="text-xs text-black/50 truncate">{c.last_message || "—"}</div>
                </div>
              </button>
            ))}
            {filtered.length === 0 && <div className="p-6 text-center text-sm text-black/40">Sem conversas</div>}
          </div>
        </div>

        {/* right pane */}
        <div className="flex flex-col min-h-0">
          {active ? (
            <>
              <div className="h-16 border-b border-black/10 px-5 flex items-center gap-3">
                <Avatar className="h-9 w-9"><AvatarFallback className="bg-[hsl(var(--lime)/0.35)]">{active.name?.[0]}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">{active.name}</div>
                  <div className="text-xs text-black/50 truncate flex items-center gap-1"><Phone className="h-3 w-3" />{active.phone}</div>
                </div>
                <Info className="h-4 w-4 text-black/40" />
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-3 bg-[radial-gradient(circle_at_50%_20%,hsl(78_60%_55%/0.06),transparent_60%)]">
                {messages.map((m) => (
                  <div key={m.msg_id} className={`flex ${m.direction === "out" ? "justify-end" : ""}`}>
                    <div className={`max-w-[70%] text-sm px-4 py-2 rounded-md ${m.direction === "out" ? "bg-[hsl(var(--ink))] text-[hsl(var(--paper))]" : "bg-white border border-black/10"}`}>
                      {m.body}
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={send} className="p-3 border-t border-black/10 flex items-center gap-2 bg-white">
                <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Escrever mensagem…" data-testid="wa-input" className="h-11" />
                <Button type="submit" size="icon" data-testid="wa-send" className="h-11 w-11 bg-[hsl(var(--ink))] hover:bg-black text-[hsl(var(--paper))]"><Send className="h-4 w-4" /></Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-black/40 text-sm">Selecione uma conversa</div>
          )}
        </div>
      </div>
    </div>
  );
}
