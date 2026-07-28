import React from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem, CommandShortcut,
} from "@/components/ui/command";
import { LayoutDashboard, Users2, MessageCircle, Kanban, Wallet, FileText, Zap, Sparkles, Plus } from "lucide-react";

export default function CommandPalette({ open, onOpenChange, onOpenCopilot }) {
  const navigate = useNavigate();
  const go = (path) => { onOpenChange(false); navigate(path); };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Buscar módulos, ações ou digite algo…" data-testid="palette-input" />
      <CommandList>
        <CommandEmpty>Nada encontrado.</CommandEmpty>
        <CommandGroup heading="Ir para">
          <CommandItem onSelect={() => go("/app")}><LayoutDashboard className="h-4 w-4 mr-2" />Dashboard</CommandItem>
          <CommandItem onSelect={() => go("/app/crm")}><Users2 className="h-4 w-4 mr-2" />CRM</CommandItem>
          <CommandItem onSelect={() => go("/app/whatsapp")}><MessageCircle className="h-4 w-4 mr-2" />WhatsApp</CommandItem>
          <CommandItem onSelect={() => go("/app/projetos")}><Kanban className="h-4 w-4 mr-2" />Projetos</CommandItem>
          <CommandItem onSelect={() => go("/app/financeiro")}><Wallet className="h-4 w-4 mr-2" />Financeiro</CommandItem>
          <CommandItem onSelect={() => go("/app/documentos")}><FileText className="h-4 w-4 mr-2" />Documentos</CommandItem>
          <CommandItem onSelect={() => go("/app/automacoes")}><Zap className="h-4 w-4 mr-2" />Automações</CommandItem>
        </CommandGroup>
        <CommandGroup heading="Ações">
          <CommandItem onSelect={() => { onOpenChange(false); onOpenCopilot(); }}>
            <Sparkles className="h-4 w-4 mr-2" />Abrir Copiloto <CommandShortcut>⌘I</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => go("/app/crm")}><Plus className="h-4 w-4 mr-2" />Novo lead</CommandItem>
          <CommandItem onSelect={() => go("/app/financeiro")}><Plus className="h-4 w-4 mr-2" />Novo lançamento</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
