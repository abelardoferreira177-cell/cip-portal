import { useMemo, useState } from "react";
import ResultCard from "../components/ResultCard";
import Alert from "../components/Alert";
import { publicSearch, Cert } from "../lib/api";

type Mode = "code" | "cpf" | "name";

export default function PublicSearch() {
  const [mode, setMode] = useState<Mode>("code");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [cert, setCert] = useState<Cert | null>(null);
  const [error, setError] = useState<string | null>(null);

  const placeholder = useMemo(() => {
    if (mode === "code") return "Ex.: CIP-AB1234";
    if (mode === "cpf") return "Ex.: 718.321.901-10";
    return "Ex.: Fernanda Ferreira de Oliveira";
  }, [mode]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCert(null);

    const value = q.trim();
    if (!value) return setError("Digite um valor para pesquisar.");

    setLoading(true);
    try {
      const data = await publicSearch(mode, value);
      setCert(data);
    } catch (err: any) {
      setError(err?.message || "Não foi possível consultar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="card p-7">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-extrabold text-ink-900">
            Consulta de Certificados e Diplomas
          </h1>
          <p className="text-sm text-slate-600">
            Valide a autenticidade utilizando <b>código</b>, <b>nome completo</b> ou <b>CPF</b>.
          </p>
        </div>

        <form onSubmit={onSubmit} className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-[240px_1fr_auto]">
          <div>
            <label className="label">Tipo de consulta</label>
            <select className="input" value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
              <option value="code">Código de autenticação</option>
              <option value="name">Nome completo</option>
              <option value="cpf">CPF</option>
            </select>
          </div>

          <div>
            <label className="label">Pesquisar</label>
            <input
              className="input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={placeholder}
            />
          </div>

          <div className="flex items-end">
            <button className="btn-primary w-full sm:w-auto" disabled={loading}>
              {loading ? "Consultando..." : "Consultar"}
            </button>
          </div>
        </form>

        <div className="mt-6 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold text-slate-600">Observações</div>
          <ul className="mt-2 text-xs text-slate-600 list-disc pl-4 space-y-1">
            <li>Se estiver no certificado, prefira o <b>código de autenticação</b>.</li>
            <li>Para CPF, pode digitar com ou sem pontuação.</li>
            <li>Se a consulta não retornar resultado, confirme os dados e tente novamente.</li>
          </ul>
        </div>
      </div>

      {error && <Alert title="Consulta não realizada" message={error} />}
      {cert && <ResultCard cert={cert} />}
    </div>
  );
}
