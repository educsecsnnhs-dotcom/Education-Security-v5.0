// models/Attendance.js
const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sectionId: { type: mongoose.Schema.Types.ObjectId, ref: "Section", required: true },
    date: { type: Date, required: true },
    status: { type: String, enum: ["Present", "Absent", "Late"], required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Attendance", attendanceSchema);
