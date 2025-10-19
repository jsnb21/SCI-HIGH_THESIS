/*
  Animate On Scroll (AOS) bootstrapper for SCI-HIGH index page
  - Loads AOS CSS/JS from CDN (no inline HTML changes)
  - Initializes with sensible defaults and reduced-motion respect
  - Adds data-aos attributes to common elements if not already present
  - Fails gracefully if CDN is unavailable
*/
(function () {
  const AOS_CSS = "https://unpkg.com/aos@2.3.4/dist/aos.css";
  const AOS_JS = "https://unpkg.com/aos@2.3.4/dist/aos.js";

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
    try {
      return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (_) {
      return false;
    }
  }

  function tagElementsForAOS() {
    const candidates = [];

    // High-level sections
    candidates.push(...document.querySelectorAll("section"));

    // Feature/stat cards and other highlighted boxes
    candidates.push(...document.querySelectorAll(".neon-border"));

    // Team/member cards & grid items
    candidates.push(...document.querySelectorAll(".grid > *"));

    let delay = 0;
    const step = 75; // ms between siblings

    candidates.forEach((el) => {
      // Skip if already configured
      if (el.hasAttribute("data-aos")) return;

      // Pick a style based on rough semantics
      let anim = "fade-up";
      if (el.classList.contains("neon-border")) anim = "zoom-in";
      else if (el.tagName === "SECTION") anim = "fade-up";

      el.setAttribute("data-aos", anim);
      el.setAttribute("data-aos-delay", String(delay));
      delay = (delay + step) % 450; // cycle delays to avoid excessive waits
    });
  }

  function initAOS() {
    if (typeof AOS === "undefined") return;

    const disable = prefersReducedMotion();

    // Configure
    AOS.init({
      // Disable animations entirely for users who prefer reduced motion
      disable: () => disable,
      startEvent: "DOMContentLoaded",
      offset: 80,
      duration: disable ? 0 : 600,
      easing: "ease-out-quart",
      once: true,
      mirror: false,
    });

    // Refresh on content load changes just in case
    window.addEventListener("load", () => {
      try { AOS.refreshHard(); } catch (_) { /* noop */ }
    });
  }

  // Bootstrap sequence
  loadCSS(AOS_CSS)
    .then(() => loadScript(AOS_JS))
    .then(() => {
      // Mark elements with data attributes before init for best results
      tagElementsForAOS();
      initAOS();
      console.info("[AOS] Loaded and initialized");
    })
    .catch((err) => {
      // Fail gracefully without blocking the page
      console.info("[AOS] Skipped (", err && err.message ? err.message : err, ")");
    });
})();
