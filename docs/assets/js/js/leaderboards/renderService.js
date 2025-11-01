// Rendering service for leaderboard list and player cards
// Exports: renderLeaderboard(data), renderPlayerCards(data)

export function renderLeaderboard(data) {
  const container = document.getElementById('leaderboard-list');
  if (!container) return;
  if (!data || data.length === 0) {
    container.innerHTML = '<p class="text-gray-500 text-center font-gaming">No career stats available yet. Complete some quiz sessions!</p>';
    return;
  }

  const MAX_INITIAL = 10;
  const visible = data.slice(0, MAX_INITIAL);
  const hidden = data.slice(MAX_INITIAL);

  let html = `
    <div class="overflow-x-auto">
      <table class="w-full text-left bg-dark/50 rounded-lg overflow-hidden">
        <thead class="bg-gradient-to-r from-primary to-accent">
          <tr class="text-dark font-gaming">
            <th class="py-4 px-4 font-bold">Rank</th>
            <th class="py-4 px-4 font-bold">Student</th>
            <th class="py-4 px-4 font-bold">Total Points</th>
            <th class="py-4 px-4 font-bold">Sessions</th>
            <th class="py-4 px-4 font-bold">Avg Accuracy</th>
            <th class="py-4 px-4 font-bold">Courses</th>
            <th class="py-4 px-4 font-bold">Department</th>
          </tr>
        </thead>
        <tbody>
  `;

  const renderRow = (entry, index) => {
    const rank = index + 1;
    let rankBadge = '';
    let rowClass = 'border-b border-light/30 hover:bg-light/20 transition-colors';
    if (rank === 1) { rankBadge = '👑'; rowClass += ' bg-gradient-to-r from-yellow-400/10 to-yellow-600/10'; }
    else if (rank === 2) { rankBadge = '🥈'; rowClass += ' bg-gradient-to-r from-gray-300/10 to-gray-500/10'; }
    else if (rank === 3) { rankBadge = '🥉'; rowClass += ' bg-gradient-to-r from-orange-400/10 to-orange-600/10'; }

    const playerNameHtml = `
      <button class="player-name-link text-primary hover:text-accent underline cursor-pointer font-medium transition-colors" onclick="showPlayerProfile('${entry.studentId}')">
        ${entry.name}
      </button>
    `;

    const coursesHtml = `
      <div class="text-center">
        <span class="text-accent font-bold">${entry.completedCourses}/${entry.totalCourses}</span>
        <div class="text-xs text-gray-400">${entry.completionPercentage}%</div>
      </div>
    `;

    return `
      <tr class="${rowClass}">
        <td class="py-3 px-4">
          <div class="flex items-center space-x-2">
            <span class="font-gaming font-bold text-primary">#${rank}</span>
            <span class="text-lg">${rankBadge}</span>
          </div>
        </td>
        <td class="py-3 px-4">
          <div>
            ${playerNameHtml}
            <div class="text-xs text-gray-400">${entry.strand ? `${entry.strand}` : ''}${entry.strand && entry.year ? ' - ' : ''}${entry.year ? `${entry.year}` : ''}${!entry.strand && !entry.year && entry.strandYear ? entry.strandYear : ''}</div>
          </div>
        </td>
        <td class="py-3 px-4">
          <span class="font-gaming font-bold text-primary text-lg">${(entry.score||0).toLocaleString()}</span>
        </td>
        <td class="py-3 px-4 text-center">
          <span class="font-gaming text-accent">${entry.totalSessions||0}</span>
        </td>
        <td class="py-3 px-4 text-center">
          <span class="font-gaming text-cyan">${entry.averageAccuracy||0}%</span>
        </td>
        <td class="py-3 px-4">
          ${coursesHtml}
        </td>
        <td class="py-3 px-4">
          <span class="text-sm text-gray-300">${entry.department||'Unknown'}</span>
        </td>
      </tr>
    `;
  };

  visible.forEach((entry, idx) => { html += renderRow(entry, idx); });

  if (hidden.length > 0) {
    // Hidden rows container (collapsed by default)
    html += `<tr id="lb-hidden-start" class="hidden"></tr>`; // marker for AOS observer grouping
    hidden.forEach((entry, i) => {
      const globalIndex = MAX_INITIAL + i;
      html += renderRow(entry, globalIndex);
    });
  }

  html += '</tbody></table></div>';

  if (hidden.length > 0) {
    html += `
      <div class="flex justify-center mt-4">
        <button id="lb-toggle" class="px-4 py-2 rounded bg-primary text-dark font-gaming hover:opacity-90 transition-colors">
          Show More
        </button>
      </div>
    `;
  }
  container.innerHTML = html;

  // Wire up toggle logic if there are hidden rows
  if (hidden.length > 0) {
    const btn = document.getElementById('lb-toggle');
    const tbody = container.querySelector('tbody');
    let expanded = false;
    if (btn && tbody) {
      btn.addEventListener('click', () => {
        expanded = !expanded;
        // Toggle visibility by adding/removing a class on hidden section
        const rows = Array.from(tbody.querySelectorAll('tr'));
        rows.forEach((tr, idx) => {
          if (idx >= MAX_INITIAL) {
            tr.classList.toggle('hidden', !expanded);
          }
        });
        btn.textContent = expanded ? 'Show Less' : 'Show More';
        // If AOS is loaded, refresh animations after expanding
        try { if (window.AOS) window.AOS.refreshHard(); } catch (_) {}
      });

      // Initial state: hide extra rows
      const rows = Array.from(tbody.querySelectorAll('tr'));
      rows.forEach((tr, idx) => { if (idx >= MAX_INITIAL) tr.classList.add('hidden'); });
    }
  }
}

export function renderPlayerCards(data) {
  const container = document.getElementById('player-cards-grid');
  const loading = document.getElementById('player-cards-loading');
  if (!container) return;

  if (!data || data.length === 0) {
    if (loading) {
      loading.innerHTML = '<p class="text-gray-400 text-center font-gaming">No students with career stats found</p>';
      loading.style.display = 'block';
    }
    return;
  }
  if (loading) loading.style.display = 'none';

  const rawTop = data.slice(0, 3);
  const ordered = rawTop.length === 3 ? [rawTop[1], rawTop[0], rawTop[2]] : rawTop;

  let cardsHtml = '';
  ordered.forEach(player => {
    const originalRank = data.indexOf(player) + 1;
    const playerName = player.name || 'Unknown Student';
    let initials = '??';
    try {
      const words = (playerName || '').trim().split(' ').filter(Boolean);
      initials = (words.map(w => w[0]?.toUpperCase() || '').join('') || playerName.substring(0,2)).substring(0,2).toUpperCase();
    } catch (_) {}

    let cardStyle, rankIcon, rankColor;
    if (originalRank === 1) { cardStyle = 'from-yellow-400/20 to-yellow-600/20'; rankIcon = '👑'; rankColor = 'from-yellow-400 to-yellow-600'; }
    else if (originalRank === 2) { cardStyle = 'from-gray-300/20 to-gray-500/20'; rankIcon = '🥈'; rankColor = 'from-gray-300 to-gray-500'; }
    else { cardStyle = 'from-orange-400/20 to-orange-600/20'; rankIcon = '🥉'; rankColor = 'from-orange-400 to-orange-600'; }
    const emphasizeClass = originalRank === 1 ? 'md:scale-110 md:-mt-2 z-10' : 'md:scale-100';

    cardsHtml += `
      <div class="leaderboard-card relative group cursor-pointer transform transition-all duration-300 hover:scale-105 ${emphasizeClass} opacity-100" onclick="showPlayerProfile('${player.studentId}')">
        <div class="neon-border bg-gradient-to-br ${cardStyle} rounded-lg p-6 backdrop-blur-sm relative overflow-hidden">
          <div class="absolute -top-3 -right-3 w-12 h-12 bg-gradient-to-br ${rankColor} rounded-full flex items-center justify-center text-lg font-bold text-white border-3 border-white shadow-xl z-10">${rankIcon}</div>
          <div class="flex flex-col items-center mb-4">
            <div class="w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-2xl font-bold text-dark mb-3 border-3 border-primary/50 shadow-lg">${initials}</div>
            <div class="text-center">
              <h3 class="font-gaming text-primary text-lg font-bold">${playerName}</h3>
              <p class="text-gray-400 text-sm">${player.department || 'Unknown'}</p>
            </div>
          </div>
          <div class="space-y-3">
            <div class="flex justify-between items-center"><span class="text-gray-300 text-sm font-gaming">Career Points</span><span class="text-primary font-gaming font-bold text-lg">${(player.score || 0).toLocaleString()}</span></div>
            <div class="flex justify-between items-center"><span class="text-gray-300 text-sm font-gaming">Global Rank</span><span class="text-accent font-gaming font-bold text-lg">#${originalRank}</span></div>
            <div class="flex justify-between items-center"><span class="text-gray-300 text-sm font-gaming">Sessions</span><span class="text-cyan font-gaming font-bold">${player.totalSessions || 0}</span></div>
            <div class="flex justify-between items-center"><span class="text-gray-300 text-sm font-gaming">Accuracy</span><span class="text-purple font-gaming font-bold">${player.averageAccuracy || 0}%</span></div>
            <div class="flex justify-between items-center"><span class="text-gray-300 text-sm font-gaming">Courses</span><span class="text-orange-400 font-gaming font-bold">${player.completedCourses}/${player.totalCourses}</span></div>
          </div>
          <div class="mt-4">
            <div class="flex justify-between text-xs text-gray-400 mb-1"><span>Course Progress</span><span>${player.completionPercentage}%</span></div>
            <div class="w-full bg-gray-700 rounded-full h-2"><div class="bg-gradient-to-r from-accent to-cyan h-2 rounded-full transition-all duration-300" style="width: ${player.completionPercentage}%"></div></div>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = cardsHtml;

  // Ensure cards are visible even if AOS/animations left a parent hidden on some devices
  try {
    // If AOS is present, refresh to register newly injected elements
    if (window.AOS) {
      if (typeof window.AOS.refreshHard === 'function') window.AOS.refreshHard();
      else if (typeof window.AOS.refresh === 'function') window.AOS.refresh();
    }

    // If any ancestor has data-aos but didn't animate, force it visible
    const aosAncestor = container.closest('[data-aos]');
    if (aosAncestor && !aosAncestor.classList.contains('aos-animate')) {
      aosAncestor.classList.add('aos-animate');
      aosAncestor.style.opacity = '';
      aosAncestor.style.visibility = '';
      aosAncestor.style.transform = '';
    }
  } catch (_) {}

  // Extra safeguard: force cards to be visible
  try {
    requestAnimationFrame(() => {
      container.querySelectorAll('.leaderboard-card').forEach(el => {
        el.style.opacity = '1';
        el.style.visibility = 'visible';
      });
    });
  } catch (_) {}
}
