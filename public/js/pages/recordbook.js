// public/js/pages/recordbook.js
// Unified Record Book Management for Student, Moderator, Registrar, SuperAdmin

document.addEventListener("DOMContentLoaded", () => {
  // ✅ Require login & token
  if (!window.Auth || typeof Auth.getUser !== "function" || typeof Auth.getToken !== "function") {
    console.error("Auth.getUser() and Auth.getToken() are required (auth.js)");
    Auth.logout(); // Redirect if Auth is not properly loaded
    return;
  }

  Auth.requireLogin();
  const user = Auth.getUser(); // Get user from client-side decoded token
  // No need to get token explicitly here, PageUtils.fetchJson handles it

  if (!user) {
    Auth.logout();
    return;
  }

  // DOM references
  const recordContainer = document.getElementById("recordContainer"); // Main container for record book
  const selectSection = document.getElementById("selectSection"); // Renamed from sectionSelect
  const selectSubject = document.getElementById("selectSubject"); // Renamed from subjectInput (now a select)
  const loadRecordBtn = document.getElementById("loadRecord"); // Renamed from uploadBtn (for loading)
  // const finalizeBtn = document.getElementById("finalizeBtn"); // Assuming this button exists for Registrar/SuperAdmin
  // const studentTable = document.getElementById("studentGradesTable"); // Assuming this table exists for Student view

  // Helper to render a table
  function renderTable(headers, data, containerId, rowRenderer) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!data || data.length === 0) {
      container.innerHTML = `<div class="muted small">No records found.</div>`;
      return;
    }

    let tableHtml = `<table class="att-table"><thead><tr>`;
    headers.forEach(h => tableHtml += `<th>${PageUtils.escapeHtml(h)}</th>`);
    tableHtml += `</tr></thead><tbody>`;

    data.forEach(item => {
      tableHtml += rowRenderer(item);
    });

    tableHtml += `</tbody></table>`;
    container.innerHTML = tableHtml;
  }

  /**
   * 🔹 Student: View my grades
   */
  async function loadMyGrades() {
    try {
      // ✅ Use PageUtils.fetchJson
      const grades = await PageUtils.fetchJson("/api/student/grades");

      renderTable(
        ["Section", "Subject", "Grades"],
        grades,
        "recordContainer", // Render into recordContainer
        (g) => `
          <tr>
            <td>${PageUtils.escapeHtml(g.section || 'N/A')}</td>
            <td>${PageUtils.escapeHtml(g.subject || 'N/A')}</td>
            <td>${PageUtils.escapeHtml(Array.isArray(g.grades) ? g.grades.join(", ") : g.grade || "—")}</td>
          </tr>
        `
      );
    } catch (err) {
      console.error("Error loading grades:", err);
      recordContainer.innerHTML = `<div class="muted small">⚠️ Failed to load grades</div>`;
    }
  }

  /**
   * 🔹 Moderator: Load section students for grade entry
   */
  async function loadSectionForGrades(sectionId, subject) {
    try {
      // Assuming an endpoint to get students in a section and their existing grades for a subject
      // This might need a new backend endpoint like /api/recordbook/section/:sectionId/students-with-grades?subject=...
      const studentsWithGrades = await PageUtils.fetchJson(`/api/recordbook/section/${sectionId}/students-with-grades?subject=${encodeURIComponent(subject)}`);
      const students = studentsWithGrades.students || [];

      renderTable(
        ["LRN", "Name", "Grade"],
        students,
        "recordContainer", // Render into recordContainer
        (s) => `
          <tr>
            <td>${PageUtils.escapeHtml(s.lrn || "—")}</td>
            <td>${PageUtils.escapeHtml(s.fullName || s.email)}</td>
            <td><input type="number" min="0" max="100" class="gradeInput" data-student-id="${s._id}" value="${s.grade || ''}" placeholder="Enter grade"></td>
          </tr>
        `
      );

      // Add a submit button for moderator
      if (!document.getElementById('submitGradesBtn')) {
        const submitBtn = document.createElement('button');
        submitBtn.id = 'submitGradesBtn';
        submitBtn.className = 'btn';
        submitBtn.textContent = 'Submit Grades';
        submitBtn.style.marginTop = '15px';
        recordContainer.appendChild(submitBtn);
        submitBtn.addEventListener('click', uploadGrades);
      }

    } catch (err) {
      console.error("Error loading section for grades:", err);
      recordContainer.innerHTML = `<div class="muted small">⚠️ Failed to load section data</div>`;
    }
  }

  /**
   * 🔹 Moderator: Submit grades
   */
  async function uploadGrades() {
    const sectionId = selectSection.value;
    const subject = selectSubject.value; // Get subject from select element

    if (!sectionId || !subject) {
      return alert("⚠️ Please select a section and subject");
    }

    const grades = [];
    document.querySelectorAll(".gradeInput").forEach((input) => {
      const val = input.value.trim();
      if (val) {
        grades.push({ studentId: input.dataset.studentId, grade: Number(val) });
      }
    });

    if (!grades.length) {
      return alert("⚠️ No grades entered");
    }

    try {
      // ✅ Use PageUtils.fetchJson
      await PageUtils.fetchJson("/api/recordbook", { // Endpoint is /api/recordbook (POST)
        method: "POST",
        body: JSON.stringify({ sectionId, subject, grades }), // Send grades array
      });
      showToast("✅ Grades uploaded successfully!", "success");
      loadSectionForGrades(sectionId, subject); // Reload to show updated grades
    } catch (err) {
      console.error("Upload grades error:", err);
      showToast("❌ Failed to upload grades: " + (err.message || err), "error");
    }
  }

  /**
   * 🔹 Registrar: Finalize / Lock record book
   */
  async function finalizeRecordBook() {
    const sectionId = selectSection.value;
    const subject = selectSubject.value;

    if (!sectionId || !subject) {
      return alert("⚠️ Please select section and subject to finalize");
    }

    if (!confirm("⚠️ Finalizing will lock this record book. Proceed?")) return;

    try {
      // ✅ Use PageUtils.fetchJson
      // Assuming an endpoint like /api/recordbook/:sectionId/:subject/finalize
      await PageUtils.fetchJson(`/api/recordbook/${sectionId}/${encodeURIComponent(subject)}/finalize`, {
        method: "POST",
      });
      showToast("✅ Record book finalized successfully!", "success");
    } catch (err) {
      console.error("Finalize error:", err);
      showToast("❌ Failed to finalize record book: " + (err.message || err), "error");
    }
  }

  // 🔹 Role-based initialization
  if (user.role === "Student") {
    loadMyGrades();
  }

  if (user.role === "Moderator") {
    // Fetch sections for moderator
    PageUtils.fetchJson("/api/registrar/sections") // Assuming this endpoint lists sections
      .then((sections) => {
        selectSection.innerHTML = `<option value="">-- Select Section --</option>`;
        (sections.data || sections).forEach((sec) => {
          selectSection.innerHTML += `<option value="${sec._id}">${PageUtils.escapeHtml(sec.name)}</option>`;
        });
      })
      .catch((err) => console.error("Error loading sections:", err));

    // Fetch subjects (assuming a list of subjects is available)
    // For now, let's hardcode some subjects or fetch from an API if available
    const subjects = ["Mathematics", "Science", "English", "Filipino", "History"]; // Placeholder
    selectSubject.innerHTML = `<option value="">-- Select Subject --</option>`;
    subjects.forEach(sub => {
      selectSubject.innerHTML += `<option value="${sub}">${PageUtils.escapeHtml(sub)}</option>`;
    });

    loadRecordBtn.addEventListener("click", () => {
      if (selectSection.value && selectSubject.value) {
        loadSectionForGrades(selectSection.value, selectSubject.value);
      } else {
        showToast("Please select a section and subject.", "info");
      }
    });
  }

  if (["Registrar", "SuperAdmin"].includes(user.role)) {
    // Assuming a finalize button exists in the HTML for these roles
    const finalizeBtn = document.getElementById("finalizeBtn");
    if (finalizeBtn) {
      finalizeBtn.addEventListener("click", finalizeRecordBook);
    }
  }

  // 🔹 Fix logout to use Auth.logout()
  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    Auth.logout();
  });
});
