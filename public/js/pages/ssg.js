/*
 Combined SSG frontend (public/js/ssg.js) — JWT Edition
 - Works with JWT-based auth:
     POST /api/auth/login → returns { token, user }
     POST /api/auth/register
     POST /api/auth/logout (optional server revoke)
     GET  /api/auth/me  (requires Authorization: Bearer <token>)
 - Expects JWT to be stored client-side in localStorage.
 - Role-based checks preserved (hasRole).
 - Elections/Announcements/Projects remain localStorage fallback until backend endpoints exist.
*/

(function () {
  'use strict';

  // Ensure Auth and PageUtils are available
  if (!window.Auth || !window.PageUtils) {
    console.error("Auth or PageUtils not loaded. Ensure public/js/auth.js and public/js/page-utils.js are included.");
    Auth.logout(); // Attempt to redirect if critical dependencies are missing
    return;
  }

  /* ---------- fetchJson (Now using PageUtils.fetchJson) ---------- */
  // The custom fetchJson here is no longer needed as PageUtils.fetchJson is global and handles JWT/logout.
  // We will use PageUtils.fetchJson directly.

  /* ---------- Current User ---------- */
  async function getCurrentUser() {
    return Auth.getUser(); // Get user from client-side decoded token
  }

  function hasRole(user, roleName) {
    if (!user) return false;
    const rn = String(roleName || '').toLowerCase();
    if (typeof user.role === 'string' && user.role.toLowerCase() === rn) return true;
    if (Array.isArray(user.extraRoles)) { // Check extraRoles
      for (const r of user.extraRoles) {
        if (!r) continue;
        if (typeof r === 'string' && r.toLowerCase() === rn) return true;
      }
    }
    // Specific checks for convenience (though extraRoles should cover it)
    if (rn === 'superadmin' && user.role === 'SuperAdmin') return true;
    if (rn === 'admin' && user.role === 'Admin') return true;
    if (rn === 'ssg' && user.role === 'SSG') return true; // Check main role first
    return false;
  }

  function $id(id) { return document.getElementById(id); }
  // escapeHtml is now PageUtils.escapeHtml

  /* ---------- Members (server-backed) ---------- */
  async function loadMembers() {
    // ✅ Use PageUtils.fetchJson
    return await PageUtils.fetchJson('/api/ssg/members', { method: 'GET' });
  }

  async function createMember(payload) {
    const opts = {};
    if (payload instanceof FormData) {
      opts.method = 'POST'; opts.body = payload;
    } else {
      opts.method = 'POST'; opts.body = JSON.stringify(payload); opts.headers = { 'Content-Type': 'application/json' };
    }
    // ✅ Use PageUtils.fetchJson
    return await PageUtils.fetchJson('/api/ssg/members', opts);
  }

  async function deleteMember(id) {
    if (!id) throw new Error('Member id required');
    // ✅ Use PageUtils.fetchJson
    return await PageUtils.fetchJson(`/api/ssg/members/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  function renderMembersTable(container, members, opts = {}) {
    if (!container) return;
    container.innerHTML = '';
    if (!Array.isArray(members) || members.length === 0) { container.innerHTML = '<div class="muted small">No members</div>'; return; } // Use muted small for consistency
    if (container.tagName.toLowerCase() === 'tbody') {
      const frag = document.createDocumentFragment();
      members.forEach(m => {
        const tr = document.createElement('tr');
        const idCell = document.createElement('td'); idCell.textContent = m.id ?? m._id ?? '';
        const nameCell = document.createElement('td'); nameCell.textContent = m.name ?? [m.firstName, m.lastName].filter(Boolean).join(' ') || '';
        const roleCell = document.createElement('td'); roleCell.textContent = m.position ?? m.role ?? (m.roles && m.roles.join ? m.roles.join(', ') : '') ?? '';
        const emailCell = document.createElement('td'); emailCell.textContent = m.email ?? m.contact ?? '';
        const actions = document.createElement('td');
        if (opts.currentUser && (hasRole(opts.currentUser,'Admin') || hasRole(opts.currentUser,'SuperAdmin') || hasRole(opts.currentUser,'SSG'))) {
          const del = document.createElement('button'); del.type='button'; del.className='btn small logout'; del.textContent='Remove'; // Use btn small logout for consistency
          del.addEventListener('click', async () => {
            if (!confirm('Remove this member?')) return;
            try { await deleteMember(m.id ?? m._id); tr.remove(); showToast('Member removed', 'success'); } catch (e) { showToast('Failed to remove member: ' + (e.message || e), 'error'); console.error(e); }
          });
          actions.appendChild(del);
        } else {
          actions.textContent = '-';
        }
        tr.appendChild(idCell); tr.appendChild(nameCell); tr.appendChild(roleCell); tr.appendChild(emailCell); tr.appendChild(actions);
        frag.appendChild(tr);
      });
      container.appendChild(frag);
    }
  }

  /* ---------- Events (server-backed) ---------- */
  async function loadEvents() {
    // ✅ Use PageUtils.fetchJson
    return await PageUtils.fetchJson('/api/ssg/events', { method: 'GET' });
  }
  async function createEvent(payload) {
    const opts = {};
    if (payload instanceof FormData) { opts.method='POST'; opts.body = payload; }
    else { opts.method='POST'; opts.body = JSON.stringify(payload); opts.headers = { 'Content-Type': 'application/json' }; }
    // ✅ Use PageUtils.fetchJson
    return await PageUtils.fetchJson('/api/ssg/events', opts);
  }
  async function deleteEvent(id) {
    if (!id) throw new Error('Event id required');
    // ✅ Use PageUtils.fetchJson
    return await PageUtils.fetchJson(`/api/ssg/events/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  function renderEvents(container, events, opts = {}) {
    if (!container) return; container.innerHTML = '';
    if (!Array.isArray(events) || events.length === 0) { container.innerHTML = '<div class="muted small">No events</div>'; return; }
    const wrap = document.createElement('div'); wrap.className='ssg-events-grid'; // Assuming ssg-events-grid class exists
    events.forEach(e => {
      const card = document.createElement('div'); card.className='card'; // Use generic card class
      const title = e.title ?? e.name ?? '';
      const when = e.date ? PageUtils.niceDate(e.date) : (e.when ?? e.datetime ?? '');
      const desc = e.description ?? e.desc ?? '';
      card.innerHTML = `<h4>${PageUtils.escapeHtml(title)}</h4><div class="small muted">${PageUtils.escapeHtml(when)}</div><p>${PageUtils.escapeHtml(desc)}</p>`;
      if (opts.currentUser && (hasRole(opts.currentUser,'Admin') || hasRole(opts.currentUser,'SuperAdmin') || hasRole(opts.currentUser,'SSG'))) {
        const actions = document.createElement('div'); actions.className='header-actions'; // Use header-actions for consistency
        const del = document.createElement('button'); del.type='button'; del.className='btn small logout'; del.textContent='Delete';
        del.addEventListener('click', async () => { if (!confirm('Delete event?')) return; try { await deleteEvent(e.id ?? e._id); card.remove(); showToast('Event deleted', 'success'); } catch (err) { showToast('Failed to delete event: ' + (err.message || err), 'error'); console.error(err); } });
        actions.appendChild(del); card.appendChild(actions);
      }
      wrap.appendChild(card);
    });
    container.appendChild(wrap);
  }

  /* ---------- Elections / Announcements / Projects (fallback localStorage) ---------- */
  // These are now server-backed as per server.js routes
  const Elections = {
    list: async () => {
      // ✅ Use PageUtils.fetchJson
      const res = await PageUtils.fetchJson('/api/ssg/elections', { method: 'GET' });
      return res || [];
    },
    create: async (o) => {
      // ✅ Use PageUtils.fetchJson
      return await PageUtils.fetchJson('/api/ssg/election', { // Endpoint is /api/ssg/election (POST)
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(o)
      });
    },
    remove: async (id) => {
      // ✅ Use PageUtils.fetchJson
      return await PageUtils.fetchJson(`/api/ssg/elections/${encodeURIComponent(id)}`, { method: 'DELETE' });
    }
  };

  const Announcements = {
    list: async () => {
      // ✅ Use PageUtils.fetchJson
      const res = await PageUtils.fetchJson('/api/ssg/announcements', { method: 'GET' });
      return res || [];
    },
    create: async (o) => {
      // ✅ Use PageUtils.fetchJson
      return await PageUtils.fetchJson('/api/ssg/announcements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(o) });
    },
    remove: async (id) => {
      // ✅ Use PageUtils.fetchJson
      return await PageUtils.fetchJson(`/api/ssg/announcements/${encodeURIComponent(id)}`, { method: 'DELETE' });
    }
  };

  const Projects = {
    list: async () => {
      // ✅ Use PageUtils.fetchJson
      const res = await PageUtils.fetchJson('/api/ssg/projects', { method: 'GET' });
      return res || [];
    },
    create: async (o) => {
      // ✅ Use PageUtils.fetchJson
      return await PageUtils.fetchJson('/api/ssg/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(o) });
    },
    remove: async (id) => {
      // ✅ Use PageUtils.fetchJson
      return await PageUtils.fetchJson(`/api/ssg/projects/${encodeURIComponent(id)}`, { method: 'DELETE' });
    }
  };


  function renderList(container, items, type, opts = {}) {
    if (!container) return; container.innerHTML = '';
    if (!items || items.length === 0) { container.innerHTML = `<div class="muted small">No ${type}</div>`; return; }
    const frag = document.createDocumentFragment();
    items.forEach(it => {
      const card = document.createElement('div'); card.className = `card`; // Use generic card class
      card.innerHTML = `<h4>${PageUtils.escapeHtml(it.title ?? it.name ?? '')}</h4><p>${PageUtils.escapeHtml(it.description ?? it.body ?? '')}</p>`;
      if (opts.allowEdit) {
        const a = document.createElement('div'); a.className='header-actions'; const del = document.createElement('button'); del.className='btn small logout'; del.textContent='Delete';
        del.addEventListener('click', async () => { if (!confirm('Delete?')) return; await opts.onRemove(it.id ?? it._id); card.remove(); showToast(`${type} deleted`, 'success'); }); a.appendChild(del); card.appendChild(a);
      }
      frag.appendChild(card);
    });
    container.appendChild(frag);
  }

  /* ---------- Auto-init ---------- */
  async function initAuto() {
    const currentUser = await getCurrentUser();

    // Render SSG Members (assuming a table or list for members)
    const ssgListContainer = $id('ssgList'); // This is the main container in ssg.html
    if (ssgListContainer) {
      ssgListContainer.innerHTML = '<div class="muted small">Loading SSG data…</div>';
      try {
        const members = await loadMembers();
        // Assuming you want to display members in a table format within ssgListContainer
        let membersHtml = `
          <div style="margin-bottom: 15px;">
            <h3>SSG Members</h3>
            <table class="att-table"> <!-- Reusing att-table class -->
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Position/Role</th>
                  <th>Contact</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="ssgMembersTableBody"></tbody>
            </table>
          </div>
        `;
        ssgListContainer.innerHTML = membersHtml;
        renderMembersTable($id('ssgMembersTableBody'), members, { currentUser });

        // Render SSG Events
        const events = await loadEvents();
        let eventsHtml = `
          <div style="margin-top: 20px;">
            <h3>SSG Events</h3>
            <div id="ssgEventsList"></div>
          </div>
        `;
        ssgListContainer.insertAdjacentHTML('beforeend', eventsHtml);
        renderEvents($id('ssgEventsList'), events, { currentUser });

      } catch (e) {
        ssgListContainer.innerHTML = '<div class="muted small">Failed to load SSG data</div>';
        console.error(e);
      }
    }

    // Quick Actions for SSG role
    const createMemberBtn = $id('createMemberBtn');
    const createEventBtn = $id('createEventBtn'); // Assuming this button exists in ssg.html

    if (currentUser && hasRole(currentUser, 'SSG')) {
      if (createMemberBtn) {
        createMemberBtn.style.display = 'inline-block';
        createMemberBtn.addEventListener('click', () => {
          // Implement modal for creating member
          PageUtils.showModal(`
            <h3>Create SSG Member</h3>
            <label>Full Name<br><input id="memberName" class="input" /></label><br>
            <label>Position<br><input id="memberPosition" class="input" /></label><br>
            <label>Grade Level<br><input id="memberGradeLevel" type="number" class="input" /></label><br>
            <div class="actions">
              <button id="cancelMember" class="btn ghost">Cancel</button>
              <button id="saveMember" class="btn">Create</button>
            </div>
          `);
          $id('cancelMember').addEventListener('click', PageUtils.closeModal);
          $id('saveMember').addEventListener('click', async () => {
            const name = $id('memberName').value.trim();
            const position = $id('memberPosition').value.trim();
            const gradeLevel = parseInt($id('memberGradeLevel').value.trim());
            if (!name || !position || isNaN(gradeLevel)) { alert('All fields required'); return; }
            try {
              await createMember({ fullName: name, position, gradeLevel, createdBy: currentUser.id });
              showToast('Member created', 'success');
              PageUtils.closeModal();
              initAuto(); // Reload all SSG data
            } catch (e) { showToast('Failed to create member: ' + (e.message || e), 'error'); }
          });
        });
      }

      if (createEventBtn) {
        createEventBtn.style.display = 'inline-block';
        createEventBtn.addEventListener('click', () => {
          // Implement modal for creating event
          PageUtils.showModal(`
            <h3>Create SSG Event</h3>
            <label>Title<br><input id="eventTitle" class="input" /></label><br>
            <label>Description<br><textarea id="eventDescription" class="input" rows="4"></textarea></label><br>
            <label>Date<br><input id="eventDate" type="date" class="input" /></label><br>
            <label>Location<br><input id="eventLocation" class="input" /></label><br>
            <div class="actions">
              <button id="cancelEvent" class="btn ghost">Cancel</button>
              <button id="saveEvent" class="btn">Create</button>
            </div>
          `);
          $id('cancelEvent').addEventListener('click', PageUtils.closeModal);
          $id('saveEvent').addEventListener('click', async () => {
            const title = $id('eventTitle').value.trim();
            const description = $id('eventDescription').value.trim();
            const date = $id('eventDate').value;
            const location = $id('eventLocation').value.trim();
            if (!title || !date) { alert('Title and Date required'); return; }
            try {
              await createEvent({ title, description, date, location, schoolYear: '2025-2026', createdBy: currentUser.id }); // Hardcoded schoolYear for now
              showToast('Event created', 'success');
              PageUtils.closeModal();
              initAuto(); // Reload all SSG data
            } catch (e) { showToast('Failed to create event: ' + (e.message || e), 'error'); }
          });
        });
      }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAuto); else setTimeout(initAuto,0);

  /* ---------- Public API ---------- */
  window.SSG = Object.assign(window.SSG || {}, {
    loadMembers, createMember, deleteMember, renderMembersTable,
    loadEvents, createEvent, deleteEvent, renderEvents,
    Elections, Announcements, Projects,
    getCurrentUser, hasRole
  });

  // Logout button handler
  $id('logoutBtn')?.addEventListener('click', () => {
    Auth.logout(); // ✅ Use Auth.logout()
  });

})();
