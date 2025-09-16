//seedAdmin.js

const User = require("./models/User");
const { encryptPassword } = require("./utils/caesar"); // Use encryptPassword from utils

async function seedAdmin() {
  try {
    const email = process.env.SUPERADMIN_EMAIL || "superadmin@school.com";
    const password = process.env.SUPERADMIN_PASSWORD || "superadmin123";

    let existing = await User.findOne({ role: "SuperAdmin" });
    if (existing) {
      console.log("✅ SuperAdmin already exists:", existing.email);
      return;
    }

    // ✅ Encrypt the password using the backend's Caesar cipher before storing
    // This ensures it matches the format of passwords sent from the frontend.
    const encryptedPasswordForSeed = encryptPassword(password);

    const superAdmin = new User({
      email,
      password: encryptedPasswordForSeed, // Store the encrypted password
      role: "SuperAdmin",
      extraRoles: [],
    });

    await superAdmin.save();
    console.log("🎉 SuperAdmin created:", email);
  } catch (err) {
    console.error("❌ Error seeding SuperAdmin:", err.message);
  }
}

module.exports = seedAdmin;
