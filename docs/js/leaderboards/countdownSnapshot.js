// Countdown + Snapshot module for Leaderboards
// Exports initCountdown(options)

function qs(selector) {
  return document.querySelector(selector);
}

function createDownloadButtons(container, toCSV, snapshot) {
  if (!container) return;
  let btnWrap = document.getElementById('mini-contest-downloads');
  if (btnWrap) btnWrap.remove();
  btnWrap = document.createElement('div');
  btnWrap.id = 'mini-contest-downloads';
  btnWrap.className = 'mt-4 flex flex-wrap gap-3';

  const jsonBtn = document.createElement('button');
  jsonBtn.className = 'px-4 py-2 font-gaming text-sm rounded-lg bg-primary text-dark font-bold hover:brightness-110 transition shadow';
  jsonBtn.textContent = 'Download Winners (JSON)';
  jsonBtn.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'mini_contest_winners.json';
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
  });

  const csvBtn = document.createElement('button');
  csvBtn.className = 'px-4 py-2 font-gaming text-sm rounded-lg bg-accent text-white font-bold hover:brightness-110 transition shadow';
  csvBtn.textContent = 'Download Winners (CSV)';
  csvBtn.addEventListener('click', () => {
    const blob = new Blob([toCSV(snapshot)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'mini_contest_winners.csv';
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
  });

  btnWrap.appendChild(jsonBtn);
  btnWrap.appendChild(csvBtn);
  container.appendChild(btnWrap);
}

function partitionByDepartment(entries) {
  const buckets = {};
  entries.forEach(e => {
    const dept = (e.department || 'Unknown').trim() || 'Unknown';
    if (!buckets[dept]) buckets[dept] = [];
    buckets[dept].push(e);
  });
  const result = {};
  Object.keys(buckets).forEach(dept => {
    const sorted = buckets[dept].slice().sort((a, b) => b.score - a.score);
    result[dept] = sorted.slice(0, 3);
  });
  return result;
}

function buildSnapshotStructure(all, targetDate) {
  const overallTop3 = all.slice(0, 3);
  const byDept = partitionByDepartment(all);
  return {
    generatedAt: new Date().toISOString(),
    contestEnds: targetDate.toISOString(),
    overallTop3,
    byDepartment: byDept
  };
}

function toCSV(snapshot) {
  const rows = [];
  rows.push(['Category', 'Rank', 'StudentId', 'Name', 'Department', 'Score', 'Sessions', 'Accuracy', 'CompletedCourses', 'TotalCourses'].join(','));
  function pushEntries(category, list) {
    list.forEach((e, i) => {
      rows.push([
        '"' + category + '"',
        i + 1,
        '"' + (e.studentId || '') + '"',
        '"' + (e.name || '') + '"',
        '"' + (e.department || '') + '"',
        e.score || 0,
        e.totalSessions || 0,
        e.averageAccuracy || 0,
        e.completedCourses || 0,
        e.totalCourses || 0
      ].join(','));
    });
  }
  pushEntries('Overall', snapshot.overallTop3);
  Object.keys(snapshot.byDepartment).forEach(dept => {
    pushEntries('Dept: ' + dept, snapshot.byDepartment[dept]);
  });
  return rows.join('\n');
}

async function waitForLeaderboardLoader(maxMs = 10000, interval = 200) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    if (window.leaderboardAPI && typeof window.leaderboardAPI.loadCareerStatsData === 'function') {
      return window.leaderboardAPI.loadCareerStatsData;
    }
    await new Promise(r => setTimeout(r, interval));
  }
  return null;
}

export async function initCountdown(options) {
  const {
    targetISO,
    containerId = 'mini-contest-countdown',
    selectors = { days: '#mc-days', hours: '#mc-hours', mins: '#mc-mins', secs: '#mc-secs' },
    statusId = 'mini-contest-status',
    enableAdminButton = true,
    loadData // optional: async () => Array
  } = options || {};

  // Allow fallback to centralized config when targetISO not provided
  let targetDate;
  if (targetISO) {
    targetDate = new Date(targetISO);
  } else {
    try {
      const cfg = await import('./config.js');
      targetDate = cfg.getContestEndDate();
    } catch {
      targetDate = new Date('2025-10-12T00:00:00');
    }
  }
  const daysEl = qs(selectors.days);
  const hoursEl = qs(selectors.hours);
  const minsEl = qs(selectors.mins);
  const secsEl = qs(selectors.secs);
  const statusEl = statusId ? document.getElementById(statusId) : null;
  const container = containerId ? document.getElementById(containerId) : null;
  let snapshotTaken = false;

  async function getFullLeaderboardData() {
    try {
      if (typeof loadData === 'function') {
        return await loadData();
      }
      const loader = await waitForLeaderboardLoader();
      if (loader) return await loader();
    } catch (e) {
      console.warn('[MiniContestSnapshot] load failed', e);
    }
    return [];
  }

  function addDownloadButtons(snapshot) {
    createDownloadButtons(container, toCSV, snapshot);
  }

  async function generateSnapshot(label = 'Contest') {
    const data = await getFullLeaderboardData();
    const snapshot = buildSnapshotStructure(data, targetDate);
    addDownloadButtons(snapshot);
    console.info('[MiniContestSnapshot] ' + label + ' snapshot generated', snapshot);
  }

  async function takeSnapshot() {
    if (snapshotTaken) return;
    snapshotTaken = true;
    if (statusEl) statusEl.textContent = 'Contest ended. Snapshot captured.';
    await generateSnapshot('Auto');
  }

  // Admin/manual trigger support (?admin=1 in URL)
  (async function setupManualSnapshot() {
    try {
      if (!enableAdminButton || !container) return;
      let isAdmin = false;
      try { const cfg = await import('./config.js'); isAdmin = cfg.isAdmin(); } catch { 
        const params = new URLSearchParams(window.location.search); isAdmin = params.get('admin') === '1';
      }
      if (!isAdmin) return;
      let manualBtn = document.getElementById('mini-contest-manual-btn');
      if (manualBtn) manualBtn.remove();
      manualBtn = document.createElement('button');
      manualBtn.id = 'mini-contest-manual-btn';
      manualBtn.type = 'button';
      manualBtn.className = 'px-4 py-2 font-gaming text-xs md:text-sm rounded-lg bg-gradient-to-r from-purple to-pink-600 text-white font-semibold tracking-wide shadow hover:brightness-110 hover:shadow-lg transition focus:outline-none focus:ring-2 focus:ring-purple-300';
      manualBtn.textContent = 'Test Export Now';
      manualBtn.title = 'Generate a snapshot early (admin only)';
      manualBtn.addEventListener('click', async () => {
        if (!snapshotTaken) snapshotTaken = true; // allow regenerations before end
        if (statusEl) statusEl.textContent = 'Generating manual snapshot...';
        await generateSnapshot('Manual');
        if (statusEl) statusEl.textContent = 'Manual snapshot ready (will auto-regenerate at contest end).';
      });
      container.appendChild(manualBtn);
    } catch (err) {
      console.warn('[MiniContestSnapshot] manual button setup failed:', err);
    }
  })();

  if (daysEl && hoursEl && minsEl && secsEl) {
    function updateCountdown() {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();
      if (diff <= 0) {
        daysEl.textContent = '0';
        hoursEl.textContent = '00';
        minsEl.textContent = '00';
        secsEl.textContent = '00';
        if (!snapshotTaken) takeSnapshot();
        if (container) container.classList.add('ring', 'ring-primary/50');
        return; // stop updating further values; keep zeros
      }
      const totalSeconds = Math.floor(diff / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      daysEl.textContent = String(days);
      hoursEl.textContent = hours.toString().padStart(2, '0');
      minsEl.textContent = minutes.toString().padStart(2, '0');
      secsEl.textContent = seconds.toString().padStart(2, '0');
      if (statusEl) statusEl.textContent = 'Time remaining until contest ends';
    }
    updateCountdown();
    setInterval(updateCountdown, 1000);
  }
}
