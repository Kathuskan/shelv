const express = require("express");
const auth = require("../middleware/authMiddleware");
const rateLimit = require("../lib/rateLimit");
const { asyncRoute } = require("../lib/validation");
const Preference = require("../models/UserPreference");
const discovery = require("../services/discovery");

module.exports = function discoveryRouter() {
  const router = express.Router();
  router.use(auth);
  router.use((_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
  router.get("/recommendation-preferences", asyncRoute(async (req, res) => {
    res.json(discovery.preferenceView(await Preference.findOne({ userId: req.user.id })));
  }));
  router.put("/recommendation-preferences", rateLimit({ limit: 20 }), asyncRoute(async (req, res) => {
    res.json(await discovery.configure(req.user.id, req.body));
  }));
  router.delete("/recommendation-preferences", rateLimit({ limit: 20 }), asyncRoute(async (req, res) => {
    res.json(await discovery.configure(req.user.id, { enabled: false }));
  }));
  router.get("/recommendations", rateLimit({ limit: 30 }), asyncRoute(async (req, res) => {
    res.json(await discovery.feed(req.user.id, req.query));
  }));
  router.post("/events", rateLimit({ limit: 120 }), asyncRoute(async (req, res) => {
    const result = await discovery.ingest(req.user.id, req.body);
    res.status(result.duplicate ? 200 : 201).json(result);
  }));
  return router;
};
