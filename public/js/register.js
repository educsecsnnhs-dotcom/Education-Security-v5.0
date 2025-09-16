// public/js/register.js
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registerForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!email || !password) {
      alert("Please fill in all fields");
      return;
    }

    // ✅ Encrypt password using the global Auth.caesarEncrypt before sending
    const encryptedPassword = Auth.caesarEncrypt(password);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: encryptedPassword }) // Send encrypted password
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Registration failed");

      alert("✅ Registration successful! Please log in.");
      window.location.href = "../html/login.html"; // Standardized redirect
    } catch (err) {
      console.error("Registration error:", err);
      alert("❌ " + err.message);
    }
  });

  // Password toggle
  const toggle = document.getElementById("togglePassword");
  const passwordInput = document.getElementById("password");
  if (toggle && passwordInput) {
    toggle.addEventListener("click", () => {
      const type = passwordInput.type === "password" ? "text" : "password";
      passwordInput.type = type;
      toggle.textContent = type === "password" ? "👁️" : "🙈";
    });
  }
});
