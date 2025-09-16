// controllers/ssgController.js
const SSG = require("../models/SSG");
const Event = require("../models/Event");
const User = require("../models/User");

/** Create election */
exports.createElection = async (req, res) => {
  try {
    const { name, positions } = req.body;
    const e = new SSG({ type: "election", name, positions, createdBy: req.user.id }); // ✅ JWT user
    await e.save();
    res.status(201).json({ message: "Election created", election: e });
  } catch (err) {
    res.status(500).json({ message: "Error creating election", error: err.message });
  }
};

/** Nominate candidate (student) */
exports.nominateCandidate = async (req, res) => {
  try {
    const { electionId, userId, position } = req.body;
    const election = await SSG.findById(electionId);
    if (!election) return res.status(404).json({ message: "Election not found" });

    election.candidates.push({ user: userId, position, votes: 0 });
    await election.save();
    res.json({ message: "Candidate nominated", election });
  } catch (err) {
    res.status(500).json({ message: "Error nominating", error: err.message });
  }
};

/** Cast vote */
exports.castVote = async (req, res) => {
  try {
    const { electionId, candidateId } = req.body;
    const election = await SSG.findById(electionId);
    if (!election) return res.status(404).json({ message: "Election not found" });

    if (election.voters.includes(req.user.id)) { // ✅ JWT user
      return res.status(400).json({ message: "You already voted" });
    }

    const cand = election.candidates.id(candidateId);
    if (!cand) return res.status(404).json({ message: "Candidate not found" });

    cand.votes = (cand.votes || 0) + 1;
    election.voters.push(req.user.id); // ✅ JWT user
    await election.save();
    res.json({ message: "Vote recorded", election });
  } catch (err) {
    res.status(500).json({ message: "Error voting", error: err.message });
  }
};

/** Create SSG event */
exports.createSSGEvent = async (req, res) => {
  try {
    const { title, date } = req.body;
    const ev = new Event({ title, date, createdBy: req.user.id, type: "SSG" }); // ✅ JWT user
    await ev.save();
    res.status(201).json({ message: "SSG event created", event: ev });
  } catch (err) {
    res.status(500).json({ message: "Error creating SSG event", error: err.message });
  }
};
