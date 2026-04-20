// ============================================
//   GHOST BOT DASHBOARD — app.js
//   Synchronisé avec index.js (bots{}, userPrefixes{}, PREFIX_LIST)
// ============================================

// ════════════════════════════════════════════
//  ⚙️  CONFIG
//  !! Modifiez ici — doit correspondre à index.js !!
// ════════════════════════════════════════════
const CONFIG = {
  // URL du bot — automatique en local ET sur Render
  botApiUrl: window.location.origin,

  // Intervalle de polling du status (ms)
  pollInterval: 4000,

  // Nombre max de logs gardés en mémoire
  maxLogs: 300,

  // ── Numéro owner prédéfini ──
  // Doit être identique à OWNER_NUMBER dans index.js
  ownerNumber: "237655562634",

  // ── Mot de passe admin ──
  // Changez directement ici
  adminPassword: "1234",
};

// ════════════════════════════════════════════
//  🗂  DICTIONNAIRE DES PRÉFIXES
//  Doit être IDENTIQUE à PREFIX_LIST dans index.js
//  Position 0 = owner, positions suivantes = autres utilisateurs
// ════════════════════════════════════════════
const PREFIX_LIST = ["#", "!", "*", "$", "&", "?", "%", "."];

// ════════════════════════════════════════════
//  STATE INTERNE
// ════════════════════════════════════════════
const state = {
  botConnected:      false,
  users:             [],      // [{ number, prefix, isOwner }]
  allLogs:           [],
  logFilter:         "all",
  logSearch:         "",
  autoScroll:        true,
  botStartTime:      null,    // reçu du serveur via /status → startTime
  dashStartTime:     Date.now(),
  messageCount:      0,
  logPointer:        0,       // index dans WEB_LOGS pour éviter les doublons
  toastTimer:        null,
  adminAuthenticated: false,
};

// ════════════════════════════════════════════
//  🚀  INITIALISATION
// ════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {
  initOwnerCard();
  initQR();
  startPolling();
  startUptimeCounter();
  fetchLogs(true);
  navigate("dashboard");
});

function startPolling() {
  checkStatus();
  setInterval(checkStatus, 5000);
  setInterval(() => fetchLogs(false), CONFIG.pollInterval);
}

// ════════════════════════════════════════════
//  🧭  NAVIGATION
// ════════════════════════════════════════════
function navigate(pageId, el) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-link").forEach(n => n.classList.remove("active"));

  const page = document.getElementById("page-" + pageId);
  if (page) page.classList.add("active");

  if (el) {
    el.classList.add("active");
  } else {
    const link = document.querySelector(`[data-page="${pageId}"]`);
    if (link) link.classList.add("active");
  }

  const titles = {
    dashboard:  "DASHBOARD",
    connection: "CONNEXION WHATSAPP",
    users:      "UTILISATEURS ACTIFS",
    terminal:   "TERMINAL LIVE",
    admin:      "ADMINISTRATEUR",
  };
  const titleEl = document.getElementById("pageTitle");
  if (titleEl) titleEl.textContent = titles[pageId] || pageId.toUpperCase();

  if (pageId === "terminal") renderTerminal();
  if (pageId === "users")    renderUsersPage();
  if (pageId === "admin")    renderAdminPage();
}

function handleAdminNav(el) {
  if (state.adminAuthenticated) {
    navigate("admin", el);
  } else {
    openAdminLogin(el);
  }
}

function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("collapsed");
  document.querySelector(".main").classList.toggle("expanded");
}

// ════════════════════════════════════════════
//  🔒  ADMIN LOGIN
// ════════════════════════════════════════════
let _adminNavEl = null;

function openAdminLogin(el) {
  _adminNavEl = el || null;
  const overlay = document.getElementById("adminLoginOverlay");
  const input   = document.getElementById("adminPasswordInput");
  const errEl   = document.getElementById("adminLoginError");
  if (overlay) overlay.classList.add("open");
  if (errEl)   errEl.style.display = "none";
  if (input)   { input.value = ""; setTimeout(() => input.focus(), 120); }
}

function closeAdminLogin() {
  const overlay = document.getElementById("adminLoginOverlay");
  if (overlay) overlay.classList.remove("open");
}

function submitAdminLogin() {
  const input = document.getElementById("adminPasswordInput");
  const errEl = document.getElementById("adminLoginError");
  const pass  = input ? input.value.trim() : "";

  if (pass === CONFIG.adminPassword) {
    state.adminAuthenticated = true;
    closeAdminLogin();
    showToast("🔓 Accès admin autorisé");
    const badge = document.getElementById("adminLockBadge");
    if (badge) { badge.textContent = "✓"; badge.style.background = "var(--accent3)"; }
    navigate("admin", _adminNavEl);
    _adminNavEl = null;
  } else {
    if (errEl) errEl.style.display = "block";
    if (input) { input.value = ""; input.focus(); }
  }
}

function logoutAdmin() {
  state.adminAuthenticated = false;
  const badge = document.getElementById("adminLockBadge");
  if (badge) { badge.textContent = "🔒"; badge.style.background = "#f59e0b"; }
  navigate("dashboard");
  showToast("🔒 Admin verrouillé");
}

// ════════════════════════════════════════════
//  👑  OWNER QUICK-CONNECT
//  Pré-remplit le numéro owner et appelle POST /connect
// ════════════════════════════════════════════
function initOwnerCard() {
  const numEl = document.getElementById("ownerNumberDisplay");
  const preEl = document.getElementById("ownerPrefixDisplay");
  if (numEl) numEl.textContent = "+" + CONFIG.ownerNumber;
  if (preEl) preEl.textContent = "Prefix assigné : " + PREFIX_LIST[0];
  updateOwnerCardStatus();
}

function updateOwnerCardStatus() {
  const btnEl = document.getElementById("ownerConnectBtn");
  if (!btnEl) return;
  // On vérifie si l'owner est déjà dans la liste des bots actifs
  const isConnected = state.users.some(u => u.number === CONFIG.ownerNumber);
  if (isConnected) {
    btnEl.innerHTML   = "✅ Connecté";
    btnEl.disabled    = true;
    btnEl.style.opacity = "0.65";
  } else {
    btnEl.innerHTML   = "⚡ Connecter";
    btnEl.disabled    = false;
    btnEl.style.opacity = "1";
  }
}

async function connectOwner() {
  const btnEl = document.getElementById("ownerConnectBtn");
  if (btnEl) { btnEl.innerHTML = "⏳..."; btnEl.disabled = true; }

  addLog("sys", `[OWNER] Demande de connexion: ${CONFIG.ownerNumber}`);

  try {
    const res  = await fetch(`${CONFIG.botApiUrl}/connect`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ number: CONFIG.ownerNumber, isOwner: true }),
    });
    const data = await res.json();

    if (data.code) {
      // Naviguer vers la page connexion et afficher le code
      navigate("connection", document.querySelector("[data-page=connection]"));
      const box  = document.getElementById("pairCodeBox");
      const code = document.getElementById("pairCodeValue");
      const pref = document.getElementById("pairPrefixValue");
      if (box)  box.style.display = "block";
      if (code) code.textContent = data.code;
      if (pref) pref.textContent = "Prefix Owner : " + (data.prefix || PREFIX_LIST[0]);
      showToast("👑 Code owner généré — Entrez-le dans WhatsApp");
      addLog("success", `[OWNER] Code: ${data.code} — Prefix: ${data.prefix || PREFIX_LIST[0]}`);
    } else {
      showToast("❌ " + (data.message || "Erreur connexion owner"));
      addLog("error", `[OWNER] Échec: ${data.message || "Erreur inconnue"}`);
    }
  } catch (e) {
    showToast("❌ Impossible de joindre le bot");
    addLog("error", `[OWNER] Erreur réseau: ${e.message}`);
  }

  updateOwnerCardStatus();
}

// ════════════════════════════════════════════
//  🔄  POLLING STATUS — GET /status
//  Récupère: connected, list[{number,prefix,isOwner}], startTime, messages
// ════════════════════════════════════════════
async function checkStatus() {
  try {
    const res  = await fetch(`${CONFIG.botApiUrl}/status`);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();

    state.botConnected = !!data.connected;
    state.messageCount = data.messages  || state.messageCount;

    // startTime = timestamp Node.js du démarrage du processus (BOT_START_TIME)
    if (data.startTime) state.botStartTime = data.startTime;

    // La liste vient directement du serveur avec les préfixes déjà assignés
    // (index.js remplit userPrefixes[number] à la connexion)
    state.users = (data.list || []).map((u, idx) => ({
      ...u,
      // Si le serveur n'a pas fourni de préfixe (ne devrait pas arriver),
      // on assigne selon la position comme fallback
      prefix:  u.prefix  || PREFIX_LIST[idx % PREFIX_LIST.length],
      isOwner: u.number === CONFIG.ownerNumber,
    }));

    updateStatusUI();
    updateDashboard();
    updateNavBadges();
    updateOwnerCardStatus();

  } catch (e) {
    // Bot non accessible (pas encore démarré ou plantage)
    state.botConnected = false;
    state.users = [];
    updateStatusUI();
    updateDashboard();
  }
}

// ════════════════════════════════════════════
//  🖥  MISE À JOUR DE L'INTERFACE
// ════════════════════════════════════════════
function updateStatusUI() {
  const connected = state.botConnected;

  // Points de statut (sidebar + topbar)
  document.querySelectorAll(".status-dot").forEach(d => {
    d.className = "status-dot " + (connected ? "online" : "offline");
  });

  const topText  = document.getElementById("topbarStatusText");
  const sideText = document.getElementById("sidebarStatusText");
  if (topText)  topText.textContent  = connected ? "Bot En ligne"  : "Bot Hors ligne";
  if (sideText) sideText.textContent = connected ? "En ligne"       : "Hors ligne";

  const sideCount = document.getElementById("sidebarUserCount");
  if (sideCount) sideCount.textContent = state.users.length;

  // Alerte bannière dashboard
  const alertEl  = document.getElementById("dashAlert");
  const alertTxt = document.getElementById("alertText");
  if (alertEl && alertTxt) {
    if (connected) {
      alertEl.className   = "dash-alert";
      alertTxt.textContent = `✅ Ghost Bot opérationnel — ${state.users.length} utilisateur(s) connecté(s)`;
    } else {
      alertEl.className   = "dash-alert danger";
      alertTxt.textContent = "⛔ Ghost Bot hors ligne — Lancez node index.js puis actualisez";
    }
  }

  // Infos admin
  const adminStatus = document.getElementById("adminRenderStatus");
  if (adminStatus) adminStatus.textContent = connected ? "✅ Actif" : "❌ Hors ligne";

  const adminMsg = document.getElementById("adminMessages");
  if (adminMsg) adminMsg.textContent = state.messageCount.toLocaleString();
}

function updateDashboard() {
  const g = id => document.getElementById(id);
  if (g("statOnline"))   g("statOnline").textContent   = state.users.length;
  if (g("statMessages")) g("statMessages").textContent = state.messageCount.toLocaleString();

  const list = g("dashUsersList");
  if (!list) return;

  if (state.users.length === 0) {
    list.innerHTML = '<div class="users-empty">👻 Aucun utilisateur connecté</div>';
    return;
  }

  list.innerHTML = state.users.map((u, i) => `
    <div class="user-item">
      <div class="user-avatar" style="${u.isOwner
        ? 'background:linear-gradient(135deg,#f59e0b,#ef4444)'
        : 'background:linear-gradient(135deg,var(--accent),var(--accent2))'}">
        ${u.isOwner ? "👑" : "U" + (i + 1)}
      </div>
      <div class="user-info">
        <div class="user-number">
          ${u.isOwner ? "Utilisateur Owner" : "Utilisateur " + (i + 1)}
        </div>
        <div class="user-prefix">Statut : <b>En ligne</b></div>
      </div>
      <span style="font-size:11px;color:var(--accent3);font-weight:700">● ACTIF</span>
    </div>
  `).join("");
}

function updateNavBadges() {
  const badge = document.getElementById("navConnBadge");
  if (badge) badge.textContent = state.users.length;
}

// ════════════════════════════════════════════
//  CONNEXION / DÉCONNEXION
// ════════════════════════════════════════════
async function connectBot() {
  const numInput = document.getElementById("pairNumber");
  if (!numInput) return;
  const number = numInput.value.replace(/[^0-9]/g, "");
  if (!number) { showToast("❌ Entrez votre numéro"); return; }

  const btn = document.getElementById("connectBtnText");
  if (btn) btn.textContent = "⏳ Connexion...";
  addLog("sys", `[CONNECT] Tentative pour: ${number}`);

  try {
    const res  = await fetch(`${CONFIG.botApiUrl}/connect`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ number }),
    });
    const data = await res.json();

    if (data.code) {
      const box  = document.getElementById("pairCodeBox");
      const code = document.getElementById("pairCodeValue");
      const pref = document.getElementById("pairPrefixValue");
      if (box)  box.style.display   = "block";
      if (code) code.textContent    = data.code;
      if (pref) pref.textContent    = "Prefix attribué : " + (data.prefix || "?");
      showToast("✅ Code généré — Entrez-le dans WhatsApp");
      addLog("success", `[CONNECT] Code: ${data.code} — Prefix: ${data.prefix}`);
    } else {
      showToast("❌ " + (data.message || "Erreur de connexion"));
      addLog("error",   `[CONNECT] Échec: ${data.message}`);
    }
  } catch (e) {
    showToast("❌ Impossible de joindre le bot");
    addLog("error", `[CONNECT] Erreur réseau: ${e.message}`);
  }

  if (btn) btn.textContent = "⚡ Connecter";
}

async function disconnectBot() {
  const numInput = document.getElementById("pairNumber");
  const number   = numInput ? numInput.value.replace(/[^0-9]/g, "") : "";
  if (!number) { showToast("❌ Entrez votre numéro"); return; }
  doDisconnect(number);
}

async function disconnectUser(number) {
  openModal(
    "Déconnecter l'utilisateur",
    `Voulez-vous vraiment déconnecter le numéro ${number} ?`,
    () => doDisconnect(number)
  );
}

async function doDisconnect(number) {
  try {
    const res  = await fetch(`${CONFIG.botApiUrl}/disconnect`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ number }),
    });
    const data = await res.json();

    if (data.success) {
      showToast("✅ " + number + " déconnecté");
      addLog("warn", `[DISCONNECT] ${number} retiré`);
      const box = document.getElementById("pairCodeBox");
      if (box) box.style.display = "none";
      checkStatus();
    } else {
      showToast("⚠️ " + (data.message || "Utilisateur introuvable"));
    }
  } catch (e) {
    showToast("❌ Erreur réseau");
    addLog("error", `[DISCONNECT] Erreur: ${e.message}`);
  }
}

// ════════════════════════════════════════════
//  👥  PAGE UTILISATEURS
// ════════════════════════════════════════════
function renderUsersPage() {
  const slots = document.getElementById("usersSlots");
  const badge = document.getElementById("userCountBadge");
  if (!slots) return;
  if (badge) badge.textContent = `${state.users.length} / ${4} connectés`;

  let html = "";
  // Afficher jusqu'à MAX_USERS slots (4 comme dans index.js)
  for (let i = 0; i < 4; i++) {
    const u = state.users[i];
    if (u) {
      html += `
        <div class="slot-card occupied">
          <div class="slot-num">SLOT ${i + 1}</div>
          <div class="user-avatar" style="${u.isOwner
            ? 'background:linear-gradient(135deg,#f59e0b,#ef4444)'
            : 'background:linear-gradient(135deg,var(--accent),var(--accent2))'}">
            ${u.isOwner ? "👑" : "U" + (i + 1)}
          </div>
          <div class="slot-info">
            <div class="slot-phone">
              ${u.isOwner ? "Utilisateur Owner" : "Utilisateur " + (i + 1)}
            </div>
            <div class="slot-prefix">Prefix : <b>Masqué</b></div>
          </div>
          <span style="font-size:11px;color:var(--accent3);font-weight:700;margin-right:16px">● ACTIF</span>
        </div>`;
    } else {
      html += `
        <div class="slot-card">
          <div class="slot-num">SLOT ${i + 1}</div>
          <div class="user-avatar" style="background:var(--surface2);color:var(--muted)">—</div>
          <div class="slot-info">
            <div class="slot-empty">Emplacement disponible</div>
          </div>
          <button class="btn btn-ghost btn-sm"
            onclick="navigate('connection',document.querySelector('[data-page=connection]'))">
            + Connecter
          </button>
        </div>`;
    }
  }
  slots.innerHTML = html;
}

// ════════════════════════════════════════════
//  🛡  PAGE ADMIN
// ════════════════════════════════════════════
function renderAdminPage() {
  const urlEl = document.getElementById("adminBotUrl");
  if (urlEl) urlEl.textContent = CONFIG.botApiUrl;

  renderPrefixDict();

  const list = document.getElementById("adminUsersList");
  if (!list) return;

  if (state.users.length === 0) {
    list.innerHTML = '<div class="users-empty">Aucun utilisateur connecté</div>';
    return;
  }

  list.innerHTML = state.users.map(u => `
    <div class="admin-user-row">
      <div class="user-avatar" style="${u.isOwner
        ? 'background:linear-gradient(135deg,#f59e0b,#ef4444)'
        : 'background:linear-gradient(135deg,var(--accent),var(--accent2))'}">
        ${u.isOwner ? "👑" : initials(u.number)}
      </div>
      <div class="admin-user-info">
        <div style="font-size:14px;font-weight:700">
          ${u.number}
          ${u.isOwner ? '<span style="color:var(--warn);margin-left:6px">[Owner]</span>' : ""}
        </div>
        <div style="font-size:11px;color:var(--accent2);font-family:'Space Mono',monospace">
          Prefix : <b>${u.prefix || "?"}</b>
        </div>
      </div>
      <span style="font-size:11px;color:var(--accent3);font-weight:700;flex:1;text-align:right;margin-right:12px">
        ● EN LIGNE
      </span>
      <div class="admin-user-actions">
        <button class="btn btn-danger btn-sm" onclick="disconnectUser('${u.number}')">
          ✕ Retirer
        </button>
      </div>
    </div>`
  ).join("");
}

function renderPrefixDict() {
  const dict = document.getElementById("prefixDict");
  if (!dict) return;

  if (state.users.length === 0) {
    dict.innerHTML = '<div class="users-empty">Aucun préfixe assigné pour l\'instant</div>';
    return;
  }

  dict.innerHTML = state.users.map(u => `
    <div class="prefix-row">
      <span class="prefix-row-num">
        ${u.isOwner ? "👑 " : ""}${u.number}
      </span>
      <span class="prefix-row-badge">${u.prefix || "?"}</span>
    </div>
  `).join("");
}

// ════════════════════════════════════════════
//  📋  TERMINAL — GET /logs (WEB_LOGS de index.js)
// ════════════════════════════════════════════
async function fetchLogs(force = false) {
  try {
    const res = await fetch(`${CONFIG.botApiUrl}/logs`);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    if (!Array.isArray(data)) return;

    // Ajouter seulement les nouveaux logs (state.logPointer = dernier index connu)
    const newLogs = data.slice(state.logPointer);
    newLogs.forEach(l => {
      addLog(detectLevel(l.msg || ""), l.msg || "", l.time || null, false);
    });
    state.logPointer = data.length;

    if (newLogs.length > 0 || force) renderTerminal();

    const lastUpd = document.getElementById("termLastUpdate");
    if (lastUpd) lastUpd.textContent = "Dernière MàJ: " + nowTime();

  } catch (e) {
    // Bot pas encore démarré — silencieux
  }
}

function addLog(level, msg, time, render = true) {
  state.allLogs.push({
    level: level || "info",
    msg:   msg   || "",
    time:  time  || nowTime(),
  });
  if (state.allLogs.length > CONFIG.maxLogs) state.allLogs.shift();
  if (render) renderTerminal();
}

function renderTerminal() {
  const body = document.getElementById("terminalBody");
  if (!body) return;

  const filtered = state.allLogs.filter(l => {
    const lvlOk    = state.logFilter === "all" || l.level === state.logFilter;
    const searchOk = !state.logSearch || l.msg.toLowerCase().includes(state.logSearch.toLowerCase());
    return lvlOk && searchOk;
  });

  if (filtered.length === 0) {
    body.innerHTML = `
      <div class="term-line">
        <span class="ttime">--:--:--</span>
        <span class="tlevel debug">SYS</span>
        <span class="tmsg">Aucun log correspondant. En attente...</span>
      </div>`;
  } else {
    body.innerHTML = filtered.map(l => `
      <div class="term-line" data-level="${l.level}">
        <span class="ttime">${l.time}</span>
        <span class="tlevel ${l.level}">${l.level.toUpperCase()}</span>
        <span class="tmsg">${escapeHtml(l.msg)}</span>
      </div>`).join("");
  }

  if (state.autoScroll) body.scrollTop = body.scrollHeight;

  const cnt = document.getElementById("termLogCount");
  if (cnt) cnt.textContent = filtered.length + " logs";

  const src = document.getElementById("termRenderStatus");
  if (src) src.textContent = "Source: /logs";
}

function clearTerminal() {
  state.allLogs    = [];
  state.logPointer = 0;
  renderTerminal();
  showToast("🗑 Terminal vidé");
}

function exportLogs() {
  const text = state.allLogs.map(l =>
    `[${l.time}] [${l.level.toUpperCase()}] ${l.msg}`
  ).join("\n");
  const blob = new Blob([text], { type: "text/plain" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `ghost-bot-logs-${new Date().toISOString().slice(0,10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("⬇ Logs exportés !");
}

function setFilter(level, btn) {
  state.logFilter = level;
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  renderTerminal();
}

function filterLogs(q) {
  state.logSearch = q;
  renderTerminal();
}

function toggleAutoScroll() {
  state.autoScroll = !state.autoScroll;
  const btn = document.getElementById("autoScrollBtn");
  if (btn) btn.classList.toggle("active", state.autoScroll);
  showToast(state.autoScroll ? "↓ Auto-scroll activé" : "↑ Auto-scroll désactivé");
}

// ════════════════════════════════════════════
//  ⏱  UPTIME — basé sur BOT_START_TIME (index.js)
//  Le serveur envoie startTime dans /status
//  → uptime = Date.now() - startTime (uptime réel du processus Node)
// ════════════════════════════════════════════
function startUptimeCounter() {
  setInterval(() => {
    let display = "--:--:--";

    if (state.botStartTime) {
      // Uptime réel du processus Node.js
      display = formatUptime(Date.now() - state.botStartTime);
    }

    ["sidebarUptime", "statUptime", "adminUptime"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = display;
    });
  }, 1000);
}

function formatUptime(ms) {
  if (ms < 0) ms = 0;
  const s   = Math.floor(ms / 1000);
  const h   = Math.floor(s / 3600);
  const m   = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

function pad(n) { return String(n).padStart(2, "0"); }

// ════════════════════════════════════════════
//  📷  QR CODE (visuel simulé)
// ════════════════════════════════════════════
let qrTimerVal = 45;

function initQR() {
  generateQR();
  setInterval(() => {
    qrTimerVal--;
    const el = document.getElementById("qrTimer");
    if (el) el.textContent = qrTimerVal + "s";
    if (qrTimerVal <= 0) { qrTimerVal = 45; generateQR(); }
  }, 1000);
}

function generateQR() {
  const inner = document.getElementById("qrInner");
  if (!inner) return;
  inner.innerHTML = "";
  for (let i = 0; i < 100; i++) {
    const r      = Math.floor(i / 10), c = i % 10;
    const corner = (r < 3 && c < 3) || (r < 3 && c > 6) || (r > 6 && c < 3);
    const cell   = document.createElement("div");
    cell.className = "qr-cell " + (corner || Math.random() > 0.5 ? "qr-dark" : "qr-light");
    inner.appendChild(cell);
  }
}

function regenQR() {
  qrTimerVal = 45;
  generateQR();
  showToast("🔄 Nouveau QR Code généré");
}

function selectMode(mode) {
  const cardPair = document.getElementById("cardPair");
  const cardQR   = document.getElementById("cardQR");
  const secPair  = document.getElementById("sectionPair");
  const secQR    = document.getElementById("sectionQR");
  if (!cardPair) return;

  if (mode === "pair") {
    cardPair.classList.add("selected");   cardQR.classList.remove("selected");
    secPair.style.display = "block";      secQR.style.display  = "none";
    cardPair.querySelector(".conn-check").style.display = "flex";
    cardQR.querySelector(".conn-check").style.display   = "none";
  } else {
    cardQR.classList.add("selected");     cardPair.classList.remove("selected");
    secQR.style.display  = "block";       secPair.style.display = "none";
    cardQR.querySelector(".conn-check").style.display   = "flex";
    cardPair.querySelector(".conn-check").style.display = "none";
  }
}

// ════════════════════════════════════════════
//  🪟  MODAL DE CONFIRMATION
// ════════════════════════════════════════════
let pendingAction = null;

function openModal(title, msg, onConfirm) {
  const modal = document.getElementById("confirmModal");
  if (!modal) return;
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("modalMsg").textContent   = msg;
  pendingAction = onConfirm;
  modal.classList.add("open");
  document.getElementById("modalConfirmBtn").onclick = () => {
    closeModal();
    if (pendingAction) pendingAction();
  };
}

function closeModal() {
  const modal = document.getElementById("confirmModal");
  if (modal) modal.classList.remove("open");
  pendingAction = null;
}

// ════════════════════════════════════════════
//  🍞  TOAST
// ════════════════════════════════════════════
function showToast(msg) {
  const toast    = document.getElementById("toast");
  const toastMsg = document.getElementById("toastMsg");
  if (!toast || !toastMsg) return;
  toastMsg.textContent = msg;
  toast.classList.add("show");
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}

// ════════════════════════════════════════════
//  🔧  UTILITAIRES
// ════════════════════════════════════════════
function initials(number) {
  return number ? String(number).slice(-2).toUpperCase() : "??";
}

function nowTime() {
  return new Date().toTimeString().slice(0, 8);
}

function detectLevel(msg) {
  const m = String(msg).toLowerCase();
  if (m.includes("error") || m.includes("erreur") || m.includes("❌") || m.includes("fail")) return "error";
  if (m.includes("warn")  || m.includes("⚠"))                                                 return "warn";
  if (m.includes("✅")    || m.includes("success") || m.includes("connecté") || m.includes("ok")) return "success";
  if (m.includes("debug"))                                                                     return "debug";
  return "info";
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
