import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPlus, Mail, X, Crown, Shield, Users2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const ROLE_MAP = {
  owner: { l: "Owner", icon: Crown, color: "hsl(32 95% 55% / 0.30)" },
  admin: { l: "Admin", icon: Shield, color: "hsl(245 60% 55% / 0.25)" },
  comercial: { l: "Comercial", icon: Users2, color: "hsl(78 60% 55% / 0.35)" },
  financeiro: { l: "Financeiro", icon: Wallet, color: "hsl(148 60% 45% / 0.25)" },
};

export default function Team() {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", role: "comercial" });

  const load = async () => {
    const r = await api.get("/team/members");
    setMembers(r.data.members || []);
    setInvites(r.data.invites || []);
  };
  useEffect(() => { load(); }, []);

  const invite = async (e) => {
    e.preventDefault();
    try {
      await api.post("/team/invite", form);
      toast.success(`Convite enviado para ${form.email}`);
      setForm({ email: "", role: "comercial" });
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Falha ao convidar");
    }
  };

  const cancel = async (id) => { await api.delete(`/team/invite/${id}`); load(); };
  const changeRole = async (uid, role) => { await api.patch(`/team/members/${uid}`, { role }); load(); toast.success("Papel atualizado"); };

  const canInvite = user?.role === "owner" || user?.role === "admin";

  return (
    <div className="space-y-8 fade-up" data-testid="team-page">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="overline text-black/50">Equipe</div>
          <h1 className="font-display text-4xl font-light tracking-tight mt-2">Sua turma.</h1>
          <p className="text-black/60 mt-2 text-sm">Convide colegas por e-mail — eles entram automaticamente na sua organização ao fazer login.</p>
        </div>
        {canInvite && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="h-10 bg-[hsl(var(--ink))] hover:bg-black text-[hsl(var(--paper))]" data-testid="invite-btn">
                <UserPlus className="h-4 w-4 mr-2" /> Convidar membro
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Convidar para a equipe</DialogTitle></DialogHeader>
              <form onSubmit={invite} className="space-y-4 pt-2">
                <div><Label>E-mail</Label><Input required type="email" data-testid="invite-email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div>
                  <Label>Papel</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                    <SelectTrigger data-testid="invite-role"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLE_MAP).filter(([k]) => k !== "owner").map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-black/50 leading-relaxed">Um e-mail de convite será enviado. Quando essa pessoa fizer login com Google usando o mesmo e-mail, entra automaticamente aqui.</p>
                <DialogFooter><Button type="submit" className="bg-[hsl(var(--ink))] hover:bg-black text-[hsl(var(--paper))]" data-testid="send-invite">Enviar convite</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="rounded-md border border-black/10 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-black/10 overline text-black/50">Membros ativos · {members.length}</div>
        <div className="divide-y divide-black/5">
          {members.map((m) => {
            const R = ROLE_MAP[m.role] || ROLE_MAP.comercial;
            return (
              <div key={m.user_id} className="px-5 py-4 flex items-center gap-4" data-testid={`member-${m.user_id}`}>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={m.picture} alt={m.name} />
                  <AvatarFallback>{m.name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{m.name} {m.user_id === user?.user_id && <span className="text-xs text-black/40">(você)</span>}</div>
                  <div className="text-xs text-black/50">{m.email}</div>
                </div>
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-md" style={{ background: R.color }}>
                  <R.icon className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">{R.l}</span>
                </div>
                {user?.role === "owner" && m.user_id !== user.user_id && (
                  <Select value={m.role} onValueChange={(v) => changeRole(m.user_id, v)}>
                    <SelectTrigger className="w-32 h-8" data-testid={`role-${m.user_id}`}><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(ROLE_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.l}</SelectItem>)}</SelectContent>
                  </Select>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {invites.length > 0 && (
        <div className="rounded-md border border-dashed border-black/15 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-black/10 overline text-black/50">Convites pendentes · {invites.length}</div>
          <div className="divide-y divide-black/5">
            {invites.map((i) => (
              <div key={i.invite_id} className="px-5 py-4 flex items-center gap-4" data-testid={`invite-${i.invite_id}`}>
                <div className="h-10 w-10 rounded-md bg-black/5 flex items-center justify-center"><Mail className="h-4 w-4" /></div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{i.email}</div>
                  <div className="text-xs text-black/50">Convite como {ROLE_MAP[i.role]?.l || i.role} · aguardando login</div>
                </div>
                {canInvite && (
                  <button onClick={() => cancel(i.invite_id)} data-testid={`cancel-${i.invite_id}`} className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-black/5 text-black/40 hover:text-red-600 transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
