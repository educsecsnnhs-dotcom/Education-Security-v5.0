// models/Enrollee.js
const mongoose = require("mongoose");

const enrolleeSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    lrn: { type: String, required: true, unique: true },
    gradeLevel: { type: Number, required: true }, // e.g. 7–12
    strand: { type: String },
    schoolYear: { type: String, required: true },
    status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
    assignedSection: { type: mongoose.Schema.Types.ObjectId, ref: "Section" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Enrollee", enrolleeSchema);
