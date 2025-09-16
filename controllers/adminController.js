// controllers/adminController.js
const User = require("../models/User");
const Section = require("../models/Section");

/**
 * Assign a Moderator (teacher) - Admin scopes by department in real deployments
 */
exports.assignModerator = async (req, res) => {
  try {
    const { userId, sectionId } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.role = "Moderator";
    await user.save();

    // Optionally set as adviser for a section
    if (sectionId) {
      const sec = await Section.findById(sectionId);
      if (sec) {
        sec.adviser = user._id;
        await sec.save();
      }
    }

    res.json({ message: "Moderator assigned", user });
  } catch (err) {
    res.status(500).json({ message: "Error assigning moderator", error: err.message });
  }
};
