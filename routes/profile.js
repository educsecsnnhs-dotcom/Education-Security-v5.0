// routes/profile.js
const express = require("express");
const router = express.Router();
const comm = require("../controllers/communicationController");
const { authRequired } = require("../middleware/authMiddleware");

router.post("/", authRequired, comm.updateProfile);
router.get("/", authRequired, comm.getAnnouncements); // placeholder — implement getProfile if needed

module.exports = router;

