// routes/auth.js
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { authRequired } = require("../middleware/authMiddleware");

// Register new user
router.post("/register", authController.register);

// Login → issues JWT
router.post("/login", authController.login);

// Logout → client discards token
router.post("/logout", authController.logout);

// Session check → requires valid JWT
router.get("/me", authRequired, authController.me);

module.exports = router;
