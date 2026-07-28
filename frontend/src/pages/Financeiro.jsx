import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, TrendingUp, TrendingDown, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const brl = (n) => (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function Financeiro() {
  const [data, setData] = useState({ items: [], receita: 0, despesa: 0, saldo: 0 });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ description: "", amount: 0, kind: "receita", date: new Date().toISOString().slice(0,10), status: "pago" });

  const load = async () => { const r = await api.get("/finance"); setData(r.data); };
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    await api.post("/finance", { ...form, amount: Number(form.amount) || 0 });
    setForm({ description: "", amount: 0, kind: "receita", date: new Date().toISOString().slice(0,10), status: "pago" });
    setOpen(false);
    load();
    toast.success("Lançamento adicionado");
  };
  const del = async (id) => { await api.delete(`/finance/${id}`); load(); };

  // series
  const byDate = {};
  data.items.forEach((t) => {
    byDate[t.date] = byDate[t.date] || { date: t.date, receita: 0, despesa: 0 };
    byDate[t.date][t.kind] += t.amount;
  });
  const series = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-8 fade-up" data-testid="financeiro-page">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="overline text-black/50">Financeiro</div>
          <h1 className="font-display text-4xl font-light tracking-tight mt-2">Fluxo de caixa.</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="h-10 bg-[hsl(var(--ink))] hover:bg-black text-[hsl(var(--paper))]" data-testid="new-tx-btn"><Plus className="h-4 w-4 mr-2" />Novo lançamento</Button></DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Novo lançamento</DialogTitle></DialogHeader>
            <form onSubmit={create} className="space-y-4 pt-2">
              <div><Label>Descrição</Label><Input required data-testid="tx-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Valor (R$)</Label><Input type="number" required data-testid="tx-amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
                <div><Label>Data</Label><Input type="date" data-testid="tx-date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              </div>
              <div><Label>Tipo</Label>
                <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
                  <SelectTrigger data-testid="tx-kind"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="receita">Receita</SelectItem><SelectItem value="despesa">Despesa</SelectItem></SelectContent>
                </Select>
              </div>
              <DialogFooter><Button type="submit" className="bg-[hsl(var(--ink))] hover:bg-black text-[hsl(var(--paper))]" data-testid="save-tx">Salvar</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Big north star */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 rounded-md border border-black/10 bg-white p-6">
          <div className="overline text-black/50">Saldo do período</div>
          <div className="font-display text-5xl font-light mt-3 tracking-tight">{brl(data.saldo)}</div>
          <div className="mt-4 space-y-2 pt-4 border-t border-black/10">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-emerald-700"><TrendingUp className="h-4 w-4" />Receita</div>
              <div className="font-mono">{brl(data.receita)}</div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-red-700"><TrendingDown className="h-4 w-4" />Despesa</div>
              <div className="font-mono">{brl(data.despesa)}</div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-md border border-black/10 bg-white p-6">
          <div className="overline text-black/50">Movimentação</div>
          <div className="h-64 mt-2">
            <ResponsiveContainer>
              <AreaChart data={series} margin={{ top: 10, right: 8, bottom: 0, left: -10 }}>
                <defs>
                  <linearGradient id="rec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(148 60% 45%)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(148 60% 45%)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="des" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(8 84% 65%)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(8 84% 65%)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="hsl(220 13% 91%)" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#64748b" }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }} formatter={(v) => brl(v)} />
                <Area type="monotone" dataKey="receita" stroke="hsl(148 60% 35%)" strokeWidth={2} fill="url(#rec)" />
                <Area type="monotone" dataKey="despesa" stroke="hsl(8 60% 45%)" strokeWidth={2} fill="url(#des)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-md border border-black/10 bg-white overflow-hidden">
        <div className="p-4 border-b border-black/10 overline text-black/50">Lançamentos recentes</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((t) => (
              <TableRow key={t.tx_id} data-testid={`tx-row-${t.tx_id}`}>
                <TableCell className="font-medium">{t.description}</TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-1 rounded-md ${t.kind === "receita" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                    {t.kind}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-xs">{t.date}</TableCell>
                <TableCell className={`text-right font-mono ${t.kind === "receita" ? "text-emerald-700" : "text-red-700"}`}>
                  {t.kind === "despesa" ? "- " : ""}{brl(t.amount)}
                </TableCell>
                <TableCell className="w-10">
                  <button data-testid={`del-tx-${t.tx_id}`} onClick={() => del(t.tx_id)} className="text-black/40 hover:text-red-600 transition-colors"><Trash2 className="h-4 w-4" /></button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
