// models/RecordBook.js
const mongoose = require("mongoose");

const recordBookSchema = new mongoose.Schema(
  {
    sectionId: { type: mongoose.Schema.Types.ObjectId, ref: "Section", required: true },
    subject: { type: String, required: true },
    sheetId: { type: String, required: true }, // Google Sheet ID
    partial: { type: Boolean, default: false }, // false = finalized
  },
  { timestamps: true }
);

module.exports = mongoose.model("RecordBook", recordBookSchema);
