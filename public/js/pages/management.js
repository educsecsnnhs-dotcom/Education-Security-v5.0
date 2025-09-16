// public/js/pages/management.js
document.addEventListener("DOMContentLoaded", async () => {
  // Require Auth
  if (!window.Auth || typeof Auth.getUser !== "function") {
    console.error("Auth.getUser() is required (auth.js)");
    Auth.logout(); // Redirect if Auth is not properly loaded
    return;
  }

  const user = Auth.getUser(); // Get user from client-side decoded token
  // No need to get token explicitly here, PageUtils.fetchJson handles it

  if (!user || user.role !== "Admin") { // Ensure only Admin can access
    Auth.logout(); // Redirect if not authorized
    return;
  }

  // 🔹 PageUtils.fetchJson is now the global API fetch wrapper

  // =======================
  // Load Students & Teachers
  // =======================
  async function loadUsers() {
    try {
      // ✅ Use PageUtils.fetchJson
      const data = await PageUtils.fetchJson(`/api/superadmin/users`); // Assuming Admin can view all users via superadmin endpoint
      const tbody = document.querySelector("#userTable tbody");
      tbody.innerHTML = "";
      if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="muted small">No users found.</td></tr>`;
        return;
      }
      data.forEach(u => {
        const tr = PageUtils.el("tr", {}, [
          PageUtils.el("td", {}, PageUtils.escapeHtml(u.fullName || u.username || "—")),
          PageUtils.el("td", {}, PageUtils.escapeHtml(u.email || "—")),
          PageUtils.el("td", {}, PageUtils.escapeHtml(u.role || "—")),
          PageUtils.el("td", {}, PageUtils.escapeHtml(u.yearSection || "—")) // Assuming yearSection exists
        ]);
        tbody.appendChild(tr);
      });
    } catch (e) {
      showToast("Failed to load users: " + (e.message || e), "error");
    }
  }

  // =======================
  // Load Announcements
  // =======================
  async function loadAnnouncements() {
    try {
      // ✅ Use PageUtils.fetchJson
      const anns = await PageUtils.fetchJson(`/api/announcements`); // Assuming Admin can view all announcements
      const list = document.getElementById("announcementList");
      list.innerHTML = "";
      if (!anns || anns.length === 0) {
        list.innerHTML = `<li class="muted small">No announcements found.</li>`;
        return;
      }
      anns.forEach(a => {
        const li = PageUtils.el("li", { class: "announcement" }, [
          PageUtils.el("strong", {}, PageUtils.escapeHtml(a.title) + ": "),
          document.createTextNode(PageUtils.escapeHtml(a.content)),
          PageUtils.el("span", { class: "meta" }, " — " + PageUtils.niceDate(a.createdAt))
        ]);
        list.appendChild(li);
      });
    } catch (e) {
      showToast("Failed to load announcements: " + (e.message || e), "error");
    }
  }

  // Handle new announcement
  const form = document.getElementById("announcementForm");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = qs("#annTitle").value.trim();
      const content = qs("#annContent").value.trim();
      if (!title || !content) return;

      const submitBtn = form.querySelector("button[type='submit']");
      PageUtils.disableBtn(submitBtn);
      try {
        // ✅ Use PageUtils.fetchJson
        await PageUtils.fetchJson("/api/announcements", {
          method: "POST",
          body: { title, content, createdBy: user.id, audience: ["Admin"] } // Assuming Admin creates for Admin audience
        });
        showToast("Announcement posted", "success");
        form.reset();
        loadAnnouncements();
      } catch (e) {
        showToast("Failed to post announcement: " + (e.message || e), "error");
      } finally {
        PageUtils.enableBtn(submitBtn);
      }
    });
  }


  // =======================
  // Load Activity Logs (Placeholder - assuming a backend endpoint for this)
  // =======================
  async function loadActivity() {
    try {
      // ✅ Use PageUtils.fetchJson
      const logs = await PageUtils.fetchJson(`/api/activity-logs`); // Assuming a backend endpoint for activity logs
      const list = document.getElementById("activityList");
      list.innerHTML = "";
      if (!logs || logs.length === 0) {
        list.innerHTML = `<li class="muted small">No activity logs found.</li>`;
        return;
      }
      logs.forEach(log => {
        const li = PageUtils.el("li", {}, [
          PageUtils.el("span", { class: "meta" }, PageUtils.niceDate(log.time) + ": "),
          document.createTextNode(PageUtils.escapeHtml(log.user) + " → " + PageUtils.escapeHtml(log.action))
        ]);
        list.appendChild(li);
      });
    } catch (e) {
      // Fallback to local storage activity if API fails
      const local = PageUtils.getRecentActivity(10);
      const list = document.getElementById("activityList");
      list.innerHTML = "";
      if (!local || local.length === 0) {
        list.innerHTML = `<li class="muted small">No local activity logs.</li>`;
        return;
      }
      local.forEach(l => {
        const li = PageUtils.el("li", {}, [
          PageUtils.el("span", { class: "meta" }, PageUtils.niceDate(l.time) + ": "),
          document.createTextNode(PageUtils.escapeHtml(l.msg))
        ]);
        list.appendChild(li);
      });
      showToast("Failed to load server activity logs, showing local.", "info");
    }
  }

  // =======================
  // Initial load
  // =======================
  loadUsers();
  loadAnnouncements();
  loadActivity();

  // Logout button handler
  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    Auth.logout(); // ✅ Use Auth.logout()
  });
});
