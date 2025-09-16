// public/js/menu.js
window.__EDUSEC_MENU = (function(){
  const menus = {
    User: [
      { name: "Enrollment", link: "pages/enrollment.html", icon: "📝" }
    ],
    Student: [
      { name: "Grades", link: "pages/grades.html", icon: "📊" },
      { name: "Attendance", link: "pages/attendance.html", icon: "🕒" },
      { name: "Vote", link: "pages/vote.html", icon: "🗳️" },
      { name: "Announcements", link: "pages/announcements.html", icon: "📢" },
    ],
    Moderator: [
      { name: "Record Book", link: "pages/recordbook.html", icon: "📚" },
      { name: "Announcements", link: "pages/announcements.html", icon: "📢" },
    ],
    Registrar: [
      { name: "Enrollee", link: "pages/registrar.html", icon: "🧾" },
      { name: "Enrolled", link: "pages/enrolled.html", icon: "✅" },
      { name: "Archives", link: "pages/archives.html", icon: "📂" },
      { name: "Role Management", link: "pages/role-management.html", icon: "👥" },
      { name: "Announcements", link: "pages/announcements.html", icon: "📢" },
    ],
    Admin: [
      { name: "Management", link: "pages/admin.html", icon: "⚙️" },
      { name: "Announcements", link: "pages/announcements.html", icon: "📢" },
    ],
    SuperAdmin: [],
    SSG: [
      { name: "SSG Management", link: "pages/ssg.html", icon: "🏛️" },
      { name: "SSG Announcements", link: "pages/ssg-announcements.html", icon: "📢" },
      { name: "SSG Projects", link: "pages/ssg-projects.html", icon: "🛠️" }
    ],
  };

  function buildMenuForUser(user) {
    const role = user && user.role;
    let finalMenu = [...menus.User];

    if (role === "SuperAdmin") {
      Object.keys(menus).forEach(r => {
        if (r !== "SuperAdmin") finalMenu.push(...menus[r]);
      });
    } else if (menus[role]) {
      finalMenu = [...finalMenu, ...menus[role]];
    }

    if (user && user.extraRoles && Array.isArray(user.extraRoles)) {
      user.extraRoles.forEach(r => { if (menus[r]) finalMenu.push(...menus[r]); });
    }

    if (user && (user.isSSG || role === "SSG")) {
      finalMenu.push(...menus.SSG);
    }

    const seen = new Set();
    return finalMenu.filter(item => {
      if (seen.has(item.name)) return false;
      seen.add(item.name);
      return true;
    });
  }

  function renderSidebar(menu) {
    const menuList = document.getElementById("menuList");
    if (!menuList) return;
    menuList.innerHTML = "";
    menu.forEach(item => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = item.link;
      a.className = "menu-link";
      a.innerHTML = `<span class="icon">${item.icon || "📄"}</span><span class="label">${item.name}</span>`;
      li.appendChild(a);
      menuList.appendChild(li);
    });
  }

  function renderQuickActions(menu) {
    const container = document.getElementById("quickActions");
    if (!container) return;
    container.innerHTML = "";
    menu.forEach(item => {
      const btn = document.createElement("a");
      btn.className = "btn ghost";
      btn.href = item.link;
      btn.textContent = item.name;
      container.appendChild(btn);
    });
  }

  return {
    buildMenuForUser,
    renderSidebar,
    renderQuickActions
  };
})();
