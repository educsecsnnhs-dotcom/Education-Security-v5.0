// controllers/academicsController.js
const RecordBook = require("../models/RecordBook");
const Enrollment = require("../models/Enrollment");
const Attendance = require("../models/Attendance");
const { getSheetValues } = require("../utils/sheetsClient");

/**
 * Student - get their grades (via RecordBook -> Google Sheets)
 */
exports.getMyGrades = async (req, res) => {
  try {
    const studentId = req.user?.id; // ✅ JWT only
    if (!studentId) return res.status(401).json({ message: "Unauthorized" });

    const enrollments = await Enrollment.find({ studentId, status: "approved" }).populate("assignedSection");

    const out = [];
    for (const enr of enrollments) {
      const recordBooks = await RecordBook.find({ sectionId: enr.assignedSection, partial: false });
      for (const rb of recordBooks) {
        const values = await getSheetValues(rb.sheetId, "Sheet1!A1:Z50");
        const row = values.find(r => r[0] === enr.lrn || r[1] === req.user.fullName);
        out.push({ section: enr.section, subject: rb.subject, grades: row || [] });
      }
    }
    res.json(out);
  } catch (err) {
    console.error("getMyGrades:", err);
    res.status(500).json({ message: "Error fetching grades", error: err.message });
  }
};

/**
 * Teacher/Moderator - create recordbook entry (meta)
 */
exports.createRecordBook = async (req, res) => {
  try {
    const { subject, sectionId, sheetId } = req.body;
    const rb = new RecordBook({ subject, sectionId, sheetId, createdBy: req.user.id });
    await rb.save();
    res.status(201).json({ message: "Record book created", rb });
  } catch (err) {
    res.status(500).json({ message: "Error creating recordbook", error: err.message });
  }
};

/**
 * Mark attendance
 */
exports.markAttendance = async (req, res) => {
  try {
    const { studentId, date, status } = req.body;
    const rec = new Attendance({ studentId, date, status, markedBy: req.user.id });
    await rec.save();
    res.status(201).json({ message: "Attendance marked", rec });
  } catch (err) {
    res.status(500).json({ message: "Error marking attendance", error: err.message });
  }
};
