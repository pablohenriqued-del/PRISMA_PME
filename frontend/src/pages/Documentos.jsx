import React, { useEffect, useState, useRef } from "react";
import api, { API_BASE } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, Trash2, Filter, UploadCloud, Download, Loader2 } from "lucide-react";
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
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadKind, setUploadKind] = useState("geral");
  const fileRef = useRef(null);

  const load = async () => { const r = await api.get("/documents"); setDocs(r.data.items); };
  useEffect(() => { load(); }, []);

  const uploadFiles = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const f of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", f);
        fd.append("kind", uploadKind);
        await api.post("/documents/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      }
      toast.success(`${files.length} arquivo(s) enviado(s)`);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Falha no upload");
    } finally {
      setUploading(false);
    }
  };

  const create = async (e) => {
    e.preventDefault();
    await api.post("/documents", { ...form, size: Number(form.size) || 0 });
    setForm({ title: "", kind: "geral", size: 0 });
    setOpen(false); load();
    toast.success("Documento registrado");
  };
  const del = async (id) => { await api.delete(`/documents/${id}`); load(); };

  const download = async (doc) => {
    try {
      const r = await api.get(`/documents/${doc.doc_id}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement("a");
      a.href = url; a.download = doc.title; document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 500);
    } catch { toast.error("Não foi possível baixar"); }
  };

  const list = docs.filter((d) => filter === "todos" || d.kind === filter);

  return (
    <div className="space-y-8 fade-up" data-testid="documentos-page">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="overline text-zinc-500">Documentos</div>
          <h1 className="font-display text-4xl font-light tracking-tight mt-2">Sua biblioteca.</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 border border-white/10 rounded-md h-10 px-3 bg-[#121214]">
            <Filter className="h-4 w-4 text-zinc-500" />
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
            <DialogTrigger asChild><Button variant="outline" className="h-10 border-white/10" data-testid="new-doc-btn"><Plus className="h-4 w-4 mr-2" />Registro manual</Button></DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Registrar documento (sem arquivo)</DialogTitle></DialogHeader>
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
                <DialogFooter><Button type="submit" className="bg-gradient-to-r from-[#5E6AD2] to-[#8B5CF6] hover:opacity-90 text-white" data-testid="save-doc">Salvar</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); uploadFiles(e.dataTransfer.files); }}
        className={`rounded-md border-2 border-dashed transition-colors p-8 bg-[#121214] flex items-center gap-6 ${dragOver ? "border-[hsl(var(--ink))] bg-[#121214]/[0.02]" : "border-white/15"}`}
        data-testid="dropzone"
      >
        <div className="h-14 w-14 rounded-md bg-[#121214]/5 flex items-center justify-center">
          {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <UploadCloud className="h-6 w-6" strokeWidth={1.6} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display text-lg">Arraste arquivos aqui</div>
          <div className="text-sm text-zinc-400 mt-1">PDFs, imagens, contratos — armazenamento gerenciado. Multi-tenant por organização.</div>
        </div>
        <div className="flex items-center gap-3">
          <Select value={uploadKind} onValueChange={setUploadKind}>
            <SelectTrigger className="w-32 h-10" data-testid="upload-kind"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="contrato">Contrato</SelectItem>
              <SelectItem value="proposta">Proposta</SelectItem>
              <SelectItem value="fiscal">Fiscal</SelectItem>
              <SelectItem value="geral">Geral</SelectItem>
            </SelectContent>
          </Select>
          <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => uploadFiles(e.target.files)} data-testid="file-input" />
          <Button className="h-10 bg-gradient-to-r from-[#5E6AD2] to-[#8B5CF6] hover:opacity-90 text-white" onClick={() => fileRef.current?.click()} data-testid="upload-btn" disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UploadCloud className="h-4 w-4 mr-2" />}
            Selecionar arquivo
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {list.map((d) => (
          <div key={d.doc_id} className="group rounded-md border border-white/10 bg-[#121214] p-5 hover:border-white/20 transition-colors relative" data-testid={`doc-${d.doc_id}`}>
            <div className="h-16 w-16 rounded-md flex items-center justify-center mb-4" style={{ background: KIND_COLOR[d.kind] || KIND_COLOR.geral }}>
              <FileText className="h-6 w-6" strokeWidth={1.4} />
            </div>
            <div className="text-sm font-medium truncate">{d.title}</div>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-500">
              <span className="uppercase tracking-widest">{d.kind}</span>
              <span>·</span>
              <span className="font-mono">{Math.round((d.size || 0) / 1024)} KB</span>
            </div>
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              {d.storage_path && (
                <button data-testid={`download-doc-${d.doc_id}`} onClick={() => download(d)} className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-white/5 text-zinc-500 hover:text-white">
                  <Download className="h-4 w-4" />
                </button>
              )}
              <button data-testid={`del-doc-${d.doc_id}`} onClick={() => del(d.doc_id)} className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-white/5 text-zinc-500 hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {list.length === 0 && <div className="col-span-full border border-dashed border-white/10 rounded-md p-10 text-center text-sm text-zinc-500">Nenhum documento nesta categoria</div>}
      </div>
    </div>
  );
}
