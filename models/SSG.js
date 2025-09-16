const mongoose = require("mongoose");

/**
 * SSG Schema — combines elections, candidates, events, posts, and votes.
 */
const candidateSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Reference to User model
  fullName: { type: String, required: true },
  gradeLevel: { type: Number, required: true },
  position: { type: String, required: true }, // e.g., President, VP
  votes: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
});

const electionSchema = new mongoose.Schema({
  title: { type: String, required: true }, // e.g., "SSG Election 2025"
  description: { type: String }, // Added description
  schoolYear: { type: String, required: true },
  candidates: [candidateSchema],
  isActive: { type: Boolean, default: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
});

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  date: { type: Date, required: true },
  location: { type: String },
  schoolYear: { type: String, required: true }, // Keeps consistent with enrollment
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
});

const postSchema = new mongoose.Schema({
  content: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
});

const voteSchema = new mongoose.Schema({
  electionId: { type: mongoose.Schema.Types.ObjectId, required: true }, // Reference to a specific election within SSG.elections
  candidateId: { type: mongoose.Schema.Types.ObjectId, required: true }, // Reference to a specific candidate within SSG.elections[].candidates
  voter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  castAt: { type: Date, default: Date.now },
});

const ssgSchema = new mongoose.Schema(
  {
    elections: [electionSchema],
    events: [eventSchema],
    posts: [postSchema], // For general SSG posts/announcements
    votes: [voteSchema], // Centralized vote records
  },
  { timestamps: true }
);

module.exports = mongoose.model("SSG", ssgSchema);
