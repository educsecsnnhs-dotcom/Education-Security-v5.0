// public/js/pages/enrollment.js
document.addEventListener("DOMContentLoaded", () => {
  // Require Auth
  if (!window.Auth || typeof Auth.getUser !== "function" || typeof Auth.getToken !== "function") {
    console.error("Auth.getUser() and Auth.getToken() are required (auth.js)");
    Auth.logout(); // Redirect if Auth is not properly loaded
    return;
  }

  const user = Auth.getUser(); // Get user from client-side decoded token
  // No need to get token explicitly here, PageUtils.fetchJson handles it

  if (!user) { // If user is null after Auth.getUser(), redirect
    Auth.logout();
    return;
  }

  // Elements
  const form = document.getElementById("enrollForm"); // Corrected ID from enrollmentForm
  const msg = document.getElementById("enrollMsg");
  const fullNameField = document.getElementById("fullName"); // Assuming these fields exist in the form
  const lrnField = document.getElementById("lrn");
  const yearField = document.getElementById("yearLevel");
  const levelSelect = document.getElementById("levelSelect");
  const strandSection = document.getElementById("strandSection");
  const strandSelect = document.getElementById("strandSelect");
  const logoutBtn = document.getElementById("logoutBtn");

  const juniorStrands = ["STE", "Regular", "TechVoc", "Sports", "SPA"];
  const seniorStrands = ["STEM", "CIT", "GAS", "HUMMS", "TVL", "ABM"];
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  // Auto-fill from logged-in user (if fields exist in the HTML)
  if (fullNameField) fullNameField.value = user.fullName || "";
  if (lrnField) lrnField.value = user.lrn || "";

  // Level → Strands
  if (levelSelect && strandSelect && strandSection) {
    levelSelect.addEventListener("change", (e) => {
      strandSelect.innerHTML = "";
      if (e.target.value === "junior") {
        juniorStrands.forEach((s) =>
          strandSelect.insertAdjacentHTML("beforeend", `<option value="${s}">${PageUtils.escapeHtml(s)}</option>`)
        );
        strandSection.style.display = "block";
      } else if (e.target.value === "senior") {
        seniorStrands.forEach((s) =>
          strandSelect.insertAdjacentHTML("beforeend", `<option value="${s}">${PageUtils.escapeHtml(s)}</option>`)
        );
        strandSection.style.display = "block";
      } else {
        strandSection.style.display = "none";
      }
    });
  }


  // File size check
  function validateFiles(formData) {
    for (const [key, value] of formData.entries()) {
      if (value instanceof File && value.size > MAX_FILE_SIZE) {
        alert(`⚠️ File "${value.name}" exceeds 5MB limit.`);
        return false;
      }
    }
    return true;
  }

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      Auth.logout(); // ✅ Use Auth.logout()
    });
  }

  // Submit
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const formData = new FormData(form);
      // Ensure fullName and lrn are always present, even if not in form directly
      formData.append("name", user.fullName || user.email); // Use 'name' as per Enrollment model
      formData.append("lrn", user.lrn || ''); // LRN is required by model, ensure it's there

      // Add schoolYear (dynamic later)
      formData.append("schoolYear", "2025-2026");

      // Validate year level
      const yearLevel = yearField ? yearField.value.trim() : '';
      if (!yearLevel) {
        alert("⚠️ Please enter your Year Level (e.g., 7, 8, 11, 12).");
        return;
      }
      formData.set("yearLevel", yearLevel);

      // Validate level + strand
      const level = levelSelect ? levelSelect.value : '';
      if (!level) {
        alert("⚠️ Please select a Level (junior/senior).");
        return;
      }
      formData.set("level", level);

      const strand = strandSelect ? strandSelect.value : '';
      if ((level === "junior" || level === "senior") && !strand) {
        alert("⚠️ Please select a Strand.");
        return;
      }
      if (strand) {
        formData.set("strand", strand);
      }

      // Validate files
      if (!validateFiles(formData)) return;

      msg.textContent = "Submitting…";
      msg.className = "small muted"; // Reset class

      try {
        // ✅ Use PageUtils.fetchJson for multipart/form-data
        // Note: PageUtils.fetchJson automatically adds Authorization header.
        // For FormData, do NOT set 'Content-Type': 'application/json'
        const res = await PageUtils.fetchJson("/api/enrollment", { // Endpoint is /api/enrollment (POST)
          method: "POST",
          body: formData, // FormData is sent directly
          headers: {} // Explicitly empty headers to let browser set Content-Type for FormData
        });

        // PageUtils.fetchJson throws on !res.ok, so if we reach here, it's successful
        msg.textContent = "✅ Enrollment submitted! Wait for registrar approval.";
        msg.className = "small success";
        setTimeout(() => (window.location.href = "/html/welcome.html"), 1200); // Standardized redirect
      } catch (err) {
        console.error("Enrollment error:", err);
        msg.textContent = "❌ Failed to submit: " + (err.message || err);
        msg.className = "small error";
      }
    });
  }
});
