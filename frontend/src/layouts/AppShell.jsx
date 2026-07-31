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
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--paper))]">
        <div className="text-sm text-black/60">Carregando…</div>
      </div>
    );
  }

  const activeModule = NAV.find((n) => n.to === location.pathname)?.label || "Núcleo";

  return (
    <div className="min-h-screen flex bg-[hsl(var(--paper))] text-[hsl(var(--ink))]">
      {/* SIDEBAR */}
      <aside
        data-testid="app-sidebar"
        className={`sticky top-0 h-screen shrink-0 border-r border-black/10 bg-white/40 backdrop-blur-sm flex flex-col transition-[width] duration-200 ${collapsed ? "w-[76px]" : "w-[248px]"}`}
      >
        <div className="h-16 flex items-center gap-3 px-5 border-b border-black/10">
          <div className="h-8 w-8 rounded-md bg-[hsl(var(--ink))] flex items-center justify-center shrink-0 relative overflow-hidden">
            <svg width="18" height="18" viewBox="0 0 44 44" fill="none" aria-hidden="true">
              <path d="M22 4 L40 34 L4 34 Z" fill="#F5F1EA" stroke="#F5F1EA" strokeWidth="1" strokeLinejoin="round" />
            </svg>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-base leading-none truncate italic" style={{ fontFamily: "'Fraunces', serif" }}>Prisma</div>
              <div className="text-[10px] uppercase tracking-widest text-black/50 truncate mt-1">workspace</div>
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
                `group flex items-center gap-3 rounded-md px-3 h-10 text-sm transition-colors ${
                  isActive
                    ? "bg-[hsl(var(--ink))] text-[hsl(var(--paper))]"
                    : "text-black/70 hover:bg-black/5 hover:text-black"
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.6} />
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
          ))}

          <div className="mt-3 border-t border-black/10 pt-3">
            <button
              data-testid="open-copilot-side"
              onClick={() => setCopilotOpen(true)}
              className={`group w-full flex items-center gap-3 rounded-md px-3 h-10 text-sm transition-colors bg-black/5 hover:bg-black/10 text-black`}
            >
              <Sparkles className="h-4 w-4 shrink-0" strokeWidth={1.6} />
              {!collapsed && (
                <>
                  <span className="truncate">Copiloto</span>
                  <kbd className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded border border-black/15 text-black/60">⌘I</kbd>
                </>
              )}
            </button>
          </div>
        </nav>

        <div className="p-3 border-t border-black/10">
          <button
            data-testid="user-menu"
            className="w-full flex items-center gap-3 rounded-md px-2 py-2 hover:bg-black/5 transition-colors"
            onClick={logout}
            title="Sair"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.picture} alt={user.name} />
              <AvatarFallback className="text-xs">{user.name?.[0]}</AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0 text-left">
                <div className="text-sm font-medium truncate">{user.name}</div>
                <div className="text-[11px] text-black/50 truncate">{user.email}</div>
              </div>
            )}
            {!collapsed && <LogOut className="h-4 w-4 text-black/50" />}
          </button>

          <button
            onClick={() => setCollapsed((v) => !v)}
            className="mt-2 w-full flex items-center justify-center gap-2 h-8 rounded-md text-xs text-black/50 hover:text-black hover:bg-black/5 transition-colors"
            data-testid="toggle-sidebar"
          >
            {collapsed ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <><PanelLeftClose className="h-3.5 w-3.5" /> Recolher</>}
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-16 border-b border-black/10 bg-white/70 backdrop-blur-xl flex items-center px-6 gap-4">
          <div className="overline text-black/50 hidden sm:block">{activeModule}</div>
          <button
            onClick={() => setPaletteOpen(true)}
            data-testid="open-command-palette"
            className="ml-auto flex items-center gap-2 h-9 px-3 rounded-md border border-black/10 bg-white hover:bg-black/5 text-sm text-black/60 transition-colors w-full max-w-md"
          >
            <Search className="h-4 w-4" strokeWidth={1.7} />
            <span className="flex-1 text-left">Buscar ou executar ação…</span>
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-black/15 text-black/60 flex items-center gap-0.5">
              <Command className="h-3 w-3" /> K
            </kbd>
          </button>
          <NotificationBell onOpenTask={(taskId) => navigate(`/app/projetos?task=${taskId}`)} />
          <Button
            data-testid="open-copilot-top"
            variant="outline"
            className="h-9 rounded-md border-black/10 gap-2"
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
          className="relative h-9 w-9 rounded-md border border-black/10 hover:bg-black/5 flex items-center justify-center"
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
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/10">
          <div className="text-sm font-medium">Notificações</div>
          {unread > 0 && <button onClick={readAll} className="text-xs text-black/50 hover:text-black" data-testid="notif-read-all">Marcar todas</button>}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 && <div className="p-8 text-center text-xs text-black/40">Sem notificações</div>}
          {items.map((n) => (
            <button
              key={n.notif_id}
              onClick={() => readOne(n)}
              data-testid={`notif-item-${n.notif_id}`}
              className={`w-full text-left px-4 py-3 border-b border-black/5 hover:bg-black/[0.03] ${!n.read ? "bg-blue-50/40" : ""}`}
            >
              <div className="text-sm text-black/80">{n.body}</div>
              <div className="text-[10px] text-black/40 mt-1">{new Date(n.created_at).toLocaleString("pt-BR")}</div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
