// routes/recordbook.js
const express = require("express");
const router = express.Router();
const academics = require("../controllers/academicsController");
const RecordBook = require("../models/RecordBook"); // Import RecordBook model
const { appendToSheet } = require("../utils/sheetsClient"); // Import sheetsClient
const { authRequired, requireAnyRole } = require("../middleware/authMiddleware");

// POST /api/recordbook (Moderator creates recordbook entry and uploads grades)
router.post("/", authRequired, requireAnyRole(["Admin", "Registrar", "Moderator"]), async (req, res) => {
  try {
    const { subject, sectionId, grades } = req.body; // Expecting grades array
    if (!subject || !sectionId || !Array.isArray(grades)) {
      return res.status(400).json({ message: "Subject, sectionId, and grades array are required." });
    }

    // Find or create a RecordBook entry for this section and subject
    let recordBook = await RecordBook.findOne({ sectionId, subject });

    if (!recordBook) {
      // If no sheetId is provided, you might need to create a new Google Sheet
      // For now, let's use a dummy ID or require it from the frontend.
      // In a real app, you'd integrate with Google Sheets API to create a new sheet.
      const dummySheetId = `dummy_sheet_${sectionId}_${subject.replace(/\s/g, '_')}`;
      recordBook = new RecordBook({
        subject,
        sectionId,
        sheetId: dummySheetId, // Placeholder sheet ID
        createdBy: req.user.id,
        partial: true, // Mark as partial until finalized
      });
      await recordBook.save();
    }

    // Prepare data for Google Sheet / CSV
    // Assuming grades array is [{ studentId, grade }]
    // You'd need to fetch student LRNs and names to match the sheet format (LRN, Name, Grade1, Grade2...)
    // For simplicity, let's assume the sheet format is LRN, FullName, Grade
    const studentIds = grades.map(g => g.studentId);
    const students = await User.find({ _id: { $in: studentIds } }).select('lrn fullName');
    const studentMap = new Map(students.map(s => [s._id.toString(), s]));

    const valuesToAppend = grades.map(g => {
      const student = studentMap.get(g.studentId);
      return [
        student?.lrn || 'N/A',
        student?.fullName || 'N/A',
        g.grade,
      ];
    });

    // Append grades to the Google Sheet / CSV
    // The range should be dynamic, e.g., 'Sheet1!A:C' to append new rows
    await appendToSheet(recordBook.sheetId, 'Sheet1!A:C', valuesToAppend);

    res.status(201).json({ message: "Grades uploaded and record book updated", recordBook });
  } catch (err) {
    console.error("Error creating recordbook/uploading grades:", err);
    res.status(500).json({ message: "Error creating recordbook/uploading grades", error: err.message });
  }
});

// NEW: POST /api/recordbook/:sectionId/:subject/finalize (Registrar/Admin finalizes record book)
router.post("/:sectionId/:subject/finalize", authRequired, requireAnyRole(["Admin", "Registrar"]), async (req, res) => {
  try {
    const { sectionId, subject } = req.params;
    if (!sectionId || !subject) {
      return res.status(400).json({ message: "Section ID and Subject are required." });
    }

    const recordBook = await RecordBook.findOneAndUpdate(
      { sectionId, subject },
      { partial: false }, // Set partial to false to finalize
      { new: true }
    );

    if (!recordBook) {
      return res.status(404).json({ message: "Record book not found for this section and subject." });
    }

    res.json({ message: "Record book finalized successfully", recordBook });
  } catch (err) {
    console.error("Error finalizing record book:", err);
    res.status(500).json({ message: "Error finalizing record book", error: err.message });
  }
});

module.exports = router;
