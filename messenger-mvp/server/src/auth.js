const jwt = require("jsonwebtoken");

// NOTE: MVP uses email/password login as a stand-in for the real SSO/AD
// integration planned for the org-chart phase (see 기획서 2.1). Swap this
// module for an OIDC/SAML client without touching the rest of the app —
// every route only depends on `req.user` being populated.
const JWT_SECRET = process.env.JWT_SECRET || "dev-only-secret-change-me";
const TOKEN_TTL = "7d";

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, name: user.name }, JWT_SECRET, {
    expiresIn: TOKEN_TTL,
  });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "인증 토큰이 필요합니다." });
  }
  try {
    const payload = verifyToken(token);
    req.userId = payload.sub;
    next();
  } catch (err) {
    return res.status(401).json({ error: "토큰이 유효하지 않거나 만료되었습니다." });
  }
}

module.exports = { signToken, verifyToken, requireAuth, JWT_SECRET };
