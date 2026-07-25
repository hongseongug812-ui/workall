const express = require("express");
const { requireAuth } = require("../auth");
const { runGlobalSearch } = require("../search/registry");
const { publicUser } = require("./auth");
require("../search/providers");

const router = express.Router();

router.get("/", requireAuth, (req, res) => {
  const { q } = req.query;
  if (typeof q !== "string" || q.trim().length < 2) {
    return res.status(400).json({ error: "검색어는 2자 이상 입력하세요." });
  }
  const grouped = runGlobalSearch(req.userId, q);
  const messages = grouped.find((g) => g.module === "messenger")?.items || [];
  const directory = (grouped.find((g) => g.module === "directory")?.items || []).map(publicUser);
  const tasks = grouped.find((g) => g.module === "project")?.items || [];
  const wikiPages = grouped.find((g) => g.module === "wiki")?.items || [];
  res.json({ messages, directory, tasks, wikiPages });
});

module.exports = router;
