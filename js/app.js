// ─── COOKIE MANAGEMENT ────────────────────────────────────────────────────────
// Cookie-based session persistence with localStorage fallback

const COOKIE_NAME = 'aal_session_id';
const COOKIE_EXPIRY_DAYS = 365;

function setCookie(name, value, days) {
  try {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = `expires=${date.toUTCString()}`;
    document.cookie = `${name}=${value};${expires};path=/;SameSite=Lax`;
    return true;
  } catch(e) {
    console.warn('Failed to set cookie:', e);
    return false;
  }
}

function getCookie(name) {
  try {
    const nameEQ = `${name}=`;
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length);
    }
  } catch(e) {
    console.warn('Failed to read cookie:', e);
  }
  return null;
}

function deleteCookie(name) {
  try {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`;
  } catch(e) {
    console.warn('Failed to delete cookie:', e);
  }
}

// ─── LENS CONSTANTS ───────────────────────────────────────────────────────────
// The six Well-Architected pillars in Lens order. Names must match the
// `pillar` field of the generated items and the `pillars[].name` in lens.json.
const PILLARS       = ['Operational excellence', 'Security', 'Reliability', 'Performance efficiency', 'Cost optimization', 'Sustainability'];
const PILLAR_SHORT  = ['OpEx', 'Security', 'Reliability', 'Performance', 'Cost', 'Sustainability'];
const PILLAR_ABBR   = ['OPS', 'SEC', 'REL', 'PERF', 'COST', 'SUS'];
const PILLAR_PREFIX = ['AGENTOPS', 'AGENTSEC', 'AGENTREL', 'AGENTPERF', 'AGENTCOST', 'AGENTSUS'];
// Mirrors --r1..--r6 in css/styles.css
const PILLAR_COLORS = ['#FF9900', '#ff6b6b', '#b47aff', '#4da6ff', '#ffd93d', '#3ecf8e'];
const RISK_COLORS   = { High: '#ff4757', Medium: '#f5c518', Low: '#3ecf8e' };

const SCORING_OPTIONS = [
  {label:'-- Select an option --',       value: null},
  {label:'100% — Full coverage',          value: 1},
  {label:'75% — Advanced coverage',       value: 0.75},
  {label:'50% — Medium coverage',         value: 0.5},
  {label:'25% — Starting coverage',       value: 0.25},
  {label:'0% — Not aligned',              value: 0},
  {label:'Excluded from analysis',        value: 'na'}
];

function pillarIdx(name)  { return PILLARS.indexOf(name); }
function pillarColor(name){ const i = pillarIdx(name); return i >= 0 ? PILLAR_COLORS[i] : 'var(--aws)'; }
function faShort(id)      { return String(id || '').replace(/^AGENT/, ''); }
function faColor(fa)      { return fa ? pillarColor(fa.pillar) : 'var(--aws)'; }
function pillarClassList(){ return PILLARS.map((_, i) => 'active-p' + i); }
function roadmapLabel(id) { return (LENS.roadmap || []).find(r => r.id === id)?.label || id; }

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// Inline markdown (links, emphasis) -> HTML. Falls back to escaped text.
function mdInline(s) {
  try {
    if (typeof marked !== 'undefined' && typeof marked.parseInline === 'function') return marked.parseInline(String(s || ''));
  } catch(e) { /* fall through */ }
  return escapeHtml(s);
}

// ─── DATA LOADER ──────────────────────────────────────────────────────────────
let DATA = [];
let FOCUS_AREAS = [];
const FA_BY_ID = {};
let LENS = {};

async function loadData() {
  const bust = `?v=${Date.now()}`;
  const fetchJson = async path => {
    const r = await fetch(path + bust);
    if (!r.ok) throw new Error(`Failed to load ${path} (HTTP ${r.status})`);
    return r.json();
  };

  const res = await fetch('data/manifest.json' + bust);
  if (!res.ok) throw new Error(`Could not load data/manifest.json (HTTP ${res.status})`);
  const manifest = await res.json();

  const [lens, focusAreas, ...items] = await Promise.all([
    fetchJson(manifest.lens || 'data/lens/lens.json'),
    fetchJson(manifest.focus_areas || 'data/lens/focus_areas.json'),
    ...manifest.items.map(async path => {
      const item = await fetchJson(path);
      item._guidancePath = path.replace(/^data\//, 'guidance/').replace(/\.json$/, '.md');
      item._hasGuidance = true; // generated 1:1 with the data files
      return item;
    })
  ]);

  LENS = lens || {};
  FOCUS_AREAS = focusAreas || [];
  Object.keys(FA_BY_ID).forEach(k => delete FA_BY_ID[k]);
  FOCUS_AREAS.forEach(fa => { FA_BY_ID[fa.id] = fa; });

  const lensPillars = (LENS.pillars || []).map(p => p.name);
  if (lensPillars.length && lensPillars.join('|') !== PILLARS.join('|')) {
    console.warn('lens.json pillar names differ from PILLARS constant:', lensPillars);
  }

  DATA = items;
  DATA.sort((a, b) => {
    const pd = pillarIdx(a.pillar) - pillarIdx(b.pillar);
    if (pd !== 0) return pd;
    const fd = String(a.focus_area_id).localeCompare(String(b.focus_area_id), undefined, { numeric: true });
    if (fd !== 0) return fd;
    return String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
  });
}

// STATE
const scores = {};
const comments = {};
let activePillarFilter  = 'all';   // 'all' | 'unassessed' | 'excluded' | '0'..'5'
let activeFaFilter      = 'all';   // 'all' | focus area id
let activeRoadmapFilter = 'all';   // 'all' | roadmap path id
const collapsedPillars  = new Set();

// STORAGE
const STORAGE_KEY = 'aal_sessions_v1';
const CURRENT_SESSION_KEY = 'aal_current_session_v1';

let sessions = {};
let currentSessionId = null;

function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function formatDate(date) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const d = new Date(date);
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function loadSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      sessions = JSON.parse(raw);
    }

    // Try to load session ID from cookie first, then fallback to localStorage
    let currentId = getCookie(COOKIE_NAME);
    if (!currentId) {
      currentId = localStorage.getItem(CURRENT_SESSION_KEY);
    }

    if (currentId && sessions[currentId]) {
      currentSessionId = currentId;
    } else {
      // Create default session if none exists
      const defaultId = generateSessionId();
      sessions[defaultId] = {
        id: defaultId,
        name: 'Default Session',
        date: new Date().toISOString(),
        isDefault: true,
        scores: {},
        comments: {}
      }
      currentSessionId = defaultId;
      saveSessions();
    }
    loadCurrentSession();
    updateSessionUI();
  } catch(e) {
    console.error('Error loading sessions:', e);
  }
}

function saveSessions() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    localStorage.setItem(CURRENT_SESSION_KEY, currentSessionId);

    // Persist current session ID in cookie
    setCookie(COOKIE_NAME, currentSessionId, COOKIE_EXPIRY_DAYS);
  } catch(e) {
    console.error('Error saving sessions:', e);
  }
}

function loadCurrentSession() {
  if (!currentSessionId || !sessions[currentSessionId]) return;
  const session = sessions[currentSessionId];
  Object.keys(scores).forEach(k => delete scores[k]);
  Object.keys(comments).forEach(k => delete comments[k]);
  if (session.scores) Object.assign(scores, session.scores);
  if (session.comments) Object.assign(comments, session.comments);
}

function saveCurrentSession() {
  if (!currentSessionId || !sessions[currentSessionId]) return;
  sessions[currentSessionId].scores = {...scores};
  sessions[currentSessionId].comments = {...comments};
  saveSessions();
}

function saveSession() {
  saveCurrentSession();
}

function loadSession() {
  loadSessions();
  return Object.keys(scores).length > 0;
}

function updateSessionUI() {
  if (!currentSessionId || !sessions[currentSessionId]) return;
  const session = sessions[currentSessionId];
  document.getElementById('currentSessionName').textContent = session.name;
  document.getElementById('currentSessionDate').textContent = formatDate(session.date);
  renderSessionList();
}

function renderSessionList() {
  const list = document.getElementById('sessionList');
  list.innerHTML = '';

  const sortedSessions = Object.values(sessions)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const visibleSessions = sortedSessions.slice(0, 10);

  visibleSessions.forEach(session => {
    const div = document.createElement('div');
    const canDelete = sortedSessions.length > 1 && !session.isDefault;
    div.className = 'session-item' + (session.id === currentSessionId ? ' active' : '');
    div.innerHTML = `
      <div class="session-item-icon">📊</div>
        <div class="session-item-info">
        <div class="session-item-name">${escapeHtml(session.name)}</div>
        <div class="session-item-date">${formatDate(session.date)}</div>
      </div>
      ${canDelete ? `<button class="session-item-delete" onclick="deleteSession('${session.id}', event)">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
      </button>` : ''}
    `;
    div.onclick = () => switchSession(session.id);
    list.appendChild(div);
  });

  if (sortedSessions.length > 10) {
    const more = document.createElement('div');
    more.style.cssText = 'text-align:center;padding:8px;font-size:10px;font-family:Roboto Mono,monospace;color:var(--text-dim);border-top:1px solid var(--border);margin-top:4px';
    more.textContent = `+${sortedSessions.length - 10} more sessions (oldest hidden)`;
    list.appendChild(more);
  }
}

function switchSession(sessionId) {
  if (sessionId === currentSessionId) {
    toggleSessionDropdown();
    return;
  }
  currentSessionId = sessionId;
  loadCurrentSession();
  updateSessionUI();
  renderCards();
  updateScores();
  toggleSessionDropdown();

  const toast = document.getElementById('savedToast');
  toast.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5.5" stroke="#00d97e"/><path d="M3.5 6l2 2 3-3" stroke="#00d97e" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg> Session loaded`;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5.5" stroke="#00d97e"/><path d="M3.5 6l2 2 3-3" stroke="#00d97e" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg> Session saved`;
    }, 300);
  }, 1800);
}

function toggleSessionDropdown() {
  const dropdown = document.getElementById('sessionDropdown');
  dropdown.classList.toggle('open');
}

function openNewSessionModal() {
  document.getElementById('newSessionModal').classList.add('open');
  document.getElementById('newSessionNameInput').value = '';
  setTimeout(() => document.getElementById('newSessionNameInput').focus(), 100);
}

function closeNewSessionModal() {
  document.getElementById('newSessionModal').classList.remove('open');
}

function createNewSession() {
  const input = document.getElementById('newSessionNameInput');
  const name = input.value.trim();
  if (!name) {
    alert('Please enter a session name');
    return;
  }

  const newId = generateSessionId();
  sessions[newId] = {
    id: newId,
    name: name,
    date: new Date().toISOString(),
    scores: {...scores},
    comments: {...comments}
  };

  currentSessionId = newId;
  saveSessions();
  loadCurrentSession();
  updateSessionUI();
  renderCards();
  updateScores();
  closeNewSessionModal();

  const toast = document.getElementById('savedToast');
  toast.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5.5" stroke="#00d97e"/><path d="M3.5 6l2 2 3-3" stroke="#00d97e" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg> New session created`;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5.5" stroke="#00d97e"/><path d="M3.5 6l2 2 3-3" stroke="#00d97e" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg> Session saved`;
    }, 300);
  }, 2000);
}

let pendingDeleteSessionId = null;

function deleteSession(sessionId, event) {
  event.stopPropagation();
  if (sessions[sessionId]?.isDefault) return;
  if (Object.keys(sessions).length <= 1) return;

  pendingDeleteSessionId = sessionId;
  document.getElementById('deleteSessionModal').classList.add('open');
  document.getElementById('deleteSessionConfirmBtn').onclick = confirmDeleteSession;
}

function closeDeleteSessionModal() {
  document.getElementById('deleteSessionModal').classList.remove('open');
  pendingDeleteSessionId = null;
}

function confirmDeleteSession() {
  if (!pendingDeleteSessionId) return;

  const sessionIdToDelete = pendingDeleteSessionId;
  closeDeleteSessionModal();

  // ── Defer heavy work so the browser can paint the modal closing first ──
  requestAnimationFrame(() => {
    delete sessions[sessionIdToDelete];

    if (currentSessionId === sessionIdToDelete) {
      currentSessionId = Object.keys(sessions)[0];
      loadCurrentSession();
    }

    saveSessions();
    updateSessionUI();

    // ── Defer rendering to a second frame to keep UI responsive ──────────
    requestAnimationFrame(() => {
      renderCards();
      updateScores();

      const toast = document.getElementById('savedToast');
      toast.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5.5" stroke="#ff4757"/><path d="M3.5 3.5l5 5M8.5 3.5l-5 5" stroke="#ff4757" stroke-width="1.2" stroke-linecap="round"/></svg> Session deleted`;
      toast.style.borderColor = 'var(--red)';
      toast.style.color = 'var(--red)';
      toast.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
          toast.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5.5" stroke="#00d97e"/><path d="M3.5 6l2 2 3-3" stroke="#00d97e" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg> Session saved`;
          toast.style.borderColor = 'var(--green)';
          toast.style.color = 'var(--green)';
        }, 300);
      }, 2200);
    });
  });
}

// Close dropdown when clicking outside
document.addEventListener('click', function(e) {
  const dropdown = document.getElementById('sessionDropdown');
  const selector = document.querySelector('.session-selector');
  const newBtn = document.querySelector('.btn-new-session');
  if (dropdown && !dropdown.contains(e.target) && !selector.contains(e.target) && !newBtn.contains(e.target)) {
    dropdown.classList.remove('open');
  }
});

// INIT
function init() {
  renderPillarChrome();
  renderFaNav();
  renderCards();
  updateScores();

  // ── Set default state: all pillars selected and highlighted ───────────
  document.querySelectorAll('.phase-stat').forEach(s => s.classList.add('active'));
  const allPill = document.querySelector('.phase-pill[data-p="all"]');
  if (allPill) {
    document.querySelectorAll('.phase-pill[data-p]').forEach(p => {
      p.classList.remove(...pillarClassList(), 'active-unassessed', 'active-excluded');
    });
    allPill.classList.add('active-p0');
  }

  // Modal backdrop clicks
  const deleteModal = document.getElementById('deleteSessionModal');
  if (deleteModal) {
    deleteModal.addEventListener('click', function(e) {
      if (e.target === this) closeDeleteSessionModal();
    });
  }

  ['guidanceModal', 'focusAreaModal', 'aboutModal'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', function(e) {
      if (e.target === this) el.classList.remove('open');
    });
  });
  document.addEventListener('keydown', function(e) {
    if (e.key !== 'Escape') return;
    ['guidanceModal', 'focusAreaModal', 'aboutModal'].forEach(id => {
      const el = document.getElementById(id);
      if (el && el.classList.contains('open')) el.classList.remove('open');
    });
  });
}

// ─── PILLAR CHROME (stats bar, pills, progress rows, print checkboxes) ───────
function renderPillarChrome() {
  const stats = document.getElementById('phaseStats');
  if (stats) {
    stats.innerHTML = PILLARS.map((p, i) => `
      <div class="phase-stat active" data-phase="${i}" style="--pc:${PILLAR_COLORS[i]}" onclick="filterPillarStat(${i})" title="${escapeHtml(p)}">
        <div class="stat-label">${PILLAR_PREFIX[i]}</div>
        <div class="stat-name">${escapeHtml(p)}</div>
        <div class="stat-bar-track"><div class="stat-bar-fill" id="bar-p${i}" style="width:0%"></div></div>
        <div class="stat-pct" id="pct-p${i}">0%</div>
        <div class="stat-count" id="cnt-p${i}">0 items</div>
      </div>`).join('');
  }

  const pills = document.getElementById('pillarPills');
  if (pills) {
    pills.querySelectorAll('.phase-pill.pillar-pill').forEach(p => p.remove());
    const allPill = pills.querySelector('.phase-pill[data-p="all"]');
    const frag = document.createDocumentFragment();
    PILLARS.forEach((p, i) => {
      const div = document.createElement('div');
      div.className = 'phase-pill pillar-pill';
      div.dataset.p = String(i);
      div.title = p;
      div.textContent = PILLAR_SHORT[i];
      div.onclick = () => filterByPillar(String(i), div);
      frag.appendChild(div);
    });
    if (allPill && allPill.nextSibling) pills.insertBefore(frag, allPill.nextSibling);
    else pills.appendChild(frag);
  }

  const progress = document.getElementById('pillarProgress');
  if (progress) {
    progress.innerHTML = PILLARS.map((p, i) => `
      <div class="progress-phase-row" title="${escapeHtml(p)}">
        <span class="progress-phase-label p${i}-color" style="font-size:9px;font-family:'Roboto Mono'">${PILLAR_ABBR[i]}</span>
        <div class="progress-track"><div class="progress-fill p${i}-fill" id="rbar-p${i}" style="width:0%"></div></div>
        <span class="progress-pct p${i}-color" id="rpct-p${i}">0%</span>
      </div>`).join('');
  }

  const roadmap = document.getElementById('roadmapPills');
  if (roadmap) {
    const paths = LENS.roadmap || [];
    roadmap.innerHTML = `<div class="phase-pill roadmap-pill active-roadmap" data-r="all" onclick="filterByRoadmap('all', this)">All paths</div>` +
      paths.map(r => `<div class="phase-pill roadmap-pill" data-r="${escapeHtml(r.id)}" title="${escapeHtml(r.intro)}" onclick="filterByRoadmap('${escapeHtml(r.id)}', this)">${escapeHtml(r.label)}</div>`).join('');
  }

  const printBox = document.getElementById('pillarCheckboxes');
  if (printBox) {
    printBox.innerHTML = PILLARS.map((p, i) => `
      <label class="print-checkbox-row"><input type="checkbox" class="phase-chk" name="phase-chk-${i}" value="${i}" checked onchange="refreshPreview()"><span class="print-checkbox-label">${PILLAR_PREFIX[i]} · ${escapeHtml(p)}</span></label>`).join('');
  }
}

// ─── SIDEBAR: FOCUS AREAS GROUPED BY PILLAR ──────────────────────────────────
function renderFaNav() {
  const nav = document.getElementById('faNav');
  if (!nav) return;
  nav.innerHTML = '';

  const allDiv = document.createElement('div');
  allDiv.className = 'cap-nav-item' + (activeFaFilter === 'all' ? ' active' : '');
  allDiv.onclick = () => filterByFocusArea('all');
  allDiv.innerHTML = `<span class="cap-nav-icon" style="color:var(--aws);border-color:var(--aws-dim);">★</span><span class="cap-nav-label">All focus areas</span><span class="cap-nav-count">${DATA.length}</span>`;
  nav.appendChild(allDiv);

  const pillarFilterIdx = /^\d+$/.test(activePillarFilter) ? parseInt(activePillarFilter) : -1;

  PILLARS.forEach((p, i) => {
    if (pillarFilterIdx >= 0 && pillarFilterIdx !== i) return;
    const fas = FOCUS_AREAS.filter(fa => fa.pillar === p);
    if (!fas.length) return;
    const color = PILLAR_COLORS[i];
    const pillarCount = DATA.filter(d => d.pillar === p).length;
    const collapsed = collapsedPillars.has(p) && pillarFilterIdx < 0;

    const header = document.createElement('div');
    header.className = 'fa-nav-pillar' + (collapsed ? ' collapsed' : '');
    header.innerHTML = `
      <span class="fa-nav-dot" style="background:${color}"></span>
      <span class="fa-nav-pillar-name" title="${escapeHtml(p)}">${escapeHtml(p)}</span>
      <span class="cap-nav-count">${pillarCount}</span>
      <svg class="fa-nav-chevron" width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    header.onclick = () => {
      if (collapsedPillars.has(p)) collapsedPillars.delete(p); else collapsedPillars.add(p);
      renderFaNav();
    };
    nav.appendChild(header);

    const children = document.createElement('div');
    children.className = 'fa-nav-children' + (collapsed ? ' collapsed' : '');
    fas.forEach(fa => {
      const count = DATA.filter(d => d.focus_area_id === fa.id).length;
      const div = document.createElement('div');
      div.className = 'cap-nav-item' + (activeFaFilter === fa.id ? ' active' : '');
      div.onclick = () => filterByFocusArea(fa.id);
      div.innerHTML = `
        <span class="cap-nav-icon" style="color:${color};border-color:${color}30;">${faShort(fa.id)}</span>
        <span class="cap-nav-label" title="${escapeHtml(fa.id + ': ' + fa.question)}">${escapeHtml(fa.name)}</span>
        <span class="cap-nav-count">${count}</span>
      `;
      children.appendChild(div);
    });
    nav.appendChild(children);
  });
}

function getFilteredData() {
  let filtered = DATA;
  if (activePillarFilter === 'unassessed') {
    filtered = filtered.filter(d => scores[d.id] === null || scores[d.id] === undefined);
  } else if (activePillarFilter === 'excluded') {
    filtered = filtered.filter(d => scores[d.id] === 'na');
  } else if (activePillarFilter !== 'all') {
    filtered = filtered.filter(d => d.pillar === PILLARS[parseInt(activePillarFilter)]);
  }
  if (activeFaFilter !== 'all') {
    filtered = filtered.filter(d => d.focus_area_id === activeFaFilter);
  }
  if (activeRoadmapFilter !== 'all') {
    filtered = filtered.filter(d => (FA_BY_ID[d.focus_area_id]?.roadmap || []).includes(activeRoadmapFilter));
  }
  const search = document.getElementById('searchInput').value.toLowerCase().trim();
  if (search) {
    filtered = filtered.filter(d => {
      const fa = FA_BY_ID[d.focus_area_id];
      return (d.recommendation || '').toLowerCase().includes(search) ||
        (d.focus_area || '').toLowerCase().includes(search) ||
        (d.focus_area_id || '').toLowerCase().includes(search) ||
        (d.pillar || '').toLowerCase().includes(search) ||
        (d.aws_service || '').toLowerCase().includes(search) ||
        (d.risk || '').toLowerCase().includes(search) ||
        (d.id || '').toLowerCase().includes(search) ||
        (fa?.question || '').toLowerCase().includes(search);
    });
  }
  return filtered;
}

function renderCards() {
  const container = document.getElementById('cardsContainer');
  const noRes = document.getElementById('noResults');
  const filtered = getFilteredData();
  const isFiltered = activePillarFilter !== 'all' || activeFaFilter !== 'all' || activeRoadmapFilter !== 'all' || document.getElementById('searchInput').value.trim() !== '';
  document.getElementById('itemCountBadge').textContent = `${filtered.length} items`;
  const existingTag = document.getElementById('filteredTag');
  if (isFiltered) {
    if (!existingTag) {
      const tag = document.createElement('span');
      tag.id = 'filteredTag';
      tag.textContent = 'FILTERED';
      tag.style.cssText = 'margin-left:8px;font-size:10px;font-family:"Roboto Mono",monospace;color:var(--aws);letter-spacing:0.08em;font-weight:700;';
      document.getElementById('itemCountBadge').after(tag);
    }
  } else {
    if (existingTag) existingTag.remove();
  }

  if (filtered.length === 0) {
    container.innerHTML = '';
    noRes.style.display = 'block';
    return;
  }
  noRes.style.display = 'none';

  // Group by focus area (each focus area belongs to exactly one pillar)
  const groups = {};
  filtered.forEach(item => {
    if (!groups[item.focus_area_id]) groups[item.focus_area_id] = [];
    groups[item.focus_area_id].push(item);
  });
  const faOrder = FOCUS_AREAS.map(fa => fa.id);
  const sortedKeys = Object.keys(groups).sort((a, b) => faOrder.indexOf(a) - faOrder.indexOf(b));

  container.innerHTML = '';
  const fragment = document.createDocumentFragment();

  sortedKeys.forEach(faId => {
    const items = groups[faId];
    const fa = FA_BY_ID[faId] || { id: faId, name: items[0].focus_area, question: '', pillar: items[0].pillar, roadmap: [] };
    const pi = pillarIdx(fa.pillar);
    const color = PILLAR_COLORS[pi] || '#FF9900';

    // Group header
    const header = document.createElement('div');
    header.className = 'cap-group-header fa-group-header';
    header.innerHTML = `
      <div class="cap-icon" style="background:${color}20; color:${color}; border: 1px solid ${color}40;">${faShort(fa.id)}</div>
      <div class="fa-group-text">
        <span class="cap-group-name">${escapeHtml(fa.name)}</span>
        ${fa.question ? `<div class="fa-group-question">${escapeHtml(fa.id)}: ${escapeHtml(fa.question)}</div>` : ''}
      </div>
      <span class="cap-group-phase-badge phase-tag-${pi}">${PILLAR_SHORT[pi] || escapeHtml(fa.pillar)}</span>
      ${FA_BY_ID[faId] ? `<button class="fa-info-btn" onclick="openFocusAreaModal('${escapeHtml(fa.id)}')" title="Capability intent, maturity levels and common issues">Maturity levels</button>` : ''}
    `;
    fragment.appendChild(header);

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'rec-card';
      card.id = `card-${item.id}`;

      const scoreClass = getScoreClass(item.id);
      if (scoreClass) card.classList.add(scoreClass);

      const hasGuidance = item.guidance || item.how_to_check;
      const currentVal = scores[item.id];
      const optionsHtml = SCORING_OPTIONS.map((o, i) =>
        i === 0
          ? `<option value="" disabled hidden ${currentVal === undefined || currentVal === null ? 'selected' : ''}>${o.label}</option>`
          : `<option value="${o.value ?? ''}">${o.label}</option>`
      ).join('');
      const currentScore = scores[item.id];
      const selectClass = getSelectClass(currentScore);
      const risk = item.risk || '';
      const roadmapTags = (fa.roadmap || []).map(r => `<span class="roadmap-tag" title="Lens roadmap reading path">${escapeHtml(roadmapLabel(r))}</span>`).join('');

      card.innerHTML = `
        <div class="rec-header" onclick="handleHeaderClick(event, '${item.id}')">
          <span class="rec-id">${escapeHtml(item.id)}</span>
          <div class="rec-info">
            <div class="rec-title">${escapeHtml(item.recommendation)}</div>
            <div class="rec-meta">
              ${risk ? `<span class="rec-risk risk-${risk.toLowerCase()}" title="Level of risk exposed if this best practice is not established">${escapeHtml(risk)} risk</span>` : ''}
              ${item.aws_service && item.aws_service !== 'N/A' ? `<span class="rec-service">⚙ ${escapeHtml(item.aws_service)}</span>` : ''}
              ${roadmapTags}
            </div>
          </div>
          <div class="rec-select-wrapper" onclick="event.stopPropagation()">
            <select class="rec-select ${selectClass}" id="sel-${item.id}" onchange="setScore('${item.id}', this)">
              ${optionsHtml}
            </select>
          </div>
          ${hasGuidance ? `<button class="rec-expand-btn" id="btn-${item.id}"></button>` : ''}
        </div>
        <div class="rec-detail" id="detail-${item.id}">
          <div class="rec-detail-inner">
            ${item.guidance ? `<div class="rec-detail-block"><div class="detail-label">Summary</div><div class="detail-text">${item.guidance.trim()}</div></div>` : ''}
            ${item.how_to_check ? `<div class="rec-detail-block"><div class="detail-label">Desired outcome</div><div class="detail-text">${item.how_to_check.trim()}</div></div>` : ''}
          </div>
          <textarea class="comments-input" id="cmt-${item.id}" placeholder="Add comments, owner, evidence, or notes..." oninput="setComment('${item.id}', this.value)">${escapeHtml(comments[item.id] || '')}</textarea>
          <div class="rec-actions">
            ${item._hasGuidance ? `<button class="btn-solution" onclick="openGuidanceModal('${item.id}')"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>Implementation guidance</button>` : ''}
            ${item.doc_url ? `<a class="rec-doc-link" href="${escapeHtml(item.doc_url)}" target="_blank" rel="noopener noreferrer">View in AWS documentation ↗</a>` : ''}
          </div>
        </div>
      `;

      // Restore select value
      if (currentScore !== undefined) {
        const sel = card.querySelector('#' + CSS.escape('sel-' + item.id));
        if (sel) sel.value = currentScore === 'na' ? 'na' : (currentScore ?? '');
      }

      fragment.appendChild(card);
    });
  });

  container.appendChild(fragment);

  container.querySelectorAll('a').forEach(a => {
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  });
}

function getScoreClass(id) {
  const s = scores[id];
  if (s === undefined || s === null || s === 'na') return '';
  if (s === 1) return 'has-score';
  if (s === 0.75) return 'score-75';
  if (s === 0.5) return 'score-50';
  return 'score-low';
}

function getSelectClass(val) {
  if (val === undefined || val === null || val === '') return '';
  if (val === 'na') return 'score-na';
  if (val === 1) return 'score-100';
  if (val === 0.75) return 'score-75';
  if (val === 0.5) return 'score-50';
  if (val === 0.25) return 'score-25';
  if (val === 0) return 'score-0';
  return '';
}

function toggleDetail(id) {
  const detail = document.getElementById(`detail-${id}`);
  const btn = document.getElementById(`btn-${id}`);
  const card = document.getElementById(`card-${id}`);

  const isOpen = detail.classList.contains('open');

  if (isOpen) {
    detail.classList.remove('open');
    if (btn) btn.classList.remove('open');
    if (card) card.classList.remove('expanded');
  } else {
    detail.classList.add('open');
    if (btn) btn.classList.add('open');
    if (card) card.classList.add('expanded');
  }
}

function handleHeaderClick(e, id) {
  // Do not toggle when the click landed on the score select or its wrapper
  if (e.target.closest('.rec-select-wrapper') || e.target.closest('.rec-select')) {
    return;
  }
  toggleDetail(id);
}

function scrollToCard(id) {
  const card = document.getElementById(`card-${id}`);
  if (!card) return;
  card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  card.classList.add('highlight');
  setTimeout(() => card.classList.remove('highlight'), 1600);
}

function setScore(id, sel) {
  const raw = sel.value;
  let val;
  if (raw === '' || raw === 'null') val = null;
  else if (raw === 'na') val = 'na';
  else val = parseFloat(raw);

  scores[id] = val;
  saveSession();

  // Update select style
  sel.className = 'rec-select ' + getSelectClass(val);

  // Update card border
  const card = document.getElementById(`card-${id}`);
  if (card) {
    card.className = 'rec-card';
    const sc = getScoreClass(id);
    if (sc) card.classList.add(sc);
  }

  updateScores();
  // If filtering by unassessed, re-render so scored item is removed
  if (activePillarFilter === 'unassessed') renderCards();
  showSavedToast();
}

let commentSaveTimer = null;
function setComment(id, val) {
  comments[id] = val;
  clearTimeout(commentSaveTimer);
  commentSaveTimer = setTimeout(() => { saveSession(); showSavedToast(); }, 800);
}

function isScored(id) {
  const s = scores[id];
  return s !== null && s !== undefined && s !== 'na';
}

function avgPct(items) {
  const scored = items.filter(d => isScored(d.id));
  if (scored.length === 0) return null;
  return (scored.reduce((sum, d) => sum + (scores[d.id] || 0), 0) / scored.length) * 100;
}

function updateScores() {
  // Per pillar
  PILLARS.forEach((p, i) => {
    const items = DATA.filter(d => d.pillar === p);
    const pct = Math.round(avgPct(items) ?? 0);
    const bar = document.getElementById(`bar-p${i}`);
    if (bar) bar.style.width = pct + '%';
    const pctEl = document.getElementById(`pct-p${i}`);
    if (pctEl) pctEl.textContent = pct + '%';
    const cnt = document.getElementById(`cnt-p${i}`);
    if (cnt) cnt.textContent = items.length + ' items';
    const rbar = document.getElementById(`rbar-p${i}`);
    if (rbar) rbar.style.width = pct + '%';
    const rpct = document.getElementById(`rpct-p${i}`);
    if (rpct) rpct.textContent = pct + '%';
  });

  // Overall
  const allScored = DATA.filter(d => isScored(d.id));
  const op = Math.round(avgPct(DATA) ?? 0);
  const circumference = 314.2;
  const offset = circumference - (circumference * op / 100);
  document.getElementById('scoreRing').style.strokeDashoffset = offset;
  document.getElementById('scoreRingText').textContent = op + '%';
  document.getElementById('scoreLabel').textContent = allScored.length === 0
    ? 'No assessments yet'
    : `${allScored.length} of ${DATA.length} best practices assessed`;

  renderFaScores();
  renderRadar();
}

function renderFaScores() {
  const list = document.getElementById('faScoresList');
  if (!list) return;
  list.innerHTML = '';
  const pillarFilterIdx = /^\d+$/.test(activePillarFilter) ? parseInt(activePillarFilter) : -1;
  FOCUS_AREAS.forEach(fa => {
    const pi = pillarIdx(fa.pillar);
    if (pillarFilterIdx >= 0 && pi !== pillarFilterIdx) return;
    const items = DATA.filter(d => d.focus_area_id === fa.id);
    const pct = Math.round(avgPct(items) ?? 0);
    const color = PILLAR_COLORS[pi] || '#FF9900';
    const row = document.createElement('div');
    row.className = 'cap-score-row';
    row.title = `${fa.id}: ${fa.name}`;
    row.onclick = () => filterByFocusArea(fa.id);
    row.innerHTML = `
      <span class="cap-score-label fa-score-label" style="color:${color}">${faShort(fa.id)}</span>
      <div class="cap-score-bar-track"><div class="cap-score-bar-fill" style="width:${pct}%; background: linear-gradient(90deg, ${color}, ${color}cc);"></div></div>
      <span class="cap-score-val" style="color:${color}">${pct}%</span>
    `;
    list.appendChild(row);
  });
}

function renderRadar() {
  const svg = document.getElementById('radarSvg');
  const cx = 132, cy = 132, r = 90;
  const n = PILLARS.length;
  const NS = 'http://www.w3.org/2000/svg';

  // null = no scored items in that pillar (distinct from 0%)
  const pillarScores = PILLARS.map(p => {
    const pct = avgPct(DATA.filter(d => d.pillar === p));
    return pct === null ? null : pct / 100;
  });

  svg.innerHTML = '';

  // Grid rings
  [0.25, 0.5, 0.75, 1].forEach(level => {
    const pts = PILLARS.map((_, i) => {
      const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
      return [cx + Math.cos(angle) * r * level, cy + Math.sin(angle) * r * level];
    });
    const polygon = document.createElementNS(NS, 'polygon');
    polygon.setAttribute('points', pts.map(p => p.join(',')).join(' '));
    polygon.setAttribute('fill', 'none');
    polygon.setAttribute('stroke', '#1e3050');
    polygon.setAttribute('stroke-width', '1');
    svg.appendChild(polygon);
  });

  // Axis lines
  PILLARS.forEach((_, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    const line = document.createElementNS(NS, 'line');
    line.setAttribute('x1', cx);
    line.setAttribute('y1', cy);
    line.setAttribute('x2', cx + Math.cos(angle) * r);
    line.setAttribute('y2', cy + Math.sin(angle) * r);
    line.setAttribute('stroke', '#1e3050');
    line.setAttribute('stroke-width', '1');
    svg.appendChild(line);
  });

  const hasAnyData = pillarScores.some(s => s !== null);
  if (hasAnyData) {
    const dataPoints = pillarScores.map((score, i) => {
      const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
      const val = score !== null ? score : 0;
      return [cx + Math.cos(angle) * r * val, cy + Math.sin(angle) * r * val];
    });

    const dataPoly = document.createElementNS(NS, 'polygon');
    dataPoly.setAttribute('points', dataPoints.map(p => p.join(',')).join(' '));
    dataPoly.setAttribute('fill', 'rgba(255,153,0,0.15)');
    dataPoly.setAttribute('stroke', '#FF9900');
    dataPoly.setAttribute('stroke-width', '1.5');
    svg.appendChild(dataPoly);

    dataPoints.forEach((pt, i) => {
      const circle = document.createElementNS(NS, 'circle');
      circle.setAttribute('cx', pt[0]);
      circle.setAttribute('cy', pt[1]);
      circle.setAttribute('r', '3');
      if (pillarScores[i] !== null) {
        circle.setAttribute('fill', PILLAR_COLORS[i]);
      } else {
        circle.setAttribute('fill', 'none');
        circle.setAttribute('stroke', '#3d5a7e');
        circle.setAttribute('stroke-width', '1');
      }
      const title = document.createElementNS(NS, 'title');
      title.textContent = `${PILLARS[i]}: ${pillarScores[i] === null ? 'not assessed' : Math.round(pillarScores[i] * 100) + '%'}`;
      circle.appendChild(title);
      svg.appendChild(circle);
    });
  } else {
    const text = document.createElementNS(NS, 'text');
    text.setAttribute('x', cx);
    text.setAttribute('y', cy);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('font-size', '11');
    text.setAttribute('font-family', 'Roboto Mono, monospace');
    text.setAttribute('fill', '#3d5a7e');
    text.textContent = 'No assessments yet';
    svg.appendChild(text);
  }

  // Axis labels (pillar abbreviations; full names would clip the viewBox)
  PILLARS.forEach((p, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    const labelR = r + 19;
    const x = cx + Math.cos(angle) * labelR;
    const y = cy + Math.sin(angle) * labelR;
    const text = document.createElementNS(NS, 'text');
    text.setAttribute('x', x);
    text.setAttribute('y', y);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('font-size', '12');
    text.setAttribute('font-family', 'Arial, sans-serif');
    text.setAttribute('fill', '#9db1c9ff');
    text.textContent = PILLAR_ABBR[i];
    const title = document.createElementNS(NS, 'title');
    title.textContent = p;
    text.appendChild(title);
    svg.appendChild(text);
  });
}

// ─── FILTERS ──────────────────────────────────────────────────────────────────
function clearPillarPillClasses() {
  document.querySelectorAll('.phase-pill[data-p]').forEach(p => {
    p.classList.remove(...pillarClassList(), 'active-unassessed', 'active-excluded');
  });
}

function filterByPillar(value, el) {
  activePillarFilter = value;
  if (value !== 'all') {
    activeFaFilter = 'all';
  }

  // ── Update sidebar pills ──────────────────────────────────────────────
  clearPillarPillClasses();
  if (!el) el = document.querySelector(`.phase-pill[data-p="${value}"]`);
  if (el) {
    if (value === 'all') el.classList.add('active-p0');
    else if (value === 'unassessed') el.classList.add('active-unassessed');
    else if (value === 'excluded') el.classList.add('active-excluded');
    else el.classList.add(`active-p${value}`);
  }

  // ── Update top pillar stats bar ───────────────────────────────────────
  document.querySelectorAll('.phase-stat').forEach(s => s.classList.remove('active'));
  if (value === 'all' || value === 'unassessed' || value === 'excluded') {
    document.querySelectorAll('.phase-stat').forEach(s => s.classList.add('active'));
  } else {
    const statEl = document.querySelector(`.phase-stat[data-phase="${value}"]`);
    if (statEl) statEl.classList.add('active');
  }

  renderFaNav();
  renderCards();
  renderFaScores();
}

function filterPillarStat(idx) {
  // Clicking an already-selected single pillar in the stats bar returns to "all"
  if (activePillarFilter === String(idx)) {
    filterByPillar('all');
    return;
  }
  filterByPillar(String(idx));
}

function filterByFocusArea(faId) {
  activeFaFilter = faId;
  if (faId !== 'all') {
    activePillarFilter = 'all';
    clearPillarPillClasses();
    const allPill = document.querySelector('.phase-pill[data-p="all"]');
    if (allPill) allPill.classList.add('active-p0');
    document.querySelectorAll('.phase-stat').forEach(s => s.classList.add('active'));
  }
  renderFaNav();
  renderCards();
  renderFaScores();
  if (faId !== 'all') {
    const main = document.getElementById('mainContent');
    if (main && window.innerWidth <= 1024) main.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function filterByRoadmap(pathId, el) {
  activeRoadmapFilter = pathId;
  document.querySelectorAll('.roadmap-pill').forEach(p => p.classList.remove('active-roadmap'));
  if (!el) el = document.querySelector(`.roadmap-pill[data-r="${pathId}"]`);
  if (el) el.classList.add('active-roadmap');
  renderCards();
}

// ── Debounce for the search input ──
let renderDebounceTimer = null;
function applyFilters() {
  clearTimeout(renderDebounceTimer);
  renderDebounceTimer = setTimeout(() => renderCards(), 120);
}

function resetAll() {
  openModal();
}

function openModal() {
  document.getElementById('confirmModal').classList.add('open');
}

function closeModal() {
  document.getElementById('confirmModal').classList.remove('open');
}

// ─── IMPLEMENTATION GUIDANCE MODAL ───────────────────────────────────────────

const guidanceCache = {};

async function openGuidanceModal(itemId) {
  const item = DATA.find(d => d.id === itemId);
  if (!item || !item._hasGuidance) return;

  const modal = document.getElementById('guidanceModal');
  const body = document.getElementById('guidanceModalBody');
  const link = document.getElementById('guidanceDocLink');
  if (link) {
    if (item.doc_url) { link.href = item.doc_url; link.style.display = ''; }
    else link.style.display = 'none';
  }

  body.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-dim)">Loading...</div>';
  modal.classList.add('open');

  if (!guidanceCache[itemId]) {
    try {
      const resp = await fetch(item._guidancePath + `?v=${Date.now()}`);
      if (!resp.ok) throw new Error();
      guidanceCache[itemId] = await resp.text();
    } catch {
      body.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--red)">Could not load the implementation guidance.${item.doc_url ? ` <a href="${escapeHtml(item.doc_url)}" target="_blank" rel="noopener noreferrer">Open the official page</a>.` : ''}</div>`;
      return;
    }
  }

  body.innerHTML = marked.parse(guidanceCache[itemId]);
  body.querySelectorAll('pre code').forEach(block => hljs.highlightElement(block));
  body.querySelectorAll('a').forEach(a => { a.target = '_blank'; a.rel = 'noopener noreferrer'; });
  body.scrollTop = 0;
}

function closeGuidanceModal() {
  document.getElementById('guidanceModal').classList.remove('open');
}

// ─── FOCUS AREA MODAL (question, intent, maturity levels, common issues) ─────

function openFocusAreaModal(faId) {
  const fa = FA_BY_ID[faId];
  if (!fa) return;
  const modal = document.getElementById('focusAreaModal');
  const body = document.getElementById('focusAreaModalBody');
  const titleEl = document.getElementById('focusAreaModalTitle');
  const link = document.getElementById('focusAreaDocLink');
  const pi = pillarIdx(fa.pillar);
  const color = PILLAR_COLORS[pi] || '#FF9900';

  if (titleEl) titleEl.textContent = `${fa.id} · ${fa.name}`;
  if (link) link.href = fa.doc_url || '#';

  const list = (arr) => arr && arr.length ? `<ul>${arr.map(x => `<li>${mdInline(x)}</li>`).join('')}</ul>` : '<p class="fa-modal-empty">Not available.</p>';
  const bps = (fa.best_practices || []).map(id => {
    const item = DATA.find(d => d.id === id);
    const s = scores[id];
    const scoreTxt = s === undefined || s === null ? 'Not assessed' : (s === 'na' ? 'Excluded' : Math.round(s * 100) + '%');
    return `<li><a href="#" onclick="closeFocusAreaModal(); scrollToCard('${escapeHtml(id)}'); return false;"><strong>${escapeHtml(id)}</strong> ${escapeHtml(item ? item.recommendation : '')}</a>${item ? ` <span class="rec-risk risk-${item.risk.toLowerCase()}">${escapeHtml(item.risk)}</span>` : ''} <span class="fa-bp-score">${scoreTxt}</span></li>`;
  }).join('');

  body.innerHTML = `
    <div class="fa-modal-meta"><span class="cap-group-phase-badge phase-tag-${pi}">${escapeHtml(fa.pillar)}</span>${(fa.roadmap || []).map(r => `<span class="roadmap-tag">${escapeHtml(roadmapLabel(r))}</span>`).join('')}</div>
    <h2 class="fa-modal-question" style="border-left-color:${color}">${escapeHtml(fa.question)}</h2>
    ${fa.intro ? `<p>${mdInline(fa.intro)}</p>` : ''}
    <h3>Capability intent</h3>
    ${list(fa.capability_intent)}
    <h3>Maturity levels</h3>
    <p class="fa-modal-hint">These levels summarize what each stage of maturity looks like for this focus area as a whole. Use them as a reference when scoring the best practices below.</p>
    <table class="maturity-table">
      <thead><tr><th>Level</th><th>Name</th><th>What it looks like</th></tr></thead>
      <tbody>${(fa.maturity_levels || []).map(l => `<tr><td class="ml-level">${l.level}</td><td class="ml-name">${escapeHtml(l.name)}</td><td>${mdInline(l.description)}</td></tr>`).join('')}</tbody>
    </table>
    <h3>Common issues to watch for</h3>
    ${list(fa.common_issues)}
    <h3>Best practices in this focus area</h3>
    <ul class="fa-bp-list">${bps}</ul>
    <p class="about-source">Source: <a href="${escapeHtml(fa.doc_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(fa.id)} in the AWS Well-Architected Agentic AI Lens</a> (${escapeHtml(LENS.published || '')}). Condensed for this self-assessment aid.</p>
  `;
  body.querySelectorAll('a[href^="http"]').forEach(a => { a.target = '_blank'; a.rel = 'noopener noreferrer'; });
  modal.classList.add('open');
  body.scrollTop = 0;
}

function closeFocusAreaModal() {
  document.getElementById('focusAreaModal').classList.remove('open');
}

// ─── ABOUT THE LENS MODAL ────────────────────────────────────────────────────

function openAboutModal() {
  const modal = document.getElementById('aboutModal');
  const body = document.getElementById('aboutModalBody');
  if (!modal || !body) return;
  const L = LENS || {};
  const counts = L.counts || {};

  const principles = (L.design_principles || []).map(p =>
    `<li><strong>${escapeHtml(p.title)}:</strong> ${mdInline(p.text)}</li>`).join('');

  const pillars = (L.pillars || []).map(p => {
    const i = pillarIdx(p.name);
    const color = PILLAR_COLORS[i] || '#FF9900';
    const fas = (p.focus_areas || []).map(id => {
      const fa = FA_BY_ID[id];
      return `<li><a href="#" onclick="closeAboutModal(); filterByFocusArea('${escapeHtml(id)}'); return false;">${escapeHtml(id)}</a> ${escapeHtml(fa ? fa.name : '')}</li>`;
    }).join('');
    const pr = (p.design_principles || []).map(d => `<li><strong>${escapeHtml(d.title)}:</strong> ${mdInline(d.text)}</li>`).join('');
    return `
      <details class="about-pillar">
        <summary><span class="fa-nav-dot" style="background:${color}"></span>${escapeHtml(p.name)} <span class="about-count">${(p.focus_areas || []).length} focus areas · ${DATA.filter(d => d.pillar === p.name).length} best practices</span></summary>
        <p>${mdInline(p.intro)}</p>
        ${pr ? `<h4>Design principles</h4><ul>${pr}</ul>` : ''}
        <h4>Focus areas</h4><ul class="about-fa-list">${fas}</ul>
      </details>`;
  }).join('');

  const roadmap = (L.roadmap || []).map(r => `
    <div class="about-roadmap-path">
      <button class="fa-info-btn" onclick="closeAboutModal(); filterByRoadmap('${escapeHtml(r.id)}'); document.getElementById('mainContent').scrollIntoView({behavior:'smooth'});">${escapeHtml(r.label)}</button>
      <p>${escapeHtml(r.intro)}</p>
      <ul>${(r.focus_areas || []).map(f => `<li><a href="#" onclick="closeAboutModal(); filterByFocusArea('${escapeHtml(f.id)}'); return false;">${escapeHtml(f.id)}</a>: ${escapeHtml(f.summary)}</li>`).join('')}</ul>
    </div>`).join('');

  const definitions = (L.definitions || []).map(d => `<dt>${escapeHtml(d.term)}</dt><dd>${mdInline(d.definition)}</dd>`).join('');

  body.innerHTML = `
    <section class="about-section">
      <p class="about-lead">${(L.abstract || []).map(p => mdInline(p)).join('</p><p class="about-lead">')}</p>
      <p class="about-counts">${counts.pillars || PILLARS.length} pillars · ${counts.focus_areas || FOCUS_AREAS.length} focus areas · ${counts.best_practices || DATA.length} best practices · published ${escapeHtml(L.published || '')}</p>
      <p>
        <a href="${escapeHtml(L.doc_url || '')}" target="_blank" rel="noopener noreferrer">Read the official Lens ↗</a> ·
        <a href="${escapeHtml(L.custom_lens_json_url || '')}" target="_blank" rel="noopener noreferrer">Import the custom lens into AWS Well-Architected Tool ↗</a>
      </p>
    </section>
    <section class="about-section">
      <h3>How to use this self-assessment</h3>
      <ol>
        <li>Pick a pillar, a focus area, or a Lens roadmap reading path from the sidebar.</li>
        <li>Open <em>Maturity levels</em> on a focus area to see what each stage looks like, then score each best practice from 0% (not aligned) to 100% (fully covered), or exclude it if it does not apply.</li>
        <li>Open <em>Implementation guidance</em> for the condensed desired outcome, anti-patterns, steps and resources. Follow the link to the official page for the complete text.</li>
        <li>Track progress per pillar and focus area in the right panel, export a CSV or print a report when you are done.</li>
      </ol>
      <p class="about-note">Scores are stored only in this browser (sessions). This tool is an unofficial study aid and is not affiliated with AWS.</p>
    </section>
    <section class="about-section">
      <h3>Design principles</h3>
      <ul>${principles}</ul>
    </section>
    <section class="about-section">
      <h3>Lens roadmap: reading paths</h3>
      ${roadmap}
    </section>
    <section class="about-section">
      <h3>Pillars</h3>
      ${pillars}
    </section>
    <section class="about-section">
      <details class="about-definitions">
        <summary>Definitions (${(L.definitions || []).length} terms)</summary>
        <dl class="about-dl">${definitions}</dl>
      </details>
    </section>
    <p class="about-source">Content condensed from the <a href="${escapeHtml(L.doc_url || '')}" target="_blank" rel="noopener noreferrer">${escapeHtml(L.title || 'AWS Well-Architected Agentic AI Lens')}</a>, AWS documentation, ${escapeHtml(L.published || '')}. Always refer to the official documentation for the authoritative text.</p>
  `;
  body.querySelectorAll('a[href^="http"]').forEach(a => { a.target = '_blank'; a.rel = 'noopener noreferrer'; });
  modal.classList.add('open');
  body.scrollTop = 0;
}

function closeAboutModal() {
  document.getElementById('aboutModal').classList.remove('open');
}

function confirmReset() {
  closeModal();

  requestAnimationFrame(() => {
    // ── Only clear scores and comments for the current session ──
    Object.keys(scores).forEach(k => delete scores[k]);
    Object.keys(comments).forEach(k => delete comments[k]);

    if (sessions[currentSessionId]) {
      sessions[currentSessionId].scores = {};
      sessions[currentSessionId].comments = {};
    }
    saveSessions();

    requestAnimationFrame(() => {
      renderCards();
      updateScores();

      const toast = document.getElementById('savedToast');
      toast.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5.5" stroke="#ff4757"/><path d="M3.5 3.5l5 5M8.5 3.5l-5 5" stroke="#ff4757" stroke-width="1.2" stroke-linecap="round"/></svg> Session cleared`;
      toast.style.borderColor = 'var(--red)';
      toast.style.color = 'var(--red)';
      toast.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
          toast.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5.5" stroke="#00d97e"/><path d="M3.5 6l2 2 3-3" stroke="#00d97e" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg> Session saved`;
          toast.style.borderColor = 'var(--green)';
          toast.style.color = 'var(--green)';
        }, 300);
      }, 2200);
    });
  });
}

function exportCSV() {
  const rows = [['ID','Pillar','Focus Area','Best Practice','Risk','AWS Services','Alignment','Score','Comments']];
  DATA.forEach(item => {
    const s = scores[item.id];
    // Skip items with no score assigned
    if (s === null || s === undefined) return;
    const alignOption = SCORING_OPTIONS.find(o => o.value === s);
    const alignLabel = alignOption ? alignOption.label : '--';
    const scoreVal = s === 'na' ? 'N/A' : (s * 100) + '%';
    rows.push([item.id, item.pillar, `${item.focus_area_id} ${item.focus_area}`, item.recommendation, item.risk || '', item.aws_service || '', alignLabel, scoreVal, comments[item.id]||'']);
  });
  if (rows.length === 1) {
    // No scored items — show error toast
    const toast = document.getElementById('savedToast');
    toast.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5.5" stroke="#ff4757"/><path d="M3.5 3.5l5 5M8.5 3.5l-5 5" stroke="#ff4757" stroke-width="1.2" stroke-linecap="round"/></svg> No data to export yet`;
    toast.style.borderColor = 'var(--red)';
    toast.style.color = 'var(--red)';
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        toast.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5.5" stroke="#00d97e"/><path d="M3.5 6l2 2 3-3" stroke="#00d97e" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg> Session saved`;
        toast.style.borderColor = 'var(--green)';
        toast.style.color = 'var(--green)';
      }, 300);
    }, 2200);
    return;
  }

  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const session = sessions[currentSessionId];
  const sessionName = session ? session.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : 'assessment';
  const today = new Date().toISOString().split('T')[0];
  const a = document.createElement('a'); a.href = url; a.download = `${sessionName}-${today}.csv`; a.click();
  URL.revokeObjectURL(url);
}

let toastTimer = null;
function showSavedToast() {
  const toast = document.getElementById('savedToast');
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
}

// ─── LOAD CSV ────────────────────────────────────────────────────────────
function loadCSV(event) {
  const file = event.target.files[0];
  if (!file) return;

  // ── Extract name and date from filename ───────────────────────────────
  const filename  = file.name.replace('.csv', '');
  // Detect YYYY-MM-DD pattern at end of string
  const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2})$/);
  const dateStr   = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0];
  const rawName   = dateMatch ? filename.slice(0, -(dateStr.length + 1)) : filename;

  // Convert kebab-case to Title Case: "my-session" → "My Session"
  let sessionName = rawName
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ') || 'Imported Session';

  // If filename is "default-session", auto-increment: Default Session 01, 02...
  if (sessionName.toLowerCase() === 'default session') {
    const existingNumbers = Object.values(sessions)
      .map(s => {
        const match = s.name.match(/^Default Session (\d+)$/i);
        return match ? parseInt(match[1]) : 0;
      })
      .filter(n => n > 0);

    const nextNum = existingNumbers.length > 0
      ? Math.max(...existingNumbers) + 1
      : 1;

    sessionName = `Default Session ${String(nextNum).padStart(2, '0')}`;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const lines = e.target.result.split('\n').filter(l => l.trim());
      // Expected header: ID,Pillar,Focus Area,Best Practice,Risk,AWS Services,Alignment,Score,Comments
      // Only ID, Score and Comments are read, so older exports still import.
      const headers     = parseCSVLine(lines[0]);
      const idxId       = headers.indexOf('ID');
      const idxScore    = headers.indexOf('Score');
      const idxComments = headers.indexOf('Comments');

      if (idxId === -1 || idxScore === -1) {
        alert('Invalid CSV format. Make sure it was exported from this tool.');
        return;
      }

      const newScores   = {};
      const newComments = {};

      lines.slice(1).forEach(line => {
        const cols = parseCSVLine(line);
        const id   = cols[idxId];
        if (!id) return;

        // Only store scores that have an actual value (skip empty/unassigned)
        const rawScore = cols[idxScore]?.trim();
        if (rawScore === 'N/A') {
          newScores[id] = 'na';
        } else if (rawScore !== '' && rawScore !== undefined) {
          const numVal = parseFloat(rawScore) / 100;
          if (!isNaN(numVal)) newScores[id] = numVal;
        }
        // (empty rawScore → not added to newScores, leaves item as unassessed)

        // Restore comments if present
        const comment = cols[idxComments]?.trim();
        if (comment) newComments[id] = comment;
      });

      // ── Create new session from CSV data ──────────────────────────────
      const newId = generateSessionId();
      sessions[newId] = {
        id:        newId,
        name:      sessionName,
        date:      new Date(dateStr + 'T12:00:00').toISOString(),
        isDefault: false,
        scores:    newScores,
        comments:  newComments
      };

      currentSessionId = newId;
      saveSessions();
      loadCurrentSession();
      updateSessionUI();
      renderCards();
      updateScores();

      // Reset input so the same file can be loaded again
      event.target.value = '';

      // Show success toast
      const toast = document.getElementById('savedToast');
      toast.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5.5" stroke="#00d97e"/><path d="M3.5 6l2 2 3-3" stroke="#00d97e" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg> CSV loaded as "${escapeHtml(sessionName)}"`;
      toast.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
          toast.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5.5" stroke="#00d97e"/><path d="M3.5 6l2 2 3-3" stroke="#00d97e" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg> Session saved`;
        }, 300);
      }, 2500);

    } catch(err) {
      alert('Error parsing CSV: ' + err.message);
    }
  };
  reader.readAsText(file);
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i+1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ─── BOOT ─────────────────────────────────────────────────────────────────────
const loadingEl = document.getElementById('loadingScreen');
if (loadingEl) loadingEl.style.display = 'flex';

loadData().then(() => {
  if (loadingEl) loadingEl.style.display = 'none';
  const sessionRestored = loadSession();
  init();
  if (sessionRestored) {
    setTimeout(() => {
      const toast = document.getElementById('savedToast');
      toast.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5.5" stroke="#00d97e"/><path d="M3.5 6l2 2 3-3" stroke="#00d97e" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg> Session restored';
      toast.classList.add('show');
      toastTimer = setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
          toast.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5.5" stroke="#00d97e"/><path d="M3.5 6l2 2 3-3" stroke="#00d97e" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg> Session saved';
        }, 300);
      }, 2200);
    }, 400);
  }
}).catch(err => {
  if (loadingEl) {
    loadingEl.innerHTML = `
      <div style="text-align:center;color:#ff4757;max-width:600px;margin:0 auto;padding:0 20px">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style="margin-bottom:16px">
          <circle cx="24" cy="24" r="22" stroke="#ff4757" stroke-width="2" fill="rgba(255,71,87,0.1)"/>
          <path d="M24 14v14M24 32v2" stroke="#ff4757" stroke-width="3" stroke-linecap="round"/>
        </svg>
        <p style="font-size:18px;font-weight:700;margin-bottom:12px;color:#ff4757">Failed to load the Lens data</p>
        <p style="font-size:13px;color:#7a9cc4;margin-bottom:16px;line-height:1.6">${escapeHtml(err.message)}</p>
        <p style="font-size:11px;color:#3d5a7e;line-height:1.6">
          Make sure you're running via a local server:<br>
          <code style="background:rgba(255,153,0,0.1);padding:2px 6px;border-radius:3px;font-family:monospace;color:#FF9900">npx serve .</code>
          or deploy to Vercel
        </p>
      </div>
    `;
  }
  console.error('Data load error:', err);
});

// ─── MOBILE SIDEBAR TOGGLE ────────────────────────────────────────────────────

(function () {
  function injectSidebarToggle() {
    const header  = document.querySelector('header');
    const sidebar = document.querySelector('.sidebar');
    if (!header || !sidebar || document.querySelector('.btn-sidebar-toggle')) return;

    // ── Move sidebar to body to escape .layout overflow:hidden trap ───────────
    // .layout has overflow:hidden + position:relative which clips position:fixed
    // children in Chrome Android. Moving it to body fixes this.
    // On resize back to desktop, sidebar is returned to its original position.
    const layoutEl   = document.querySelector('.layout');
    const mainContent = document.querySelector('.main-content');

    // Defined here so reparentSidebar can call it
    function closeSidebar() {
      document.body.classList.remove('sidebar-open');
    }

    function reparentSidebar() {
      if (window.innerWidth <= 1024) {
        // Mobile: move sidebar to body so position:fixed works correctly
        if (sidebar.parentElement !== document.body) {
          document.body.appendChild(sidebar);
        }
      } else {
        // Desktop: move sidebar back before main-content inside .layout
        if (layoutEl && sidebar.parentElement !== layoutEl) {
          closeSidebar();
          layoutEl.insertBefore(sidebar, mainContent);
        }
      }
    }

    reparentSidebar();
    window.addEventListener('resize', reparentSidebar);

    // ── Hamburger button ──────────────────────────────────────────────────────
    const btn = document.createElement('button');
    btn.className = 'btn-sidebar-toggle';
    btn.setAttribute('aria-label', 'Toggle filters');
    btn.setAttribute('title', 'Filters');
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      </svg>`;
    header.insertBefore(btn, header.firstChild);

    // ── Scrim: real div injected into body ────────────────────────────────────
    const scrim = document.createElement('div');
    scrim.className = 'sidebar-scrim';
    document.body.appendChild(scrim);

    // ── Open / close helpers ──────────────────────────────────────────────────
    function openSidebar() {
      document.body.classList.add('sidebar-open');
    }


    // ── Events ────────────────────────────────────────────────────────────────
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      document.body.classList.contains('sidebar-open') ? closeSidebar() : openSidebar();
    });

    // Close when tapping the scrim
    scrim.addEventListener('click', closeSidebar);

    // Close when a filter item is tapped (only on small screens)
    sidebar.addEventListener('click', function (e) {
      if (window.innerWidth <= 1024) {
        const clickedFilter =
          e.target.closest('.phase-pill') || e.target.closest('.cap-nav-item');
        if (clickedFilter) closeSidebar();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeSidebar();
    });

    // ── CSV buttons + Reset All at the bottom of the sidebar ────────────────
    const bottomSection = document.createElement('div');
    bottomSection.className = 'sidebar-section sidebar-bottom-section';

    // Hidden file input for Load CSV (reuses the existing one in the HTML)
    const loadBtn = document.createElement('button');
    loadBtn.className = 'sidebar-action-btn';
    loadBtn.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
        <path d="M6.5 1v7M3.5 5l3 3 3-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M1 10h11" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      </svg>
      Load CSV`;
    loadBtn.addEventListener('click', function () {
      closeSidebar();
      const input = document.getElementById('loadCSVInput');
      if (input) input.click();
    });

    const exportBtn = document.createElement('button');
    exportBtn.className = 'sidebar-action-btn';
    exportBtn.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
        <path d="M6.5 9V2M3.5 5.5l3-3 3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M1 10h11" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      </svg>
      Export CSV`;
    exportBtn.addEventListener('click', function () {
      closeSidebar();
      if (typeof exportCSV === 'function') exportCSV();
    });

    bottomSection.appendChild(loadBtn);
    bottomSection.appendChild(exportBtn);
    sidebar.appendChild(bottomSection);

    // ── About the Lens button ────────────────────────────────────────────────
    const aboutBtn = document.createElement('button');
    aboutBtn.className = 'sidebar-action-btn';
    aboutBtn.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
        <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" stroke-width="1.4"/>
        <path d="M6.5 6v3.5M6.5 4v.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      </svg>
      About the Lens`;
    aboutBtn.addEventListener('click', function () {
      closeSidebar();
      if (typeof openAboutModal === 'function') openAboutModal();
    });
    bottomSection.appendChild(aboutBtn);

    // ── Reset All button (separated by a divider) ─────────────────────────────
    const resetBtn = document.createElement('button');
    resetBtn.className = 'sidebar-reset-btn';
    resetBtn.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
        <path d="M2 6.5a4.5 4.5 0 1 0 1.2-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        <path d="M2 3v3h3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Reset All`;
    resetBtn.addEventListener('click', function () {
      closeSidebar();
      if (typeof resetAll === 'function') resetAll();
    });

    const resetSection = document.createElement('div');
    resetSection.className = 'sidebar-section sidebar-reset-section';
    resetSection.appendChild(resetBtn);
    sidebar.appendChild(resetSection);

    // ── Print Report button ──────────────────────────────────────────────────────
    const printBtn = document.createElement('button');
    printBtn.className = 'sidebar-action-btn';
    printBtn.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 18 18" fill="none">
        <rect x="3" y="5.5" width="12" height="8" rx="1.5" stroke="currentColor" stroke-width="1.4" fill="none"/>
        <path d="M5.5 5.5V3.5a1 1 0 011-1h5a1 1 0 011 1v2" stroke="currentColor" stroke-width="1.4"/>
        <rect x="6" y="9.5" width="6" height="2.5" rx=".5" fill="currentColor"/>
        <circle cx="4.5" cy="8" r=".8" fill="currentColor"/>
      </svg>
      Print Report`;
    printBtn.addEventListener('click', function () {
      closeSidebar();
      if (typeof openPrintPreview === 'function') openPrintPreview();
    });
    bottomSection.appendChild(printBtn);

    sidebar.appendChild(bottomSection);
  }

  // ── Mobile Score Strip ───────────────────────────────────────────────────────
  // Moves Overall Score and Radar Chart below the hero on mobile,
  // and returns them to the right-panel on desktop resize.
  // The right panel must keep exactly four sections in this order:
  // 1 overall score, 2 pillar progress, 3 focus-area scores, 4 radar.
  function initMobileScoreStrip() {
    const rightPanel   = document.querySelector('.right-panel');
    const scoreSection = rightPanel ? rightPanel.querySelector('.panel-section:nth-child(1)') : null;
    const radarSection = rightPanel ? rightPanel.querySelector('.panel-section:nth-child(4)') : null;
    const phaseStats   = document.getElementById('phaseStats');

    if (!scoreSection || !radarSection || !phaseStats) return;

    // Create container
    const strip = document.createElement('div');
    strip.id = 'mobileScoreStrip';
    phaseStats.parentNode.insertBefore(strip, phaseStats);

    function reparentScoreStrip() {
      if (window.innerWidth <= 1100) {
        if (scoreSection.parentElement !== strip) strip.appendChild(scoreSection);
        if (radarSection.parentElement !== strip) strip.appendChild(radarSection);
        strip.style.display = 'grid';
      } else {
        if (scoreSection.parentElement !== rightPanel) rightPanel.insertBefore(scoreSection, rightPanel.firstChild);
        if (radarSection.parentElement !== rightPanel) rightPanel.appendChild(radarSection);
        strip.style.display = 'none';
      }
    }

    reparentScoreStrip();
    window.addEventListener('resize', reparentScoreStrip);
  }

  initMobileScoreStrip();

  // Wait for the DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectSidebarToggle);
  } else {
    injectSidebarToggle();
  }
})();
