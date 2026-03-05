import { Outlet, Link, useLocation } from "react-router-dom";

export default function Shell() {
  const loc = useLocation();
  const isAdmin = loc.pathname.startsWith("/admin");

  return (
    <div className="min-h-screen">
      <header className="bg-ink-800 text-white">
        <div className="container-max py-5 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Colégio Integrado Polivalente"
              className="h-10 w-10 rounded-xl bg-white/10 object-contain p-1"
            />
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-wide">
                Colégio Integrado Polivalente
              </div>
              <div className="text-xs text-white/70">
                Portal de Verificação de Certificados e Diplomas
              </div>
            </div>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            {!isAdmin ? (
              <Link to="/admin" className="btn-ghost">
                Acesso administrativo
              </Link>
            ) : (
              <Link to="/" className="btn-ghost">
                Voltar para consulta
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="container-max py-10">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200">
        <div className="container-max py-6 text-xs text-slate-500 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            © {new Date().getFullYear()} Colégio Integrado Polivalente — Verificação
            oficial.
          </div>
          <div className="text-slate-400">
            Dica: para validação rápida, use o <span className="font-semibold">código</span>{" "}
            informado no documento.
          </div>
        </div>
      </footer>
    </div>
  );
}
