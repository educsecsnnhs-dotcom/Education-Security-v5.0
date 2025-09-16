// public/js/pages/archives.js
// Archives page: show archived records from registrar/admin
document.addEventListener("DOMContentLoaded", () => {
  const el = (id) => document.getElementById(id);
  const cont = el("archivesList");

  // 🔹 No need for authHeaders function here, PageUtils.fetchJson handles it

  async function loadArchives() {
    cont.innerHTML = '<div class="muted small">Loading archives…</div>';
    try {
      // ✅ Use PageUtils.fetchJson
      const j = await PageUtils.fetchJson("/api/registrar/enrollment/archived", { method: 'GET' });

      const items = j.data || j.archives || j || []; // Adjusted to handle direct array response
      if (!items.length) {
        cont.innerHTML = '<div class="muted small">No archived records.</div>';
        return;
      }

      cont.innerHTML = "";
      items.forEach((it) => {
        const row = document.createElement("div");
        row.className = "archive-item"; // Changed to archive-item for specific styling
        const name = it.name || it.fullName || it.email || it._id || it.id;
        const reason = it.archiveReason || 'No reason specified';
        const date = it.updatedAt || it.createdAt || '';

        row.innerHTML = `
          <div class="title">${PageUtils.escapeHtml(name)}</div>
          <div class="meta">Archived: ${PageUtils.niceDate(date)}</div>
          <div class="desc">Reason: ${PageUtils.escapeHtml(reason)}</div>
          <div class="actions">
            <button class="btn" data-id="${it._id}" data-action="restore">Restore</button>
          </div>
        `;
        cont.appendChild(row);
      });

      // Add event listeners for restore buttons
      cont.querySelectorAll('button[data-action="restore"]').forEach(button => {
        button.addEventListener('click', async (event) => {
          const id = event.target.dataset.id;
          if (confirm('Are you sure you want to restore this enrollment?')) {
            try {
              // ✅ Use PageUtils.fetchJson
              await PageUtils.fetchJson(`/api/registrar/enrollment/${id}/restore`, { method: 'POST' });
              showToast('Enrollment restored successfully!', 'success');
              loadArchives(); // Reload the list
            } catch (err) {
              console.error('Error restoring enrollment:', err);
              showToast('Failed to restore enrollment: ' + (err.message || err), 'error');
            }
          }
        });
      });

    } catch (err) {
      console.error("Archives load error:", err);
      cont.innerHTML = '<div class="muted small">Failed to load archives.</div>';
    }
  }

  // 🔹 Fix logout to use Auth.logout()
  el("logoutBtn")?.addEventListener("click", () => {
    Auth.logout();
  });

  loadArchives();
});
