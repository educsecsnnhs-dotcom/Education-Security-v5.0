// 🔹 Caesar Cipher (MUST match backend /utils/caesar.js)
// IMPORTANT: This function should be identical to the one in utils/caesar.js on the backend.
// The shift value should ideally come from a global config or be consistent.
// For now, we'll hardcode the default shift of 3, assuming CIPHER_KEY=3 in .env
function caesarEncrypt(str, shift = 3) {
  if (str === undefined || str === null) return "";
  return String(str).split("").map(char => {
    const code = char.charCodeAt(0);
    // Uppercase letters
    if (code >= 65 && code <= 90) return String.fromCharCode(((code - 65 + shift) % 26) + 65);
    // Lowercase letters
    if (code >= 97 && code <= 122) return String.fromCharCode(((code - 97 + shift) % 26) + 97);
    // Digits
    if (code >= 48 && code <= 57) return String.fromCharCode(((code - 48 + shift) % 10) + 48);
    // Other characters pass through
    return char;
  }).join("");
}

// 🔹 Auth object for JWT handling
const Auth = {
  saveToken(token) {
    localStorage.setItem("edusec_token", token);
  },
  getToken() {
    return localStorage.getItem("edusec_token");
  },
  clearToken() {
    localStorage.removeItem("edusec_token");
  },
  async logout() {
    Auth.clearToken();
    // No server-side logout needed for stateless JWT, just redirect
    window.location.href = "/html/login.html"; // Standardized redirect
  },
  // Helper to get user info from token (client-side decode)
  getUser() {
    const token = Auth.getToken();
    if (!token) return null;
    try {
      // This is a client-side decode, not verification.
      // It's for UI purposes only. Actual verification happens on backend.
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error("Error decoding token:", e);
      return null;
    }
  },
  // Simple check if user is logged in (based on token presence)
  isLoggedIn() {
    return !!Auth.getToken();
  },
  // Redirects to login if not logged in
  requireLogin() {
    if (!Auth.isLoggedIn()) {
      window.location.href = "/html/login.html";
    }
  },

  // 🔹 Attach Caesar cipher so login.js can use Auth.caesarEncrypt()
  caesarEncrypt: caesarEncrypt
};

// Expose Auth globally for other scripts
window.Auth = Auth;

/* ---------------------- 🔹 Forms (Moved to specific page scripts) ---------------------- */
// The login and register form handling logic is now moved to public/js/login.js and public/js/register.js
// to avoid conflicts and ensure proper script loading order.
// The logout button handler remains here for global access.
document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => Auth.logout());
  }
});
