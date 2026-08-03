import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, fileUrl, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { toPng } from "html-to-image";
import { FORMATIONS, FORMATION_NAMES } from "@/lib/formations";
import { ArrowLeft, Save, Download, Goal, Square, ArrowRightLeft, Play, Flag, Trash2, Plus } from "lucide-react";
import BroadcastOverlay from "@/components/BroadcastOverlay";

const POS_ORDER = { GK: 0, DF: 1, MF: 2, FW: 3 };

export default function MatchEditor() {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [clubs, setClubs] = useState([]);
  const [players, setPlayers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [activeSide, setActiveSide] = useState("home"); // home | away
  const [eventForm, setEventForm] = useState({ type: "goal", minute: 1, team: "home", player_id: "", player_out_id: "", player_in_id: "" });
  const overlayRef = useRef(null);

  const load = async () => {
    const [m, c, p] = await Promise.all([api.get(`/matches/${id}`), api.get("/clubs"), api.get("/players")]);
    setMatch(m.data); setClubs(c.data); setPlayers(p.data);
  };
  useEffect(() => { load(); }, [id]);

  if (!match) return <div className="p-10 text-white/50">Carregando...</div>;

  const homeClub = clubs.find((c) => c.id === match.home_club_id);
  const awayClub = clubs.find((c) => c.id === match.away_club_id);
  const homePlayers = players.filter((p) => p.club_id === match.home_club_id);
  const awayPlayers = players.filter((p) => p.club_id === match.away_club_id);

  const lineup = activeSide === "home" ? match.home_lineup : match.away_lineup;
  const sidePlayers = activeSide === "home" ? homePlayers : awayPlayers;
  const availablePlayers = sidePlayers.filter((p) => !lineup.players.some((lp) => lp.player_id === p.id));

  const setLineup = (updater) => {
    const key = activeSide === "home" ? "home_lineup" : "away_lineup";
    setMatch((m) => ({ ...m, [key]: typeof updater === "function" ? updater(m[key]) : updater }));
  };

  const applyFormation = (formation) => {
    const positions = FORMATIONS[formation];
    if (!positions) return;
    // Sort available players by position order, GK first
    const sorted = [...sidePlayers].sort((a, b) => (POS_ORDER[a.position] ?? 5) - (POS_ORDER[b.position] ?? 5));
    const newPlayers = positions.map((slot, i) => {
      const p = sorted[i];
      return p ? { player_id: p.id, x: slot.x, y: slot.y, is_starter: true } : null;
    }).filter(Boolean);
    setLineup({ formation, players: newPlayers });
    toast.success(`Formação ${formation} aplicada`);
  };

  const setFormationOnly = (formation) => setLineup((l) => ({ ...l, formation }));

  const addPlayerToLineup = (playerId) => {
    if (lineup.players.length >= 11) return toast.error("Máx 11 titulares");
    // find first empty formation slot
    const positions = FORMATIONS[lineup.formation] || FORMATIONS["4-4-2"];
    const used = new Set(lineup.players.map((_, i) => i));
    let slot = positions.find((_, i) => !used.has(i)) || { x: 50, y: 50 };
    // Actually easier: pick slot at index lineup.players.length
    slot = positions[lineup.players.length] || { x: 50, y: 50 };
    setLineup((l) => ({ ...l, players: [...l.players, { player_id: playerId, x: slot.x, y: slot.y, is_starter: true }] }));
  };

  const removeFromLineup = (playerId) => {
    setLineup((l) => ({ ...l, players: l.players.filter((p) => p.player_id !== playerId) }));
  };

  const movePlayer = (playerId, x, y) => {
    setLineup((l) => ({
      ...l,
      players: l.players.map((p) => p.player_id === playerId ? { ...p, x, y } : p),
    }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put(`/matches/${id}`, {
        home_lineup: match.home_lineup,
        away_lineup: match.away_lineup,
        events: match.events,
        home_score: match.home_score,
        away_score: match.away_score,
        status: match.status,
      });
      setMatch(data);
      toast.success("Salvo");
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setSaving(false); }
  };

  const addEvent = () => {
    if (eventForm.type === "substitution") {
      if (!eventForm.player_out_id || !eventForm.player_in_id) return toast.error("Escolha jogadores");
    } else {
      if (!eventForm.player_id) return toast.error("Escolha jogador");
    }
    const ev = { ...eventForm, id: crypto.randomUUID(), minute: parseInt(eventForm.minute, 10) || 0 };
    let newScore = { home_score: match.home_score, away_score: match.away_score };
    if (ev.type === "goal") {
      if (ev.team === "home") newScore.home_score += 1;
      else newScore.away_score += 1;
    }
    setMatch((m) => ({ ...m, events: [...(m.events || []), ev].sort((a, b) => a.minute - b.minute), ...newScore }));
    setEventForm({ ...eventForm, player_id: "", player_out_id: "", player_in_id: "" });
    toast.success("Evento adicionado");
  };

  const removeEvent = (evId) => {
    const ev = match.events.find((e) => e.id === evId);
    let newScore = { home_score: match.home_score, away_score: match.away_score };
    if (ev?.type === "goal") {
      if (ev.team === "home") newScore.home_score = Math.max(0, newScore.home_score - 1);
      else newScore.away_score = Math.max(0, newScore.away_score - 1);
    }
    setMatch((m) => ({ ...m, events: m.events.filter((e) => e.id !== evId), ...newScore }));
  };

  const setStatus = (status) => setMatch((m) => ({ ...m, status }));

  const exportImage = async () => {
    setExporting(true);
    try {
      // brief delay to ensure images loaded
      await new Promise((r) => setTimeout(r, 500));
      const node = overlayRef.current;
      if (!node) throw new Error("Overlay not ready");
      const dataUrl = await toPng(node, { cacheBust: true, pixelRatio: 2, backgroundColor: "#000000" });
      const link = document.createElement("a");
      link.download = `partida-${homeClub?.short_name || "H"}-${awayClub?.short_name || "A"}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Imagem gerada");
    } catch (e) {
      toast.error("Erro ao gerar imagem: " + (e.message || e));
    } finally {
      setExporting(false);
    }
  };

  const playerById = (pid) => players.find((p) => p.id === pid);

  return (
    <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <Link to="/partidas" className="flex items-center gap-2 text-white/60 hover:text-white text-xs uppercase tracking-[0.2em] font-semibold" data-testid="back-matches">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
        <div className="flex items-center gap-2">
          <StatusBtn active={match.status === "scheduled"} onClick={() => setStatus("scheduled")} icon={Flag} label="Agendada" tid="status-scheduled" />
          <StatusBtn active={match.status === "live"} onClick={() => setStatus("live")} icon={Play} label="Ao vivo" tid="status-live" />
          <StatusBtn active={match.status === "finished"} onClick={() => setStatus("finished")} icon={Flag} label="Encerrada" tid="status-finished" />
          <button onClick={save} disabled={saving} data-testid="save-match-btn" className="ml-2 flex items-center gap-2 px-4 py-2 border border-white/10 hover:border-white/40 uppercase text-xs tracking-[0.2em] font-semibold">
            <Save className="w-3 h-3" /> {saving ? "Salvando..." : "Salvar"}
          </button>
          <button onClick={exportImage} disabled={exporting} data-testid="export-image-btn" className="flex items-center gap-2 px-4 py-2 bg-[#FF3B30] hover:bg-[#FF5C53] uppercase text-xs tracking-[0.2em] font-bold">
            <Download className="w-3 h-3" /> {exporting ? "Gerando..." : "Gerar Imagem"}
          </button>
        </div>
      </div>

      {/* Score header */}
      <div className="bg-[#141414] border border-white/10 p-6 mb-4">
        <div className="text-center text-xs uppercase tracking-[0.3em] text-white/50 font-semibold mb-4">{match.competition}</div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-6">
          <TeamHeader club={homeClub} align="right" />
          <div className="font-display font-black text-6xl md:text-7xl tracking-tighter tabular-nums">
            {match.home_score}<span className="text-white/20 mx-3">–</span>{match.away_score}
          </div>
          <TeamHeader club={awayClub} align="left" />
        </div>
      </div>

      {/* Side selector */}
      <div className="flex gap-1 mb-4 border border-white/10 p-1 bg-[#141414] w-full md:w-fit">
        <button onClick={() => setActiveSide("home")} data-testid="side-home"
                className={`px-4 py-2 uppercase text-xs tracking-[0.2em] font-semibold ${activeSide === "home" ? "bg-[#FF3B30] text-white" : "text-white/60 hover:text-white"}`}>
          Mandante · {homeClub?.short_name || homeClub?.name}
        </button>
        <button onClick={() => setActiveSide("away")} data-testid="side-away"
                className={`px-4 py-2 uppercase text-xs tracking-[0.2em] font-semibold ${activeSide === "away" ? "bg-[#FF3B30] text-white" : "text-white/60 hover:text-white"}`}>
          Visitante · {awayClub?.short_name || awayClub?.name}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Tactical board */}
        <div className="lg:col-span-8 bg-[#141414] border border-white/10 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-[0.25em] text-white/50 font-semibold mr-2">Formação</span>
              {FORMATION_NAMES.map((f) => (
                <button key={f} onClick={() => applyFormation(f)} data-testid={`formation-${f}`}
                        className={`px-3 py-1.5 text-xs uppercase tracking-[0.15em] font-bold border ${
                          lineup.formation === f ? "border-[#FF3B30] text-[#FF3B30]" : "border-white/10 text-white/60 hover:text-white"
                        }`}>
                  {f}
                </button>
              ))}
            </div>
            <div className="text-xs text-white/40 uppercase tracking-[0.2em]">Arraste para reposicionar</div>
          </div>

          <Pitch
            lineup={lineup}
            playerById={playerById}
            onMove={movePlayer}
            onRemove={removeFromLineup}
            club={activeSide === "home" ? homeClub : awayClub}
          />
        </div>

        {/* Right controls */}
        <div className="lg:col-span-4 space-y-4">
          {/* Roster */}
          <div className="bg-[#141414] border border-white/10 p-5">
            <div className="text-xs uppercase tracking-[0.25em] text-white/50 font-semibold mb-3">Elenco disponível</div>
            <div className="max-h-64 overflow-auto pr-1 space-y-1">
              {availablePlayers.length === 0 && <div className="text-white/40 text-sm">Todos escalados</div>}
              {availablePlayers.map((p) => (
                <button key={p.id} onClick={() => addPlayerToLineup(p.id)} data-testid={`add-lineup-${p.id}`}
                        className="w-full flex items-center gap-3 p-2 border border-white/5 hover:border-white/30 text-left transition-colors">
                  <div className="w-8 h-8 border border-white/10 bg-black overflow-hidden shrink-0">
                    {p.photo_url ? <img src={fileUrl(p.photo_url)} className="w-full h-full object-cover" alt="" /> : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-display uppercase font-bold truncate">{p.name}</div>
                    <div className="text-[10px] text-white/40 uppercase tracking-[0.15em]">#{p.number} · {p.position}</div>
                  </div>
                  <Plus className="w-3 h-3 text-white/50" />
                </button>
              ))}
            </div>
          </div>

          {/* Add event */}
          <div className="bg-[#141414] border border-white/10 p-5">
            <div className="text-xs uppercase tracking-[0.25em] text-white/50 font-semibold mb-3">Adicionar evento</div>
            <div className="grid grid-cols-4 gap-1 mb-3">
              {[
                { v: "goal", label: "Gol", icon: Goal },
                { v: "yellow_card", label: "Amarelo", icon: Square },
                { v: "red_card", label: "Vermelho", icon: Square },
                { v: "substitution", label: "Sub", icon: ArrowRightLeft },
              ].map((t) => (
                <button key={t.v} onClick={() => setEventForm({ ...eventForm, type: t.v })} data-testid={`event-type-${t.v}`}
                        className={`p-2 text-[10px] uppercase tracking-[0.1em] font-bold flex flex-col items-center gap-1 border ${
                          eventForm.type === t.v ? "border-[#FF3B30] text-[#FF3B30]" : "border-white/10 text-white/60 hover:text-white"
                        }`}>
                  <t.icon className="w-3 h-3" /> {t.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <input type="number" min={0} max={130} value={eventForm.minute} onChange={(e) => setEventForm({ ...eventForm, minute: e.target.value })} data-testid="event-minute"
                     placeholder="Minuto" className="bg-transparent border border-white/10 focus:border-[#FF3B30] px-3 py-2 text-sm outline-none" />
              <select value={eventForm.team} onChange={(e) => setEventForm({ ...eventForm, team: e.target.value })} data-testid="event-team"
                      className="bg-[#141414] border border-white/10 focus:border-[#FF3B30] px-3 py-2 text-sm outline-none">
                <option value="home">{homeClub?.short_name || "Mandante"}</option>
                <option value="away">{awayClub?.short_name || "Visitante"}</option>
              </select>
            </div>
            {eventForm.type === "substitution" ? (
              <div className="grid grid-cols-1 gap-2 mb-3">
                <select value={eventForm.player_out_id} onChange={(e) => setEventForm({ ...eventForm, player_out_id: e.target.value })} data-testid="event-player-out"
                        className="bg-[#141414] border border-white/10 px-3 py-2 text-sm outline-none focus:border-[#FF3B30]">
                  <option value="">Sai...</option>
                  {(eventForm.team === "home" ? homePlayers : awayPlayers).map((p) => (
                    <option key={p.id} value={p.id}>#{p.number} {p.name}</option>
                  ))}
                </select>
                <select value={eventForm.player_in_id} onChange={(e) => setEventForm({ ...eventForm, player_in_id: e.target.value })} data-testid="event-player-in"
                        className="bg-[#141414] border border-white/10 px-3 py-2 text-sm outline-none focus:border-[#FF3B30]">
                  <option value="">Entra...</option>
                  {(eventForm.team === "home" ? homePlayers : awayPlayers).map((p) => (
                    <option key={p.id} value={p.id}>#{p.number} {p.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <select value={eventForm.player_id} onChange={(e) => setEventForm({ ...eventForm, player_id: e.target.value })} data-testid="event-player"
                      className="w-full bg-[#141414] border border-white/10 px-3 py-2 text-sm outline-none focus:border-[#FF3B30] mb-3">
                <option value="">Jogador...</option>
                {(eventForm.team === "home" ? homePlayers : awayPlayers).map((p) => (
                  <option key={p.id} value={p.id}>#{p.number} {p.name}</option>
                ))}
              </select>
            )}
            <button onClick={addEvent} data-testid="add-event"
                    className="w-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 py-2 uppercase text-xs tracking-[0.2em] font-semibold">
              Adicionar evento
            </button>
          </div>

          {/* Events list */}
          <div className="bg-[#141414] border border-white/10 p-5">
            <div className="text-xs uppercase tracking-[0.25em] text-white/50 font-semibold mb-3">Timeline</div>
            {(!match.events || match.events.length === 0) ? (
              <div className="text-sm text-white/40">Nenhum evento</div>
            ) : (
              <ul className="space-y-1 max-h-64 overflow-auto">
                {match.events.map((ev) => (
                  <li key={ev.id} className="flex items-center gap-2 p-2 border border-white/5 text-sm">
                    <span className="font-mono-alt text-xs text-white/60 w-8">{ev.minute}'</span>
                    <EventIcon type={ev.type} />
                    <div className="flex-1 truncate">
                      {ev.type === "substitution"
                        ? <>{playerById(ev.player_out_id)?.name} <span className="text-white/40">↔</span> {playerById(ev.player_in_id)?.name}</>
                        : playerById(ev.player_id)?.name || "?"}
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">{ev.team === "home" ? homeClub?.short_name : awayClub?.short_name}</span>
                    <button onClick={() => removeEvent(ev.id)} data-testid={`remove-event-${ev.id}`} className="text-white/40 hover:text-[#FF3B30]"><Trash2 className="w-3 h-3" /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Hidden broadcast overlay for capture */}
      <div style={{ position: "fixed", left: -99999, top: 0 }} aria-hidden>
        <BroadcastOverlay
          ref={overlayRef}
          match={match}
          homeClub={homeClub}
          awayClub={awayClub}
          players={players}
        />
      </div>
    </div>
  );
}

function EventIcon({ type }) {
  const map = {
    goal: <Goal className="w-3 h-3 text-[#FF3B30]" />,
    yellow_card: <Square className="w-3 h-3 text-yellow-400 fill-yellow-400" />,
    red_card: <Square className="w-3 h-3 text-red-500 fill-red-500" />,
    substitution: <ArrowRightLeft className="w-3 h-3 text-[#007AFF]" />,
  };
  return map[type] || null;
}

function StatusBtn({ active, onClick, icon: Icon, label, tid }) {
  return (
    <button onClick={onClick} data-testid={tid} className={`flex items-center gap-2 px-3 py-2 border uppercase text-xs tracking-[0.2em] font-semibold ${
      active ? "border-[#FF3B30] text-[#FF3B30]" : "border-white/10 text-white/60 hover:text-white"
    }`}>
      <Icon className="w-3 h-3" /> {label}
    </button>
  );
}

function TeamHeader({ club, align }) {
  if (!club) return <div />;
  return (
    <div className={`flex items-center gap-4 ${align === "right" ? "justify-end" : "justify-start"}`}>
      {align === "left" && <Badge club={club} />}
      <div className={align === "right" ? "text-right" : "text-left"}>
        <div className="font-display font-black uppercase tracking-tight text-2xl md:text-3xl">{club.name}</div>
        <div className="text-xs uppercase tracking-[0.25em] text-white/50">{club.short_name}</div>
      </div>
      {align === "right" && <Badge club={club} />}
    </div>
  );
}
function Badge({ club }) {
  return (
    <div className="w-16 h-16 md:w-20 md:h-20 border border-white/10 grid place-items-center shrink-0" style={{ background: club.primary_color + "22" }}>
      {club.badge_url ? <img src={fileUrl(club.badge_url)} className="w-full h-full object-cover" alt="" />
        : <span className="font-display font-black text-xl">{(club.short_name || club.name).slice(0, 3).toUpperCase()}</span>}
    </div>
  );
}

function Pitch({ lineup, playerById, onMove, onRemove, club }) {
  const boardRef = useRef(null);
  const [dragging, setDragging] = useState(null);

  const onPointerDown = (e, playerId) => {
    e.preventDefault();
    setDragging(playerId);
  };

  const onPointerMove = (e) => {
    if (!dragging || !boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const py = ((e.clientY - rect.top) / rect.height) * 100;
    const x = Math.max(2, Math.min(98, px));
    const y = Math.max(2, Math.min(98, py));
    onMove(dragging, x, y);
  };

  const onPointerUp = () => setDragging(null);

  return (
    <div
      ref={boardRef}
      className="pitch relative w-full border border-white/10"
      style={{ aspectRatio: "16 / 10" }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      data-testid="tactical-board"
    >
      {/* Pitch markings */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 62.5" preserveAspectRatio="none">
        <rect x="1" y="1" width="98" height="60.5" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.2" />
        <line x1="50" y1="1" x2="50" y2="61.5" stroke="rgba(255,255,255,0.2)" strokeWidth="0.2" />
        <circle cx="50" cy="31.25" r="7" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.2" />
        <rect x="1" y="15" width="12" height="32.5" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.2" />
        <rect x="87" y="15" width="12" height="32.5" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.2" />
        <rect x="1" y="23" width="5" height="16.5" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.2" />
        <rect x="94" y="23" width="5" height="16.5" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.2" />
      </svg>
      {lineup.players.map((lp) => {
        const p = playerById(lp.player_id);
        if (!p) return null;
        return (
          <div
            key={lp.player_id}
            onPointerDown={(e) => onPointerDown(e, lp.player_id)}
            data-testid={`node-${lp.player_id}`}
            className={`player-node absolute select-none cursor-grab active:cursor-grabbing ${dragging === lp.player_id ? "dragging" : ""}`}
            style={{ left: `${lp.x}%`, top: `${lp.y}%`, transform: "translate(-50%,-50%)", touchAction: "none" }}
          >
            <div className="flex flex-col items-center gap-1">
              <div className="w-11 h-11 md:w-12 md:h-12 rounded-full border-2 grid place-items-center overflow-hidden shadow-lg"
                   style={{ borderColor: club?.primary_color || "#FF3B30", background: "#0A0A0A" }}>
                {p.photo_url
                  ? <img src={fileUrl(p.photo_url)} className="w-full h-full object-cover" alt="" />
                  : <span className="font-display font-black text-sm">{p.number}</span>}
              </div>
              <div className="px-1.5 py-0.5 bg-black/80 border border-white/10 text-[10px] font-display uppercase tracking-tight font-bold flex items-center gap-1">
                <span style={{ color: club?.primary_color || "#FF3B30" }}>{p.number}</span>
                <span className="truncate max-w-[80px]">{p.name.split(" ").slice(-1)[0]}</span>
              </div>
              <button onPointerDown={(e) => e.stopPropagation()} onClick={() => onRemove(lp.player_id)}
                      className="absolute -top-2 -right-2 bg-black/80 border border-white/10 rounded-full w-5 h-5 grid place-items-center text-white/70 hover:text-[#FF3B30] hover:border-[#FF3B30]">
                <Trash2 className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
