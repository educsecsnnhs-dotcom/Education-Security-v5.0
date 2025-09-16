// controllers/registrarController.js
const Enrollment = require("../models/Enrollment");
const Section = require("../models/Section");
const User = require("../models/User");
const { encrypt } = require("../utils/caesar");

/**
 * 📌 Get all pending enrollments
 */
exports.getPendingEnrollees = async (req, res) => {
  try {
    const pending = await Enrollment.find({ status: "pending", archived: false });
    res.json(pending);
  } catch (err) {
    res.status(500).json({ message: "Error fetching pending", error: err.message });
  }
};

/**
 * 📌 Approve enrollment → promote to Student, assign section
 */
exports.approveEnrollee = async (req, res) => {
  try {
    const { id } = req.params;
    const { sectionName } = req.body;

    const enroll = await Enrollment.findById(id);
    if (!enroll) return res.status(404).json({ message: "Enrollment not found" });

    // Find user by LRN or create new
    let user = await User.findOne({ lrn: enroll.lrn });
    if (!user) {
      const randPass = Math.random().toString(36).slice(2, 10);
      user = new User({
        username: `u${Date.now()}`,
        fullName: enroll.name,
        password: encrypt(randPass),
        lrn: enroll.lrn,
        role: "Student",
      });
      await user.save();
      enroll.studentId = user._id;
    } else {
      user.role = "Student";
      await user.save();
    }

    // Find or create section
    let section = null;
    if (sectionName) {
      section = await Section.findOne({ name: sectionName, schoolYear: enroll.schoolYear });
    }
    if (!section) {
      const defaultName = sectionName || `${enroll.level?.toUpperCase() || "X"}-${enroll.strand || "GEN"}-A`;
      section = new Section({
        name: defaultName,
        gradeLevel: enroll.yearLevel || null,
        strand: enroll.strand || "N/A",
        schoolYear: enroll.schoolYear,
        capacity: 40,
        students: [],
      });
      await section.save();
    }

    // Attach student to section
    if (!section.students.includes(user._id)) {
      section.students.push(user._id);
      await section.save();
    }

    // Finalize enrollment
    enroll.status = "approved";
    enroll.section = section.name;
    enroll.assignedSection = section._id;
    await enroll.save();

    res.json({ message: "Enrollment approved", enrollment: enroll, section });
  } catch (err) {
    res.status(500).json({ message: "Error approving enrollment", error: err.message });
  }
};

/**
 * 📌 Reject enrollment
 */
exports.rejectEnrollee = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const enroll = await Enrollment.findById(id);
    if (!enroll) return res.status(404).json({ message: "Enrollment not found" });

    enroll.status = "rejected";
    enroll.rejectionReason = reason || "Not specified";
    await enroll.save();

    res.json({ message: "Enrollment rejected", enrollment: enroll });
  } catch (err) {
    res.status(500).json({ message: "Error rejecting enrollment", error: err.message });
  }
};

/**
 * 📌 Get approved / enrolled list
 */
exports.getApprovedEnrollees = async (req, res) => {
  try {
    const approved = await Enrollment.find({ status: "approved", archived: false });
    res.json(approved);
  } catch (err) {
    res.status(500).json({ message: "Error fetching approved", error: err.message });
  }
};

/**
 * 📌 Archive enrollment
 */
exports.archiveEnrollee = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const enroll = await Enrollment.findById(id);
    if (!enroll) return res.status(404).json({ message: "Enrollment not found" });

    enroll.archived = true;
    enroll.archiveReason = reason || "Archived";
    await enroll.save();

    res.json({ message: "Enrollment archived", enrollment: enroll });
  } catch (err) {
    res.status(500).json({ message: "Error archiving enrollment", error: err.message });
  }
};

/**
 * 📌 Get archived enrollments
 */
exports.getArchivedEnrollees = async (req, res) => {
  try {
    const archived = await Enrollment.find({ archived: true });
    res.json(archived);
  } catch (err) {
    res.status(500).json({ message: "Error fetching archived", error: err.message });
  }
};

/**
 * 📌 Restore archived enrollment
 */
exports.restoreArchivedEnrollee = async (req, res) => {
  try {
    const { id } = req.params;

    const enroll = await Enrollment.findById(id);
    if (!enroll) return res.status(404).json({ message: "Enrollment not found" });

    enroll.archived = false;
    enroll.archiveReason = null;
    await enroll.save();

    res.json({ message: "Enrollment restored", enrollment: enroll });
  } catch (err) {
    res.status(500).json({ message: "Error restoring enrollment", error: err.message });
  }
};

/**
 * 📌 Create section (manual)
 */
exports.createSection = async (req, res) => {
  try {
    const { name, gradeLevel, strand, schoolYear, capacity } = req.body;
    const exists = await Section.findOne({ name, schoolYear });
    if (exists) return res.status(400).json({ message: "Section already exists" });

    const sec = new Section({ name, gradeLevel, strand, schoolYear, capacity: capacity || 40 });
    await sec.save();

    res.status(201).json({ message: "Section created", section: sec });
  } catch (err) {
    res.status(500).json({ message: "Error creating section", error: err.message });
  }
};

/**
 * 📌 List sections
 */
exports.getSections = async (req, res) => {
  try {
    const sections = await Section.find();
    res.json(sections);
  } catch (err) {
    res.status(500).json({ message: "Error fetching sections", error: err.message });
  }
};

/**
 * 📌 Enrollment stats
 */
exports.getEnrollmentStats = async (req, res) => {
  try {
    const enrolled = await Enrollment.countDocuments({ status: "approved" });
    const pending = await Enrollment.countDocuments({ status: "pending" });
    res.json({ enrolled, pending });
  } catch (err) {
    res.status(500).json({ message: "Error fetching stats", error: err.message });
  }
};

/**
 * 📌 Assign roles (Registrar can only GIVE, not remove)
 * Roles: Moderator (Teacher), Admin (Dept Head), SSG (Student Gov)
 */
exports.assignRole = async (req, res) => {
  try {
    const { userId, role, lastName, firstName, middleName, lrn } = req.body;
    const allowed = ["Moderator", "Admin", "SSG"];

    if (!allowed.includes(role)) {
      return res.status(400).json({ message: "Invalid role: Registrar can only assign Moderator/Admin/SSG" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.role = role;
    if (lastName) user.lastName = lastName;
    if (firstName) user.firstName = firstName;
    if (middleName) user.middleName = middleName;
    if (lrn) user.lrn = lrn;

    await user.save();
    res.json({ message: `✅ Role '${role}' granted by Registrar`, user });
  } catch (err) {
    res.status(500).json({ message: "Error assigning role", error: err.message });
  }
};

