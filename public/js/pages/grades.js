// public/js/pages/grades.js
(async function () {
  const el = (id) => document.getElementById(id);

  // 🔹 No need for authHeaders function here, PageUtils.fetchJson handles it

  async function loadViews() {
    const sel = el("gradeViewSelect");
    sel.innerHTML = '<option value="">Loading...</option>';

    // Ensure Auth object is available
    if (!window.Auth) {
      console.error("Auth object not loaded. Ensure public/js/auth.js is included before grades.js.");
      Auth.logout();
      return;
    }

    const user = Auth.getUser(); // Get user from client-side decoded token
    sel.innerHTML = "";

    if (!user) {
      sel.innerHTML = '<option value="">No user</option>';
      return;
    }

    if (user.role === "Student") {
      sel.innerHTML = '<option value="me">My Grades</option>';
    } else {
      try {
        // ✅ Use PageUtils.fetchJson
        const sections = await PageUtils.fetchJson("/api/registrar/sections", { method: 'GET' }); // Assuming this endpoint lists sections
        (sections.data || sections).forEach((it) => {
          const o = document.createElement("option");
          o.value = "section:" + (it._id || it.id);
          o.textContent = PageUtils.escapeHtml(it.name || it.title);
          sel.appendChild(o);
        });

        // Assuming there's an API endpoint for subjects if needed for non-students
        // const subjectsRes = await PageUtils.fetchJson("/api/subjects", { headers: authHeaders(), });
        // if (subjectsRes.ok) {
        //   const subjects = await subjectsRes.json();
        //   (subjects.data || subjects).forEach((it) => {
        //     const o = document.createElement("option");
        //     o.value = "subject:" + (it._id || it.id);
        //     o.textContent = "Subject: " + (it.name || it.title);
        //     sel.appendChild(o);
        //   });
        // }
      } catch (e) {
        console.error("Error loading views", e);
      }

      sel.insertAdjacentHTML(
        "beforeend",
        '<option value="all">All Grades</option>'
      );
    }
  }

  async function loadGrades() {
    const v = el("gradeViewSelect").value;
    const container = el("gradesContainer");
    container.innerHTML = '<div class="muted small">Loading grades…</div>';

    try {
      let data = null;
      if (v === "me") {
        // ✅ Use PageUtils.fetchJson
        data = await PageUtils.fetchJson("/api/student/grades", { method: 'GET' });
      } else if (v && v.startsWith("section:")) {
        const sec = v.split(":", 2)[1];
        // ✅ Use PageUtils.fetchJson
        data = await PageUtils.fetchJson(`/api/grades?sectionId=${sec}`, { method: 'GET' }); // Assuming endpoint takes sectionId
      } else if (v && v.startsWith("subject:")) {
        const sub = v.split(":", 2)[1];
        // ✅ Use PageUtils.fetchJson
        data = await PageUtils.fetchJson(`/api/grades?subjectId=${sub}`, { method: 'GET' }); // Assuming endpoint takes subjectId
      } else if (v === "all") {
        // ✅ Use PageUtils.fetchJson
        data = await PageUtils.fetchJson("/api/grades", { method: 'GET' }); // Assuming a general grades endpoint
      } else {
        container.innerHTML = '<div class="muted small">Select a view to load grades.</div>';
        return;
      }

      const items = data.data || data.grades || data || []; // Handle various response formats

      if (!items.length) {
        container.innerHTML =
          '<div class="muted small">No grades found.</div>';
        return;
      }

      const table = document.createElement("div");
      table.innerHTML = `
        <div style="overflow:auto">
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr>
                <th>Student</th><th>Subject</th><th>Grade</th><th>Actions</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>`;
      const tbody = table.querySelector("tbody");

      items.forEach((g) => {
        const tr = document.createElement("tr");
        const student =
          g.studentName ||
          (g.student && g.student.name) ||
          g.name ||
          "Student";
        const subject =
          g.subjectName || (g.subject && g.subject.name) || g.subject || "";
        const grade = g.grade || g.score || "";

        tr.innerHTML = `
          <td style="padding:8px;border-top:1px solid #eef2ff">${PageUtils.escapeHtml(
            student
          )}</td>
          <td style="padding:8px;border-top:1px solid #eef2ff">${PageUtils.escapeHtml(
            subject
          )}</td>
          <td style="padding:8px;border-top:1px solid #eef2ff">
            <input data-id="${g._id || g.id}" value="${PageUtils.escapeHtml(
          String(grade)
        )}" class="input" style="width:80px"/>
          </td>
          <td style="padding:8px;border-top:1px solid #eef2ff">
            <button class="btn ghost updateBtn">Update</button>
          </td>`;
        tbody.appendChild(tr);
      });

      container.innerHTML = "";
      container.appendChild(table);

      container.querySelectorAll(".updateBtn").forEach((btn) => {
        btn.addEventListener("click", async (ev) => {
          const input = ev.target.closest("tr").querySelector("input");
          const id = input.getAttribute("data-id");
          const value = input.value;

          try {
            // ✅ Use PageUtils.fetchJson
            const r = await PageUtils.fetchJson(`/api/grades/${id}`, { // Assuming PUT /api/grades/:id to update
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ grade: value }),
            });
            // PageUtils.fetchJson throws on !res.ok
            showToast("Updated", "success");
            loadGrades();
          } catch (e) {
            console.error(e);
            showToast("Error updating grade: " + (e.message || e), "error");
          }
        });
      });
    } catch (e) {
      console.error(e);
      container.innerHTML =
        '<div class="muted small">Failed to load grades.</div>';
    }
  }

  el("loadGrades").addEventListener("click", loadGrades);

  el("logoutBtn")?.addEventListener("click", () => {
    Auth.logout(); // ✅ Use Auth.logout()
  });

  loadViews();
})();
