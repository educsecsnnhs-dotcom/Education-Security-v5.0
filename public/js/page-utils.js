// public/js/page-utils.js
// Unified frontend utilities (merged utils.js + page-utils.js)
// Includes:
// - DOM helpers
// - API fetch wrapper (credentials included, backend-safe)
// - Toast + confirm dialogs
// - Button disable/enable
// - Recent activity log
// - Header ticker + clock
// - Date/time + formatting helpers
// - Query param + debounce
// - HTML escape (now in welcome.js for consistency)
// Place in public/js/ and include FIRST on every page.

(function () {
  "use strict";

  /* ============================ DOM helpers ============================ */
  window.qs = (sel, ctx) => (ctx || document).querySelector(sel);
  window.qsa = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  window.el = function (tag, attrs = {}, children = []) {
    const d = document.createElement(tag);
    for (const k in attrs) {
      if (k === "style" && typeof attrs[k] === "object") {
        Object.assign(d.style, attrs[k]);
      } else if (k.startsWith("on") && typeof attrs[k] === "function") {
        d.addEventListener(k.slice(2), attrs[k]);
      } else if (k === "dataset" && typeof attrs[k] === "object") {
        for (const ds in attrs[k]) d.dataset[ds] = attrs[k][ds];
      } else {
        d.setAttribute(k, attrs[k]);
      }
    }
    (Array.isArray(children) ? children : [children]).forEach(c => {
      if (c === null || c === undefined) return;
      d.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return d;
  };

  /* ============================ API fetch wrapper ============================ */
  // This is the primary fetch wrapper for authenticated API calls
  window.PageUtils = window.PageUtils || {}; // Ensure PageUtils exists
  window.PageUtils.fetchJson = async function (path, options = {}) {
    // Ensure Auth object is available
    if (!window.Auth) {
      console.error("Auth object not loaded. Cannot make authenticated API calls.");
      throw new Error("Authentication system not initialized.");
    }

    const token = Auth.getToken(); // Get token using Auth object
    const baseOptions = { credentials: "include", headers: {} };
    let body = options.body;

    if (body && !(body instanceof FormData) && typeof body === "object") {
      baseOptions.headers["Content-Type"] = "application/json";
      try { body = JSON.stringify(body); } catch (err) {}
    }

    const fetchOpts = Object.assign({}, baseOptions, options, { body });
    fetchOpts.headers = Object.assign({}, baseOptions.headers, options.headers || {});

    if (token) {
      fetchOpts.headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(path, fetchOpts);

    // Handle unauthorized responses (token might have expired)
    if (res.status === 401 || res.status === 403) {
      Auth.logout(); // Use Auth object to clear token and redirect
      throw new Error("Unauthorized or Forbidden: Session expired."); // Stop further processing
    }

    const txt = await res.text();
    let data = null;
    try { data = txt ? JSON.parse(txt) : null; } catch { data = txt; }

    if (!res.ok) {
      const msg = (data && (data.message || data.error)) || res.statusText || "Request failed";
      const err = new Error(msg);
      err.status = res.status;
      err.body = data;
      throw err;
    }
    return data;
  };

  // Expose currentUser helper
  window.PageUtils.currentUser = async function() {
    if (!window.Auth) {
      console.error("Auth object not loaded. Cannot get current user.");
      return null;
    }
    return Auth.getUser(); // Get user from client-side decoded token
  };

  // Expose escapeHtml and niceDate for general use
  window.PageUtils.escapeHtml = function(str) {
    if (!str && str !== 0) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  };

  window.PageUtils.niceDate = function (dStr) {
    try {
      const d = new Date(dStr);
      return d.toLocaleString('en-PH', {
        timeZone: 'Asia/Manila',
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch (e) { return dStr; }
  };

  window.PageUtils.truncate = function(s,n){
    if(!s) return '';
    return s.length > n ? s.slice(0,n-1)+'…' : s;
  };


  /* ============================ Toast / Notification ============================ */
  (function () {
    const CONTAINER_ID = "global-toast-container-v1";

    function ensureContainer() {
      let c = document.getElementById(CONTAINER_ID);
      if (!c) {
        c = document.createElement("div");
        c.id = CONTAINER_ID;
        c.style.position = "fixed";
        c.style.right = "20px";
        c.style.top = "20px";
        c.style.zIndex = 99999;
        c.style.maxWidth = "360px";
        c.style.display = "flex";
        c.style.flexDirection = "column";
        c.style.gap = "8px";
        document.body.appendChild(c);
      }
      return c;
    }

    window.showToast = function (message, type = "info", timeout = 4000) {
      try {
        const c = ensureContainer();
        const el = document.createElement("div");
        el.className = "global-toast";
        el.style.padding = "10px 12px";
        el.style.borderRadius = "8px";
        el.style.boxShadow = "0 6px 18px rgba(0,0,0,0.08)";
        el.style.fontSize = "13px";
        el.style.lineHeight = "1.2";
        el.style.wordBreak = "break-word";
        el.style.background =
          (type === "error") ? "#ffe6e6" :
          (type === "success") ? "#eaffea" :
          "#f4f4f4";
        el.style.color = "#222";
        el.textContent = message;
        c.insertBefore(el, c.firstChild);
        setTimeout(() => {
          el.style.opacity = "0";
          setTimeout(() => el.remove(), 300);
        }, timeout);
      } catch { alert(message); }
    };

    window.showConfirm = function (message) {
      return window.confirm(message);
    };
  })();

  /* ============================ Button enable/disable ============================ */
  window.disableBtn = function (btn) {
    if (!btn) return;
    btn.dataset._wasDisabled = btn.disabled ? "1" : "0";
    btn.disabled = true;
    btn.style.opacity = 0.6;
    btn.style.pointerEvents = "none";
  };
  window.enableBtn = function (btn) {
    if (!btn) return;
    btn.disabled = btn.dataset._wasDisabled === "1";
    btn.style.opacity = 1;
    btn.style.pointerEvents = "auto";
  };

  /* ============================ Recent activity (local only) ============================ */
  window.logActivity = function (msg) {
    try {
      const key = "app_recent_activity_v1";
      const arr = JSON.parse(localStorage.getItem(key) || "[]");
      arr.unshift({ time: new Date().toISOString(), msg: String(msg) });
      if (arr.length > 50) arr.length = 50;
      localStorage.setItem(key, JSON.stringify(arr));
    } catch {}
  };
  window.getRecentActivity = function (limit = 5) {
    try {
      const key = "app_recent_activity_v1";
      const arr = JSON.parse(localStorage.getItem(key) || "[]");
      return arr.slice(0, limit);
    } catch { return []; }
  };

  /* ============================ Header + ticker + clock (Simplified) ============================ */
  // This is a simplified version. The main welcome.html header is handled by welcome.js and menu.js
  // This function is kept for compatibility if other pages use initHeaderTickerClock
  window.initHeaderTickerClock = async function (opts = {}) {
    const schoolName = opts.schoolName || "School Portal";
    const mountId = opts.mountId || "app-header";
    const mount = document.getElementById(mountId);
    if (!mount) return;

    mount.style.boxSizing = "border-box";
    mount.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 18px;border-bottom:1px solid #e9e9e9;background:#ffffff">
        <div style="display:flex;align-items:center;gap:14px">
          <div style="font-weight:700;font-size:18px">${PageUtils.escapeHtml(schoolName)}</div>
          <div id="${mountId}-ticker" style="font-size:13px;color:#555;max-width:640px;overflow:hidden;white-space:nowrap"></div>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <div id="${mountId}-role" style="font-size:13px;color:#333"></div>
          <div id="${mountId}-clock" style="font-size:13px;color:#333"></div>
          <button id="${mountId}-logout" style="padding:6px 10px;border-radius:6px;border:1px solid #ddd;background:#fff;cursor:pointer">Logout</button>
        </div>
      </div>
    `;

    const clockEl = document.getElementById(`${mountId}-clock`);
    function tick() { clockEl.textContent = new Date().toLocaleString(); }
    tick();
    setInterval(tick, 1000);

    const tickerEl = document.getElementById(`${mountId}-ticker`);
    (async function loadTicker() {
      try {
        const anns = await PageUtils.fetchJson("/api/announcements"); // Use PageUtils.fetchJson
        if (!Array.isArray(anns) || anns.length === 0) {
          tickerEl.textContent = "No announcements";
          return;
        }
        const txt = anns.map(a => `${a.title}: ${a.content}`).join(" • ");
        tickerEl.textContent = txt;
        let pos = 0;
        setInterval(() => {
          pos += 1;
          tickerEl.style.transform = `translateX(-${pos}px)`;
          if (pos > 2000) pos = 0;
        }, 150);
      } catch {
        tickerEl.textContent = "Announcements unavailable";
      }
    })();

    const roleEl = document.getElementById(`${mountId}-role`);
    try {
      const user = Auth.getUser(); // Use Auth.getUser()
      if (user) {
        const displayName = user.fullName || user.username || user.email || "User";
        roleEl.textContent = `${displayName} — ${user.role || "User"}`;
      } else {
        roleEl.textContent = "Not logged in";
      }
    } catch { roleEl.textContent = "Not logged in"; }

    const logoutBtn = document.getElementById(`${mountId}-logout`);
    logoutBtn.addEventListener("click", () => {
      Auth.logout(); // Use Auth.logout()
    });
  };

  /* ============================ Query helpers ============================ */
  window.getQueryParam = function (name) {
    return new URLSearchParams(window.location.search).get(name);
  };

  /* ============================ Debounce helper ============================ */
  window.debounce = function (fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  };

})();
