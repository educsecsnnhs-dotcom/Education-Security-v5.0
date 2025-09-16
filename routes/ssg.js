// routes/ssg.js
const express = require("express");
const router = express.Router();
const SSG = require("../models/SSG"); // Use the combined SSG model
const Event = require("../models/Event"); // Still use separate Event model for general events
const User = require("../models/User"); // For user lookups
const { authRequired, requireAnyRole, requireRole } = require("../middleware/authMiddleware");

// Helper to get the main SSG document, creating it if it doesn't exist
async function getOrCreateSSGDoc() {
  let ssgDoc = await SSG.findOne();
  if (!ssgDoc) {
    ssgDoc = new SSG({});
    await ssgDoc.save();
  }
  return ssgDoc;
}

/** Create election */
router.post("/election", authRequired, requireAnyRole(["SSG", "Registrar", "SuperAdmin"]), async (req, res) => {
  try {
    const { title, schoolYear, startDate, endDate, positions } = req.body; // Added more fields for election
    if (!title || !schoolYear || !startDate || !endDate) {
      return res.status(400).json({ message: "Title, school year, start date, and end date are required for election." });
    }

    const ssgDoc = await getOrCreateSSGDoc();

    const newElection = {
      title,
      schoolYear,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isActive: true, // Default to active
      candidates: [], // Start with no candidates
    };

    ssgDoc.elections.push(newElection);
    await ssgDoc.save();
    res.status(201).json({ message: "Election created", election: newElection });
  } catch (err) {
    console.error("Error creating election:", err);
    res.status(500).json({ message: "Error creating election", error: err.message });
  }
});

/** Nominate candidate (student) */
router.post("/nominate", authRequired, requireAnyRole(["SSG", "Registrar", "SuperAdmin"]), async (req, res) => {
  try {
    const { electionId, userId, position, fullName, gradeLevel } = req.body; // Added fullName, gradeLevel
    if (!electionId || !userId || !position || !fullName || !gradeLevel) {
      return res.status(400).json({ message: "Election ID, User ID, Position, Full Name, and Grade Level are required." });
    }

    const ssgDoc = await getOrCreateSSGDoc();
    const election = ssgDoc.elections.id(electionId);
    if (!election) return res.status(404).json({ message: "Election not found" });

    // Check if user is already a candidate for this position in this election
    const existingCandidate = election.candidates.find(c => c.user?.toString() === userId && c.position === position);
    if (existingCandidate) {
      return res.status(400).json({ message: "User is already a candidate for this position." });
    }

    const newCandidate = {
      user: userId, // Store user ID
      fullName,
      gradeLevel,
      position,
      votes: 0,
      createdBy: req.user.id, // User who nominated
    };

    election.candidates.push(newCandidate);
    await ssgDoc.save();
    res.json({ message: "Candidate nominated", candidate: newCandidate });
  } catch (err) {
    console.error("Error nominating candidate:", err);
    res.status(500).json({ message: "Error nominating candidate", error: err.message });
  }
});

/** Cast vote */
router.post("/vote", authRequired, requireRole("Student"), async (req, res) => {
  try {
    const { electionId, candidateId } = req.body;
    if (!electionId || !candidateId) {
      return res.status(400).json({ message: "Election ID and Candidate ID are required." });
    }

    const ssgDoc = await getOrCreateSSGDoc();
    const election = ssgDoc.elections.id(electionId);
    if (!election) return res.status(404).json({ message: "Election not found" });

    // Check if election is active
    if (!election.isActive || new Date() < election.startDate || new Date() > election.endDate) {
      return res.status(400).json({ message: "Voting is not currently active for this election." });
    }

    // Check if user has already voted in this election
    const hasVoted = ssgDoc.votes.some(vote =>
      vote.electionId.toString() === electionId && vote.voter.toString() === req.user.id
    );
    if (hasVoted) {
      return res.status(400).json({ message: "You have already voted in this election." });
    }

    const candidate = election.candidates.id(candidateId);
    if (!candidate) return res.status(404).json({ message: "Candidate not found." });

    // Increment candidate's vote count
    candidate.votes = (candidate.votes || 0) + 1;

    // Record the vote in the main SSG document's votes array
    ssgDoc.votes.push({
      electionId: election._id,
      candidateId: candidate._id,
      voter: req.user.id,
      castAt: new Date(),
    });

    await ssgDoc.save();
    res.json({ message: "Vote recorded", election });
  } catch (err) {
    console.error("Error casting vote:", err);
    res.status(500).json({ message: "Error voting", error: err.message });
  }
});

/** Create SSG event */
router.post("/event", authRequired, requireAnyRole(["SSG", "Registrar", "SuperAdmin"]), async (req, res) => {
  try {
    const { title, date, description, location, schoolYear } = req.body;
    if (!title || !date || !schoolYear) {
      return res.status(400).json({ message: "Title, date, and school year are required for event." });
    }

    const ssgDoc = await getOrCreateSSGDoc();

    const newEvent = {
      title,
      date: new Date(date),
      description: description || '',
      location: location || '',
      schoolYear,
      createdBy: req.user.id,
    };

    ssgDoc.events.push(newEvent);
    await ssgDoc.save();
    res.status(201).json({ message: "SSG event created", event: newEvent });
  } catch (err) {
    console.error("Error creating SSG event:", err);
    res.status(500).json({ message: "Error creating SSG event", error: err.message });
  }
});

// GET all elections
router.get("/elections", async (req, res) => {
  try {
    const ssgDoc = await SSG.findOne().populate('elections.candidates.user', 'fullName email'); // Populate candidate user info
    if (!ssgDoc) return res.json([]);
    res.json(ssgDoc.elections);
  } catch (err) {
    console.error("Error fetching elections:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET all SSG members (candidates from all elections, or a dedicated SSG members list if you add one)
router.get("/members", async (req, res) => {
  try {
    const ssgDoc = await SSG.findOne().populate('elections.candidates.user', 'fullName email lrn');
    if (!ssgDoc) return res.json([]);

    // Collect unique candidates from all elections
    const membersMap = new Map();
    ssgDoc.elections.forEach(election => {
      election.candidates.forEach(candidate => {
        if (candidate.user) {
          membersMap.set(candidate.user._id.toString(), {
            _id: candidate.user._id,
            fullName: candidate.user.fullName || candidate.fullName,
            email: candidate.user.email,
            lrn: candidate.user.lrn,
            position: candidate.position,
            // You might want to add which election they were a candidate in
          });
        }
      });
    });

    // Also fetch users with 'SSG' role directly if they are not necessarily candidates
    const ssgRoleUsers = await User.find({ role: 'SSG' }).select('fullName email lrn');
    ssgRoleUsers.forEach(user => {
      if (!membersMap.has(user._id.toString())) {
        membersMap.set(user._id.toString(), {
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          lrn: user.lrn,
          position: 'SSG Member', // Default position for direct SSG role
        });
      }
    });

    res.json(Array.from(membersMap.values()));
  } catch (err) {
    console.error("Error fetching SSG members:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET all SSG events
router.get("/events", async (req, res) => {
  try {
    const ssgDoc = await SSG.findOne().populate('events.createdBy', 'fullName email');
    if (!ssgDoc) return res.json([]);
    res.json(ssgDoc.events);
  } catch (err) {
    console.error("Error fetching SSG events:", err);
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
