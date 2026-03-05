import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Cert, adminCreate, adminDelete, adminList, adminUpdate } from "../lib/api";
import { clearToken, getToken } from "./AdminLogin";

type FormState = {
  id?: number;
  nome: string;
  cpf: string;
  curso: string;
  carga_horaria: string;
  data_conclusao: string;
  codigo: string;
  status: "VALIDO" | "INVALIDO";
};

const emptyForm: FormState = {
  nome: "",
  cpf: "",
  curso: "",
  carga_horaria: "",
  data_conclusao: "",
  codigo: "",
  status: "VALIDO",
};

export default function AdminDashboard() {
  const nav = useNavigate();
  const [token, setToken] = useState(getToken());
  const [items, setItems] = useState<Cert[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return items;
    return items.filter((c) =>
      [c.nome, c.cpf, c.codigo, c.curso].some((x) => String(x).toLowerCase().includes(f))
    );
  }, [items, filter]);

  useEffect(() => {
    if (!token) {
      nav("/admin");
      return;
    }
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const list = await adminList(token);
        setItems(list);
      } catch (e: any) {
        setErr(e?.message || "Erro ao carregar.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token, nav]);

  function logout() {
    clearToken();
    setToken("");
    nav("/admin");
  }

  function startEdit(c: Cert) {
    setForm({
      id: c.id,
      nome: c.nome,
      cpf: c.cpf,
      curso: c.curso,
      carga_horaria: c.carga_horaria,
      data_conclusao: c.data_conclusao,
      codigo: c.codigo,
      status: c.status,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setForm(emptyForm);
  }

  async function save() {
    setErr(null);
    setSaving(true);
    try {
      if (!token) throw new Error("Sessão expirada.");

      if (form.id) {
        const updated = await adminUpdate(token, form.id, form as unknown as Cert);
        setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      } else {
        const created = await adminCreate(token, {
          nome: form.nome,
          cpf: form.cpf,
          curso: form.curso,
          carga_horaria: form.carga_horaria,
          data_conclusao: form.data_conclusao,
          codigo: form.codigo || undefined,
          status: form.status,
        });
        setItems((prev) => [created, ...prev]);
      }

      resetForm();
    } catch (e: any) {
      setErr(e?.message || "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("Tem certeza que deseja remover este registro?")) return;
    setErr(null);
    try {
      if (!token) throw new Error("Sessão expirada.");
      await adminDelete(token, id);
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch (e: any) {
      setErr(e?.message || "Erro ao remover.");
    }
  }

  return (
    <div>
      <div className="card p-7">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">Painel administrativo</div>
            <h1 className="mt-1 text-2xl font-extrabold text-ink-900">
              Gestão de certificados
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Cadastre, edite e remova certificados. O código é único e serve para verificação pública.
            </p>
          </div>

          <div className="flex gap-2">
            <button className="btn-ghost" onClick={logout}>Sair</button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
            <div className="text-sm font-bold text-ink-900">
              {form.id ? "Editar certificado" : "Novo certificado"}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input label="Nome completo" value={form.nome} onChange={(v) => setForm({ ...form, nome: v })} />
              <Input label="CPF (somente números ou com pontuação)" value={form.cpf} onChange={(v) => setForm({ ...form, cpf: v })} />
              <Input label="Curso" value={form.curso} onChange={(v) => setForm({ ...form, curso: v })} />
              <Input label="Carga horária" value={form.carga_horaria} onChange={(v) => setForm({ ...form, carga_horaria: v })} />
              <Input label="Data de conclusão" value={form.data_conclusao} onChange={(v) => setForm({ ...form, data_conclusao: v })} />
              <div>
                <label className="label">Status</label>
                <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })}>
                  <option value="VALIDO">Válido</option>
                  <option value="INVALIDO">Inválido</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="label">Código de autenticação (opcional)</label>
                <input
                  className="input font-mono"
                  value={form.codigo}
                  onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                  placeholder="Se deixar vazio, o sistema gera automaticamente"
                />
              </div>
            </div>

            {err && (
              <div className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200">
                {err}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <button className="btn-primary" onClick={save} disabled={saving}>
                {saving ? "Salvando..." : form.id ? "Salvar alterações" : "Cadastrar"}
              </button>
              <button className="btn-ghost" onClick={resetForm} disabled={saving}>
                Limpar
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-bold text-ink-900">Registros</div>
              <input
                className="input max-w-xs"
                placeholder="Filtrar por nome, CPF, código..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>

            {loading ? (
              <div className="mt-4 text-sm text-slate-600">Carregando...</div>
            ) : (
              <div className="mt-4 overflow-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="sticky top-0 bg-white">
                    <tr className="text-slate-500">
                      <th className="py-2 pr-3">Nome</th>
                      <th className="py-2 pr-3">CPF</th>
                      <th className="py-2 pr-3">Código</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c) => (
                      <tr key={c.id} className="border-t border-slate-100">
                        <td className="py-2 pr-3">
                          <div className="font-semibold text-slate-900">{c.nome}</div>
                          <div className="text-[11px] text-slate-500">{c.curso}</div>
                        </td>
                        <td className="py-2 pr-3 font-mono">{c.cpf}</td>
                        <td className="py-2 pr-3 font-mono">{c.codigo}</td>
                        <td className="py-2 pr-3">
                          <span className={c.status === "VALIDO" ? "text-emerald-700" : "text-rose-700"}>
                            {c.status}
                          </span>
                        </td>
                        <td className="py-2 pr-3">
                          <div className="flex gap-2">
                            <button className="btn-ghost" onClick={() => startEdit(c)}>Editar</button>
                            <button className="btn-ghost" onClick={() => remove(c.id)}>Remover</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!filtered.length && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-500">
                          Nenhum registro.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
