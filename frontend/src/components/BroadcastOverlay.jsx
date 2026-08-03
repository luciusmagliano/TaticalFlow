import { forwardRef } from "react";
import { fileUrl } from "@/lib/api";

// Broadcast overlay component - 1600x900 cinematic
const BroadcastOverlay = forwardRef(function BroadcastOverlay({ match, homeClub, awayClub, players }, ref) {
  const playerById = (pid) => players.find((p) => p.id === pid);
  const goals = (match.events || []).filter((e) => e.type === "goal");
  const subs = (match.events || []).filter((e) => e.type === "substitution");
  const cards = (match.events || []).filter((e) => e.type === "yellow_card" || e.type === "red_card");

  const homeGoals = goals.filter((g) => g.team === "home");
  const awayGoals = goals.filter((g) => g.team === "away");
  const homeStarters = (match.home_lineup?.players || []).map((lp) => playerById(lp.player_id)).filter(Boolean);
  const awayStarters = (match.away_lineup?.players || []).map((lp) => playerById(lp.player_id)).filter(Boolean);

  const STADIUM_BG = "https://images.pexels.com/photos/32471031/pexels-photo-32471031.jpeg";

  return (
    <div
      ref={ref}
      style={{
        width: 1600, height: 900, position: "relative", overflow: "hidden",
        fontFamily: "'IBM Plex Sans', sans-serif", color: "#fff",
        background: "#000",
      }}
    >
      {/* Cinematic background */}
      <img src={STADIUM_BG} crossOrigin="anonymous" alt="" style={{
        position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(2px) brightness(0.35)",
      }} />
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(180deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0.9) 100%)",
      }} />
      {/* Corner accents */}
      <div style={{ position: "absolute", top: 32, left: 32, width: 48, height: 48, borderTop: "3px solid #FF3B30", borderLeft: "3px solid #FF3B30" }} />
      <div style={{ position: "absolute", top: 32, right: 32, width: 48, height: 48, borderTop: "3px solid #FF3B30", borderRight: "3px solid #FF3B30" }} />
      <div style={{ position: "absolute", bottom: 32, left: 32, width: 48, height: 48, borderBottom: "3px solid #FF3B30", borderLeft: "3px solid #FF3B30" }} />
      <div style={{ position: "absolute", bottom: 32, right: 32, width: 48, height: 48, borderBottom: "3px solid #FF3B30", borderRight: "3px solid #FF3B30" }} />

      {/* Top badge */}
      <div style={{ position: "absolute", top: 40, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 8, height: 8, background: "#FF3B30" }} />
          <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4em", fontSize: 16, color: "rgba(255,255,255,0.7)" }}>
            {match.competition || "Amistoso"} {match.stadium ? `· ${match.stadium}` : ""}
          </div>
          <div style={{ width: 8, height: 8, background: "#FF3B30" }} />
        </div>
        <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.6em", fontSize: 12, color: "#FF3B30" }}>
          RESULTADO FINAL
        </div>
      </div>

      {/* Score bar */}
      <div style={{ position: "absolute", top: 130, left: 80, right: 80, display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 40 }}>
        {/* Home */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 32 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 900, textTransform: "uppercase", fontSize: 72, letterSpacing: "-0.03em", lineHeight: 0.9 }}>{homeClub?.name}</div>
            <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3em", fontSize: 18, color: "rgba(255,255,255,0.55)", marginTop: 8 }}>MANDANTE</div>
          </div>
          <ShieldBig club={homeClub} />
        </div>

        {/* Score */}
        <div style={{
          padding: "20px 40px", border: "2px solid rgba(255,255,255,0.15)",
          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(10px)",
          textAlign: "center", minWidth: 280,
        }}>
          <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 900, fontSize: 140, letterSpacing: "-0.05em", lineHeight: 0.9 }}>
            {match.home_score}
            <span style={{ color: "rgba(255,255,255,0.15)", margin: "0 24px" }}>–</span>
            {match.away_score}
          </div>
          <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4em", fontSize: 14, color: "#FF3B30", marginTop: 4 }}>
            {match.status === "finished" ? "ENCERRADO" : match.status === "live" ? "AO VIVO" : "AGENDADO"}
          </div>
        </div>

        {/* Away */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 32 }}>
          <ShieldBig club={awayClub} />
          <div style={{ textAlign: "left" }}>
            <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 900, textTransform: "uppercase", fontSize: 72, letterSpacing: "-0.03em", lineHeight: 0.9 }}>{awayClub?.name}</div>
            <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3em", fontSize: 18, color: "rgba(255,255,255,0.55)", marginTop: 8 }}>VISITANTE</div>
          </div>
        </div>
      </div>

      {/* Lineups */}
      <div style={{ position: "absolute", top: 400, left: 80, right: 80, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }}>
        <LineupCol title="Escalação" formation={match.home_lineup?.formation} players={homeStarters} color={homeClub?.primary_color} playerById={playerById} scorers={homeGoals} side="home" cards={cards.filter((c) => c.team === "home")} />
        <LineupCol title="Escalação" formation={match.away_lineup?.formation} players={awayStarters} color={awayClub?.primary_color} playerById={playerById} scorers={awayGoals} side="away" cards={cards.filter((c) => c.team === "away")} />
      </div>

      {/* Bottom ticker: subs */}
      <div style={{ position: "absolute", bottom: 40, left: 80, right: 80 }}>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }}>
          <SubList label="Substituições" side="home" subs={subs.filter((s) => s.team === "home")} playerById={playerById} />
          <SubList label="Substituições" side="away" subs={subs.filter((s) => s.team === "away")} playerById={playerById} />
        </div>
        <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4em", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>TATICAFLOW</div>
          <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4em", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{match.competition}</div>
        </div>
      </div>
    </div>
  );
});

function ShieldBig({ club }) {
  if (!club) return null;
  return (
    <div style={{
      width: 160, height: 160,
      border: `3px solid ${club.primary_color}`,
      background: club.primary_color + "22",
      display: "grid", placeItems: "center", overflow: "hidden",
    }}>
      {club.badge_url ? <img src={fileUrl(club.badge_url)} crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
        : <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 900, fontSize: 48, letterSpacing: "-0.02em" }}>{(club.short_name || club.name).slice(0, 3).toUpperCase()}</div>}
    </div>
  );
}

function LineupCol({ title, formation, players, color, playerById, scorers, side, cards }) {
  return (
    <div style={{ background: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.1)", padding: 24, backdropFilter: "blur(10px)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.35em", fontSize: 14, color: "rgba(255,255,255,0.55)" }}>{title}</div>
        <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 22, color }}>{formation || "—"}</div>
      </div>
      {players.length === 0 ? (
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Sem jogadores escalados</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {players.map((p) => {
            const pGoals = scorers.filter((g) => g.player_id === p.id);
            const pCards = cards.filter((c) => c.player_id === p.id);
            return (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 4px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ width: 32, textAlign: "center", fontFamily: "'Barlow Condensed'", fontWeight: 900, fontSize: 22, color }}>{p.number}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 700, textTransform: "uppercase", letterSpacing: "-0.01em", fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                </div>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  {pGoals.map((g, i) => (
                    <div key={i} style={{ fontFamily: "'IBM Plex Mono'", fontSize: 11, color: "#FF3B30", background: "rgba(255,59,48,0.15)", padding: "2px 5px" }}>⚽ {g.minute}'</div>
                  ))}
                  {pCards.map((c, i) => (
                    <div key={i} style={{ width: 8, height: 12, background: c.type === "yellow_card" ? "#FFCC00" : "#FF3B30" }} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SubList({ label, side, subs, playerById }) {
  return (
    <div>
      <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3em", fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 8 }}>{label}</div>
      {subs.length === 0 ? (
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>—</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {subs.slice(0, 5).map((s) => (
            <div key={s.id} style={{ fontFamily: "'IBM Plex Mono'", fontSize: 12, color: "rgba(255,255,255,0.75)", display: "flex", gap: 8 }}>
              <span style={{ color: "#FF3B30" }}>{s.minute}'</span>
              <span>↑ {playerById(s.player_in_id)?.name || "?"}</span>
              <span style={{ color: "rgba(255,255,255,0.4)" }}>↓ {playerById(s.player_out_id)?.name || "?"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default BroadcastOverlay;
