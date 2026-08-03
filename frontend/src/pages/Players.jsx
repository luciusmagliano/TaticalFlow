import { useEffect, useRef, useState } from "react";
import { api, fileUrl, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Upload, Trash2, Pencil, X, Users } from "lucide-react";

const POSITIONS = [
  { value: "GK", label: "Goleiro" },
  { value: "DF", label: "Defensor" },
  { value: "MF", label: "Meio-campo" },
  { value: "FW", label: "Atacante" },
];

const empty = { name: "", number: 10, position: "MF", club_id: "", photo_url: "" };

export default function Players() {
  const [players, setPlayers] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [clubFilter, setClubFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const load = async () => {
    const [p, c] = await Promise.all([api.get("/players"), api.get("/clubs")]);
    setPlayers(p.data); setClubs(c.data);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ ...empty, club_id: clubs[0]?.id || "" });
    setOpen(true);
  };
  const openEdit = (p) => { setEditing(p.id); setForm({ ...empty, ...p }); setOpen(true); };

  const uploadPhoto = async (file) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setForm((f) => ({ ...f, photo_url: data.path }));
      toast.success("Foto enviada");
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setUploading(false); }
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.club_id) return toast.error("Selecione um clube");
    try {
      const payload = { ...form, number: parseInt(form.number, 10) };
      if (editing) await api.put(`/players/${editing}`, payload);
      else await api.post("/players", payload);
      toast.success(editing ? "Jogador atualizado" : "Jogador criado");
      setOpen(false); load();
    } catch (err) { toast.error(formatApiError(err)); }
  };

  const remove = async (id) => {
    if (!confirm("Excluir jogador?")) return;
    await api.delete(`/players/${id}`);
    toast.success("Excluído"); load();
  };

  const filtered = clubFilter === "all" ? players : players.filter((p) => p.club_id === clubFilter);
  const clubById = (id) => clubs.find((c) => c.id === id);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-[#FF3B30] font-semibold mb-2">Elenco</div>
          <h1 className="font-display font-black text-5xl md:text-6xl uppercase tracking-tighter">Jogadores</h1>
        </div>
        <button onClick={openNew} data-testid="add-player" disabled={clubs.length === 0}
                className="flex items-center gap-2 px-4 py-3 bg-[#FF3B30] hover:bg-[#FF5C53] uppercase text-xs tracking-[0.2em] font-bold disabled:opacity-50">
          <Plus className="w-4 h-4" /> Novo jogador
        </button>
      </div>

      {clubs.length === 0 && (
        <div className="mb-6 p-4 border border-white/10 bg-[#141414] text-white/60 text-sm">
          Cadastre pelo menos um clube antes de adicionar jogadores.
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        <FilterChip active={clubFilter === "all"} onClick={() => setClubFilter("all")} label="Todos" tid="filter-all" />
        {clubs.map((c) => (
          <FilterChip key={c.id} active={clubFilter === c.id} onClick={() => setClubFilter(c.id)} label={c.short_name || c.name} tid={`filter-${c.id}`} />
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="border border-dashed border-white/10 py-16 text-center text-white/50 flex flex-col items-center gap-2">
          <Users className="w-6 h-6" /> Nenhum jogador
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map((p) => {
            const club = clubById(p.club_id);
            return (
              <div key={p.id} data-testid={`player-${p.id}`} className="relative bg-[#141414] border border-white/10 p-4 group">
                <div className="absolute right-1 top-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(p)} data-testid={`edit-player-${p.id}`} className="p-1.5 border border-white/10 hover:border-white/40"><Pencil className="w-3 h-3" /></button>
                  <button onClick={() => remove(p.id)} data-testid={`delete-player-${p.id}`} className="p-1.5 border border-white/10 hover:border-[#FF3B30] hover:text-[#FF3B30]"><Trash2 className="w-3 h-3" /></button>
                </div>
                <div className="aspect-square w-full border border-white/10 bg-black grid place-items-center overflow-hidden">
                  {p.photo_url
                    ? <img src={fileUrl(p.photo_url)} className="w-full h-full object-cover" alt="" />
                    : <span className="font-display font-black text-4xl text-white/30">{p.name.slice(0, 1).toUpperCase()}</span>}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-display font-black text-xl leading-none">{p.number}</span>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-white/50">{p.position}</span>
                </div>
                <div className="mt-1 font-display uppercase font-bold text-sm truncate">{p.name}</div>
                <div className="text-xs text-white/40 truncate">{club?.name || "—"}</div>
              </div>
            );
          })}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
          <form onSubmit={save} onClick={(e) => e.stopPropagation()} data-testid="player-form"
                className="w-full max-w-lg bg-[#141414] border border-white/10 p-8 relative max-h-[90vh] overflow-auto">
            <button type="button" onClick={() => setOpen(false)} className="absolute top-4 right-4 text-white/60 hover:text-white"><X className="w-5 h-5" /></button>
            <h2 className="font-display uppercase text-2xl font-bold tracking-tight mb-6">{editing ? "Editar jogador" : "Novo jogador"}</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-white/60 font-semibold">Nome</label>
                <input data-testid="player-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
                       className="mt-2 w-full bg-transparent border border-white/10 focus:border-[#FF3B30] px-4 py-3 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-white/60 font-semibold">Número</label>
                  <input data-testid="player-number" type="number" min={1} max={99} value={form.number}
                         onChange={(e) => setForm({ ...form, number: e.target.value })} required
                         className="mt-2 w-full bg-transparent border border-white/10 focus:border-[#FF3B30] px-4 py-3 outline-none" />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-white/60 font-semibold">Posição</label>
                  <select data-testid="player-position" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })}
                          className="mt-2 w-full bg-[#141414] border border-white/10 focus:border-[#FF3B30] px-4 py-3 outline-none">
                    {POSITIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-white/60 font-semibold">Clube</label>
                <select data-testid="player-club" value={form.club_id} onChange={(e) => setForm({ ...form, club_id: e.target.value })} required
                        className="mt-2 w-full bg-[#141414] border border-white/10 focus:border-[#FF3B30] px-4 py-3 outline-none">
                  <option value="">Selecione</option>
                  {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-white/60 font-semibold">Foto</label>
                <div className="mt-2 flex items-center gap-4">
                  <div className="w-16 h-16 border border-white/10 grid place-items-center bg-black overflow-hidden">
                    {form.photo_url
                      ? <img src={fileUrl(form.photo_url)} className="w-full h-full object-cover" alt="" />
                      : <span className="text-xs text-white/40">Sem foto</span>}
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])} className="hidden" data-testid="player-photo-input" />
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="px-3 py-2 border border-white/10 hover:border-[#FF3B30] hover:text-[#FF3B30] uppercase text-xs tracking-[0.2em] font-semibold flex items-center gap-2">
                    <Upload className="w-3 h-3" /> {uploading ? "Enviando..." : "Enviar foto"}
                  </button>
                </div>
              </div>
            </div>
            <button type="submit" data-testid="save-player" className="mt-8 w-full bg-[#FF3B30] hover:bg-[#FF5C53] py-3 uppercase tracking-[0.2em] text-sm font-bold">
              {editing ? "Salvar alterações" : "Criar jogador"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, label, tid }) {
  return (
    <button onClick={onClick} data-testid={tid} className={`px-3 py-2 text-xs uppercase tracking-[0.2em] font-semibold border transition-colors ${
      active ? "bg-[#FF3B30] border-[#FF3B30] text-white" : "border-white/10 text-white/60 hover:text-white hover:border-white/40"
    }`}>
      {label}
    </button>
  );
}
