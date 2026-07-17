const http = require("http");
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth").router;
const usersRoutes = require("./routes/users");
const channelsRoutes = require("./routes/channels");
const { initSocket } = require("./socket");

const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/channels", channelsRoutes);

app.use((req, res) => res.status(404).json({ error: "찾을 수 없는 경로입니다." }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "서버 오류가 발생했습니다." });
});

const httpServer = http.createServer(app);
initSocket(httpServer, CLIENT_ORIGIN);

httpServer.listen(PORT, () => {
  console.log(`사내 메신저 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});
