// routes/announcement.js
const express = require("express");
const router = express.Router();
const comm = require("../controllers/communicationController");
const { authRequired, requireAnyRole } = require("../middleware/authMiddleware");

router.post("/", authRequired, requireAnyRole(["Admin", "Registrar", "SuperAdmin"]), comm.createAnnouncement);
router.get("/", comm.getAnnouncements);

module.exports = router;
