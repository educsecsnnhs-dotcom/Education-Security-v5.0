// public/js/pages/enrolled.js
(async function(){
  const el = id => document.getElementById(id);

  // 🔹 No need for authHeaders function here, PageUtils.fetchJson handles it

  async function loadEnrolled(){
    const cont = el('enrolledList');
    cont.innerHTML = '<div class="muted small">Loading enrolled students…</div>';
    try{
      // ✅ Use PageUtils.fetchJson
      const j = await PageUtils.fetchJson('/api/enrollment/enrolled', { method:'GET' });

      const items = j.data || j.enrolled || j.students || j || [];
      if (!items || items.length === 0) {
        cont.innerHTML = '<div class="muted small">No enrolled students.</div>';
        return;
      }

      cont.innerHTML = '';
      items.forEach(i => {
        const row = document.createElement('div');
        row.className = 'announcement'; // Reusing announcement class for styling
        const name = i.name || i.fullName || `${i.firstName||''} ${i.lastName||''}`.trim() || i.email || i._id || i.id;
        const sectionName = i.assignedSection?.name || i.section || 'N/A'; // Access assignedSection.name
        const yearLevel = i.yearLevel || 'N/A';
        const lrn = i.lrn || 'N/A';

        row.innerHTML = `
          <div style="font-weight:600">${PageUtils.escapeHtml(name)}</div>
          <div class="small muted">
            LRN: ${PageUtils.escapeHtml(lrn)} |
            Section: <span class="section-tag">${PageUtils.escapeHtml(sectionName)}</span> |
            Year Level: <span class="year-tag">${PageUtils.escapeHtml(String(yearLevel))}</span>
          </div>
        `;
        cont.appendChild(row);
      });
    } catch (e) {
      console.error('Enrolled load error:', e);
      cont.innerHTML = '<div class="muted small">Error loading enrolled students.</div>';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    el('logoutBtn')?.addEventListener('click', () => {
      Auth.logout(); // ✅ Use Auth.logout()
    });

    loadEnrolled();
  });
})();
