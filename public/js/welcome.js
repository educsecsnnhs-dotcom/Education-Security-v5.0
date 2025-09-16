(function(){
  'use strict';

  const api = {
    me: '/api/auth/me',
    announcements: '/api/announcements',
    ssgAnnouncements: '/api/ssg/announcements', // Corrected path
    ssgProjects: '/api/ssg/projects', // Corrected path
    superUsers: '/api/superadmin/users',
    impersonate: '/api/superadmin/impersonate'
  };

  function qs(sel){ return document.querySelector(sel); }

  // Fetch with JWT token (using Auth.getToken())
  async function fetchJson(url, opts = {}) {
    const token = Auth.getToken(); // Use Auth object to get token
    const headers = { 'Accept': 'application/json', ...(opts.headers || {}) };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const cfg = Object.assign({ headers }, opts);
    const res = await fetch(url, cfg);

    // Handle unauthorized responses (token might have expired)
    if (res.status === 401 || res.status === 403) { // Also handle 403 Forbidden
      Auth.logout(); // Use Auth object to clear token and redirect
      return; // Stop further processing
    }

    return res;
  }

  // Helper functions (moved from page-utils.js or utils.js if they were there)
  function showModal(html){
    const root = qs('#modalRoot');
    if (!root) { console.error("Modal root not found"); return; }
    root.innerHTML = '';
    root.style.display = 'block';
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `<div class="modal">${html}</div>`;
    backdrop.addEventListener('click', (ev)=>{
      if(ev.target===backdrop){
        root.style.display='none';
        root.innerHTML='';
      }
    });
    root.appendChild(backdrop);
  }

  function closeModal(){
    const r = qs('#modalRoot');
    if (r) {
      r.style.display='none';
      r.innerHTML='';
    }
  }

  function niceDate(dStr){
    try{
      const d = new Date(dStr);
      return d.toLocaleString('en-PH', {
        timeZone:'Asia/Manila',
        year:'numeric',month:'short',day:'numeric',
        hour:'2-digit',minute:'2-digit'
      });
    }catch(e){ return dStr; }
  }

  function escapeHtml(str){
    if(!str && str !== 0) return '';
    return String(str).replace(/[&<>"']/g, s => ( {
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[s]);
  }

  function truncate(s,n){
    if(!s) return '';
    return s.length > n ? s.slice(0,n-1)+'…' : s;
  }

  // === School announcements ===
  async function loadAnnouncements(){
    const container = qs('#schoolAnnouncements');
    if(!container) return;
    container.innerHTML = '<div class="muted small">Loading announcements…</div>';
    try{
      const res = await fetchJson(api.announcements);
      if(!res || !res.ok){ // Check if res is null or not ok
        container.innerHTML = '<div class="muted small">No announcements found.</div>';
        return;
      }
      const json = await res.json();
      let items = [];
      if(Array.isArray(json)) items = json;
      else if(Array.isArray(json.announcements)) items = json.announcements;
      else if(Array.isArray(json.data)) items = json.data;
      else if(json.announcements) items = Object.values(json.announcements);
      if(!items || items.length === 0){
        container.innerHTML = '<div class="muted small">No announcements.</div>';
        return;
      }
      container.innerHTML = '';
      items.slice(0,8).forEach(a => {
        const title = a.title || a.subject || 'Announcement';
        const body = a.body || a.message || a.content || '';
        const date = a.createdAt || a.date || a.created || '';
        const el = document.createElement('div');
        el.className = 'announcement';
        el.innerHTML =
          `<div class="meta">${niceDate(date)}</div>`+
          `<div style="font-weight:600">${escapeHtml(title)}</div>`+
          `<div class="small muted">${truncate(escapeHtml(body),220)}</div>`;
        container.appendChild(el);
      });
    }catch(e){
      console.error('Announcements error',e);
      container.innerHTML = '<div class="muted small">Failed to load announcements.</div>';
    }
  }

  // === SSG announcements ===
  async function loadSSGAnnouncements(){
    const container = qs('#ssgAnnouncements');
    if(!container) return;
    container.innerHTML = '<div class="muted small">Loading SSG announcements…</div>';
    try{
      const res = await fetchJson(api.ssgAnnouncements);
      if(!res || !res.ok){
        container.innerHTML = '<div class="muted small">No SSG announcements found.</div>';
        return;
      }
      const items = await res.json();
      if(!items || !Array.isArray(items) || items.length === 0){
        container.innerHTML = '<div class="muted small">No SSG announcements.</div>';
        return;
      }
      container.innerHTML = '';
      items.slice(0,5).forEach(a=> {
        const el = document.createElement('div');
        el.className = 'announcement';
        el.innerHTML =
          `<div class="meta">${niceDate(a.createdAt)}</div>`+
          `<div style="font-weight:600">${escapeHtml(a.title)}</div>`+
          `<div class="small muted">${truncate(escapeHtml(a.body),180)}</div>`;
        container.appendChild(el);
      });
    }catch(err){
      console.error('SSG announcements error',err);
      container.innerHTML = '<div class="muted small">Failed to load SSG announcements.</div>';
    }
  }

  // === SSG projects ===
  async function loadSSGProjects(){
    const container = qs('#ssgProjects');
    if(!container) return;
    container.innerHTML = '<div class="muted small">Loading SSG projects…</div>';
    try{
      const res = await fetchJson(api.ssgProjects);
      if(!res || !res.ok){
        container.innerHTML = '<div class="muted small">No projects found.</div>';
        return;
      }
      const items = await res.json();
      if(!items || !Array.isArray(items) || items.length === 0){
        container.innerHTML = '<div class="muted small">No projects available.</div>';
        return;
      }
      container.innerHTML = '';
      items.slice(0,5).forEach(p=>{
        const el = document.createElement('div');
        el.className = 'project';
        el.innerHTML =
          `<div style="font-weight:600">${escapeHtml(p.name)} <span class="small muted">(${escapeHtml(p.status)})</span></div>`+
          `<div class="small muted">${truncate(escapeHtml(p.description),180)}</div>`+
          `<div class="meta">${niceDate(p.createdAt)}</div>`;
        container.appendChild(el);
      });
    }catch(err){
      console.error('SSG projects error',err);
      container.innerHTML = '<div class="muted small">Failed to load projects.</div>';
    }
  }

  function updateClock(){
    const now = new Date();
    qs('#clock').textContent = now.toLocaleTimeString('en-PH', {hour12: false,timeZone:'Asia/Manila'});
    qs('#todayDate').textContent = 'Today is ' + now.toLocaleDateString('en-PH', {
      weekday:'long',year:'numeric',month:'long',day:'numeric',timeZone:'Asia/Manila'
    });
  }

  function renderPdfOrPlaceholder() {
    const pdfHolder = qs('#pdfHolder');
    if (!pdfHolder) return;

    // Check if the PDF exists (this is a client-side assumption, server might 404)
    // For a real app, you'd have an API endpoint to check for the PDF or serve it.
    const pdfPath = '/documents/school-info.pdf'; // Assuming a path in public/documents
    const imgPath = '/images/school-logo.png'; // Placeholder image if PDF not found

    // Simple check: try to load PDF, if it fails, show image
    const img = new Image();
    img.onload = () => {
      pdfHolder.innerHTML = `<embed src="${pdfPath}" type="application/pdf" width="100%" height="240px" />`;
    };
    img.onerror = () => {
      pdfHolder.innerHTML = `<img src="${imgPath}" alt="School Info" style="max-width:100%; max-height:200px; object-fit:contain; margin:auto;" /><div class="small muted" style="margin-top:10px;">School info PDF not found.</div>`;
    };
    img.src = pdfPath; // Attempt to load PDF as an image to check existence (hacky, but works for simple check)
  }


  // === INIT ===
  document.addEventListener('DOMContentLoaded', async ()=> {
    // Ensure Auth object is available
    if (!window.Auth) {
      console.error("Auth object not loaded. Ensure public/js/auth.js is included before welcome.js.");
      Auth.logout(); // Attempt to redirect to login
      return;
    }

    try {
      const res = await fetchJson(api.me);  // check user session
      if(!res || !res.ok){ // Check if res is null or not ok
        Auth.logout(); // Use Auth object to clear token and redirect
        return;
      }
      const j = await res.json();
      const user = j.user || j;
      window.__EDUSEC__ = { user }; // Store user globally

      qs('#userName').textContent = user.fullName || user.email || user.username || 'User';
      qs('#userRole').textContent = user.role || 'User';

      const menuUtil = window.__EDUSEC_MENU;
      if(menuUtil){
        const finalMenu = menuUtil.buildMenuForUser(user);
        menuUtil.renderSidebar(finalMenu);
        menuUtil.renderQuickActions(finalMenu);
      }

      // load base content
      loadAnnouncements();
      renderPdfOrPlaceholder();
      updateClock();
      setInterval(updateClock, 1000);

      // load SSG extras if user has SSG role
      if(user.role === 'SSG' || (user.extraRoles && user.extraRoles.includes('SSG'))){
        loadSSGAnnouncements();
        loadSSGProjects();
      }

      // Handle impersonation button for SuperAdmin
      if (user.role === 'SuperAdmin') {
        const impersonationArea = qs('#impersonationArea');
        const backToSuperBtn = qs('#backToSuperBtn');
        const originalSuperAdmin = sessionStorage.getItem('EDUSEC_originalSuperAdmin');

        if (originalSuperAdmin) {
          // Currently impersonating
          backToSuperBtn.style.display = 'inline-block';
          backToSuperBtn.addEventListener('click', async () => {
            try {
              const originalUser = JSON.parse(originalSuperAdmin);
              const res = await fetchJson(api.impersonate, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: originalUser.id })
              });
              if (res.ok) {
                const data = await res.json();
                Auth.saveToken(data.token);
                sessionStorage.removeItem('EDUSEC_originalSuperAdmin');
                location.reload();
              } else {
                alert('Failed to revert impersonation.');
              }
            } catch (e) {
              console.error('Error reverting impersonation:', e);
              alert('Error reverting impersonation.');
            }
          });
          impersonationArea.innerHTML = `<span class="small muted">Impersonating: <strong>${user.fullName || user.email}</strong></span>`;
        } else {
          // Not impersonating, but SuperAdmin can initiate
          // The impersonate button is usually on the role-management page, not welcome.
          // If you want it here, you'd add it. For now, assuming it's handled elsewhere.
        }
      }

    }catch(err){
      console.error('Welcome load error',err);
      Auth.logout(); // Ensure logout on any critical error during welcome page load
    }

    const logoutBtn = qs('#logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        Auth.logout(); // Use Auth object for logout
      });
    }
  });
})();
