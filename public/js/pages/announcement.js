// public/js/pages/announcements.js
(async function(){
  const api = {
    list: '/api/announcements',
    create: '/api/announcements',
    edit: '/api/announcements',
    del: '/api/announcements'
  };
  const el = id => document.getElementById(id);

  // 🔹 No need for authHeaders function here, PageUtils.fetchJson handles it

  async function load(){
    const list = el('annList');
    list.innerHTML = '<div class="muted small">Loading announcements…</div>';
    try{
      // ✅ Use PageUtils.fetchJson which handles auth headers and logout redirect
      const res = await PageUtils.fetchJson(api.list, { method: 'GET' });
      // PageUtils.fetchJson throws on !res.ok, so no need to check res.ok here
      // If it returns, it's successful.

      const j = res; // PageUtils.fetchJson already parses JSON
      let items = Array.isArray(j) ? j : (j.announcements || j.data || []);
      if(!items || items.length===0){
        list.innerHTML = '<div class="muted small">No announcements.</div>';
        return;
      }

      list.innerHTML = '';
      items.forEach(a => {
        const title = a.title || 'Announcement';
        const content = a.content || '';
        const date = a.createdAt || a.updatedAt || '';
        const author = (a.createdBy && a.createdBy.name) ? a.createdBy.name : 'System'; // Assuming createdBy might be populated
        const audience = a.audience ? a.audience.join(', ') : 'All';

        const wrapper = document.createElement('div');
        wrapper.className = 'announcement';
        wrapper.innerHTML = `
          <div class="meta">${PageUtils.niceDate(date)} · ${PageUtils.escapeHtml(author)} · 🎯 ${audience}</div>
          <div style="font-weight:600">${PageUtils.escapeHtml(title)}</div>
          <div class="small">${PageUtils.escapeHtml(content)}</div>
        `;

        // Admin/Registrar/Moderator/SSG controls
        PageUtils.currentUser().then(user => {
          if(user && (['Admin','Registrar','Moderator','SuperAdmin','SSG'].includes(user.role))){
            const controls = document.createElement('div');
            controls.style.marginTop = '8px';
            const edit = document.createElement('button'); edit.className='btn ghost'; edit.textContent='Edit';
            const del = document.createElement('button'); del.className='btn ghost'; del.textContent='Delete';
            edit.addEventListener('click', ()=> openEditor(a));
            del.addEventListener('click', ()=> deleteAnnouncement(a));
            controls.appendChild(edit);
            controls.appendChild(del);
            wrapper.appendChild(controls);
          }
        });

        list.appendChild(wrapper);
      });
    }catch(e){
      console.error(e);
      list.innerHTML='<div class="muted small">Failed to load announcements.</div>';
    }
  }

  function openEditor(item){
    const isNew = !item || !item._id;
    const html = `
      <h3>${isNew ? 'Create' : 'Edit'} announcement</h3>
      <label>Title<br><input id="annTitle" class="input" value="${PageUtils.escapeHtml(item?.title||'')}" /></label><br>
      <label>Content<br><textarea id="annContent" class="input" rows="6">${PageUtils.escapeHtml(item?.content||'')}</textarea></label><br>
      <label>Audience<br>
        <select id="annAudience" class="input" multiple>
          <option value="All">All</option>
          <option value="Students">Students</option>
          <option value="Teachers">Teachers</option>
          <option value="Parents">Parents</option>
          <option value="SSG">SSG</option>
        </select>
      </label>
      <div class="actions">
        <button id="cancel" class="btn ghost">Cancel</button>
        <button id="save" class="btn">${isNew? 'Create':'Save'}</button>
      </div>`;

    // ✅ Use PageUtils.showModal and PageUtils.closeModal
    PageUtils.showModal(html);

    if(item?.audience){
      const sel = document.getElementById('annAudience');
      [...sel.options].forEach(o => {
        if(item.audience.includes(o.value)) o.selected = true;
      });
    }

    document.getElementById('cancel').addEventListener('click', PageUtils.closeModal);
    document.getElementById('save').addEventListener('click', async ()=>{
      const title = document.getElementById('annTitle').value.trim();
      const content = document.getElementById('annContent').value.trim();
      const audience = [...document.getElementById('annAudience').selectedOptions].map(o=>o.value);

      if(!title || !content){ alert('⚠️ Title and content required'); return; }

      try{
        const payload = { title, content, audience };
        let url = api.create, method='POST';
        if(!isNew){ url = api.edit + '/' + (item._id||item.id); method='PUT'; }
        // ✅ Use PageUtils.fetchJson
        const r = await PageUtils.fetchJson(url, {
          method,
          headers: {'Content-Type':'application/json'}, // Headers are merged by fetchJson
          body: JSON.stringify(payload)
        });
        // PageUtils.fetchJson throws on !res.ok, so if we reach here, it's successful
        PageUtils.closeModal();
        load();
      }catch(e){ console.error(e); alert('Error: ' + (e.message || e)); }
    });
  }

  async function deleteAnnouncement(item){
    if(!confirm('Delete announcement?')) return;
    try{
      const id = item._id || item.id;
      // ✅ Use PageUtils.fetchJson
      const r = await PageUtils.fetchJson(api.del + '/' + id, { method:'DELETE' });
      // PageUtils.fetchJson throws on !res.ok
      load();
    }catch(e){ console.error(e); alert('Error: ' + (e.message || e)); }
  }

  const createBtn = el('createAnnouncementBtn');
  if(createBtn){
    const user = await PageUtils.currentUser(); // ✅ Use PageUtils.currentUser
    if(user && (['Admin','Registrar','Moderator','SuperAdmin','SSG'].includes(user.role))){
      createBtn.style.display = 'inline-block';
      createBtn.addEventListener('click', ()=> openEditor(null));
    }
  }

  const logout = el('logoutBtn');
  if(logout){
    logout.addEventListener('click', ()=>{
      Auth.logout(); // ✅ Use Auth.logout()
    });
  }

  load();
})();
