import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { formatApiError } from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function Auth() {
  const { login, register } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") await login(email, password);
      else await register(email, password, name);
      toast.success(mode === "login" ? "Bem-vindo de volta" : "Conta criada");
      nav("/");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-stretch">
      <div className="hidden lg:block absolute inset-0 z-0">
        <img
          src="https://images.pexels.com/photos/3158350/pexels-photo-3158350.jpeg"
          alt=""
          className="w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/40" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col justify-between p-10 lg:p-16">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 grid place-items-center bg-[#FF3B30] font-display font-black text-white">TF</div>
          <div>
            <div className="font-display font-black text-2xl uppercase tracking-tight">TaticaFlow</div>
            <div className="text-xs uppercase tracking-[0.3em] text-white/50">Ferramenta tática</div>
          </div>
        </div>

        <div className="hidden lg:block max-w-xl">
          <div className="text-xs uppercase tracking-[0.3em] text-[#FF3B30] font-semibold mb-4">Cadastre. Escale. Transmita.</div>
          <h1 className="font-display font-black text-5xl xl:text-7xl uppercase leading-[0.9] tracking-tighter">
            Da prancheta<br />
            <span className="text-[#FF3B30]">ao placar final.</span>
          </h1>
          <p className="mt-6 text-white/60 max-w-md text-base leading-relaxed">
            Cadastre clubes, gerencie jogadores, monte escalações táticas e gere imagens de resultado com qualidade de transmissão.
          </p>
        </div>

        <div className="text-xs text-white/40 uppercase tracking-[0.2em]">© TaticaFlow</div>
      </div>

      <div className="relative z-10 flex-1 flex items-center justify-center p-6 lg:p-12 bg-black/50 backdrop-blur-xl lg:bg-transparent">
        <form
          onSubmit={submit}
          data-testid="auth-form"
          className="w-full max-w-md bg-[#141414] border border-white/10 p-8 lg:p-10"
        >
          <div className="flex gap-1 mb-8 border border-white/10">
            <button
              type="button"
              data-testid="tab-login"
              onClick={() => setMode("login")}
              className={`flex-1 py-3 text-xs uppercase tracking-[0.2em] font-semibold transition-colors ${
                mode === "login" ? "bg-[#FF3B30] text-white" : "text-white/60 hover:text-white"
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              data-testid="tab-register"
              onClick={() => setMode("register")}
              className={`flex-1 py-3 text-xs uppercase tracking-[0.2em] font-semibold transition-colors ${
                mode === "register" ? "bg-[#FF3B30] text-white" : "text-white/60 hover:text-white"
              }`}
            >
              Criar conta
            </button>
          </div>

          <h2 className="font-display text-3xl uppercase font-bold tracking-tight mb-1">
            {mode === "login" ? "Acesso" : "Nova conta"}
          </h2>
          <p className="text-white/50 text-sm mb-8">
            {mode === "login" ? "Entre para gerenciar seus clubes." : "Comece em segundos."}
          </p>

          {mode === "register" && (
            <div className="mb-4">
              <label className="text-xs uppercase tracking-[0.2em] text-white/60 font-semibold">Nome</label>
              <input
                data-testid="input-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-2 w-full bg-transparent border border-white/10 focus:border-[#FF3B30] px-4 py-3 outline-none"
              />
            </div>
          )}
          <div className="mb-4">
            <label className="text-xs uppercase tracking-[0.2em] text-white/60 font-semibold">Email</label>
            <input
              data-testid="input-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-2 w-full bg-transparent border border-white/10 focus:border-[#FF3B30] px-4 py-3 outline-none"
            />
          </div>
          <div className="mb-6">
            <label className="text-xs uppercase tracking-[0.2em] text-white/60 font-semibold">Senha</label>
            <input
              data-testid="input-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="mt-2 w-full bg-transparent border border-white/10 focus:border-[#FF3B30] px-4 py-3 outline-none"
            />
          </div>

          <button
            data-testid="submit-auth"
            type="submit"
            disabled={busy}
            className="w-full bg-[#FF3B30] hover:bg-[#FF5C53] py-3 uppercase tracking-[0.2em] text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>
      </div>
    </div>
  );
}
