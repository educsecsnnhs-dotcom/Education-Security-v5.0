// controllers/communicationController.js
const Announcement = require("../models/Announcement");
const Event = require("../models/Event");
const Profile = require("../models/Profile");

/** Create announcement */
exports.createAnnouncement = async (req, res) => {
  try {
    const { title, content } = req.body;
    const ann = new Announcement({ title, content, createdBy: req.user.id }); // ✅ JWT user
    await ann.save();
    res.status(201).json({ message: "Announcement created", ann });
  } catch (err) {
    res.status(500).json({ message: "Error announcement", error: err.message });
  }
};

/** Get announcements */
exports.getAnnouncements = async (req, res) => {
  try {
    const anns = await Announcement.find().sort({ createdAt: -1 });
    res.json(anns);
  } catch (err) {
    res.status(500).json({ message: "Error fetching announcements", error: err.message });
  }
};

/** Create event */
exports.createEvent = async (req, res) => {
  try {
    const { title, date, description } = req.body;
    const ev = new Event({ title, date, description, createdBy: req.user.id }); // ✅ JWT user
    await ev.save();
    res.status(201).json({ message: "Event created", ev });
  } catch (err) {
    res.status(500).json({ message: "Error event", error: err.message });
  }
};

/** Update profile (upsert) */
exports.updateProfile = async (req, res) => {
  try {
    const { bio, contact, avatar } = req.body;
    const prof = await Profile.findOneAndUpdate(
      { user: req.user.id }, // ✅ JWT user
      { bio, contact, avatar },
      { upsert: true, new: true }
    );
    res.json({ message: "Profile updated", profile: prof });
  } catch (err) {
    res.status(500).json({ message: "Error updating profile", error: err.message });
  }
};
