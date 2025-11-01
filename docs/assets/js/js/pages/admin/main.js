// Admin page main module: extracted from admin.html inline script
(function(){
  // Minimal helpers
  const $ = (sel) => document.querySelector(sel);
  const setStatus = (msg, type = 'info') => {
    const el = document.getElementById('status-area');
    const color = type === 'error' ? 'text-red-400' : type === 'success' ? 'text-emerald-400' : 'text-gray-300';
    if (el) el.innerHTML = `<div class="${color}">${msg}</div>`;
  };

  // Firebase readiness
  async function ensureFirebaseReady() {
    if (window.firebaseConfig && !window.firebaseConfig.isInitialized()) {
      await window.firebaseConfig.initializeFirebase();
    }
    if (!window.firebase || !firebase.auth) throw new Error('Firebase not available');
    if (!firebase.auth().currentUser) {
      await firebase.auth().signInAnonymously();
    }
    return firebase.database();
  }

  // Maintenance Mode logic
  const MAINT_PATH = 'system/maintenance';
  const LB_PATH = 'system/leaderboards/contest';
  let maintTimer = null;
  function fmtCountdown(ms) {
    if (!ms || ms <= 0) return '0s';
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const parts = [];
    if (h) parts.push(h + 'h');
    if (m) parts.push(m + 'm');
    if (!h && !m) parts.push(sec + 's');
    return parts.join(' ');
  }
  function renderMaintenance(data) {
    const stateEl = document.getElementById('maint-current-state');
    const startsEl = document.getElementById('maint-starts-at');
    const endsEl = document.getElementById('maint-ends-at');
    const cdEl = document.getElementById('maint-countdown');
    const now = Date.now();
    const startsAtMs = data?.startsAtMs ?? (data?.startsAt ? Date.parse(data.startsAt) : 0);
    const endsAtMs = data?.endsAtMs ?? (data?.endsAt ? Date.parse(data.endsAt) : 0);
    const active = !!(data && data.enabled && (!startsAtMs || now >= startsAtMs) && (!endsAtMs || now < endsAtMs));
    if (stateEl) {
      let label = 'INACTIVE';
      let cls = 'bg-white/5 border border-white/10';
      if (active) { label = 'ACTIVE'; cls = 'bg-red-500/20 border border-red-400/40'; }
      else if (data?.enabled && startsAtMs && now < startsAtMs) { label = 'SCHEDULED'; cls = 'bg-yellow-500/20 border border-yellow-400/40'; }
      stateEl.textContent = label;
      stateEl.className = 'text-xs px-2 py-1 rounded ' + cls;
    }
    if (startsEl) startsEl.textContent = startsAtMs ? new Date(startsAtMs).toLocaleString() : 'n/a';
    if (endsEl) endsEl.textContent = endsAtMs ? new Date(endsAtMs).toLocaleString() : 'n/a';
    if (maintTimer) { clearInterval(maintTimer); maintTimer = null; }
    if (cdEl) {
      if (active && endsAtMs) {
        const tick = () => cdEl.textContent = fmtCountdown(endsAtMs - Date.now());
        tick(); maintTimer = setInterval(tick, 1000);
      } else if (data?.enabled && startsAtMs && now < startsAtMs) {
        const tick = () => cdEl.textContent = fmtCountdown(startsAtMs - Date.now());
        tick(); maintTimer = setInterval(tick, 1000);
      } else { cdEl.textContent = '-'; }
    }
  }
  async function fetchMaintenanceOnce() {
    try {
      const db = await ensureFirebaseReady();
      const snap = await db.ref(MAINT_PATH).once('value');
      renderMaintenance(snap.val());
    } catch (e) { setStatus('Failed to load maintenance status: ' + e.message, 'error'); }
  }
  async function startMaintenance() {
    try {
      const db = await ensureFirebaseReady();
      const msgEl = document.getElementById('maint-message');
      const sd = (document.getElementById('maint-start-date')?.value || '').trim();
      const st = (document.getElementById('maint-start-time')?.value || '').trim();
      const ed = (document.getElementById('maint-end-date')?.value || '').trim();
      const et = (document.getElementById('maint-end-time')?.value || '').trim();
      if (!sd || !st || !ed || !et) { alert('Please set both Start and End date/time.'); return; }
      const parseParts = (dateStr, timeStr) => {
        const [y, m, d] = dateStr.split('-').map(n => parseInt(n, 10));
        const [hh, mm = '0'] = timeStr.split(':');
        const h = parseInt(hh, 10); const min = parseInt(mm, 10);
        return new Date(y, (m - 1), d, h, min, 0, 0).getTime();
      };
      const startsAtMs = parseParts(sd, st);
      const endsAtMs = parseParts(ed, et);
      if (isNaN(startsAtMs) || isNaN(endsAtMs)) { alert('Invalid Start/End date or time.'); return; }
      if (endsAtMs <= startsAtMs) { alert('End must be after Start.'); return; }
      const durationMinutes = Math.round((endsAtMs - startsAtMs) / 60000);
      const payload = {
        enabled: true,
        message: (msgEl?.value || 'Scheduled maintenance in progress.').trim(),
        startedAt: new Date().toISOString(),
        startsAt: new Date(startsAtMs).toISOString(),
        startsAtMs,
        endsAt: new Date(endsAtMs).toISOString(),
        endsAtMs,
        durationMinutes,
        updatedAt: new Date().toISOString()
      };
      await db.ref(MAINT_PATH).set(payload);
      const statusMsg = (Date.now() < startsAtMs)
        ? `Maintenance scheduled from ${new Date(startsAtMs).toLocaleString()} to ${new Date(endsAtMs).toLocaleString()}`
        : `Maintenance started until ${new Date(endsAtMs).toLocaleString()}`;
      setStatus(statusMsg, 'success');
      renderMaintenance(payload);
    } catch (e) { setStatus('Failed to start maintenance: ' + e.message, 'error'); }
  }
  async function stopMaintenance() {
    try {
      const db = await ensureFirebaseReady();
      await db.ref(MAINT_PATH).update({ enabled: false, message: '', updatedAt: new Date().toISOString() });
      setStatus('Maintenance ended.', 'success');
      await fetchMaintenanceOnce();
    } catch (e) { setStatus('Failed to end maintenance: ' + e.message, 'error'); }
  }
  async function watchMaintenance() {
    try {
      const db = await ensureFirebaseReady();
      db.ref(MAINT_PATH).on('value', snap => renderMaintenance(snap.val()));
    } catch (e) { console.warn('Maintenance watcher error:', e.message); }
  }

  // Leaderboards Timer logic
  let lbTimer = null;
  function renderLeaderboardTimer(val){
    const startEl = document.getElementById('lb-starts-at');
    const endEl = document.getElementById('lb-ends-at');
    const cdEl = document.getElementById('lb-countdown');
    const now = Date.now();
    const headEl = document.getElementById('lb-header');
    const descEl = document.getElementById('lb-description');
    const visEl = document.getElementById('lb-visible');
    const startDateInput = document.getElementById('lb-start-date');
    const startTimeInput = document.getElementById('lb-start-time');
    const endDateInput = document.getElementById('lb-end-date');
    const endTimeInput = document.getElementById('lb-end-time');
    const startsAtMs = val?.startsAtMs ?? (val?.startsAt ? Date.parse(val.startsAt) : 0);
    const endsAtMs = val?.endsAtMs ?? (val?.endsAt ? Date.parse(val.endsAt) : 0);
    if (headEl) headEl.value = (val && typeof val.header === 'string') ? val.header : '';
    if (descEl) descEl.value = (val && typeof val.description === 'string') ? val.description : '';
    if (visEl) visEl.checked = (val && typeof val.visible === 'boolean') ? val.visible : true;
    const pad2 = (n) => String(n).padStart(2, '0');
    if (startsAtMs && startDateInput && startTimeInput) {
      const d = new Date(startsAtMs);
      const yyyy = d.getFullYear();
      const mm = pad2(d.getMonth() + 1);
      const dd = pad2(d.getDate());
      const hh = pad2(d.getHours());
      const mi = pad2(d.getMinutes());
      startDateInput.value = `${yyyy}-${mm}-${dd}`;
      startTimeInput.value = `${hh}:${mi}`;
    }
    if (endsAtMs && endDateInput && endTimeInput) {
      const d = new Date(endsAtMs);
      const yyyy = d.getFullYear();
      const mm = pad2(d.getMonth() + 1);
      const dd = pad2(d.getDate());
      const hh = pad2(d.getHours());
      const mi = pad2(d.getMinutes());
      endDateInput.value = `${yyyy}-${mm}-${dd}`;
      endTimeInput.value = `${hh}:${mi}`;
    }
    if (startEl) startEl.textContent = startsAtMs ? new Date(startsAtMs).toLocaleString() : 'n/a';
    if (endEl) endEl.textContent = endsAtMs ? new Date(endsAtMs).toLocaleString() : 'n/a';
    if (lbTimer) { clearInterval(lbTimer); lbTimer = null; }
    if (cdEl && (startsAtMs || endsAtMs)) {
      const target = (startsAtMs && now < startsAtMs) ? startsAtMs : endsAtMs;
      const label = (startsAtMs && now < startsAtMs) ? 'Starts in' : 'Time remaining';
      const tick = () => {
        const rem = Math.max(0, target - Date.now());
        const totalMin = Math.floor(rem / 60000);
        const h = Math.floor(totalMin / 60);
        const m = totalMin % 60;
        cdEl.textContent = `${label}: ${h > 0 ? h + 'h ' : ''}${m}m`;
      };
      tick(); lbTimer = setInterval(tick, 1000);
    } else if (cdEl) { cdEl.textContent = '-'; }
  }
  async function fetchLeaderboardTimerOnce(){
    try {
      const db = await ensureFirebaseReady();
      const snap = await db.ref(LB_PATH).once('value');
      renderLeaderboardTimer(snap.val());
    } catch(e){ console.warn('Leaderboards timer fetch error:', e.message); }
  }
  async function watchLeaderboardTimer(){
    try {
      const db = await ensureFirebaseReady();
      db.ref(LB_PATH).on('value', snap => renderLeaderboardTimer(snap.val()));
    } catch(e){ console.warn('Leaderboards timer watch error:', e.message); }
  }
  async function saveLeaderboardTimer(){
    try {
      const db = await ensureFirebaseReady();
      const sd = (document.getElementById('lb-start-date')?.value || '').trim();
      const st = (document.getElementById('lb-start-time')?.value || '').trim();
      const ed = (document.getElementById('lb-end-date')?.value || '').trim();
      const et = (document.getElementById('lb-end-time')?.value || '').trim();
      const header = (document.getElementById('lb-header')?.value || '').trim();
      const description = (document.getElementById('lb-description')?.value || '').trim();
      const visible = !!(document.getElementById('lb-visible')?.checked);
      if (!sd || !st || !ed || !et) { alert('Please set both Start and End date/time.'); return; }
      const parseParts = (dateStr, timeStr) => {
        const [y, m, d] = dateStr.split('-').map(n => parseInt(n, 10));
        const [hh, mm = '0'] = timeStr.split(':');
        return new Date(y, (m-1), d, parseInt(hh,10), parseInt(mm,10), 0, 0).getTime();
      };
      const startsAtMs = parseParts(sd, st);
      const endsAtMs = parseParts(ed, et);
      if (isNaN(startsAtMs) || isNaN(endsAtMs)) { alert('Invalid date/time.'); return; }
      if (endsAtMs <= startsAtMs) { alert('End must be after Start.'); return; }
      const payload = { startsAt: new Date(startsAtMs).toISOString(), startsAtMs, endsAt: new Date(endsAtMs).toISOString(), endsAtMs, header, description, visible, updatedAt: new Date().toISOString() };
      await db.ref(LB_PATH).set(payload);
      setStatus('Leaderboards countdown updated.', 'success');
      renderLeaderboardTimer(payload);
    } catch(e){ setStatus('Failed to save countdown: ' + e.message, 'error'); }
  }
  async function clearLeaderboardTimer(){
    try {
      const db = await ensureFirebaseReady();
      await db.ref(LB_PATH).set({ startsAt: '', startsAtMs: 0, endsAt: '', endsAtMs: 0, header: '', description: '', visible: true, updatedAt: new Date().toISOString() });
      setStatus('Leaderboards countdown cleared.', 'success');
      renderLeaderboardTimer({});
    } catch(e){ setStatus('Failed to clear countdown: ' + e.message, 'error'); }
  }

  // Password gate
  let serverPassword = null;
  async function loadAdminPassword() {
    try {
      const res = await fetch('./admin-password.txt?_=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) throw new Error('admin-password.txt not found');
      const raw = await res.text();
      const firstLine = raw
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(l => l.length > 0 && !l.startsWith('#'))[0];
      serverPassword = firstLine || null;
    } catch (e) {
      console.warn('Failed to load admin-password.txt:', e.message);
      serverPassword = null;
    }
  }
  async function handlePasswordSubmit(evt) {
    evt.preventDefault();
    const input = $('#admin-pass').value.trim();
    const err = $('#pass-error');
    err.classList.add('hidden');
    if (!serverPassword) { err.textContent = 'Password file missing. Add admin-password.txt.'; err.classList.remove('hidden'); return; }
    if (input !== serverPassword) { err.textContent = 'Incorrect password. Try again.'; err.classList.remove('hidden'); return; }
    $('#password-gate').classList.add('hidden');
    $('#admin-tools').classList.remove('hidden');
    setStatus('Admin unlocked. Initializing Firebase...');
    try {
      await ensureFirebaseReady();
      setStatus('Firebase ready.', 'success');
      try { await fetchMaintenanceOnce(); } catch {}
      try { await fetchLeaderboardTimerOnce(); } catch {}
      try { await watchMaintenance(); } catch {}
      try { await watchLeaderboardTimer(); } catch {}
    } catch (e) { setStatus('Firebase init failed: ' + e.message, 'error'); }
  }

  // Export helpers
  const nowIso = () => new Date().toISOString();
  const downloadJson = (filename, data) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  async function fetchStudentsRaw() { const db = await ensureFirebaseReady(); const snap = await db.ref('students').once('value'); return snap.val() || {}; }
  function normalizeStudentsById(raw) { const byId = {}; Object.values(raw || {}).forEach(rec => { if (rec && rec.studentId) byId[rec.studentId] = rec; }); return byId; }
  async function fetchCareerStats() { const db = await ensureFirebaseReady(); const snap = await db.ref('student_career_stats').once('value'); return snap.val() || {}; }
  async function fetchLeaderboards() { const db = await ensureFirebaseReady(); const snap = await db.ref('leaderboards').once('value'); return snap.val() || {}; }

  async function onExportAll() {
    try {
      setStatus('Exporting all...');
      const [studentsRaw, careerStats, leaderboards] = await Promise.all([ fetchStudentsRaw(), fetchCareerStats(), fetchLeaderboards() ]);
      const studentsById = normalizeStudentsById(studentsRaw);
      const payload = { meta: { type: 'all', exportedAt: nowIso(), counts: { studentsRaw: Object.keys(studentsRaw).length, studentsById: Object.keys(studentsById).length, careerStats: Object.keys(careerStats).length, leaderboards: Object.keys(leaderboards).length }, version: '1' }, students: { raw: studentsRaw, byId: studentsById }, careerStats, leaderboards };
      downloadJson(`sci-high-export-${Date.now()}.json`, payload);
      setStatus('All data exported.', 'success');
    } catch (e) { setStatus('Export failed: ' + e.message, 'error'); }
  }
  async function onExportStudents() {
    try {
      setStatus('Exporting students...');
      const raw = await fetchStudentsRaw();
      const normalized = normalizeStudentsById(raw);
      const payload = { meta: { type: 'students', exportedAt: nowIso(), counts: { raw: Object.keys(raw).length, byId: Object.keys(normalized).length } }, studentsRaw: raw, studentsById: normalized };
      downloadJson(`sci-high-students-${Date.now()}.json`, payload);
      setStatus('Students exported.', 'success');
    } catch (e) { setStatus('Export failed: ' + e.message, 'error'); }
  }
  async function onExportCareer() {
    try {
      setStatus('Exporting career stats...');
      const stats = await fetchCareerStats();
      const payload = { meta: { type: 'career_stats', exportedAt: nowIso(), count: Object.keys(stats).length }, careerStats: stats };
      downloadJson(`sci-high-career-stats-${Date.now()}.json`, payload);
      setStatus('Career stats exported.', 'success');
    } catch (e) { setStatus('Export failed: ' + e.message, 'error'); }
  }
  async function onExportLeaderboards() {
    try {
      setStatus('Exporting leaderboards...');
      const lb = await fetchLeaderboards();
      const payload = { meta: { type: 'leaderboards', exportedAt: nowIso(), count: Object.keys(lb).length }, leaderboards: lb };
      downloadJson(`sci-high-leaderboards-${Date.now()}.json`, payload);
      setStatus('Leaderboards exported.', 'success');
    } catch (e) { setStatus('Export failed: ' + e.message, 'error'); }
  }

  async function previewResetCount() {
    try {
      setStatus('Counting students to reset...');
      const stats = await fetchCareerStats();
      const count = Object.keys(stats).length;
      $('#preview-result').textContent = `${count} student(s) found`;
      setStatus('Preview ready.', 'success');
    } catch (e) { setStatus('Preview failed: ' + e.message, 'error'); }
  }

  function buildFullResetUpdates(studentId, current) {
    const base = {};
    const path = (p) => `${studentId}/${p}`;
    base[path('careerStats/totalPoints')] = 0;
    base[path('careerStats/totalSessions')] = 0;
    base[path('careerStats/totalCorrectAnswers')] = 0;
    base[path('careerStats/totalWrongAnswers')] = 0;
    base[path('careerStats/averageAccuracy')] = 0;
    base[path('careerStats/highestStreak')] = 0;
    base[path('careerStats/courseCompletionStatus/python')] = false;
    base[path('careerStats/courseCompletionStatus/java')] = false;
    base[path('careerStats/courseCompletionStatus/csharp')] = false;
    base[path('careerStats/courseCompletionStatus/cpp')] = false;
    base[path('careerStats/courseCompletionStatus/c')] = false;
    base[path('careerStats/courseCompletionStatus/webdesign')] = false;
    base[path('careerStats/coursesCompleted')] = {};
    const levels = ['remembering','understanding','applying','analyzing','evaluating','creating'];
    levels.forEach(l => { base[path(`careerStats/bloomStats/${l}/correct`)] = 0; base[path(`careerStats/bloomStats/${l}/total`)] = 0; });
    base[path('recentSessions')] = {};
    if (current && current.studentInfo) { base[path('studentInfo/lastUpdated')] = new Date().toISOString(); }
    return base;
  }
  async function resetAllCareerPoints() {
    try {
      await ensureFirebaseReady();
      setStatus('Preparing reset...');
      const db = firebase.database();
      const snap = await db.ref('student_career_stats').once('value');
      const data = snap.val() || {};
      let updates = {}; let affected = 0;
      Object.keys(data).forEach(studentId => { const current = data[studentId] || {}; const u = buildFullResetUpdates(studentId, current); updates = { ...updates, ...u }; affected++; });
      if (affected === 0) { setStatus('No records to reset.'); return; }
      await db.ref('student_career_stats').update(updates);
      setStatus(`Reset complete. Affected students: ${affected}`, 'success');
      const ca = document.getElementById('confirm-reset-all'); if (ca) ca.classList.add('hidden');
    } catch (e) { setStatus('Reset failed: ' + e.message, 'error'); }
  }
  async function resetSingleStudent() {
    try {
      const id = $('#single-student-id').value.trim();
      if (!id) { alert('Enter a Student ID.'); return; }
      await ensureFirebaseReady();
      const db = firebase.database();
      const snap = await db.ref(`student_career_stats/${id}`).once('value');
      if (!snap.exists()) { setStatus(`No career stats found for ${id}.`, 'error'); return; }
      const updates = buildFullResetUpdates(id, snap.val());
      await db.ref('student_career_stats').update(updates);
      setStatus(`Reset all core stats for ${id}.`, 'success');
      const cs = document.getElementById('confirm-reset-single'); if (cs) cs.classList.add('hidden');
    } catch (e) { setStatus('Reset failed: ' + e.message, 'error'); }
  }

  // Wire up
  document.addEventListener('DOMContentLoaded', async () => {
    await loadAdminPassword();
    $('#password-form').addEventListener('submit', handlePasswordSubmit);
    const toggle = $('#toggle-pass');
    if (toggle) toggle.addEventListener('change', (e) => { const fld = $('#admin-pass'); if (fld) fld.type = e.target.checked ? 'text' : 'password'; });
    $('#btn-export-all').addEventListener('click', onExportAll);
    $('#btn-export-students').addEventListener('click', onExportStudents);
    $('#btn-export-career').addEventListener('click', onExportCareer);
    $('#btn-export-lb').addEventListener('click', onExportLeaderboards);
    $('#btn-preview-reset').addEventListener('click', (e) => { e.preventDefault(); previewResetCount(); });
    document.querySelectorAll('[data-preset]')?.forEach(btn => { btn.addEventListener('click', () => { const v = parseInt(btn.getAttribute('data-preset'), 10); const dur = document.getElementById('maint-duration'); const unit = document.getElementById('maint-unit'); if (unit) unit.value = 'minutes'; if (dur) dur.value = isNaN(v) ? 60 : v; }); });
    const btnStart = document.getElementById('btn-start-maint');
    const btnStop = document.getElementById('btn-stop-maint');
    const btnRefresh = document.getElementById('btn-refresh-maint');
    if (btnStart) btnStart.addEventListener('click', startMaintenance);
    if (btnStop) btnStop.addEventListener('click', stopMaintenance);
    if (btnRefresh) btnRefresh.addEventListener('click', fetchMaintenanceOnce);
    const btnSaveLb = document.getElementById('btn-save-lb');
    const btnClearLb = document.getElementById('btn-clear-lb');
    const btnRefreshLb = document.getElementById('btn-refresh-lb');
    if (btnSaveLb) btnSaveLb.addEventListener('click', saveLeaderboardTimer);
    if (btnClearLb) btnClearLb.addEventListener('click', clearLeaderboardTimer);
    if (btnRefreshLb) btnRefreshLb.addEventListener('click', fetchLeaderboardTimerOnce);
    document.getElementById('btn-reset-points').addEventListener('click', () => { const blk = document.getElementById('confirm-reset-all'); if (blk) blk.classList.remove('hidden'); });
    document.getElementById('btn-cancel-reset-all').addEventListener('click', () => { const blk = document.getElementById('confirm-reset-all'); if (blk) blk.classList.add('hidden'); });
    document.getElementById('btn-confirm-reset-all').addEventListener('click', resetAllCareerPoints);
    document.getElementById('btn-reset-single').addEventListener('click', () => { const id = $('#single-student-id').value.trim(); if (!id) { alert('Enter a Student ID.'); return; } const label = document.getElementById('confirm-student-id'); if (label) label.textContent = id; const blk = document.getElementById('confirm-reset-single'); if (blk) blk.classList.remove('hidden'); });
    document.getElementById('btn-cancel-reset-single').addEventListener('click', () => { const blk = document.getElementById('confirm-reset-single'); if (blk) blk.classList.add('hidden'); });
    document.getElementById('btn-confirm-reset-single').addEventListener('click', resetSingleStudent);
  });
})();
