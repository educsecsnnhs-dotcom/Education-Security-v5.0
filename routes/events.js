// routes/events.js
const express = require("express");
const router = express.Router();
const comm = require("../controllers/communicationController");
const { authRequired, requireAnyRole } = require("../middleware/authMiddleware");

router.post("/", authRequired, requireAnyRole(["Admin", "Registrar", "SuperAdmin"]), comm.createEvent);
router.get("/", comm.getAnnouncements); // reuse or create getEvents in comm controller

module.exports = router;
