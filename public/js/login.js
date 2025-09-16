// public/js/login.js
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!email || !password) {
      alert("Please enter email and password");
      return;
    }

    // ✅ Encrypt password using the global Auth.caesarEncrypt before sending
    const encryptedPassword = Auth.caesarEncrypt(password);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: encryptedPassword }) // Send encrypted password
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Login failed");

      if (data.token) {
        Auth.saveToken(data.token); // Use Auth object to save token
        // Optionally save user data from payload if needed for immediate UI updates
        // Auth.setUser(data.user); // If Auth object had a setUser method
      }

      // Redirect based on role or to a default welcome page
      const userRole = data.user?.role;
      switch (userRole) {
        case "Registrar": window.location.href = "/html/pages/registrar.html"; break;
        case "Admin": window.location.href = "/html/pages/management.html"; break; // Assuming management.html is for Admin
        case "Moderator": window.location.href = "/html/pages/recordbook.html"; break; // Assuming recordbook.html is for Moderator
        case "Student": window.location.href = "/html/pages/grades.html"; break; // Assuming grades.html is for Student
        case "SSG": window.location.href = "/html/pages/ssg.html"; break;
        case "SuperAdmin": window.location.href = "/html/welcome.html"; break; // SuperAdmin can go to welcome or a specific admin page
        default: window.location.href = "/html/welcome.html"; // Default for 'User' role or others
      }
    } catch (err) {
      console.error("Login error:", err);
      alert("❌ " + err.message);
    }
  });

  // 👁️ toggle password visibility
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
