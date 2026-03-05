import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import ResultCard from "../components/ResultCard";
import Alert from "../components/Alert";
import { verifyByCode, Cert } from "../lib/api";

export default function VerifyPage() {
  const { code } = useParams();
  const [loading, setLoading] = useState(true);
  const [cert, setCert] = useState<Cert | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ok = true;
    (async () => {
      setLoading(true);
      setError(null);
      setCert(null);
      try {
        const data = await verifyByCode(String(code || ""));
        if (ok) setCert(data);
      } catch (e: any) {
        if (ok) setError(e?.message || "Não encontrado.");
      } finally {
        if (ok) setLoading(false);
      }
    })();
    return () => {
      ok = false;
    };
  }, [code]);

  return (
    <div>
      <div className="card p-7">
        <div className="flex flex-col gap-2">
          <div className="text-xs font-semibold text-slate-500">Página oficial de validação</div>
          <h1 className="text-2xl font-extrabold text-ink-900">Verificação por código</h1>
          <p className="text-sm text-slate-600">
            Código informado: <span className="font-mono font-semibold">{code}</span>
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link to="/" className="btn-ghost">Nova consulta</Link>
        </div>
      </div>

      {loading && (
        <div className="card p-6 mt-6">
          <div className="text-sm text-slate-600">Consultando...</div>
        </div>
      )}

      {error && <Alert title="Não encontrado" message={error} />}
      {cert && <ResultCard cert={cert} />}
    </div>
  );
}
