// public/js/pages/role-management.js
// Final merged Role Management UI (aligned with backend).
// - SuperAdmin: can assign/remove Registrar, Admin, Moderator, SSG, and impersonate users
// - Registrar: can assign Moderator, Admin, SSG only (cannot remove, cannot assign Registrar/SuperAdmin)
// - No "Student" in dropdown (handled only by enrollment approval)
// - Uses PageUtils.fetchJson(), Auth.getUser(), and /api/superadmin/* endpoints

document.addEventListener("DOMContentLoaded", async () => {
  // Ensure Auth object and PageUtils are available
  if (!window.Auth || typeof Auth.getUser !== "function" || !window.PageUtils || typeof PageUtils.fetchJson !== "function") {
    console.error("Auth or PageUtils not loaded. Ensure public/js/auth.js and public/js/page-utils.js are included.");
    Auth.logout();
    return;
  }

  const currentUser = Auth.getUser(); // Get user from client-side decoded token
  if (!currentUser) {
    Auth.logout();
    return;
  }

  // Dynamically create mount point if it doesn't exist (for pages without explicit mount)
  const mount = document.getElementById("roleManagementMount") || (() => {
    const m = document.createElement("div");
    m.id = "roleManagementMount";
    // Append to main content area if possible, otherwise body
    const main = document.querySelector('main');
    if (main) main.appendChild(m);
    else document.body.appendChild(m);
    return m;
  })();

  // Only render if the mount point is empty (to avoid re-rendering if already part of HTML)
  if (!mount.innerHTML.trim()) {
    mount.innerHTML = `
      <section class="card">
        <h2>👥 Users</h2>
        <div style="margin-bottom:12px">
          <button id="rm-refresh" class="btn ghost">Refresh</button>
          <span style="margin-left:14px;color:#666">Logged in as:
            <strong>${PageUtils.escapeHtml(currentUser.fullName || currentUser.email || currentUser.username)}</strong>
            — <em>${PageUtils.escapeHtml(currentUser.role)}</em>
          </span>
        </div>
        <div style="overflow:auto">
          <table id="rm-users-table" style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="text-align:left">
                <th style="padding:8px;border-bottom:1px solid #ddd">Name</th>
                <th style="padding:8px;border-bottom:1px solid #ddd">Email</th>
                <th style="padding:8px;border-bottom:1px solid #ddd">LRN</th>
                <th style="padding:8px;border-bottom:1px solid #ddd">Role</th>
                <th style="padding:8px;border-bottom:1px solid #ddd">Change Role</th>
                <th style="padding:8px;border-bottom:1px solid #ddd">Actions</th>
              </tr>
            </thead>
            <tbody id="rm-users-body"><tr><td colspan="6">Loading...</td></tr></tbody>
          </table>
        </div>
        <div id="rm-modal-container"></div>
      </section>
    `;
  }


  const usersBody = document.getElementById("rm-users-body");
  const refreshBtn = document.getElementById("rm-refresh");
  // const modalContainer = document.getElementById("rm-modal-container"); // Not directly used here, PageUtils.showModal handles it

  const SUPERADMIN_ROLES = ["Registrar", "Admin", "Moderator", "SSG", "User"]; // SuperAdmin can set to User
  const REGISTRAR_GIVE_ROLES = ["Moderator", "Admin", "SSG"];

  async function fetchUsers() {
    const endpoints = ["/api/superadmin/users", "/api/auth/users", "/api/users"];
    for (const ep of endpoints) {
      try {
        // ✅ Use PageUtils.fetchJson
        const data = await PageUtils.fetchJson(ep);
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.users)) return data.users;
      } catch (err) {
        // PageUtils.fetchJson will handle 401/403 by redirecting, so we only catch other errors
        if (err.status && (err.status === 401 || err.status === 403)) {
          // This case is handled by PageUtils.fetchJson, so we just continue
        } else {
          console.warn(`Failed to fetch from ${ep}:`, err.message);
        }
      }
    }
    throw new Error("Unable to list users (no permitted endpoint)");
  }

  function renderUsers(users) {
    usersBody.innerHTML = "";
    if (!users.length) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="6" style="padding:10px">No users found</td>`;
      usersBody.appendChild(tr);
      return;
    }

    users.forEach((u) => {
      const tr = document.createElement("tr");
      tr.style.borderBottom = "1px solid #eee";

      const targetIsSuperAdmin = (u.role === "SuperAdmin");
      const isSelf = (u._id === currentUser.id); // Use currentUser.id from JWT payload

      let roleOptions = [];
      if (currentUser.role === "SuperAdmin") {
        roleOptions = SUPERADMIN_ROLES.slice();
      } else if (currentUser.role === "Registrar") {
        roleOptions = REGISTRAR_GIVE_ROLES.slice();
      }

      let selectHtml = `<select data-target="${PageUtils.escapeHtml(u._id)}" class="rm-role-select" ${isSelf ? 'disabled' : ''}>`;
      selectHtml += `<option value="">-- Select --</option>`;
      roleOptions.forEach(r => {
        selectHtml += `<option value="${r}" ${u.role === r ? "selected" : ""}>${PageUtils.escapeHtml(r)}</option>`;
      });
      selectHtml += `</select>`;

      let actionsHtml = '';
      if (!isSelf) { // Cannot change own role or impersonate self
        actionsHtml += `<button class="btn small rm-update-btn" data-id="${PageUtils.escapeHtml(u._id)}" ${roleOptions.length ? "" : "disabled"}>Give</button>`;
        if (currentUser.role === "SuperAdmin" && !targetIsSuperAdmin) { // SuperAdmin can remove any non-SuperAdmin role
          actionsHtml += ` <button class="btn small ghost rm-remove-btn" data-id="${PageUtils.escapeHtml(u._id)}">Remove</button>`;
          actionsHtml += ` <button class="btn small rm-impersonate-btn" data-id="${PageUtils.escapeHtml(u._id)}">Impersonate</button>`;
        }
      } else {
        actionsHtml = `<span class="muted small">Current User</span>`;
      }


      tr.innerHTML = `
        <td style="padding:8px">${PageUtils.escapeHtml(u.fullName || u.username || "")}</td>
        <td style="padding:8px">${PageUtils.escapeHtml(u.email || "-")}</td>
        <td style="padding:8px">${PageUtils.escapeHtml(u.lrn || "-")}</td>
        <td style="padding:8px"><strong>${PageUtils.escapeHtml(u.role || "User")}</strong></td>
        <td style="padding:8px">${selectHtml}</td>
        <td style="padding:8px">${actionsHtml}</td>
      `;
      usersBody.appendChild(tr);
    });

    bindActions();
  }

  function bindActions() {
    document.querySelectorAll(".rm-update-btn").forEach(btn => {
      btn.onclick = handleGive;
    });
    document.querySelectorAll(".rm-remove-btn").forEach(btn => {
      btn.onclick = handleRemove;
    });
    document.querySelectorAll(".rm-impersonate-btn").forEach(btn => {
      btn.onclick = handleImpersonate;
    });
  }

  async function handleGive(ev) {
    const id = ev.currentTarget.dataset.id;
    const select = document.querySelector(`select.rm-role-select[data-target="${id}"]`);
    if (!select) return showToast("Select a role first", "error");
    const newRole = select.value;
    if (!newRole) return showToast("Pick a role", "error");

    if (currentUser.role === "Registrar" && newRole === "Registrar") {
      return showToast("Registrars cannot assign Registrar role", "error");
    }

    const payload = { userId: id, role: newRole }; // Backend expects userId and role
    try {
      if (currentUser.role === "SuperAdmin") {
        // ✅ Use PageUtils.fetchJson
        await PageUtils.fetchJson(`/api/superadmin/update-role`, { method: "POST", body: payload });
        showToast("Role assigned (SuperAdmin)", "success");
      } else if (currentUser.role === "Registrar") {
        // ✅ Use PageUtils.fetchJson
        await PageUtils.fetchJson("/api/registrar/assign-role", {
          method: "POST",
          body: payload
        });
        showToast("Role assigned (Registrar)", "success");
      }
      await loadAll();
    } catch (err) {
      console.error(err);
      showToast("Failed to assign role: " + (err.message || err), "error");
    }
  }

  async function handleRemove(ev) {
    const id = ev.currentTarget.dataset.id;
    if (!confirm("Remove role and set to User?")) return;
    try {
      // ✅ Use PageUtils.fetchJson
      await PageUtils.fetchJson(`/api/superadmin/update-role`, { method: "POST", body: { userId: id, role: "User" } });
      showToast("Role removed", "success");
      await loadAll();
    } catch (err) {
      console.error(err);
      showToast("Failed to remove role: " + (err.message || err), "error");
    }
  }

  async function handleImpersonate(ev) {
    const id = ev.currentTarget.dataset.id;
    if (!confirm("Impersonate this user?")) return;
    try {
      // ✅ Use PageUtils.fetchJson
      const res = await PageUtils.fetchJson(`/api/superadmin/impersonate`, { method: "POST", body: { userId: id } });
      if (res && res.token) { // Backend now returns a token
        Auth.saveToken(res.token); // Save the new impersonated token
        try { sessionStorage.setItem('EDUSEC_originalSuperAdmin', JSON.stringify({ id: currentUser.id })); } catch(e){}
        location.reload(); // Reload the page to apply new user context
      } else {
        showToast("Impersonation failed", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Impersonation error: " + (err.message || err), "error");
    }
  }

  async function loadAll() {
    usersBody.innerHTML = `<tr><td colspan="6" style="padding:10px">Loading...</td></tr>`;
    try {
      const users = await fetchUsers();
      renderUsers(users);
    } catch (err) {
      console.error(err);
      usersBody.innerHTML = `<tr><td colspan="6" style="padding:12px;color:#a00">Failed: ${PageUtils.escapeHtml(err.message || String(err))}</td></tr>`;
    }
  }

  refreshBtn.addEventListener("click", loadAll);
  loadAll();

  // Logout button handler
  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    Auth.logout(); // ✅ Use Auth.logout()
  });
});
