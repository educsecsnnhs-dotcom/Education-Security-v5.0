// routes/registrar.js
const express = require("express");
const router = express.Router();
const registrar = require("../controllers/registrarController");
const { authRequired, requireRole } = require("../middleware/authMiddleware");

/**
 * Registrar endpoints
 * Note: SuperAdmin (Principal) bypass is handled in accessGuard/authMiddleware
 */

// Enrollment lifecycle
router.get("/enrollment/pending", authRequired, requireRole("Registrar"), registrar.getPendingEnrollees);
router.post("/enrollment/:id/approve", authRequired, requireRole("Registrar"), registrar.approveEnrollee);
router.post("/enrollment/:id/reject", authRequired, requireRole("Registrar"), registrar.rejectEnrollee);

// Enrolled + Archives
router.get("/enrollment/approved", authRequired, requireRole("Registrar"), registrar.getApprovedEnrollees);
router.get("/enrollment/archived", authRequired, requireRole("Registrar"), registrar.getArchivedEnrollees);
router.post("/enrollment/:id/archive", authRequired, requireRole("Registrar"), registrar.archiveEnrollee);
router.post("/enrollment/:id/restore", authRequired, requireRole("Registrar"), registrar.restoreArchivedEnrollee);

// Section management
router.post("/sections", authRequired, requireRole("Registrar"), registrar.createSection);
router.get("/sections", authRequired, requireRole("Registrar"), registrar.getSections);

// Stats
router.get("/stats", authRequired, requireRole("Registrar"), registrar.getEnrollmentStats);

// Role assignment
router.post("/assign-role", authRequired, requireRole("Registrar"), registrar.assignRole);

module.exports = router;
