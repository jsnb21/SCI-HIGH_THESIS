// Orientation Manager: robust, cross-platform landscape handling without fullscreen
// Works with the overlay markup present in docs/game.html

const UA = navigator.userAgent || navigator.vendor || '';
const isIOS = /iPad|iPhone|iPod/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isAndroid = /Android/.test(UA);

function isMobileDevice() {
  const phoneLike = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(UA);
  const smallScreen = Math.min(window.innerWidth, window.innerHeight) <= 820;
  return phoneLike || smallScreen;
}

function isPortrait() {
  if (window.matchMedia) {
    const mq = window.matchMedia('(orientation: portrait)');
    if (typeof mq.matches === 'boolean') return mq.matches;
  }
  // Fallback with slight hysteresis to avoid transient UI chrome effects
  return (window.innerHeight / Math.max(1, window.innerWidth)) > 1.05;
}

let refreshTimer = null;
function schedulePhaserRefresh() {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    try { if (window.game?.scale) window.game.scale.refresh(); } catch {}
  }, 60);
}

function setInstructionsText(el) {
  if (!el) return;
  if (isIOS) {
    el.textContent = 'Rotate your device to landscape and ensure Portrait Orientation Lock is OFF.';
  } else if (isAndroid) {
    el.textContent = 'Rotate your device to landscape. If it doesn\'t change, rotate physically and tap Continue again.';
  } else {
    el.textContent = 'Rotate your device to landscape. Then tap Continue.';
  }
}

function handleOverlay(overlay) {
  if (!overlay) return;
  const mobile = isMobileDevice();
  const portrait = isPortrait();
  overlay.style.display = (mobile && portrait) ? 'flex' : 'none';
  schedulePhaserRefresh();
}

async function tryLockLandscape() {
  // Do NOT request fullscreen here. Attempt lock only where possible.
  try {
    if (isAndroid && screen.orientation && screen.orientation.lock) {
      await screen.orientation.lock('landscape');
    }
  } catch {
    // Ignore failures; many browsers require fullscreen to lock
  }
}

export function initOrientationManager({
  overlayId = 'orientation-overlay',
  buttonId = 'enable-landscape-btn',
  instructionsId = 'orientation-instructions',
} = {}) {
  const overlay = document.getElementById(overlayId);
  const btn = document.getElementById(buttonId);
  const instructions = document.getElementById(instructionsId);

  setInstructionsText(instructions);
  handleOverlay(overlay);

  // Event listeners
  window.addEventListener('load', () => handleOverlay(overlay));
  window.addEventListener('resize', () => handleOverlay(overlay));
  window.addEventListener('orientationchange', () => {
    // Poll briefly to catch delayed UI updates
    let tries = 0;
    const id = setInterval(() => {
      handleOverlay(overlay);
      if (!isPortrait() || tries++ > 15) clearInterval(id);
    }, 120);
  });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => handleOverlay(overlay));
  }
  document.addEventListener('visibilitychange', () => handleOverlay(overlay));

  // Fullscreen change still triggers relayouts; refresh Phaser scale
  const refresh = () => schedulePhaserRefresh();
  document.addEventListener('fullscreenchange', refresh);
  document.addEventListener('webkitfullscreenchange', refresh);
  document.addEventListener('msfullscreenchange', refresh);

  if (btn) {
    btn.addEventListener('click', async () => {
      await tryLockLandscape();
      // After user gesture, poll briefly; user may now rotate
      let attempts = 0;
      const poll = setInterval(() => {
        handleOverlay(overlay);
        if (!isPortrait() || attempts++ > 20) clearInterval(poll);
      }, 100);
    });
  }
}

// Auto-init if this file is imported directly via <script type="module" src="...">
// Consumers can still call initOrientationManager() manually if desired.
try {
  // If overlay element exists, initialize with defaults.
  if (document.getElementById('orientation-overlay')) {
    initOrientationManager();
  }
} catch {}
