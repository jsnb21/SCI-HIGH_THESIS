// Charts service for Leaderboards and Player Profile
// Exports: initializeCareerStatsCharts, createCareerLineChart, createPerformanceRadarChart,
//          createPlayerCharts, createTopicChart, createScoreChart, createProgressChart, createRadarChart,
//          generateChartColors, getTopicColor, formatTopicName

export function initializeCareerStatsCharts(career, completionStatus, recentSessions) {
  const runCharts = () => {
    try { createCareerLineChart(career, recentSessions); } catch(e){ console.warn('[CareerChart] build failed:', e); }
    try { createPerformanceRadarChart(career, completionStatus); } catch(e){ console.warn('[PerformanceRadar] build failed:', e); }
  };
  if (window.Chart) { runCharts(); }
  else if (window.ensureChartJs) {
    window.ensureChartJs().then(() => { window.applyChartWhiteTheme && window.applyChartWhiteTheme(); runCharts(); })
      .catch(err => console.warn('[CareerCharts] Chart.js load failed:', err.message));
  } else {
    console.warn('[CareerCharts] ensureChartJs not available');
  }
}

export function createCareerLineChart(career, recentSessions = {}) {
  const canvas = document.getElementById('careerChart');
  if (!canvas) return;
  if (!window.Chart) { console.warn('[CareerChart] Chart.js not loaded'); return; }

  const sessionsArray = Object.values(recentSessions)
    .filter(s => s && s.timestamp)
    .sort((a,b)=> a.timestamp - b.timestamp);

  let labels = [];
  let pointsSeries = [];
  let accuracySeries = [];
  let cumulativePoints = 0;
  if (sessionsArray.length >= 3) {
    sessionsArray.forEach(s => {
      cumulativePoints += (s.totalScore || s.sessionScore || 0);
      labels.push(new Date(s.timestamp).toLocaleDateString(undefined,{month:'short', day:'numeric'}));
      pointsSeries.push(cumulativePoints);
      accuracySeries.push(s.accuracyPercentage || 0);
    });
  } else {
    const totalPoints = career.totalPoints || 0;
    pointsSeries = [0, totalPoints*0.2, totalPoints*0.5, totalPoints*0.8, totalPoints].map(v=> Math.round(v));
    labels = ['Week 1','Week 2','Week 3','Week 4','Current'];
    accuracySeries = [65,70,75, (career.averageAccuracy||70), (career.averageAccuracy||70)];
  }

  const ctx = canvas.getContext('2d');
  if (canvas._chartInstance) { canvas._chartInstance.destroy(); }

  const gradient = ctx.createLinearGradient(0,0,0,canvas.height);
  gradient.addColorStop(0,'rgba(55,151,119,0.35)');
  gradient.addColorStop(1,'rgba(55,151,119,0)');

  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Cumulative Points',
          data: pointsSeries,
          borderColor: 'rgba(55,151,119,1)',
          backgroundColor: gradient,
          fill: true,
          tension: 0.25,
          pointRadius: 3,
          yAxisID: 'yPoints'
        },
        {
          label: 'Accuracy %',
          data: accuracySeries.map(a=> parseFloat(a.toFixed(1))),
          borderColor: 'rgba(244,206,20,1)',
          backgroundColor: 'rgba(244,206,20,0.15)',
          fill: false,
          tension: 0.25,
          pointRadius: 3,
          yAxisID: 'yAccuracy'
        }
      ]
    },
    options: {
      maintainAspectRatio: false,
      interaction: { mode:'index', intersect:false },
      plugins: {
        legend: { labels: { color:'#ffffff' } },
        tooltip: {
          callbacks: {
            label(ctx){
              if(ctx.dataset.label.includes('Points')) return `${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString()} pts`;
              return `${ctx.dataset.label}: ${ctx.parsed.y}%`;
            }
          }
        }
      },
      scales: {
        yPoints: {
          position:'left',
          ticks:{ color:'#ffffff', callback:v=> v>=1000? (v/1000)+'k': v },
          grid:{ color:'rgba(255,255,255,0.08)' }
        },
        yAccuracy: {
          position:'right',
          min:0, max:100,
          ticks:{ color:'#ffffff', callback:v=> v+'%' },
          grid:{ drawOnChartArea:false }
        },
        x:{ ticks:{ color:'#ffffff' }, grid:{ color:'rgba(255,255,255,0.05)' } }
      }
    }
  });
  canvas._chartInstance = chart;
  const fallback = document.getElementById('careerChartFallback'); if(fallback) fallback.remove();
}

export function createPerformanceRadarChart(career, completionStatus = {}) {
  const canvas = document.getElementById('performanceRadar');
  if(!canvas) return;
  if(!window.Chart){ console.warn('[PerformanceRadar] Chart.js not loaded'); return; }

  const completedCourses = Object.values(completionStatus).filter(Boolean).length;
  const totalCourses = Object.keys(completionStatus).length || 1;
  const completionPct = (completedCourses/totalCourses)*100;

  const metrics = {
    Accuracy: Math.min(100, career.averageAccuracy || 0),
    Engagement: Math.min(100, (career.totalSessions||0) / 50 * 100),
    Consistency: Math.min(100, (career.highestStreak||0) / 20 * 100),
    Progress: Math.min(100, completionPct),
    Mastery: Math.min(100, (career.totalPoints||0) / 50000 * 100)
  };
  const labels = Object.keys(metrics);
  const data = Object.values(metrics).map(v=> parseFloat(v.toFixed(1)));

  if(canvas._chartInstance) canvas._chartInstance.destroy();
  const ctx = canvas.getContext('2d');
  const radar = new Chart(ctx, {
    type: 'radar',
    data: { labels, datasets:[{
      label: 'Performance Index',
      data,
      backgroundColor: 'rgba(55,151,119,0.25)',
      borderColor: 'rgba(55,151,119,1)',
      pointBackgroundColor: 'rgba(244,206,20,1)',
      pointBorderColor: '#ffffff',
      borderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6
    }]},
    options:{
      maintainAspectRatio:false,
      plugins:{
        legend:{ labels:{ color:'#ffffff' } },
        tooltip:{ callbacks:{ label: ctx => `${ctx.label}: ${ctx.parsed.r}%` } }
      },
      scales:{
        r:{
          beginAtZero:true,
          suggestedMax:100,
          ticks:{ display:false },
          grid:{ color:'rgba(255,255,255,0.15)' },
          angleLines:{ color:'rgba(255,255,255,0.25)' },
          pointLabels:{ color:'#ffffff', font:{ size:13 } }
        }
      }
    }
  });
  canvas._chartInstance = radar;
  const fallback = document.getElementById('radarChartFallback'); if(fallback) fallback.remove();
}

export function createPlayerCharts(playerData, topicPoints, gameData) {
  if (Object.keys(topicPoints).length > 0) createTopicChart(topicPoints);
  createScoreChart(playerData, gameData);
  if (gameData.courseProgress) createProgressChart(gameData.courseProgress);
  createRadarChart(playerData, gameData, topicPoints);
}

export function createTopicChart(topicPoints) {
  const ctx = document.getElementById('topicChart');
  if (!ctx) return;
  const topics = Object.keys(topicPoints);
  const scores = Object.values(topicPoints);
  const colors = generateChartColors(topics.length);
  new Chart(ctx, {
    type: 'doughnut',
    data: { labels: topics.map(topic => formatTopicName(topic)), datasets: [{ data: scores, backgroundColor: colors.backgrounds, borderColor: colors.borders, borderWidth: 2 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { padding: 15, usePointStyle: true, color: '#ffffff' } },
        tooltip: { callbacks: { label(context) {
          const label = context.label || ''; const value = context.parsed; const total = context.dataset.data.reduce((a,b)=>a+b,0); const percentage = ((value/total)*100).toFixed(1);
          return `${label}: ${value} pts (${percentage}%)`; } } }
      }
    }
  });
}

export function createScoreChart(playerData, gameData) {
  const ctx = document.getElementById('scoreChart');
  if (!ctx) return;
  const totalScore = playerData.score;
  const achievementBonus = (gameData.achievementCount || 0) * 100;
  const baseScore = totalScore - achievementBonus;
  const timeBonus = Math.max(0, totalScore * 0.1);
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Base Score', 'Achievement Bonus', 'Time Bonus'],
      datasets: [{ label: 'Score Breakdown', data: [baseScore, achievementBonus, timeBonus], backgroundColor: ['rgba(244, 206, 20, 0.8)','rgba(55, 151, 119, 0.8)','rgba(69, 71, 75, 0.8)'], borderColor: ['rgb(244, 206, 20)','rgb(55, 151, 119)','rgb(69, 71, 75)'], borderWidth: 2 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display:false }, tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.parsed.y} points` } } },
      scales: { y: { beginAtZero: true, ticks: { color:'#ffffff' }, title:{ display:true, text:'Points', color:'#ffffff' } }, x:{ ticks:{ color:'#ffffff' } } }
    }
  });
}

export function createProgressChart(courseProgress) {
  const ctx = document.getElementById('progressChart');
  if (!ctx) return;
  const courses = Object.keys(courseProgress);
  const progress = courses.map(c => courseProgress[c] || 0);
  const colors = generateChartColors(courses.length);
  new Chart(ctx, {
    type: 'bar',
    data: { labels: courses.map(formatTopicName), datasets: [{ label: 'Progress %', data: progress, backgroundColor: colors.backgrounds, borderColor: colors.borders, borderWidth: 2 }] },
    options: { responsive:true, maintainAspectRatio:false, scales: { y: { beginAtZero:true, max:100, ticks:{ color:'#333' } }, x: { ticks:{ color:'#333' } } } }
  });
}

export function createRadarChart(playerData, gameData, topicPoints) {
  const ctx = document.getElementById('radarChart');
  if (!ctx) return;
  const metrics = {
    'Accuracy': (playerData.accuracy || 70),
    'Consistency': Math.min(100, (gameData.maxCombo || 10) * 5),
    'Engagement': Math.min(100, (Object.keys(topicPoints).length || 1) * 10),
    'Mastery': Math.min(100, (playerData.score || 0) / 50),
    'Speed': Math.min(100, (gameData.playTime || 0) / 60)
  };
  new Chart(ctx, {
    type: 'radar',
    data: { labels: Object.keys(metrics), datasets: [{ label:'Performance', data: Object.values(metrics), backgroundColor:'rgba(55, 151, 119, 0.2)', borderColor:'rgba(55, 151, 119, 1)', pointBackgroundColor:'rgba(244, 206, 20, 1)', pointBorderColor:'#333' }] },
    options: { responsive:true, maintainAspectRatio:false, scales: { r: { angleLines:{ color:'#999' }, grid:{ color:'#ccc' }, pointLabels:{ color:'#333' }, ticks:{ display:false } } } }
  });
}

export function generateChartColors(count) {
  const baseColors = [
    '#F4CE14', '#379777', '#45474B', '#6C63FF', '#FF6B6B', '#4ECDC4', '#C7F464', '#556270', '#C44D58', '#2A9D8F'
  ];
  const backgrounds = [];
  const borders = [];
  for (let i=0;i<count;i++){
    const col = baseColors[i % baseColors.length];
    borders.push(col);
    const rgba = hexToRgba(col, 0.7);
    backgrounds.push(rgba);
  }
  return { backgrounds, borders };
}

function hexToRgba(hex, alpha) {
  const bigint = parseInt(hex.replace('#',''), 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getTopicColor(topic) {
  const colors = {
    python: '#3776AB', java: '#B07219', csharp: '#178600', cpp: '#00599C', c: '#555555', webdesign: '#E34F26'
  };
  const key = (topic || '').toString().toLowerCase();
  return colors[key] || '#888888';
}

export function formatTopicName(topic) {
  const map = { python:'Python', java:'Java', csharp:'C#', cpp:'C++', c:'C', webdesign:'Web Design' };
  const key = (topic || '').toString().toLowerCase();
  return map[key] || (key.charAt(0).toUpperCase() + key.slice(1));
}

// Bloom charts builder
export function buildBloomChartsFromCareer(career){
  const stats = career.bloomStats;
  if(!stats || typeof stats !== 'object') {
    console.info('[BloomCharts] No bloomStats object found on careerStats.');
    const distFallback = document.getElementById('bloomDistributionFallback');
    if(distFallback){ distFallback.innerHTML = '<div class="text-gray-400 text-center"><div class="text-xl mb-1">ℹ️</div><div>No Bloom data yet.<br/><span class="text-sm text-gray-500">Play at least one quiz session after update.</span></div></div>'; }
    const accFallback = document.getElementById('bloomAccuracyFallback');
    if(accFallback){ accFallback.innerHTML = '<div class="text-gray-400 text-center"><div class="text-xl mb-1">ℹ️</div><div>No Bloom accuracy yet.</div></div>'; }
    return;
  }
  const orderedLevels = ['remembering','understanding','applying','analyzing','evaluating','creating'];
  const presentLevels = orderedLevels.filter(l => stats[l] && stats[l].total > 0);
  if(presentLevels.length === 0){
    console.info('[BloomCharts] bloomStats present but all totals are 0. Raw stats:', stats);
    const distFallback = document.getElementById('bloomDistributionFallback');
    if(distFallback){ distFallback.innerHTML = '<div class="text-gray-400 text-center"><div class="text-xl mb-1">🕒</div><div>Bloom tracking initialized.<br/><span class="text-sm text-gray-500">Answer some questions to populate.</span></div></div>'; }
    const accFallback = document.getElementById('bloomAccuracyFallback');
    if(accFallback){ accFallback.innerHTML = '<div class="text-gray-400 text-center"><div class="text-xl mb-1">🕒</div><div>No accuracy data yet.</div></div>'; }
    return;
  }

  const totals = presentLevels.map(l => stats[l].total);
  const corrects = presentLevels.map(l => stats[l].correct || 0);
  const accuracies = corrects.map((c,i)=> (c / Math.max(1, totals[i])) * 100);

  const distCtx = document.getElementById('bloomDistributionChart');
  if(distCtx){
    const colors = generateChartColors(presentLevels.length);
    new Chart(distCtx, {
      type: 'doughnut',
      data: { labels: presentLevels.map(capitalizeBloom), datasets:[{ data: totals, backgroundColor: colors.backgrounds, borderColor: colors.borders, borderWidth: 2 }]},
      options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'bottom', labels:{ usePointStyle:true, padding:12, color:'#ffffff' }}} }
    });
    const sumTotal = totals.reduce((a,b)=>a+b,0);
    const high = presentLevels[accuracies.indexOf(Math.max(...accuracies))];
    const fallback = document.getElementById('bloomDistributionFallback'); if(fallback) fallback.remove();
    const summary = document.getElementById('bloom-distribution-summary'); if(summary) summary.textContent = `${sumTotal} questions • Best accuracy: ${capitalizeBloom(high)}`;
  }

  const accCtx = document.getElementById('bloomAccuracyChart');
  if(accCtx){
    new Chart(accCtx, {
      type: 'bar',
      data: { labels: presentLevels.map(capitalizeBloom), datasets:[{ label:'Accuracy %', data: accuracies.map(a=> parseFloat(a.toFixed(1))), backgroundColor:'rgba(55,151,119,0.8)', borderColor:'rgb(55,151,119)', borderWidth:2 }]},
      options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false }}, scales:{ y:{ beginAtZero:true, max:100, ticks:{ color:'#ffffff' } }, x:{ ticks:{ color:'#ffffff' } }}} 
    });
    const avgAcc = (accuracies.reduce((a,b)=>a+b,0)/accuracies.length).toFixed(1);
    const fallback = document.getElementById('bloomAccuracyFallback'); if(fallback) fallback.remove();
    const summary = document.getElementById('bloom-accuracy-summary'); if(summary) summary.textContent = `Average accuracy: ${avgAcc}%`;
  }
}

function capitalizeBloom(str){
  return str.charAt(0).toUpperCase() + str.slice(1);
}

