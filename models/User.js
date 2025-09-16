const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  fullName: { // Added fullName
    type: String,
    default: "",
  },
  lrn: { // Added LRN
    type: String,
    unique: true,
    sparse: true, // Allows null values to not violate unique constraint
  },
  role: {
    type: String,
    enum: ["User", "Student", "Moderator", "Admin", "SuperAdmin", "Registrar", "SSG"], // Added Registrar and SSG to main roles
    default: "User",
  },
  extraRoles: {
    type: [String], // for SSG or other add-ons (e.g., if a Student is also SSG)
    default: [],
  },
  locked: { // Added locked status for SuperAdmin control
    type: Boolean,
    default: false,
  },
  profilePic: { // Added profile picture path
    type: String,
    default: null,
  },
});

module.exports = mongoose.model("User", userSchema);
