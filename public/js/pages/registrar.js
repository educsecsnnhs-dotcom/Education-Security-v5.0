// public/js/pages/registrar.js
document.addEventListener("DOMContentLoaded", () => {
  // Ensure Auth object is available
  if (!window.Auth) {
    console.error("Auth object not loaded. Ensure public/js/auth.js is included before registrar.js.");
    Auth.logout();
    return;
  }

  Auth.requireLogin();
  const user = Auth.getUser(); // Get user from client-side decoded token

  if (!user || user.role !== "Registrar") { // Ensure only Registrar can access
    Auth.logout();
    return;
  }

  const el = id => document.getElementById(id);
  const enrolleeList = el('enrolleeList');
  const enrolledList = el('enrolledList');

  // Helper to render enrollee items
  function renderEnrolleeItem(enrollee) {
    const div = document.createElement('div');
    div.className = 'enrollee-item'; // Custom class for enrollees
    const name = enrollee.name || enrollee.fullName || enrollee.email || 'N/A';
    const lrn = enrollee.lrn || 'N/A';
    const level = enrollee.level || 'N/A';
    const strand = enrollee.strand || 'N/A';
    const schoolYear = enrollee.schoolYear || 'N/A';
    const yearLevel = enrollee.yearLevel || 'N/A';

    div.innerHTML = `
      <div style="font-weight:600">${PageUtils.escapeHtml(name)}</div>
      <div class="small muted">
        LRN: ${PageUtils.escapeHtml(lrn)} | Level: ${PageUtils.escapeHtml(level)} | Strand: ${PageUtils.escapeHtml(strand)} | Year: ${PageUtils.escapeHtml(schoolYear)} (${PageUtils.escapeHtml(String(yearLevel))})
      </div>
      <div class="actions" style="margin-top:8px;">
        <button class="btn small approve-btn" data-id="${enrollee._id}">Approve</button>
        <button class="btn small ghost reject-btn" data-id="${enrollee._id}">Reject</button>
      </div>
    `;
    return div;
  }

  // Helper to render enrolled items
  function renderEnrolledItem(enrolled) {
    const div = document.createElement('div');
    div.className = 'enrolled-item'; // Custom class for enrolled
    const name = enrolled.name || enrolled.fullName || enrolled.email || 'N/A';
    const lrn = enrolled.lrn || 'N/A';
    const section = enrolled.section || enrolled.assignedSection?.name || 'N/A';
    const schoolYear = enrolled.schoolYear || 'N/A';
    const yearLevel = enrolled.yearLevel || 'N/A';

    div.innerHTML = `
      <div style="font-weight:600">${PageUtils.escapeHtml(name)}</div>
      <div class="small muted">
        LRN: ${PageUtils.escapeHtml(lrn)} | Section: <span class="section-tag">${PageUtils.escapeHtml(section)}</span> | Year: ${PageUtils.escapeHtml(schoolYear)} (${PageUtils.escapeHtml(String(yearLevel))})
      </div>
      <div class="actions" style="margin-top:8px;">
        <button class="btn small ghost archive-btn" data-id="${enrolled._id}">Archive</button>
      </div>
    `;
    return div;
  }

  async function loadPendingEnrollees() {
    enrolleeList.innerHTML = '<div class="muted small">Loading pending enrollees…</div>';
    try {
      // ✅ Use PageUtils.fetchJson
      const pending = await PageUtils.fetchJson('/api/registrar/enrollment/pending', { method: 'GET' });
      if (!pending || pending.length === 0) {
        enrolleeList.innerHTML = '<div class="muted small">No pending enrollees.</div>';
        return;
      }
      enrolleeList.innerHTML = '';
      pending.forEach(enrollee => enrolleeList.appendChild(renderEnrolleeItem(enrollee)));
      bindEnrolleeActions();
    } catch (e) {
      console.error('Error loading pending enrollees:', e);
      enrolleeList.innerHTML = '<div class="muted small">Failed to load pending enrollees.</div>';
    }
  }

  async function loadApprovedEnrollees() {
    enrolledList.innerHTML = '<div class="muted small">Loading approved enrollees…</div>';
    try {
      // ✅ Use PageUtils.fetchJson
      const approved = await PageUtils.fetchJson('/api/registrar/enrollment/approved', { method: 'GET' });
      if (!approved || approved.length === 0) {
        enrolledList.innerHTML = '<div class="muted small">No approved enrollees.</div>';
        return;
      }
      enrolledList.innerHTML = '';
      approved.forEach(enrollee => enrolledList.appendChild(renderEnrolledItem(enrollee)));
      bindEnrolledActions();
    } catch (e) {
      console.error('Error loading approved enrollees:', e);
      enrolledList.innerHTML = '<div class="muted small">Failed to load approved enrollees.</div>';
    }
  }

  async function approveEnrollee(id) {
    // Prompt for section name
    const sectionName = prompt("Enter section name for this enrollee (e.g., 7-A, 11-STEM-B):");
    if (sectionName === null || sectionName.trim() === "") {
      alert("Section name is required to approve enrollment.");
      return;
    }

    try {
      // ✅ Use PageUtils.fetchJson
      await PageUtils.fetchJson(`/api/registrar/enrollment/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionName: sectionName.trim() })
      });
      showToast('Enrollment approved!', 'success');
      loadPendingEnrollees();
      loadApprovedEnrollees();
    } catch (e) {
      console.error('Error approving enrollee:', e);
      showToast('Failed to approve enrollment: ' + (e.message || e), 'error');
    }
  }

  async function rejectEnrollee(id) {
    const reason = prompt("Enter reason for rejection (optional):");
    try {
      // ✅ Use PageUtils.fetchJson
      await PageUtils.fetchJson(`/api/registrar/enrollment/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      showToast('Enrollment rejected!', 'info');
      loadPendingEnrollees();
    } catch (e) {
      console.error('Error rejecting enrollee:', e);
      showToast('Failed to reject enrollment: ' + (e.message || e), 'error');
    }
  }

  async function archiveEnrollee(id) {
    const reason = prompt("Enter reason for archiving (optional):");
    if (!confirm('Are you sure you want to archive this enrollment?')) return;
    try {
      // ✅ Use PageUtils.fetchJson
      await PageUtils.fetchJson(`/api/registrar/enrollment/${id}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      showToast('Enrollment archived!', 'info');
      loadApprovedEnrollees();
    } catch (e) {
      console.error('Error archiving enrollee:', e);
      showToast('Failed to archive enrollment: ' + (e.message || e), 'error');
    }
  }

  function bindEnrolleeActions() {
    enrolleeList.querySelectorAll('.approve-btn').forEach(btn => {
      btn.onclick = () => approveEnrollee(btn.dataset.id);
    });
    enrolleeList.querySelectorAll('.reject-btn').forEach(btn => {
      btn.onclick = () => rejectEnrollee(btn.dataset.id);
    });
  }

  function bindEnrolledActions() {
    enrolledList.querySelectorAll('.archive-btn').forEach(btn => {
      btn.onclick = () => archiveEnrollee(btn.dataset.id);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadPendingEnrollees();
    loadApprovedEnrollees();

    el('logoutBtn')?.addEventListener('click', () => {
      Auth.logout(); // ✅ Use Auth.logout()
    });
  });
});
