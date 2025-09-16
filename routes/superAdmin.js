// routes/superAdmin.js
const express = require("express");
const router = express.Router();
const superAdmin = require("../controllers/superAdminController");
const { authRequired, requireRole } = require("../middleware/authMiddleware");

router.get("/users", authRequired, requireRole("SuperAdmin"), superAdmin.getAllUsers);
router.post("/update-role", authRequired, requireRole("SuperAdmin"), superAdmin.updateUserRole);
router.post("/lock-user", authRequired, requireRole("SuperAdmin"), superAdmin.lockUser);
router.post("/unlock-user", authRequired, requireRole("SuperAdmin"), superAdmin.unlockUser);
router.post("/impersonate", authRequired, requireRole("SuperAdmin"), superAdmin.impersonate);

module.exports = router;
