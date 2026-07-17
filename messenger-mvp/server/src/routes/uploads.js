const express = require("express");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");
const { requireAuth } = require("../auth");

const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB — 데모용 상한. 운영 전 정책 재검토 필요.

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).slice(0, 20);
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({ storage, limits: { fileSize: MAX_FILE_SIZE } });

const router = express.Router();

router.post("/", requireAuth, (req, res) => {
  upload.single("file")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ error: "파일이 너무 큽니다 (최대 20MB)." });
      }
      return res.status(400).json({ error: "파일 업로드에 실패했습니다." });
    }
    if (err) return res.status(500).json({ error: "파일 업로드 중 오류가 발생했습니다." });
    if (!req.file) return res.status(400).json({ error: "파일이 없습니다." });

    res.status(201).json({
      url: `/uploads/${req.file.filename}`,
      name: req.file.originalname,
      mime: req.file.mimetype,
      size: req.file.size,
    });
  });
});

module.exports = router;
