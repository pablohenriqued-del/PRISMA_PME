import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  ArrowUpRight, ArrowDownRight, Users2, MessageCircle, Kanban, Wallet, FileText, Zap,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

const brl = (n) => (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => { api.get("/dashboard/overview").then((r) => setData(r.data)); }, []);

  if (!data) return (
    <div className="space-y-6" data-testid="dashboard-loading">
      <Skeleton className="h-24 w-full" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
      </div>
      <Skeleton className="h-72 w-full" />
    </div>
  );

  const k = data.kpis;
  const pipeline = Object.entries(data.pipeline).map(([stage, count]) => ({ stage, count }));

  return (
    <div className="space-y-10 fade-up" data-testid="dashboard-page">
      <div className="flex items-end justify-between gap-6 flex-wrap">
        <div>
          <div className="overline text-zinc-500">Visão geral · fevereiro</div>
          <h1 className="font-display font-light text-5xl tracking-tight mt-2">
            Olá — <span className="font-medium">seu negócio hoje.</span>
          </h1>
          <p className="text-zinc-400 mt-2 max-w-xl">Um mapa vivo do que está acontecendo. Toque em um bloco para aprofundar.</p>
        </div>
        <div className="text-right">
          <div className="overline text-zinc-500">Saldo do mês</div>
          <div className="font-display text-4xl tracking-tight mt-1">{brl(k.saldo)}</div>
          <div className={`inline-flex items-center gap-1 text-xs mt-1 ${k.saldo >= 0 ? "text-emerald-700" : "text-red-700"}`}>
            {k.saldo >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            Receita {brl(k.receita)} · Despesa {brl(k.despesa)}
          </div>
        </div>
      </div>

      {/* North-Star grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="kpi-grid">
        <KPI icon={Users2} label="Leads no funil" value={k.leads} accent="var(--amber)" hint={`${k.ganhos} ganhos`} />
        <KPI icon={MessageCircle} label="Conversas WA" value={k.chats} accent="var(--lime)" hint="atualizadas hoje" />
        <KPI icon={Kanban} label="Tarefas abertas" value={k.tasks_open} accent="var(--coral)" hint={`${k.tasks_done} concluídas`} />
        <KPI icon={Zap} label="Automações ativas" value={k.autos_active} accent="var(--violet)" hint="rodando 24/7" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-md border border-white/10 bg-[#121214] p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="overline text-zinc-500">Receita por dia</div>
              <div className="font-display text-2xl mt-1">{brl(k.receita)}</div>
            </div>
            <div className="text-xs text-zinc-500">últimos lançamentos</div>
          </div>
          <div className="h-64 mt-4">
            <ResponsiveContainer>
              <LineChart data={data.revenue_series} margin={{ top: 10, right: 8, bottom: 0, left: -10 }}>
                <CartesianGrid stroke="hsl(220 13% 91%)" strokeDasharray="0" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }} formatter={(v) => brl(v)} />
                <Line type="monotone" dataKey="value" stroke="hsl(222 47% 11%)" strokeWidth={2} dot={{ r: 3, fill: "hsl(32 95% 55%)", strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-md border border-white/10 bg-[#121214] p-6">
          <div className="overline text-zinc-500">Pipeline CRM</div>
          <div className="font-display text-2xl mt-1">{k.leads} leads</div>
          <div className="h-64 mt-4">
            <ResponsiveContainer>
              <BarChart data={pipeline} margin={{ top: 10, right: 0, bottom: 0, left: -20 }}>
                <CartesianGrid stroke="hsl(220 13% 91%)" vertical={false} />
                <XAxis dataKey="stage" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#64748b" }} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }} />
                <Bar dataKey="count" fill="hsl(222 47% 11%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniKPI icon={FileText} label="Documentos" value={k.docs} />
        <MiniKPI icon={Wallet} label="Receita" value={brl(k.receita)} />
        <MiniKPI icon={ArrowDownRight} label="Despesa" value={brl(k.despesa)} />
        <MiniKPI icon={Users2} label="Em negociação" value={k.negociando} />
      </div>
    </div>
  );
}

function KPI({ icon: Icon, label, value, hint, accent }) {
  return (
    <div className="group rounded-md border border-white/10 bg-[#121214] p-5 hover:border-white/20 transition-colors relative overflow-hidden" data-testid={`kpi-${label.toLowerCase().replace(/\s+/g,"-")}`}>
      <div className="absolute top-0 left-0 h-1 w-full" style={{ background: `hsl(${accent})` }} />
      <div className="flex items-center justify-between">
        <div className="overline text-zinc-500">{label}</div>
        <Icon className="h-4 w-4 text-zinc-500" strokeWidth={1.6} />
      </div>
      <div className="font-display text-3xl font-light mt-3 tracking-tight">{value}</div>
      <div className="text-xs text-zinc-500 mt-1">{hint}</div>
    </div>
  );
}
function MiniKPI({ icon: Icon, label, value }) {
  return (
    <div className="rounded-md border border-white/10 bg-[#121214] p-4 flex items-center gap-3">
      <Icon className="h-4 w-4 text-zinc-500" strokeWidth={1.6} />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</div>
        <div className="font-display text-lg leading-none mt-1 truncate">{value}</div>
      </div>
    </div>
  );
}
