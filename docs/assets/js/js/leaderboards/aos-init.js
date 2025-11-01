/*
  Animate On Scroll (AOS) bootstrapper for Leaderboards page
  - Loads AOS CSS/JS from CDN
  - Initializes with reduced-motion respect
  - Tags dynamic content (player cards, table rows) and refreshes on updates
  - Fails gracefully without breaking the page
*/
(function () {
  const AOS_CSS = "https://unpkg.com/aos@2.3.4/dist/aos.css";
  const AOS_JS = "https://unpkg.com/aos@2.3.4/dist/aos.js";
  // Safety: ensure content remains visible until AOS is ready (or if disabled)
  // We use a data attribute on <html> to gate visibility overrides
  try {
    document.documentElement.setAttribute('data-aos-prep', '');
    const styleId = 'aos-safety-style';
    if (!document.getElementById(styleId)) {
      const st = document.createElement('style');
      st.id = styleId;
      st.textContent = `
        html[data-aos-prep] [data-aos] { opacity: 1 !important; transform: none !important; }
      `;
      document.head.appendChild(st);
    }
  } catch(_) {}

  function loadCSS(href) {
    return new Promise((resolve, reject) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.onload = () => resolve();
      link.onerror = () => reject(new Error("Failed to load CSS: " + href));
      document.head.appendChild(link);
    });
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load script: " + src));
      document.head.appendChild(s);
    });
  }

  function prefersReducedMotion() {
    try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch (_) { return false; }
  }

  function tagElementsForAOS(root) {
    const scope = root || document;
    const candidates = [];

    // Sections and standard feature containers
    candidates.push(...scope.querySelectorAll('section, .neon-border'));

    // Player cards
    const cards = scope.querySelectorAll('#player-cards-grid > *');
    candidates.push(...cards);

    // Table rows in leaderboard
    const rows = scope.querySelectorAll('#leaderboard-list tbody tr');
    candidates.push(...rows);

    let delay = 0;
    const step = 60;

    candidates.forEach((el) => {
      if (el.hasAttribute('data-aos')) return;
      let anim = 'fade-up';
      if (el.closest && el.closest('#player-cards-grid')) anim = 'zoom-in';
      else if (el.tagName === 'SECTION') anim = 'fade-up';
      else if (el.tagName === 'TR') anim = 'fade-up';
      else if (el.classList && el.classList.contains('neon-border')) anim = 'zoom-in';

      el.setAttribute('data-aos', anim);
      el.setAttribute('data-aos-delay', String(delay));
      delay = (delay + step) % 420;
    });
  }

  function debounce(fn, wait) {
    let t; return function () { clearTimeout(t); t = setTimeout(fn, wait); };
  }

  function initObservers() {
    const refresh = debounce(() => { try { AOS.refreshHard(); } catch (_) {} }, 100);
    const targets = [document.getElementById('leaderboard-list'), document.getElementById('player-cards-grid')];
    targets.forEach(t => {
      if (!t) return;
      const obs = new MutationObserver(() => { tagElementsForAOS(t); refresh(); });
      obs.observe(t, { childList: true, subtree: true });
    });
  }

  function initAOS() {
    if (typeof AOS === 'undefined') return false;
    const disable = prefersReducedMotion();
    AOS.init({
      disable: () => disable,
      startEvent: 'DOMContentLoaded',
      offset: 80,
      duration: disable ? 0 : 500,
      easing: 'ease-out-quart',
      once: true,
      mirror: false,
    });
    // After AOS is fully initialized, allow animations by removing the safety gate
    // If AOS is disabled, we KEEP the safety gate so elements stay visible
    try {
      if (!disable) {
        // Give AOS a moment to compute, then remove the prep flag
        setTimeout(() => {
          document.documentElement.removeAttribute('data-aos-prep');
          // Clean up safety style once not needed
          const style = document.getElementById('aos-safety-style');
          if (style) style.parentElement && style.parentElement.removeChild(style);
        }, 0);
      }
    } catch(_) {}

    window.addEventListener('load', () => { try { AOS.refreshHard(); } catch (_) {} });
    initObservers();
    return true;
  }

  loadCSS(AOS_CSS)
    .then(() => loadScript(AOS_JS))
    .then(() => {
      // Initialize first so AOS can immediately manage visibility
      const ok = initAOS();
      // Only tag elements if AOS is present; otherwise keep everything visible
      if (ok) tagElementsForAOS();
      console.info('[AOS][Leaderboards] Loaded');
    })
    .catch(err => {
      // If we failed to load AOS JS, ensure elements remain visible
      try { document.documentElement.setAttribute('data-aos-prep',''); } catch(_) {}
      console.info('[AOS][Leaderboards] Skipped (', err && err.message ? err.message : err, ')');
    });
})();
