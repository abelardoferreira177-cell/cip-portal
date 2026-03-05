import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminLogin } from "../lib/api";

const TOKEN_KEY = "CIP_TOKEN";

export default function AdminLogin() {
  const nav = useNavigate();
  const [user, setUser] = useState("admin");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const token = await adminLogin(user.trim(), pass);
      localStorage.setItem(TOKEN_KEY, token);
      nav("/admin/painel");
    } catch (e: any) {
      setErr(e?.message || "Falha no login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="card p-7">
        <div className="text-xs font-semibold text-slate-500">Área restrita</div>
        <h1 className="mt-1 text-2xl font-extrabold text-ink-900">Acesso administrativo</h1>
        <p className="mt-2 text-sm text-slate-600">
          Entre para cadastrar e gerenciar certificados. (Você pode trocar usuário/senha no arquivo <span className="font-mono">server/.env</span>)
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="label">Usuário</label>
            <input className="input" value={user} onChange={(e) => setUser(e.target.value)} />
          </div>
          <div>
            <label className="label">Senha</label>
            <input className="input" type="password" value={pass} onChange={(e) => setPass(e.target.value)} />
          </div>

          {err && (
            <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200">
              {err}
            </div>
          )}

          <button className="btn-primary w-full" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}
