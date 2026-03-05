const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001";

export type Cert = {
  id: number;
  nome: string;
  cpf: string;
  curso: string;
  carga_horaria: string;
  data_conclusao: string;
  codigo: string;
  status: "VALIDO" | "INVALIDO";
  created_at: string;
};

export async function publicSearch(type: "code" | "cpf" | "name", q: string) {
  const url = new URL(`${API_BASE}/api/certificates/search`);
  url.searchParams.set("type", type);
  url.searchParams.set("q", q);

  const r = await fetch(url.toString());
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.message || "Erro na consulta.");
  return j.data as Cert;
}

export async function verifyByCode(code: string) {
  const r = await fetch(`${API_BASE}/api/certificates/${encodeURIComponent(code)}`);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.message || "Erro na consulta.");
  return j.data as Cert;
}

export async function adminLogin(user: string, pass: string) {
  const r = await fetch(`${API_BASE}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user, pass }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.message || "Falha no login.");
  return j.token as string;
}

export async function adminList(token: string) {
  const r = await fetch(`${API_BASE}/api/admin/certificates`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.message || "Erro ao listar.");
  return j.data as Cert[];
}

export async function adminCreate(token: string, payload: Partial<Cert> & {
  nome: string; cpf: string; curso: string; carga_horaria: string; data_conclusao: string;
  codigo?: string; status?: "VALIDO" | "INVALIDO";
}) {
  const r = await fetch(`${API_BASE}/api/admin/certificates`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.message || "Erro ao criar.");
  return j.data as Cert;
}

export async function adminUpdate(token: string, id: number, payload: Cert) {
  const r = await fetch(`${API_BASE}/api/admin/certificates/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.message || "Erro ao atualizar.");
  return j.data as Cert;
}

export async function adminDelete(token: string, id: number) {
  const r = await fetch(`${API_BASE}/api/admin/certificates/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.message || "Erro ao remover.");
  return true;
}

export function maskCpfDigits(cpf: string) {
  const d = (cpf || "").replace(/\D/g, "");
  if (d.length !== 11) return cpf;
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9,11)}`;
}
