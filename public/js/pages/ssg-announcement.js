<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SSG Announcements</title>
  <link rel="stylesheet" href="../css/ssg.css">
  <script src="../js/auth.js" defer></script> <!-- ✅ ADD THIS LINE -->
  <script src="../js/page-utils.js" defer></script> <!-- ✅ Load page-utils.js -->
</head>
<body>
  <h1>📢 SSG Announcements</h1>

  <div id="announcementsList"></div>

  <script>
    async function loadAnnouncements() {
      // Ensure Auth and PageUtils are available
      if (!window.Auth || !window.PageUtils) {
        console.error("Auth or PageUtils not loaded. Ensure public/js/auth.js and public/js/page-utils.js are included.");
        Auth.logout();
        return;
      }

      try {
        // ✅ Use PageUtils.fetchJson
        const data = await PageUtils.fetchJson("/api/ssg/announcements", { method: "GET" });

        const list = document.getElementById("announcementsList");
        list.innerHTML = "";

        if (!data || !data.length) {
          list.innerHTML = "<p class='muted small'>No announcements yet.</p>"; // Use muted small for consistency
          return;
        }

        data.forEach(a => {
          const div = document.createElement("div");
          div.className = "announcement";
          div.innerHTML = `
            <h3>${PageUtils.escapeHtml(a.title)}</h3>
            <p>${PageUtils.escapeHtml(a.body)}</p>
            <small>Posted on ${PageUtils.niceDate(a.createdAt)}</small>
          `;
          list.appendChild(div);
        });
      } catch (err) {
        console.error("Error loading announcements:", err);
        document.getElementById("announcementsList").innerHTML = "<p class='muted small'>Failed to load announcements.</p>";
      }
    }
    document.addEventListener('DOMContentLoaded', loadAnnouncements); // Load on DOMContentLoaded
  </script>
</body>
</html>
