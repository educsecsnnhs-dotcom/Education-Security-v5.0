// models/Profile.js
const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    avatar: { type: String, default: null }, // profile picture path
    bio: { type: String, default: "" },
    contactNumber: { type: String, default: "" },
    address: { type: String, default: "" },
    guardianName: { type: String },   // for students
    guardianContact: { type: String } // optional parent/guardian info
  },
  { timestamps: true }
);

module.exports = mongoose.model("Profile", profileSchema);
