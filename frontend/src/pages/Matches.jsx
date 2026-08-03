import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, fileUrl, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Trash2, X, ArrowRight, Trophy } from "lucide-react";

export default function Matches() {
  const [matches, setMatches] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ home_club_id: "", away_club_id: "", competition: "Amistoso", stadium: "" });

  const load = async () => {
    const [m, c] = await Promise.all([api.get("/matches"), api.get("/clubs")]);
    setMatches(m.data); setClubs(c.data);
  };
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    if (form.home_club_id === form.away_club_id) return toast.error("Escolha clubes diferentes");
    try {
      await api.post("/matches", form);
      toast.success("Partida criada");
      setOpen(false); load();
    } catch (err) { toast.error(formatApiError(err)); }
  };

  const remove = async (id) => {
    if (!confirm("Excluir partida?")) return;
    await api.delete(`/matches/${id}`);
    toast.success("Excluída"); load();
  };

  const clubById = (id) => clubs.find((c) => c.id === id);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-[#FF3B30] font-semibold mb-2">Escalações</div>
          <h1 className="font-display font-black text-5xl md:text-6xl uppercase tracking-tighter">Partidas</h1>
        </div>
        <button onClick={() => setOpen(true)} data-testid="add-match" disabled={clubs.length < 2}
                className="flex items-center gap-2 px-4 py-3 bg-[#FF3B30] hover:bg-[#FF5C53] uppercase text-xs tracking-[0.2em] font-bold disabled:opacity-50">
          <Plus className="w-4 h-4" /> Nova partida
        </button>
      </div>

      {clubs.length < 2 && (
        <div className="mb-6 p-4 border border-white/10 bg-[#141414] text-white/60 text-sm">
          Cadastre pelo menos 2 clubes para criar uma partida.
        </div>
      )}

      {matches.length === 0 ? (
        <div className="border border-dashed border-white/10 py-16 text-center text-white/50 flex flex-col items-center gap-2">
          <Trophy className="w-6 h-6" /> Nenhuma partida
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {matches.map((m) => {
            const home = clubById(m.home_club_id);
            const away = clubById(m.away_club_id);
            return (
              <div key={m.id} data-testid={`match-${m.id}`} className="bg-[#141414] border border-white/10 p-6 group relative">
                <button onClick={() => remove(m.id)} data-testid={`delete-match-${m.id}`}
                        className="absolute right-3 top-3 p-2 border border-white/10 opacity-0 group-hover:opacity-100 hover:border-[#FF3B30] hover:text-[#FF3B30] transition-opacity">
                  <Trash2 className="w-3 h-3" />
                </button>
                <div className="text-xs uppercase tracking-[0.25em] text-white/50 font-semibold mb-4">{m.competition} · {m.status}</div>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                  <TeamCell club={home} align="right" />
                  <div className="font-display font-black text-4xl tracking-tighter">
                    {m.home_score}<span className="text-white/30 mx-2">–</span>{m.away_score}
                  </div>
                  <TeamCell club={away} align="left" />
                </div>
                {m.stadium && <div className="mt-4 text-xs text-white/40 text-center uppercase tracking-[0.2em]">{m.stadium}</div>}
                <Link to={`/partidas/${m.id}`} data-testid={`open-match-${m.id}`}
                      className="mt-5 flex items-center justify-center gap-2 border border-white/10 hover:border-[#FF3B30] hover:text-[#FF3B30] py-3 uppercase tracking-[0.2em] text-xs font-semibold transition-colors">
                  Abrir editor tático <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
          <form onSubmit={create} onClick={(e) => e.stopPropagation()} data-testid="match-form"
                className="w-full max-w-lg bg-[#141414] border border-white/10 p-8 relative">
            <button type="button" onClick={() => setOpen(false)} className="absolute top-4 right-4 text-white/60 hover:text-white"><X className="w-5 h-5" /></button>
            <h2 className="font-display uppercase text-2xl font-bold tracking-tight mb-6">Nova partida</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-white/60 font-semibold">Clube mandante</label>
                <select data-testid="match-home" value={form.home_club_id} onChange={(e) => setForm({ ...form, home_club_id: e.target.value })} required
                        className="mt-2 w-full bg-[#141414] border border-white/10 focus:border-[#FF3B30] px-4 py-3 outline-none">
                  <option value="">Selecione</option>
                  {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-white/60 font-semibold">Clube visitante</label>
                <select data-testid="match-away" value={form.away_club_id} onChange={(e) => setForm({ ...form, away_club_id: e.target.value })} required
                        className="mt-2 w-full bg-[#141414] border border-white/10 focus:border-[#FF3B30] px-4 py-3 outline-none">
                  <option value="">Selecione</option>
                  {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-white/60 font-semibold">Competição</label>
                <input data-testid="match-competition" value={form.competition} onChange={(e) => setForm({ ...form, competition: e.target.value })}
                       className="mt-2 w-full bg-transparent border border-white/10 focus:border-[#FF3B30] px-4 py-3 outline-none" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-white/60 font-semibold">Estádio</label>
                <input data-testid="match-stadium" value={form.stadium} onChange={(e) => setForm({ ...form, stadium: e.target.value })}
                       className="mt-2 w-full bg-transparent border border-white/10 focus:border-[#FF3B30] px-4 py-3 outline-none" />
              </div>
            </div>
            <button type="submit" data-testid="save-match" className="mt-8 w-full bg-[#FF3B30] hover:bg-[#FF5C53] py-3 uppercase tracking-[0.2em] text-sm font-bold">
              Criar partida
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function TeamCell({ club, align }) {
  if (!club) return <div className="text-white/30">—</div>;
  return (
    <div className={`flex items-center gap-3 ${align === "right" ? "justify-end" : "justify-start"}`}>
      {align === "left" && (
        <div className="w-12 h-12 border border-white/10 grid place-items-center shrink-0" style={{ background: club.primary_color + "22" }}>
          {club.badge_url ? <img src={fileUrl(club.badge_url)} className="w-full h-full object-cover" alt="" />
            : <span className="font-display font-black text-sm">{(club.short_name || club.name).slice(0, 3).toUpperCase()}</span>}
        </div>
      )}
      <div className={align === "right" ? "text-right" : "text-left"}>
        <div className="font-display uppercase font-bold text-sm truncate">{club.name}</div>
        <div className="text-xs text-white/40 uppercase tracking-[0.15em]">{club.short_name || "—"}</div>
      </div>
      {align === "right" && (
        <div className="w-12 h-12 border border-white/10 grid place-items-center shrink-0" style={{ background: club.primary_color + "22" }}>
          {club.badge_url ? <img src={fileUrl(club.badge_url)} className="w-full h-full object-cover" alt="" />
            : <span className="font-display font-black text-sm">{(club.short_name || club.name).slice(0, 3).toUpperCase()}</span>}
        </div>
      )}
    </div>
  );
}
