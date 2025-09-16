// controllers/authController.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { encryptPassword, decryptPassword } = require("../utils/caesar");

// REGISTER
exports.register = async (req, res) => {
  try {
    const { email, password } = req.body; // Password received here is already frontend-encrypted
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // ✅ Store the password as received (it's already frontend-encrypted)
    // If you wanted double encryption, you'd do: const doubleEncryptedPass = encryptPassword(password);
    // But for consistency with frontend sending encrypted, we store what's sent.
    const newUser = new User({
      email,
      password: password, // Store the already frontend-encrypted password
      role: "User",
      extraRoles: [],
    });

    await newUser.save();
    res.status(201).json({ message: "✅ Registration successful" });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// LOGIN
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body; // Password received here is already frontend-encrypted
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // ✅ Compare the received (frontend-encrypted) password directly with the stored password
    // This assumes the stored password is also frontend-encrypted.
    // If the stored password was backend-encrypted, you'd decrypt user.password first.
    if (user.password !== password) { // Direct comparison of encrypted strings
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const payload = {
      id: user._id,
      email: user.email,
      role: user.role,
      extraRoles: user.extraRoles,
      fullName: user.fullName, // Include fullName for frontend display
      lrn: user.lrn, // Include LRN if available
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "8h", // ✅ Increased token expiration to 8 hours
    });

    res.json({ message: "✅ Login successful", token, user: payload });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// LOGOUT (JWT is stateless — client just discards token)
exports.logout = (req, res) => {
  res.json({ message: "✅ Logged out (client must delete token)" });
};

// SESSION CHECK (decode token)
exports.me = (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Not logged in" });
  }
  res.json(req.user);
};
