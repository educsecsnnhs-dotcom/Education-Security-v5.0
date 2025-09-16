// controllers/enrollmentController.js
const Enrollment = require("../models/Enrollment");
const User = require("../models/User");

/**
 * User submits enrollment (multipart/form-data with files)
 */
exports.submitEnrollment = async (req, res) => {
  try {
    const { level, strand, schoolYear, yearLevel } = req.body;
    const userId = req.user?.id; // ✅ switched to JWT payload

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Prevent duplicate for same SY
    const existing = await Enrollment.findOne({ studentId: user._id, schoolYear });
    if (existing) {
      return res.status(400).json({ message: "You already applied for this school year" });
    }

    // Collect documents
    const files = req.files || {};
    const docs = {
      reportCard: files.reportCard?.[0]?.filename || null,
      goodMoral: files.goodMoral?.[0]?.filename || null,
      birthCertificate: files.birthCertificate?.[0]?.filename || null,
      others: (files.others || []).map(f => f.filename),
    };

    const enrollment = new Enrollment({
      studentId: user._id,
      name: user.fullName || user.email, // fallback if no fullName
      lrn: user.lrn || null,             // some users may not have LRN yet
      level,
      strand,
      section: null,
      schoolYear,
      yearLevel: yearLevel || null,
      status: "pending",
      documents: docs,
    });

    await enrollment.save();
    res.status(201).json({ message: "Enrollment submitted", enrollment });
  } catch (err) {
    console.error("submitEnrollment error:", err);
    res.status(500).json({ message: "Error submitting enrollment", error: err.message });
  }
};

/**
 * User checks their enrollment (latest)
 */
exports.getMyEnrollment = async (req, res) => {
  try {
    const userId = req.user?.id; // ✅ switched to JWT payload
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const rec = await Enrollment.findOne({ studentId: userId }).sort({ createdAt: -1 });
    if (!rec) return res.status(404).json({ message: "No enrollment found" });

    res.json(rec);
  } catch (err) {
    res.status(500).json({ message: "Error fetching enrollment", error: err.message });
  }
};

/**
 * Registrar/Admin approves enrollment → promote User role to Student
 */
exports.approveEnrollment = async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id);
    if (!enrollment) return res.status(404).json({ message: "Enrollment not found" });

    enrollment.status = "approved";
    await enrollment.save();

    await User.findByIdAndUpdate(enrollment.studentId, { role: "Student" });

    res.json({ message: "Enrollment approved, user promoted to Student" });
  } catch (err) {
    console.error("approveEnrollment error:", err);
    res.status(500).json({ message: "Error approving enrollment", error: err.message });
  }
};

/**
 * Registrar/Admin rejects enrollment
 */
exports.rejectEnrollment = async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id);
    if (!enrollment) return res.status(404).json({ message: "Enrollment not found" });

    enrollment.status = "rejected";
    await enrollment.save();

    res.json({ message: "Enrollment rejected" });
  } catch (err) {
    console.error("rejectEnrollment error:", err);
    res.status(500).json({ message: "Error rejecting enrollment", error: err.message });
  }
};
