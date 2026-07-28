import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, Trash2, Filter } from "lucide-react";
import { toast } from "sonner";

const KIND_COLOR = {
  contrato: "hsl(245 60% 55% / 0.20)",
  proposta: "hsl(32 95% 55% / 0.25)",
  fiscal: "hsl(148 60% 45% / 0.20)",
  geral: "hsl(220 13% 91%)",
};

export default function Documentos() {
  const [docs, setDocs] = useState([]);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("todos");
  const [form, setForm] = useState({ title: "", kind: "geral", size: 0 });

  const load = async () => { const r = await api.get("/documents"); setDocs(r.data.items); };
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    await api.post("/documents", { ...form, size: Number(form.size) || 0 });
    setForm({ title: "", kind: "geral", size: 0 });
    setOpen(false);
    load();
    toast.success("Documento registrado");
  };
  const del = async (id) => { await api.delete(`/documents/${id}`); load(); };

  const list = docs.filter((d) => filter === "todos" || d.kind === filter);

  return (
    <div className="space-y-8 fade-up" data-testid="documentos-page">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="overline text-black/50">Documentos</div>
          <h1 className="font-display text-4xl font-light tracking-tight mt-2">Sua biblioteca.</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 border border-black/10 rounded-md h-10 px-3 bg-white">
            <Filter className="h-4 w-4 text-black/40" />
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="border-0 shadow-none h-8 w-32" data-testid="doc-filter"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="contrato">Contratos</SelectItem>
                <SelectItem value="proposta">Propostas</SelectItem>
                <SelectItem value="fiscal">Fiscal</SelectItem>
                <SelectItem value="geral">Geral</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="h-10 bg-[hsl(var(--ink))] hover:bg-black text-[hsl(var(--paper))]" data-testid="new-doc-btn"><Plus className="h-4 w-4 mr-2" />Novo documento</Button></DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Registrar documento</DialogTitle></DialogHeader>
              <form onSubmit={create} className="space-y-4 pt-2">
                <div><Label>Título</Label><Input required data-testid="doc-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div><Label>Tipo</Label>
                  <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
                    <SelectTrigger data-testid="doc-kind"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contrato">Contrato</SelectItem>
                      <SelectItem value="proposta">Proposta</SelectItem>
                      <SelectItem value="fiscal">Fiscal</SelectItem>
                      <SelectItem value="geral">Geral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Tamanho (bytes)</Label><Input type="number" data-testid="doc-size" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} /></div>
                <DialogFooter><Button type="submit" className="bg-[hsl(var(--ink))] hover:bg-black text-[hsl(var(--paper))]" data-testid="save-doc">Salvar</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {list.map((d) => (
          <div key={d.doc_id} className="group rounded-md border border-black/10 bg-white p-5 hover:border-black/40 transition-colors relative" data-testid={`doc-${d.doc_id}`}>
            <div className="h-16 w-16 rounded-md flex items-center justify-center mb-4" style={{ background: KIND_COLOR[d.kind] || KIND_COLOR.geral }}>
              <FileText className="h-6 w-6" strokeWidth={1.4} />
            </div>
            <div className="text-sm font-medium truncate">{d.title}</div>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-black/50">
              <span className="uppercase tracking-widest">{d.kind}</span>
              <span>·</span>
              <span className="font-mono">{Math.round((d.size || 0) / 1024)} KB</span>
            </div>
            <button data-testid={`del-doc-${d.doc_id}`} onClick={() => del(d.doc_id)} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-black/40 hover:text-red-600">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {list.length === 0 && <div className="col-span-full border border-dashed border-black/10 rounded-md p-10 text-center text-sm text-black/40">Nenhum documento nesta categoria</div>}
      </div>
    </div>
  );
}
