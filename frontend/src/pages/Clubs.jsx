import { useEffect, useRef, useState } from "react";
import { api, fileUrl, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Upload, Trash2, Pencil, X } from "lucide-react";

const empty = { name: "", short_name: "", primary_color: "#FF3B30", secondary_color: "#FFFFFF", badge_url: "" };

export default function Clubs() {
  const [clubs, setClubs] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const load = async () => {
    const { data } = await api.get("/clubs");
    setClubs(data);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (c) => { setEditing(c.id); setForm({ ...empty, ...c }); setOpen(true); };

  const uploadBadge = async (file) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setForm((f) => ({ ...f, badge_url: data.path }));
      toast.success("Escudo enviado");
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setUploading(false); }
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing) await api.put(`/clubs/${editing}`, form);
      else await api.post("/clubs", form);
      toast.success(editing ? "Clube atualizado" : "Clube criado");
      setOpen(false);
      load();
    } catch (err) { toast.error(formatApiError(err)); }
  };

  const remove = async (id) => {
    if (!confirm("Excluir clube e seus jogadores?")) return;
    await api.delete(`/clubs/${id}`);
    toast.success("Excluído");
    load();
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-[#FF3B30] font-semibold mb-2">Cadastro</div>
          <h1 className="font-display font-black text-5xl md:text-6xl uppercase tracking-tighter">Clubes</h1>
        </div>
        <button onClick={openNew} data-testid="add-club" className="flex items-center gap-2 px-4 py-3 bg-[#FF3B30] hover:bg-[#FF5C53] uppercase text-xs tracking-[0.2em] font-bold">
          <Plus className="w-4 h-4" /> Novo clube
        </button>
      </div>

      {clubs.length === 0 ? (
        <div className="border border-dashed border-white/10 py-16 text-center text-white/50">Nenhum clube cadastrado</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clubs.map((c) => (
            <div key={c.id} data-testid={`club-${c.id}`} className="relative bg-[#141414] border border-white/10 p-6 group">
              <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(c)} data-testid={`edit-club-${c.id}`} className="p-2 border border-white/10 hover:border-white/40"><Pencil className="w-3 h-3" /></button>
                <button onClick={() => remove(c.id)} data-testid={`delete-club-${c.id}`} className="p-2 border border-white/10 hover:border-[#FF3B30] hover:text-[#FF3B30]"><Trash2 className="w-3 h-3" /></button>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 grid place-items-center border border-white/10 shrink-0" style={{ background: c.primary_color + "22" }}>
                  {c.badge_url
                    ? <img src={fileUrl(c.badge_url)} className="w-full h-full object-cover" alt="" />
                    : <span className="font-display font-black text-2xl">{(c.short_name || c.name).slice(0, 3).toUpperCase()}</span>}
                </div>
                <div className="min-w-0">
                  <div className="font-display font-bold uppercase tracking-tight text-lg truncate">{c.name}</div>
                  <div className="text-xs text-white/50 uppercase tracking-[0.15em]">{c.short_name || "—"}</div>
                  <div className="mt-2 flex gap-2">
                    <div className="w-4 h-4 border border-white/20" style={{ background: c.primary_color }} />
                    <div className="w-4 h-4 border border-white/20" style={{ background: c.secondary_color }} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
          <form onSubmit={save} onClick={(e) => e.stopPropagation()} data-testid="club-form"
                className="w-full max-w-lg bg-[#141414] border border-white/10 p-8 relative">
            <button type="button" onClick={() => setOpen(false)} className="absolute top-4 right-4 text-white/60 hover:text-white"><X className="w-5 h-5" /></button>
            <h2 className="font-display uppercase text-2xl font-bold tracking-tight mb-6">{editing ? "Editar clube" : "Novo clube"}</h2>
            <div className="space-y-4">
              <Field label="Nome" value={form.name} onChange={(v) => setForm({ ...form, name: v })} testid="club-name" required />
              <Field label="Sigla (3 letras)" value={form.short_name} onChange={(v) => setForm({ ...form, short_name: v.toUpperCase().slice(0, 4) })} testid="club-short" />
              <div className="grid grid-cols-2 gap-4">
                <ColorField label="Cor primária" value={form.primary_color} onChange={(v) => setForm({ ...form, primary_color: v })} testid="club-color-primary" />
                <ColorField label="Cor secundária" value={form.secondary_color} onChange={(v) => setForm({ ...form, secondary_color: v })} testid="club-color-secondary" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-white/60 font-semibold">Escudo</label>
                <div className="mt-2 flex items-center gap-4">
                  <div className="w-16 h-16 border border-white/10 grid place-items-center" style={{ background: form.primary_color + "22" }}>
                    {form.badge_url
                      ? <img src={fileUrl(form.badge_url)} className="w-full h-full object-cover" alt="" />
                      : <span className="text-xs text-white/40">Sem escudo</span>}
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadBadge(e.target.files[0])} className="hidden" data-testid="club-badge-input" />
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="px-3 py-2 border border-white/10 hover:border-[#FF3B30] hover:text-[#FF3B30] uppercase text-xs tracking-[0.2em] font-semibold flex items-center gap-2">
                    <Upload className="w-3 h-3" /> {uploading ? "Enviando..." : "Enviar imagem"}
                  </button>
                </div>
              </div>
            </div>
            <button type="submit" data-testid="save-club" className="mt-8 w-full bg-[#FF3B30] hover:bg-[#FF5C53] py-3 uppercase tracking-[0.2em] text-sm font-bold">
              {editing ? "Salvar alterações" : "Criar clube"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, testid, required }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-[0.2em] text-white/60 font-semibold">{label}</label>
      <input data-testid={testid} value={value} onChange={(e) => onChange(e.target.value)} required={required}
             className="mt-2 w-full bg-transparent border border-white/10 focus:border-[#FF3B30] px-4 py-3 outline-none" />
    </div>
  );
}

function ColorField({ label, value, onChange, testid }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-[0.2em] text-white/60 font-semibold">{label}</label>
      <div className="mt-2 flex items-center gap-2 border border-white/10 focus-within:border-[#FF3B30] px-3 py-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-8 h-8 bg-transparent border-0 outline-none" data-testid={testid} />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 bg-transparent outline-none font-mono-alt text-sm" />
      </div>
    </div>
  );
}
