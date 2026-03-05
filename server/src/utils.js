export function normalizeCpf(input) {
  return String(input || "").replace(/\D/g, "");
}

export function normalizeCode(input) {
  return String(input || "").trim().toUpperCase();
}

export function normalizeName(input) {
  return String(input || "").trim();
}

export function makeCode(prefix = "CIP") {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // sem I/O para evitar confusão
  const nums = "0123456789";
  const pick = (s) => s[Math.floor(Math.random() * s.length)];
  return `${prefix}-${pick(letters)}${pick(letters)}${pick(nums)}${pick(nums)}${pick(nums)}${pick(nums)}`;
}
