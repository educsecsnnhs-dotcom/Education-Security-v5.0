// models/Section.js
const mongoose = require("mongoose");

const sectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true }, // e.g. "7-STE-A"
    gradeLevel: { type: Number, required: true }, // 7–12
    strand: { type: String, required: true },
    schoolYear: { type: String, required: true },
    capacity: { type: Number, default: 40 },

    students: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    adviser: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    distribution: {
      high: { type: Number, default: 0 },
      mid: { type: Number, default: 0 },
      low: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

sectionSchema.methods.hasSpace = function () {
  return this.students.length < this.capacity;
};

module.exports = mongoose.model("Section", sectionSchema);
