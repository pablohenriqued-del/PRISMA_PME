import React, { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard, Users2, MessageCircle, Kanban, Wallet,
  FileText, Zap, Sparkles, LogOut, Search, Command, PanelLeftClose, PanelLeftOpen,
  ClipboardList, Bell,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import api from "@/lib/api";
import Copilot from "@/components/Copilot";
import CommandPalette from "@/components/CommandPalette";

import { UserCog } from "lucide-react";
const NAV = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/app/crm", label: "CRM", icon: Users2 },
  { to: "/app/os", label: "Ordem de Serviço", icon: ClipboardList },
  { to: "/app/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { to: "/app/projetos", label: "Projetos", icon: Kanban },
  { to: "/app/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/app/documentos", label: "Documentos", icon: FileText },
  { to: "/app/automacoes", label: "Automações", icon: Zap },
  { to: "/app/equipe", label: "Equipe", icon: UserCog },
];

export default function AppShell() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/login", { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "i") {
        e.preventDefault();
        setCopilotOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#08090A]">
        <div className="text-sm text-zinc-400">Carregando…</div>
      </div>
    );
  }

  const activeModule = NAV.find((n) => n.to === location.pathname)?.label || "Núcleo";

  return (
    <div className="min-h-screen flex bg-[#08090A] text-white">
      {/* SIDEBAR */}
      <aside
        data-testid="app-sidebar"
        className={`sticky top-0 h-screen shrink-0 border-r border-white/5 bg-[#08090A] flex flex-col transition-[width] duration-200 ${collapsed ? "w-[76px]" : "w-[240px]"}`}
      >
        <div className="h-16 flex items-center gap-3 px-5 border-b border-white/5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#5E6AD2] to-[#8B5CF6] flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(94,106,210,0.5)]">
            <svg width="15" height="15" viewBox="0 0 44 44" fill="none" aria-hidden="true">
              <path d="M22 4 L40 34 L4 34 Z" fill="white" strokeLinejoin="round" />
            </svg>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="font-display text-base font-semibold leading-none truncate">Prisma</div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 truncate mt-1">workspace</div>
            </div>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              data-testid={`nav-${label.toLowerCase()}`}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-lg px-3 h-10 text-sm transition-colors ${
                  isActive
                    ? "bg-white/5 text-white before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:rounded-full before:bg-gradient-to-b before:from-[#5E6AD2] before:to-[#8B5CF6]"
                    : "text-zinc-400 hover:bg-white/[0.03] hover:text-white"
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.6} />
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
          ))}

          <div className="mt-3 border-t border-white/5 pt-3">
            <button
              data-testid="open-copilot-side"
              onClick={() => setCopilotOpen(true)}
              className="group w-full flex items-center gap-3 rounded-lg px-3 h-10 text-sm transition-colors bg-gradient-to-r from-[#5E6AD2]/10 to-[#8B5CF6]/10 border border-[#5E6AD2]/20 hover:from-[#5E6AD2]/20 hover:to-[#8B5CF6]/20 text-white"
            >
              <Sparkles className="h-4 w-4 shrink-0 text-[#8B5CF6]" strokeWidth={1.8} />
              {!collapsed && (
                <>
                  <span className="truncate">Copiloto</span>
                  <kbd className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded border border-white/15 text-zinc-400">⌘I</kbd>
                </>
              )}
            </button>
          </div>
        </nav>

        <div className="p-3 border-t border-white/5">
          <button
            data-testid="user-menu"
            className="w-full flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/5 transition-colors"
            onClick={logout}
            title="Sair"
          >
            <Avatar className="h-8 w-8 ring-2 ring-white/10">
              <AvatarImage src={user.picture} alt={user.name} />
              <AvatarFallback className="text-xs bg-gradient-to-br from-[#5E6AD2] to-[#8B5CF6] text-white">{user.name?.[0]}</AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0 text-left">
                <div className="text-sm font-medium truncate">{user.name}</div>
                <div className="text-[11px] text-zinc-500 truncate">{user.email}</div>
              </div>
            )}
            {!collapsed && <LogOut className="h-4 w-4 text-zinc-500" />}
          </button>

          <button
            onClick={() => setCollapsed((v) => !v)}
            className="mt-2 w-full flex items-center justify-center gap-2 h-8 rounded-lg text-xs text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
            data-testid="toggle-sidebar"
          >
            {collapsed ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <><PanelLeftClose className="h-3.5 w-3.5" /> Recolher</>}
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-16 border-b border-white/5 bg-[#08090A]/80 backdrop-blur-xl flex items-center px-6 gap-4">
          <div className="overline text-zinc-500 hidden sm:block">{activeModule}</div>
          <button
            onClick={() => setPaletteOpen(true)}
            data-testid="open-command-palette"
            className="ml-auto flex items-center gap-2 h-9 px-3 rounded-md border border-white/10 bg-[#121214] hover:bg-white/5 text-sm text-zinc-400 transition-colors w-full max-w-md"
          >
            <Search className="h-4 w-4" strokeWidth={1.7} />
            <span className="flex-1 text-left">Buscar ou executar ação…</span>
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-white/15 text-zinc-400 flex items-center gap-0.5">
              <Command className="h-3 w-3" /> K
            </kbd>
          </button>
          <NotificationBell onOpenTask={(taskId) => navigate(`/app/projetos?task=${taskId}`)} />
          <Button
            data-testid="open-copilot-top"
            variant="outline"
            className="h-9 rounded-md border-white/10 gap-2"
            onClick={() => setCopilotOpen(true)}
          >
            <Sparkles className="h-4 w-4" />
            <span className="hidden md:inline">Copiloto</span>
          </Button>
        </header>

        <main className="flex-1 min-w-0 p-6 lg:p-10">
          <Outlet />
        </main>
      </div>

      <Copilot open={copilotOpen} onOpenChange={setCopilotOpen} moduleName={activeModule} />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} onOpenCopilot={() => setCopilotOpen(true)} />
    </div>
  );
}

function NotificationBell({ onOpenTask }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);

  const load = async () => {
    try {
      const r = await api.get("/notifications");
      setItems(r.data.items); setUnread(r.data.unread);
    } catch { /* ignore */ }
  };
  useEffect(() => { load(); const id = setInterval(load, 20000); return () => clearInterval(id); }, []);

  const readOne = async (n) => {
    try { await api.post(`/notifications/${n.notif_id}/read`); } catch { /* noop */ }
    if (n.target?.task_id) onOpenTask?.(n.target.task_id);
    setOpen(false); load();
  };
  const readAll = async () => { try { await api.post("/notifications/read-all"); load(); } catch { /* noop */ } };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          data-testid="notif-bell"
          className="relative h-9 w-9 rounded-md border border-white/10 hover:bg-white/5 flex items-center justify-center"
          aria-label="Notificações"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span data-testid="notif-badge" className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center font-mono">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" data-testid="notif-popover">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="text-sm font-medium">Notificações</div>
          {unread > 0 && <button onClick={readAll} className="text-xs text-zinc-500 hover:text-white" data-testid="notif-read-all">Marcar todas</button>}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 && <div className="p-8 text-center text-xs text-zinc-500">Sem notificações</div>}
          {items.map((n) => (
            <button
              key={n.notif_id}
              onClick={() => readOne(n)}
              data-testid={`notif-item-${n.notif_id}`}
              className={`w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/[0.03] ${!n.read ? "bg-blue-50/40" : ""}`}
            >
              <div className="text-sm text-zinc-200">{n.body}</div>
              <div className="text-[10px] text-zinc-500 mt-1">{new Date(n.created_at).toLocaleString("pt-BR")}</div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
