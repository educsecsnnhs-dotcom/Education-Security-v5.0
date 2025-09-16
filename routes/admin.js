// routes/admin.js
const express = require("express");
const router = express.Router();
const adminCtrl = require("../controllers/adminController");
const { authRequired, requireRole } = require("../middleware/authMiddleware");

router.post("/assign-moderator", authRequired, requireRole("Admin"), adminCtrl.assignModerator);

module.exports = router;
