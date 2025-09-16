// public/js/index.js (frontend helper script for splash screen)

// No need for caesarEncrypt here, it's in auth.js
// No need for apiFetch or logout handler here, it's in auth.js and page-utils.js

document.addEventListener("DOMContentLoaded", async () => {
  // Ensure Auth object is available
  if (!window.Auth) {
    console.error("Auth object not loaded. Ensure public/js/auth.js is included before index.js.");
    // Fallback to login if Auth is not available
    window.location.href = "/html/login.html";
    return;
  }

  try {
    // ✅ Ask server if session exists using Auth.getToken()
    const token = Auth.getToken();
    const headers = token ? { "Authorization": `Bearer ${token}` } : {};

    const res = await fetch("/api/auth/me", { headers });

    setTimeout(() => {
      if (res.ok) {
        window.location.href = "/html/welcome.html"; // Standardized redirect
      } else {
        window.location.href = "/html/login.html"; // Standardized redirect
      }
    }, 1500); // ⏳ small delay for splash effect
  } catch (err) {
    console.error("Auth check failed:", err);
    window.location.href = "/html/login.html"; // Standardized redirect
  }
});
