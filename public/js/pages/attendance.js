// public/js/pages/attendance.js
// Unified Attendance System: Student (view), Moderator (submit), Registrar/Admin (audit)

document.addEventListener("DOMContentLoaded", () => {
  // Ensure Auth object is available
  if (!window.Auth) {
    console.error("Auth object not loaded. Ensure public/js/auth.js is included before attendance.js.");
    Auth.logout();
    return;
  }

  Auth.requireLogin();
  const user = Auth.getUser(); // Get user from client-side decoded token

  // 🔹 No need for authHeaders or apiFetch here, PageUtils.fetchJson handles it

  const attContainer = document.getElementById("attContainer"); // Main container for attendance display
  const sectionSelect = document.getElementById("attSection"); // Renamed from sectionSelect
  const dateInput = document.getElementById("attDate"); // Renamed from attendanceDate
  const loadAttBtn = document.getElementById("loadAtt"); // Renamed from submitAttendance (for loading)

  if (dateInput) {
    const today = new Date().toISOString().split("T")[0];
    dateInput.value = today;
  }

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
   * 🔹 Student: View my attendance
   */
  async function loadStudentAttendance() {
    try {
      // ✅ Use PageUtils.fetchJson
      const logs = await PageUtils.fetchJson("/api/attendance/my");

      renderTable(
        ["Date", "Section", "Status"],
        logs,
        "attContainer", // Render into attContainer
        (log) => `
          <tr>
            <td>${new Date(log.date).toLocaleDateString()}</td>
            <td>${log.section?.name || "N/A"}</td>
            <td><span class="status ${log.status.toLowerCase()}">${log.status}</span></td>
          </tr>
        `
      );
    } catch (err) {
      console.error("Error loading student attendance:", err);
      attContainer.innerHTML = `<div class="muted small">⚠️ Failed to load attendance</div>`;
    }
  }

  /**
   * 🔹 Moderator: Load section students for marking attendance
   */
  async function loadSectionStudentsForMarking(sectionId, date) {
    try {
      // ✅ Use PageUtils.fetchJson
      const sectionData = await PageUtils.fetchJson(`/api/admin/department/${sectionId}/students`); // Assuming an endpoint to get students in a section
      const students = sectionData.students || [];

      // Fetch existing attendance for this section and date
      const existingAttendance = await PageUtils.fetchJson(`/api/attendance/audit?sectionId=${sectionId}&date=${date}`).catch(() => []);
      const attendanceMap = new Map(existingAttendance.map(att => [att.studentId, att.status]));

      renderTable(
        ["LRN", "Name", "Status"],
        students,
        "attContainer", // Render into attContainer
        (s) => `
          <tr>
            <td>${PageUtils.escapeHtml(s.lrn || "—")}</td>
            <td>${PageUtils.escapeHtml(s.fullName || s.email)}</td>
            <td>
              <select data-student-id="${s._id}" class="statusSelect">
                <option value="Present" ${attendanceMap.get(s._id) === 'Present' ? 'selected' : ''}>Present</option>
                <option value="Absent" ${attendanceMap.get(s._id) === 'Absent' ? 'selected' : ''}>Absent</option>
                <option value="Late" ${attendanceMap.get(s._id) === 'Late' ? 'selected' : ''}>Late</option>
                <option value="Excused" ${attendanceMap.get(s._id) === 'Excused' ? 'selected' : ''}>Excused</option>
              </select>
            </td>
          </tr>
        `
      );

      // Add a submit button for moderator
      if (!document.getElementById('submitAttendanceBtn')) {
        const submitBtn = document.createElement('button');
        submitBtn.id = 'submitAttendanceBtn';
        submitBtn.className = 'btn';
        submitBtn.textContent = 'Submit Attendance';
        submitBtn.style.marginTop = '15px';
        attContainer.appendChild(submitBtn);
        submitBtn.addEventListener('click', submitAttendance);
      }

    } catch (err) {
      console.error("Error loading section students:", err);
      attContainer.innerHTML = `<div class="muted small">⚠️ Failed to load section data</div>`;
    }
  }

  /**
   * 🔹 Moderator: Submit attendance
   */
  async function submitAttendance() {
    const sectionId = sectionSelect.value;
    const date = dateInput.value;

    if (!sectionId || !date) {
      return alert("⚠️ Please select section and date");
    }

    const records = [];
    document.querySelectorAll(".statusSelect").forEach((sel) => {
      records.push({ studentId: sel.dataset.studentId, status: sel.value, sectionId: sectionId, date: date });
    });

    if (!records.length) {
      return alert("⚠️ No students to mark attendance for.");
    }

    try {
      // ✅ Use PageUtils.fetchJson
      await PageUtils.fetchJson("/api/attendance", { // Endpoint is /api/attendance (POST)
        method: "POST",
        body: JSON.stringify({ records }), // Send an array of records
      });
      showToast("✅ Attendance submitted successfully", "success");
      loadSectionStudentsForMarking(sectionId, date); // Reload to show updated status
    } catch (err) {
      console.error("Submit attendance error:", err);
      showToast("❌ Failed to submit attendance: " + (err.message || err), "error");
    }
  }

  /**
   * 🔹 Registrar/Admin: Load audit logs
   */
  async function loadAudit() {
    try {
      // ✅ Use PageUtils.fetchJson
      const logs = await PageUtils.fetchJson("/api/attendance/audit");

      renderTable(
        ["Date", "Section", "Student", "Status"],
        logs,
        "attContainer", // Render into attContainer
        (log) => `
          <tr>
            <td>${new Date(log.date).toLocaleDateString()}</td>
            <td>${log.section?.name || "N/A"}</td>
            <td>${log.student?.fullName || "N/A"}</td>
            <td><span class="status ${log.status.toLowerCase()}">${log.status}</span></td>
          </tr>
        `
      );
    } catch (err) {
      console.error("Error loading audit logs:", err);
      attContainer.innerHTML = `<div class="muted small">⚠️ Failed to load logs</div>`;
    }
  }

  // 🔹 Role-based initialization
  if (user.role === "Student") {
    loadStudentAttendance();
  } else if (user.role === "Moderator") {
    // Fetch sections for moderator
    PageUtils.fetchJson("/api/registrar/sections") // Assuming this endpoint lists sections
      .then((sections) => {
        sectionSelect.innerHTML = `<option value="">-- Select Section --</option>`;
        (sections.data || sections).forEach((sec) => { // Handle potential data wrapper
          sectionSelect.innerHTML += `<option value="${sec._id}">${PageUtils.escapeHtml(sec.name)}</option>`;
        });
      })
      .catch((err) => console.error("Error loading sections:", err));

    loadAttBtn.addEventListener("click", () => {
      if (sectionSelect.value && dateInput.value) {
        loadSectionStudentsForMarking(sectionSelect.value, dateInput.value);
      } else {
        showToast("Please select a section and date.", "info");
      }
    });

  } else if (["Registrar", "Admin", "SuperAdmin"].includes(user.role)) {
    loadAudit();
  }

  // 🔹 Fix logout to use Auth.logout()
  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    Auth.logout();
  });
});
