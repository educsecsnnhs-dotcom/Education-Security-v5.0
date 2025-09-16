// models/Class.js
const mongoose = require("mongoose");

const classSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // e.g. "Math 7-A"
    subject: { type: String, required: true }, // e.g. "Mathematics"
    gradeLevel: { type: Number, required: true },
    strand: { type: String }, // optional, for SHS
    schoolYear: { type: String, required: true },
    section: { type: mongoose.Schema.Types.ObjectId, ref: "Section", required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // usually Moderator
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Class", classSchema);
