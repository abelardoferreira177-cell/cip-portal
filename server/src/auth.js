import crypto from "node:crypto";

const sessions = new Map(); // token -> { user, createdAt }

export function issueToken(user) {
  const token = crypto.randomBytes(24).toString("hex");
  sessions.set(token, { user, createdAt: Date.now() });
  return token;
}

export function requireAuth(req, res, next) {
  const token = req.headers["authorization"]?.replace(/^Bearer\s+/i, "") || "";
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ ok: false, message: "Não autenticado." });
  }
  req.user = sessions.get(token);
  next();
}
