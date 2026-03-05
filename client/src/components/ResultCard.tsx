import { QRCodeCanvas } from "qrcode.react";
import { Cert, maskCpfDigits } from "../lib/api";
import { Link } from "react-router-dom";

export default function ResultCard({ cert }: { cert: Cert }) {
  const ok = cert.status === "VALIDO";
  const verifyUrl = `${window.location.origin}/verificar/${encodeURIComponent(cert.codigo)}`;

  return (
    <div className="card p-6 mt-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1">
          <div className="text-xs font-semibold text-slate-500">Resultado da verificação</div>
          <div className="mt-1 text-xl font-bold text-ink-900">Certificado / Diploma</div>

          <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nome completo" value={cert.nome} />
            <Field label="CPF" value={maskCpfDigits(cert.cpf)} />
            <Field label="Curso" value={cert.curso} />
            <Field label="Carga horária" value={cert.carga_horaria} />
            <Field label="Data de conclusão" value={cert.data_conclusao} />
            <Field label="Código de autenticação" value={cert.codigo} mono />
          </dl>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span
              className={[
                "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
                ok ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
              ].join(" ")}
            >
              {ok ? "✔ CERTIFICADO VÁLIDO" : "✖ CERTIFICADO INVÁLIDO"}
            </span>

            <Link to={`/verificar/${encodeURIComponent(cert.codigo)}`} className="btn-ghost">
              Abrir página oficial
            </Link>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Este resultado é uma validação eletrônica do Colégio Integrado Polivalente.
          </p>
        </div>

        <div className="shrink-0">
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold text-slate-600">QR Code de verificação</div>
            <div className="mt-3 flex items-center justify-center">
              <QRCodeCanvas value={verifyUrl} size={160} includeMargin />
            </div>
            <div className="mt-3 text-[11px] text-slate-500 max-w-[200px]">
              Aponte a câmera para abrir a página oficial de validação.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className={"mt-1 text-sm text-slate-900 " + (mono ? "font-mono" : "")}>{value}</dd>
    </div>
  );
}
