/*
  Global Loading Overlay + Scene Transition Patch
  - Adds a high z-index DOM overlay that persists across Phaser scene restarts
  - Patches ScenePlugin.start and ScenePlugin.switch to show the overlay automatically
*/

export function setupGlobalLoadingOverlay(Phaser, game) {
  if (!Phaser || !game || typeof window === 'undefined') return;

  if (window.__globalLoadingOverlayPatched) return; // idempotent
  window.__globalLoadingOverlayPatched = true;

  // Ensure overlay element exists once
  const ensureOverlay = () => {
    let el = document.getElementById('global-loading-overlay');
    if (el) return el;

    el = document.createElement('div');
    el.id = 'global-loading-overlay';
    el.style.cssText = [
      'position:fixed',
      'inset:0',
      'display:none',
      'align-items:center',
      'justify-content:center',
      'background:rgba(0,0,0,0.9)',
      'z-index:2147483647', // above everything
      'color:#fff',
      'font-family: Caprasimo-Regular, Arial, sans-serif',
      'pointer-events:none' // do not block clicks permanently
    ].join(';');

    // Content wrapper
    const wrap = document.createElement('div');
    wrap.style.cssText = [
      'display:flex',
      'flex-direction:column',
      'align-items:center',
      'gap:14px',
      'transform:translateZ(0)'
    ].join(';');

    // Spinner (CSS border spinner)
    const spinner = document.createElement('div');
    spinner.style.cssText = [
      'width:64px',
      'height:64px',
      'border-radius:50%',
      'border:6px solid rgba(255,255,255,0.25)',
      'border-top-color:#4CAF50',
      'animation:global-loader-spin 0.9s linear infinite'
    ].join(';');

    // Message
    const msg = document.createElement('div');
    msg.id = 'global-loading-overlay-text';
    msg.textContent = 'Loading...';
    msg.style.cssText = 'font-size:22px; letter-spacing:0.3px; text-shadow:0 2px 6px rgba(0,0,0,0.6)';

    // Attach
    wrap.appendChild(spinner);
    wrap.appendChild(msg);
    el.appendChild(wrap);
    document.body.appendChild(el);

    // Inject spinner keyframes once
    if (!document.getElementById('global-loader-styles')) {
      const style = document.createElement('style');
      style.id = 'global-loader-styles';
      style.textContent = `@keyframes global-loader-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`;
      document.head.appendChild(style);
    }

    return el;
  };

  // Public API on window (DOM overlay)
  if (!window.__loadingOverlay) {
    let hideTimer = null;
    const el = ensureOverlay();
    const setText = (t) => {
      const m = document.getElementById('global-loading-overlay-text');
      if (m) m.textContent = t || 'Loading...';
    };
    window.__loadingOverlay = {
      show(text = 'Loading...') {
        clearTimeout(hideTimer);
        ensureOverlay().style.display = 'flex';
        setText(text);
      },
      hide(delayMs = 0) {
        clearTimeout(hideTimer);
        const doHide = () => {
          const node = document.getElementById('global-loading-overlay');
          if (node) node.style.display = 'none';
        };
        hideTimer = delayMs > 0 ? setTimeout(doHide, delayMs) : (doHide(), null);
      },
      isVisible() {
        const node = document.getElementById('global-loading-overlay');
        return !!node && node.style.display !== 'none';
      },
      setText
    };
  }

  // Phaser overlay fallback (works in fullscreen)
  let phaserOverlaySceneKey = '__GlobalOverlayScene__';
  function ensurePhaserOverlayScene() {
    if (game.scene.keys[phaserOverlaySceneKey]) return;
    const OverlayScene = new Phaser.Class({
      Extends: Phaser.Scene,
      initialize: function OverlayScene() { Phaser.Scene.call(this, { key: phaserOverlaySceneKey, active: false }); },
      create: function() {
        const w = this.scale.width, h = this.scale.height;
        this.bg = this.add.rectangle(w/2, h/2, w, h, 0x000000, 0.9).setScrollFactor(0);
        this.label = this.add.text(w/2, h/2 - 24, 'Loading...', { fontFamily: 'Arial, sans-serif', fontSize: '26px', color: '#ffffff' }).setOrigin(0.5).setScrollFactor(0);
        this.bg.setDepth(100000);
        this.label.setDepth(100001);
        this.events.on('resize', (sz) => {
          const W = this.scale.width, H = this.scale.height;
          this.bg.setSize(W, H).setPosition(W/2, H/2);
          this.label.setPosition(W/2, H/2 - 24);
        });
      },
      setText: function(t) { if (this.label) this.label.setText(t || 'Loading...'); }
    });
    game.scene.add(phaserOverlaySceneKey, OverlayScene, false);
  }

  function isFullscreenActive() {
    try { return !!(game?.scale?.isFullscreen || document.fullscreenElement); } catch { return false; }
  }

  // Heuristic mobile detection based on viewport CSS pixels and DPR
  function isMobileViewport() {
    try {
      const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;
      const vw = (typeof window !== 'undefined') ? window.innerWidth : 1920;
      const vh = (typeof window !== 'undefined') ? window.innerHeight : 1080;
      const cssW = vw / dpr;
      const cssH = vh / dpr;
      return cssW < 820 || cssH < 700 || (dpr > 1.5 && cssW < 900);
    } catch { return false; }
  }

  function showPhaserOverlay(text) {
    ensurePhaserOverlayScene();
    const mgr = game.scene;
    if (!mgr.isActive(phaserOverlaySceneKey)) mgr.launch(phaserOverlaySceneKey);
    mgr.bringToTop(phaserOverlaySceneKey);
    const scn = mgr.getScene(phaserOverlaySceneKey);
    scn.scene.setVisible(true);
    if (scn.setText) scn.setText(text);
  }

  function hidePhaserOverlay(delayMs = 0) {
    const mgr = game.scene;
    if (!mgr) return;
    const doHide = () => {
      if (mgr.keys[phaserOverlaySceneKey] && mgr.isActive(phaserOverlaySceneKey)) {
        const scn = mgr.getScene(phaserOverlaySceneKey);
        scn.scene.setVisible(false);
        mgr.stop(phaserOverlaySceneKey);
      }
    };
    if (delayMs > 0) setTimeout(doHide, delayMs); else doHide();
  }

  // Helper: derive a friendly name
  const prettyName = (key) => {
    if (!key) return 'Loading...';
    try { return String(key).replace(/([A-Z])/g, ' $1').replace(/\s+/g, ' ').trim(); } catch { return 'Loading...'; }
  };

  // Patch ScenePlugin.start/switch/launch
  const pluginProto = Phaser.Scenes.ScenePlugin?.prototype;
  if (!pluginProto) return;

  const originalStart = pluginProto.start;
  const originalSwitch = pluginProto.switch;
  const originalLaunch = pluginProto.launch;

  // Track first engine step after transition begins
  let firstPostStart = false;

  function showOverlayFor(targetKey) {
    const label = `Loading ${prettyName(targetKey)}...`;
    // Revised strategy: always attempt to show the DOM overlay first (more reliable on some mobile browsers)
    // Use Phaser overlay ONLY when fullscreen is active (WebKit iOS sometimes hides fixed DOM in fullscreen)
    try {
      if (isFullscreenActive()) {
        showPhaserOverlay(label);
      } else {
        window.__loadingOverlay.show(label);
        // On mobile ensure style is forced in case previous inline styles / transforms interfered
        if (isMobileViewport()) {
          const dom = document.getElementById('global-loading-overlay');
            if (dom) {
              dom.style.display = 'flex';
              dom.style.opacity = '1';
              dom.style.transition = 'opacity 0.25s ease';
            }
        }
      }
    } catch (e) {
      // Fallback to Phaser overlay if DOM path throws
      try { showPhaserOverlay(label); } catch { /* swallow */ }
    }
  }

  function scheduleAutoHide() {
    // Safety auto-hide in case scene is lightweight; keeps the overlay brief
    const delay = isMobileViewport() ? 1800 : 1300; // slightly longer on mobile for perceived feedback
    if (isFullscreenActive()) {
      hidePhaserOverlay(delay);
    } else {
      window.__loadingOverlay.hide(delay);
    }
  }

  // Defer to next frames so overlay can render before heavy scene work (mobile-safe)
  function deferSceneCall(fn) {
    try {
      const raf = typeof window !== 'undefined' && window.requestAnimationFrame;
      if (raf) {
        raf(() => raf(() => fn())); // two rAFs ensure a paint on mobile browsers
      } else {
        setTimeout(fn, 0);
      }
    } catch {
      setTimeout(fn, 0);
    }
  }

  pluginProto.start = function patchedStart(key, data) {
    try { showOverlayFor(key); } catch {}
    // Yield to allow the overlay to paint before heavy work
    deferSceneCall(() => {
      try {
        // mark to hide on the first engine step after the new scene begins ticking
        firstPostStart = true;
        originalStart.call(this, key, data);
      } finally { scheduleAutoHide(); }
    });
    return this;
  };

  if (typeof originalSwitch === 'function') {
    pluginProto.switch = function patchedSwitch(key, data) {
      try { showOverlayFor(key); } catch {}
      deferSceneCall(() => {
        try {
          firstPostStart = true;
          originalSwitch.call(this, key, data);
        } finally { scheduleAutoHide(); }
      });
      return this;
    };
  }

  if (typeof originalLaunch === 'function') {
    pluginProto.launch = function patchedLaunch(key, data) {
      try { showOverlayFor(key); } catch {}
      deferSceneCall(() => {
        try {
          firstPostStart = true;
          originalLaunch.call(this, key, data);
        } finally { scheduleAutoHide(); }
      });
      return this;
    };
  }

  // Optional: hide overlay when the game resumes focus or on first render after start
  // to avoid it sticking around in unexpected cases.
  const tryHideOnFirstStep = () => {
    if (!firstPostStart) return;
    firstPostStart = false;
    if (isFullscreenActive() || isMobileViewport()) hidePhaserOverlay(250); else window.__loadingOverlay.hide(250);
  };
  game.events.on('resume', () => { if (isFullscreenActive()) hidePhaserOverlay(250); else window.__loadingOverlay.hide(250); });
  game.events.on('step', tryHideOnFirstStep);
}
