const jwt = require("jsonwebtoken");
const db = require("./db");

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

const ACTION_FLAG = {
  read: "canRead",
  write: "canWrite",
  update: "canUpdate",
  delete: "canDelete",
};

// 권한 그룹(Role)에 따라 모듈별 read/write/update/delete 가능 여부를 검사한다.
// requireAuth 이후에 붙여 쓴다 (req.userId 필요).
function requirePermission(module, action = "read") {
  const flag = ACTION_FLAG[action];
  if (!flag) throw new Error(`알 수 없는 권한 액션: ${action}`);
  return (req, res, next) => {
    const user = db.findUserById(req.userId);
    if (!user) return res.status(401).json({ error: "인증이 필요합니다." });
    const perm = db.getRolePermission(user.role, module);
    if (!perm[flag]) {
      return res.status(403).json({ error: "이 작업을 수행할 권한이 없습니다." });
    }
    req.userRole = user.role;
    next();
  };
}

module.exports = { signToken, verifyToken, requireAuth, requirePermission, JWT_SECRET };
