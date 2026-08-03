import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import Clubs from "@/pages/Clubs";
import Players from "@/pages/Players";
import Matches from "@/pages/Matches";
import MatchEditor from "@/pages/MatchEditor";
import "@/App.css";
import { Loader2, Trophy, Users, Shield, LogOut, LayoutDashboard } from "lucide-react";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-white" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}

function Nav() {
  const { user, logout } = useAuth();
  const loc = useLocation();
  if (!user || loc.pathname === "/auth") return null;
  const items = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard, tid: "nav-dashboard" },
    { to: "/clubes", label: "Clubes", icon: Shield, tid: "nav-clubs" },
    { to: "/jogadores", label: "Jogadores", icon: Users, tid: "nav-players" },
    { to: "/partidas", label: "Partidas", icon: Trophy, tid: "nav-matches" },
  ];
  return (
    <header className="border-b border-white/10 bg-black/60 backdrop-blur-xl sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-8">
        <Link to="/" data-testid="brand-home" className="flex items-center gap-3 group">
          <div className="w-9 h-9 grid place-items-center bg-[#FF3B30] text-white font-black text-lg font-display">TF</div>
          <div className="font-display font-black text-xl tracking-tight uppercase">TaticaFlow</div>
        </Link>
        <nav className="flex items-center gap-1">
          {items.map((it) => {
            const active = loc.pathname === it.to;
            return (
              <Link
                key={it.to}
                to={it.to}
                data-testid={it.tid}
                className={`px-4 py-2 text-xs uppercase tracking-[0.2em] font-semibold flex items-center gap-2 border border-transparent hover:border-white/10 hover:bg-white/5 transition-colors ${
                  active ? "text-white bg-white/5 border-white/10" : "text-white/60"
                }`}
              >
                <it.icon className="w-4 h-4" />
                {it.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <div className="text-xs text-white/60 hidden sm:block" data-testid="user-name">{user.name}</div>
          <button
            data-testid="logout-button"
            onClick={logout}
            className="px-3 py-2 border border-white/10 hover:border-[#FF3B30] hover:text-[#FF3B30] text-xs uppercase tracking-[0.2em] font-semibold flex items-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen">
          <Nav />
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Protected><Dashboard /></Protected>} />
            <Route path="/clubes" element={<Protected><Clubs /></Protected>} />
            <Route path="/jogadores" element={<Protected><Players /></Protected>} />
            <Route path="/partidas" element={<Protected><Matches /></Protected>} />
            <Route path="/partidas/:id" element={<Protected><MatchEditor /></Protected>} />
          </Routes>
        </div>
        <Toaster theme="dark" position="top-right" />
      </BrowserRouter>
    </AuthProvider>
  );
}
