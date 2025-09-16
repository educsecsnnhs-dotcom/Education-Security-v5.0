// routes/attendance.js
const express = require("express");
const router = express.Router();
const Attendance = require("../models/Attendance"); // Import Attendance model
const { authRequired, requireAnyRole } = require("../middleware/authMiddleware");

// POST /api/attendance (Mark attendance for multiple students)
router.post("/", authRequired, requireAnyRole(["Admin", "Registrar", "Moderator"]), async (req, res) => {
  try {
    const { records } = req.body; // Expecting an array of { studentId, status, sectionId, date }
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: "Attendance records array is required." });
    }

    const markedBy = req.user.id;
    const newAttendanceRecords = [];

    for (const record of records) {
      const { studentId, date, status, sectionId } = record;
      if (!studentId || !date || !status || !sectionId) {
        console.warn("Skipping invalid attendance record:", record);
        continue; // Skip invalid records
      }

      // Check if attendance for this student, section, and date already exists
      let existingRecord = await Attendance.findOne({ studentId, sectionId, date: new Date(date) });

      if (existingRecord) {
        // Update existing record
        existingRecord.status = status;
        existingRecord.markedBy = markedBy;
        await existingRecord.save();
        newAttendanceRecords.push(existingRecord);
      } else {
        // Create new record
        const newRec = new Attendance({ studentId, date: new Date(date), status, sectionId, markedBy });
        await newRec.save();
        newAttendanceRecords.push(newRec);
      }
    }

    res.status(201).json({ message: "Attendance marked/updated", records: newAttendanceRecords });
  } catch (err) {
    console.error("Error marking attendance:", err);
    res.status(500).json({ message: "Error marking attendance", error: err.message });
  }
});

module.exports = router;
