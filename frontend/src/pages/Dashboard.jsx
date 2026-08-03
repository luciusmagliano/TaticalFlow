import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, fileUrl } from "@/lib/api";
import { Shield, Users, Trophy, Plus, ArrowRight } from "lucide-react";

export default function Dashboard() {
  const [clubs, setClubs] = useState([]);
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    (async () => {
      const [c, p, m] = await Promise.all([
        api.get("/clubs"),
        api.get("/players"),
        api.get("/matches"),
      ]);
      setClubs(c.data); setPlayers(p.data); setMatches(m.data);
    })();
  }, []);

  const stat = (label, value, color) => (
    <div className="bg-[#141414] border border-white/10 p-6">
      <div className="text-xs uppercase tracking-[0.25em] text-white/50 font-semibold">{label}</div>
      <div className="mt-3 font-display font-black text-6xl tracking-tighter" style={{ color }}>{value}</div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex items-end justify-between mb-10">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-[#FF3B30] font-semibold mb-2">Painel</div>
          <h1 className="font-display font-black text-5xl md:text-6xl uppercase tracking-tighter">Sua central tática</h1>
        </div>
        <Link to="/partidas" data-testid="cta-new-match" className="hidden md:flex items-center gap-2 px-4 py-3 bg-[#FF3B30] hover:bg-[#FF5C53] uppercase text-xs tracking-[0.2em] font-bold">
          <Plus className="w-4 h-4" /> Nova partida
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {stat("Clubes", clubs.length, "#FFFFFF")}
        {stat("Jogadores", players.length, "#007AFF")}
        {stat("Partidas", matches.length, "#FF3B30")}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 bg-[#141414] border border-white/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs uppercase tracking-[0.25em] font-semibold text-white/60 flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#FF3B30]" /> Clubes recentes
            </div>
            <Link to="/clubes" className="text-xs uppercase tracking-[0.2em] text-white/50 hover:text-white flex items-center gap-1">
              Ver tudo <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {clubs.length === 0 ? (
            <EmptyBlock title="Nenhum clube ainda" cta="Cadastrar clube" to="/clubes" />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {clubs.slice(0, 6).map((c) => (
                <div key={c.id} className="p-4 border border-white/10 flex items-center gap-3 hover:border-white/30 transition-colors" data-testid={`club-card-${c.id}`}>
                  <div className="w-12 h-12 grid place-items-center border border-white/10 shrink-0" style={{ background: c.primary_color + "22" }}>
                    {c.badge_url ? <img src={fileUrl(c.badge_url)} className="w-full h-full object-cover" alt="" />
                      : <span className="font-display font-black text-lg">{(c.short_name || c.name || "?").slice(0, 3).toUpperCase()}</span>}
                  </div>
                  <div className="min-w-0">
                    <div className="font-display font-bold uppercase tracking-tight text-sm truncate">{c.name}</div>
                    <div className="text-xs text-white/40 truncate">{c.short_name || "—"}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 bg-[#141414] border border-white/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs uppercase tracking-[0.25em] font-semibold text-white/60 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#FF3B30]" /> Partidas
            </div>
            <Link to="/partidas" className="text-xs uppercase tracking-[0.2em] text-white/50 hover:text-white flex items-center gap-1">
              Ver tudo <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {matches.length === 0 ? (
            <EmptyBlock title="Sem partidas criadas" cta="Criar partida" to="/partidas" />
          ) : (
            <ul className="space-y-2">
              {matches.slice(0, 6).map((m) => {
                const home = clubs.find((c) => c.id === m.home_club_id);
                const away = clubs.find((c) => c.id === m.away_club_id);
                return (
                  <li key={m.id}>
                    <Link to={`/partidas/${m.id}`} data-testid={`match-row-${m.id}`} className="flex items-center justify-between p-3 border border-white/10 hover:border-[#FF3B30] transition-colors">
                      <div className="font-display uppercase tracking-tight text-sm">
                        {home?.short_name || home?.name || "?"} <span className="text-white/40">×</span> {away?.short_name || away?.name || "?"}
                      </div>
                      <div className="font-mono-alt text-xs text-white/40">{m.competition}</div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyBlock({ title, cta, to }) {
  return (
    <div className="text-center py-10 border border-dashed border-white/10">
      <div className="text-white/50 mb-4">{title}</div>
      <Link to={to} className="inline-block px-4 py-2 border border-white/20 hover:border-[#FF3B30] hover:text-[#FF3B30] uppercase text-xs tracking-[0.2em] font-semibold">{cta}</Link>
    </div>
  );
}
