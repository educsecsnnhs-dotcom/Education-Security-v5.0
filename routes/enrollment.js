// routes/enrollment.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const enrollmentCtrl = require("../controllers/enrollmentController");
const { authRequired, requireRole } = require("../middleware/authMiddleware");

// File storage (5MB max per file)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/enrollments/"),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// 🔹 User submits enrollment
router.post(
  "/",
  authRequired,
  requireRole("User"),
  upload.fields([
    { name: "reportCard", maxCount: 1 },
    { name: "goodMoral", maxCount: 1 },
    { name: "birthCertificate", maxCount: 1 },
    { name: "others", maxCount: 5 },
  ]),
  enrollmentCtrl.submitEnrollment
);

// 🔹 User checks their enrollment
router.get("/me", authRequired, requireRole("User"), enrollmentCtrl.getMyEnrollment);

// 🔹 Registrar/Admin approves/rejects
router.patch("/:id/approve", authRequired, requireRole("Admin"), enrollmentCtrl.approveEnrollment);
router.patch("/:id/reject", authRequired, requireRole("Admin"), enrollmentCtrl.rejectEnrollment);

module.exports = router;

