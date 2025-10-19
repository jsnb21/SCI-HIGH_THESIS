// Reusable Maintenance Toast module
// Usage:
//   <script src="src/pages/index/maintenanceToast.js"></script>
//   window.MaintenanceToast.init({ onChange: (active, data) => { /* optional UI updates */ } });
(function(global){
  'use strict';

  const DEFAULT_PATH = 'system/maintenance';
  let watchingRef = null;
  let countdownTimer = null;

  function ensureToast(position = 'bottom-left'){
    let t = document.getElementById('maintenance-toast');
    if (t) return t;
    t = document.createElement('div');
    t.id = 'maintenance-toast';
    t.style.position = 'fixed';
    t.style.zIndex = '1000';
    t.style.maxWidth = '320px';
    t.style.background = 'rgba(23, 23, 28, 0.9)';
    t.style.border = '1px solid rgba(250, 204, 21, 0.35)';
    t.style.boxShadow = '0 8px 20px rgba(0,0,0,0.35), 0 0 18px rgba(250,204,21,0.15)';
    t.style.color = '#fde68a';
    t.style.borderRadius = '12px';
    t.style.padding = '12px 14px';
    t.style.backdropFilter = 'blur(6px)';
    t.style.pointerEvents = 'auto';
    if (position === 'bottom-left') {
      t.style.left = '16px'; t.style.bottom = '16px';
    } else if (position === 'bottom-right') {
      t.style.right = '16px'; t.style.bottom = '16px';
    } else if (position === 'top-left') {
      t.style.left = '16px'; t.style.top = '16px';
    } else if (position === 'top-right') {
      t.style.right = '16px'; t.style.top = '16px';
    }
    t.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <span style="font-size:16px;">⚠️</span>
        <strong style="color:#facc15;letter-spacing:.3px">Maintenance Mode</strong>
      </div>
      <div id="maint-toast-msg" style="font-size:13px;color:#fde68a;opacity:.95"></div>
      <div id="maint-toast-ends" style="font-size:12px;color:#fcd34d;opacity:.9;margin-top:6px"></div>
      <div id="maint-toast-count" style="font-size:12px;color:#fcd34d;opacity:.9;margin-top:2px"></div>
    `;
    document.body.appendChild(t);
    return t;
  }

  function removeToast(){
    const t = document.getElementById('maintenance-toast');
    if (t) t.remove();
  }

  function renderToast(data){
    const t = ensureToast();
    const msgEl = document.getElementById('maint-toast-msg');
    const endsEl = document.getElementById('maint-toast-ends');
    const cntEl = document.getElementById('maint-toast-count');
    const msg = data?.message || 'Scheduled maintenance in progress.';
    const now = Date.now();
    const startsAtMs = data?.startsAtMs ?? (data?.startsAt ? Date.parse(data.startsAt) : 0);
    const endsAtMs = data?.endsAtMs ?? (data?.endsAt ? Date.parse(data.endsAt) : 0);
    const isScheduled = !!(data && data.enabled && startsAtMs && now < startsAtMs);
    if (msgEl) msgEl.textContent = msg;
    if (endsEl) {
      if (isScheduled) {
        endsEl.textContent = startsAtMs ? `Starts: ${new Date(startsAtMs).toLocaleString()}` : '';
      } else {
        endsEl.textContent = endsAtMs ? `Ends: ${new Date(endsAtMs).toLocaleString()}` : '';
      }
    }
    if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
    if (cntEl) {
      const makeTick = (targetMs, label) => () => {
        const rem = Math.max(0, targetMs - Date.now());
        const totalMinutes = Math.floor(rem / 60000);
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        const parts = [];
        if (h > 0) parts.push(h + 'h');
        parts.push((m >= 0 ? m : 0) + 'm');
        const timeStr = parts.join(' ');
        cntEl.textContent = `${label}: ${timeStr}`;
      };
      if (isScheduled && startsAtMs) {
        const tick = makeTick(startsAtMs, 'Starts in');
        tick();
        countdownTimer = setInterval(tick, 1000);
      } else if (endsAtMs) {
        const tick = makeTick(endsAtMs, 'Time remaining');
        tick();
        countdownTimer = setInterval(tick, 1000);
      } else {
        cntEl.textContent = '';
      }
    }
  }

  async function ensureFirebaseReady(opts){
    // Wait briefly for firebase global
    let attempts = 0;
    while (typeof global.firebase === 'undefined' && attempts < 50) {
      await new Promise(r => setTimeout(r, 100));
      attempts++;
    }
    if (typeof global.firebase === 'undefined') return false;

    // Optional: initialize via firebaseConfig if present
    try {
      if (global.firebaseConfig && !global.firebaseConfig.isInitialized()) {
        await global.firebaseConfig.initializeFirebase();
      }
    } catch {}

    // Ensure auth for reads/writes under rules requiring auth
    try {
      if (global.firebase.auth && !global.firebase.auth().currentUser) {
        await global.firebase.auth().signInAnonymously();
      }
    } catch {}
    return true;
  }

  function computeActive(val){
    const now = Date.now();
    const startsAtMs = val?.startsAtMs ?? (val?.startsAt ? Date.parse(val.startsAt) : 0);
    const endsAtMs = val?.endsAtMs ?? (val?.endsAt ? Date.parse(val.endsAt) : 0);
    return !!(val && val.enabled && (!startsAtMs || now >= startsAtMs) && (!endsAtMs || now < endsAtMs));
  }

  function computeScheduled(val){
    const now = Date.now();
    const startsAtMs = val?.startsAtMs ?? (val?.startsAt ? Date.parse(val.startsAt) : 0);
    return !!(val && val.enabled && startsAtMs && now < startsAtMs);
  }

  async function init(options = {}){
    const { onChange, position = 'bottom-left', path = DEFAULT_PATH } = options;
    const ok = await ensureFirebaseReady(options);
    if (!ok || !global.firebase?.database) {
      console.warn('[MaintenanceToast] Firebase not ready; toast disabled.');
      return { destroy: () => {} };
    }

    // Ensure toast positions respect option on first render
    ensureToast(position);
    removeToast(); // will be re-added when active

    const ref = global.firebase.database().ref(path);
    watchingRef = ref;
    ref.on('value', (snap) => {
      const val = snap.val() || {};
      const active = computeActive(val);
      const scheduled = computeScheduled(val);
      if (val && val.enabled && (active || scheduled)) {
        renderToast(val);
      } else {
        if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
        removeToast();
      }
      if (typeof onChange === 'function') {
        try { onChange(active, val); } catch(e) { /* ignore */ }
      }
    });

    return {
      destroy: () => {
        try { if (watchingRef) watchingRef.off(); } catch {}
        watchingRef = null;
        if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
        removeToast();
      }
    };
  }

  global.MaintenanceToast = { init };

})(typeof window !== 'undefined' ? window : this);
