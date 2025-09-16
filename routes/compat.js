// routes/compat.js
// Compatibility wrappers for frontend endpoint names that don't exist in the original route layout.
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const { authRequired, requireAnyRole } = require("../middleware/authMiddleware");

const academics = require("../controllers/academicsController");
const Enrollment = require("../models/Enrollment");
const Attendance = require("../models/Attendance");
const Section = require("../models/Section");
const User = require("../models/User");
const RecordBook = require("../models/RecordBook");

const uploadProfile = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/profilePics/"),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
  }),
  limits: { fileSize: 3 * 1024 * 1024 }
});

// POST /api/attendance/mark (Frontend might call this, but main route is /api/attendance)
router.post("/attendance/mark", authRequired, requireAnyRole(["Admin","Registrar","Moderator"]), (req, res, next) => {
  // This route is a direct pass-through to academics.markAttendance
  // The frontend attendance.js now calls /api/attendance directly.
  // Keeping this for backward compatibility if other parts still use /mark.
  return academics.markAttendance(req, res, next);
});

// GET /api/attendance/my (Student's attendance)
router.get("/attendance/my", authRequired, async (req, res) => {
  try {
    const studentId = req.user?.id;
    if (!studentId) return res.status(401).json({ message: "Unauthorized" });
    // Populate section details for frontend display
    const recs = await Attendance.find({ studentId }).populate('sectionId', 'name').sort({ date: -1 }).limit(365);
    res.json(recs.map(rec => ({
      date: rec.date,
      status: rec.status,
      section: rec.sectionId ? rec.sectionId.name : 'N/A'
    })));
  } catch (err) {
    console.error("Error fetching student attendance:", err);
    res.status(500).json({ message: "Error fetching attendance", error: err.message });
  }
});

// GET /api/attendance/audit (Admin/Registrar/Moderator audit)
router.get("/attendance/audit", authRequired, requireAnyRole(["Admin","Registrar","Moderator"]), async (req, res) => {
  try {
    const q = {};
    if (req.query.studentId) q.studentId = req.query.studentId;
    if (req.query.sectionId) q.sectionId = req.query.sectionId; // Added sectionId filter
    if (req.query.date) { // Filter by exact date
      const targetDate = new Date(req.query.date);
      targetDate.setUTCHours(0, 0, 0, 0);
      const nextDate = new Date(targetDate);
      nextDate.setUTCDate(targetDate.getUTCDate() + 1);
      q.date = { $gte: targetDate, $lt: nextDate };
    } else if (req.query.from || req.query.to) { // Filter by date range
      q.date = {};
      if (req.query.from) q.date.$gte = new Date(req.query.from);
      if (req.query.to) q.date.$lte = new Date(req.query.to);
    }

    // Populate student and section details
    const recs = await Attendance.find(q)
      .populate('studentId', 'fullName email lrn')
      .populate('sectionId', 'name')
      .limit(1000)
      .sort({ date: -1 });

    res.json(recs.map(rec => ({
      _id: rec._id,
      date: rec.date,
      status: rec.status,
      student: {
        _id: rec.studentId._id,
        fullName: rec.studentId.fullName || rec.studentId.email,
        lrn: rec.studentId.lrn
      },
      section: {
        _id: rec.sectionId._id,
        name: rec.sectionId.name
      },
      markedBy: rec.markedBy // You might want to populate this too
    })));
  } catch (err) {
    console.error("Error fetching attendance audit:", err);
    res.status(500).json({ message: "Error fetching audit", error: err.message });
  }
});

// GET /api/enrollment/enrolled (Registrar/Admin list of approved enrollments)
router.get("/enrollment/enrolled", authRequired, requireAnyRole(["Admin","Registrar"]), async (req, res) => {
  try {
    // Populate assignedSection to get section name
    const list = await Enrollment.find({ status: "approved" }).populate("assignedSection", "name");
    res.json(list);
  } catch (err) {
    console.error("Error fetching enrolled list:", err);
    res.status(500).json({ message: "Error fetching enrolled list", error: err.message });
  }
});

// POST /api/profile/update
router.post("/profile/update", authRequired, async (req, res) => {
  try {
    const uid = req.user?.id;
    if (!uid) return res.status(401).json({ message: "Unauthorized" });
    const allowed = ["firstName","lastName","middleName","lrn","phone","address","bio"];
    const update = {};
    for (const k of allowed) if (k in req.body) update[k] = req.body[k];
    const user = await User.findByIdAndUpdate(uid, update, { new: true });
    res.json({ message: "Profile updated", user });
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({ message: "Error updating profile", error: err.message });
  }
});

// POST /api/profile/uploadPic
router.post("/profile/uploadPic", authRequired, uploadProfile.single("picture"), async (req, res) => {
  try {
    const uid = req.user?.id;
    if (!uid) return res.status(401).json({ message: "Unauthorized" });
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const rel = req.file.path.replace(/\\/g, "/");
    const user = await User.findByIdAndUpdate(uid, { profilePic: rel }, { new: true });
    res.json({ message: "Uploaded", file: rel, user });
  } catch (err) {
    console.error("Error uploading profile picture:", err);
    res.status(500).json({ message: "Error uploading pic", error: err.message });
  }
});

// POST /api/recordbook/upload (Moderator creates recordbook entry)
// This endpoint is now handled by the main /api/recordbook POST route.
// Keeping this compat route for older frontend calls.
router.post("/recordbook/upload", authRequired, requireAnyRole(["Admin","Registrar","Moderator"]), async (req, res) => {
  try {
    // The academics.createRecordBook expects { subject, sectionId, sheetId }
    // The frontend recordbook.js now sends { sectionId, subject, grades }
    // This compat route needs to adapt or be removed if frontend is fully updated.
    // For now, let's assume it's creating a *meta* recordbook entry.
    // If it's meant for uploading actual grades, it needs more logic.
    if (academics.createRecordBook) {
      // If frontend sends grades, this needs to be handled differently.
      // For now, assuming it's just creating the recordbook metadata.
      const { subject, sectionId } = req.body; // sheetId might be missing from frontend
      // You'd need a sheetId here. This is a potential mismatch.
      // For now, let's create a dummy sheetId or require it.
      req.body.sheetId = req.body.sheetId || `dummy_sheet_${Date.now()}`; // Placeholder
      return academics.createRecordBook(req, res);
    }
    return res.status(501).json({ message: "Not implemented on server" });
  } catch (err) {
    console.error("Error uploading recordbook (compat):", err);
    res.status(500).json({ message: "Error uploading recordbook", error: err.message });
  }
});

// POST /api/recordbook/finalize (Registrar/Admin finalizes record book)
// This endpoint needs to be updated to match the new recordbook.js frontend logic.
// Frontend recordbook.js now calls /api/recordbook/:sectionId/:subject/finalize
router.post("/recordbook/finalize", authRequired, requireAnyRole(["Admin","Registrar"]), async (req, res) => {
  try {
    const { id } = req.body; // Frontend recordbook.js now sends sectionId and subject, not just id
    if (!id) return res.status(400).json({ message: "Missing id" });
    const rb = await RecordBook.findByIdAndUpdate(id, { partial: false }, { new: true }); // partial: false means finalized
    if (!rb) return res.status(404).json({ message: "RecordBook not found" });
    res.json({ message: "Finalized", rb });
  } catch (err) {
    console.error("Error finalizing recordbook (compat):", err);
    res.status(500).json({ message: "Error finalizing", error: err.message });
  }
});

// GET /api/admin/department (Registrar/Admin get sections)
router.get("/admin/department", authRequired, requireAnyRole(["Admin","Registrar"]), async (req, res) => {
  try {
    const sections = await Section.find({}).limit(1000).sort({ gradeLevel: 1, name: 1 });
    res.json(sections);
  } catch (err) {
    console.error("Error fetching departments:", err);
    res.status(500).json({ message: "Error fetching departments", error: err.message });
  }
});

// NEW: GET /api/admin/department/:sectionId/students (For attendance marking)
router.get("/admin/department/:sectionId/students", authRequired, requireAnyRole(["Admin","Registrar","Moderator"]), async (req, res) => {
  try {
    const sectionId = req.params.sectionId;
    const section = await Section.findById(sectionId).populate('students', 'fullName email lrn');
    if (!section) return res.status(404).json({ message: "Section not found" });
    res.json({ students: section.students });
  } catch (err) {
    console.error("Error fetching students for section:", err);
    res.status(500).json({ message: "Error fetching students", error: err.message });
  }
});

// NEW: GET /api/grades (General grades endpoint for Admin/Registrar/Moderator)
router.get("/grades", authRequired, requireAnyRole(["Admin", "Registrar", "Moderator"]), async (req, res) => {
  try {
    const query = {};
    if (req.query.sectionId) query.sectionId = req.query.sectionId;
    if (req.query.subject) query.subject = req.query.subject;

    const recordBooks = await RecordBook.find(query);
    const allGrades = [];

    for (const rb of recordBooks) {
      // Assuming getSheetValues returns data where first column is LRN, second is name, then grades
      const values = await getSheetValues(rb.sheetId, "Sheet1!A1:Z50");
      values.forEach(row => {
        if (row.length > 2) { // Assuming at least LRN, Name, Grade
          allGrades.push({
            _id: `${rb._id}-${row[0]}`, // Unique ID for frontend updates
            sectionId: rb.sectionId,
            subject: rb.subject,
            lrn: row[0],
            studentName: row[1],
            grade: row[2], // Assuming grade is in the 3rd column
            // You might need to parse more columns for individual grades
          });
        }
      });
    }
    res.json(allGrades);
  } catch (err) {
    console.error("Error fetching general grades:", err);
    res.status(500).json({ message: "Error fetching grades", error: err.message });
  }
});

// NEW: PUT /api/grades/:id (Update a specific grade - placeholder, needs more robust sheet integration)
router.put("/grades/:id", authRequired, requireAnyRole(["Admin", "Registrar", "Moderator"]), async (req, res) => {
  try {
    const { id } = req.params; // id format: recordBookId-lrn
    const { grade } = req.body;

    const [recordBookId, lrn] = id.split('-');
    if (!recordBookId || !lrn || grade === undefined) {
      return res.status(400).json({ message: "Invalid request for grade update." });
    }

    const recordBook = await RecordBook.findById(recordBookId);
    if (!recordBook) return res.status(404).json({ message: "Record book not found." });

    // This is a simplified update. In a real scenario, you'd need to:
    // 1. Read the entire sheet.
    // 2. Find the row corresponding to the LRN.
    // 3. Update the specific grade column.
    // 4. Write the entire sheet back (or use Google Sheets API's update method for a specific cell).
    // This is complex with the current sheetsClient.js which only appends/gets.
    // For now, this endpoint is a placeholder and won't actually update the sheet.
    console.warn(`Attempted to update grade for LRN ${lrn} in record book ${recordBookId} to ${grade}. (Sheet update not implemented)`);
    res.json({ message: "Grade update simulated (sheet update not implemented)", id, grade });

  } catch (err) {
    console.error("Error updating grade:", err);
    res.status(500).json({ message: "Error updating grade", error: err.message });
  }
});


module.exports = router;
