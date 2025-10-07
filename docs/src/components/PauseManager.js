// PauseManager - encapsulates gameplay pause/resume logic for a Phaser.Scene
// Responsibilities:
// - Toggle pause with P / Esc keys
// - Manage a pause overlay UI (dim + title + resume button)
// - Pause/resume audio cleanly
// - Coordinate with scene.freezeGameplay so TimerController halts via shouldTick()
// - Cleanup on scene shutdown

export default class PauseManager {
  /**
   * @param {Phaser.Scene} scene - owning scene (expects flags: gameStarted, freezeGameplay, quizActive, powerUpActive, _timeUpHandled, _resultShown)
   */
  constructor(scene) {
    this.scene = scene;
    this.isPaused = false;
    this._prevFreeze = false;
    this._overlay = null;
    // UI button refs
    this._btnContainer = null;
    this._btnBg = null;
    this._btnIcon = null;

    // Bind keys
    this._bindKeys();

    // Create UI button
    this._createPauseButton();

    // Also create DOM HUD button (preferred, always on top of canvas)
    try {
      if (this.scene.time && this.scene.time.delayedCall) {
        this.scene.time.delayedCall(60, () => this._createDomPauseButton(0));
      } else {
        setTimeout(() => this._createDomPauseButton(0), 60);
      }
    } catch (_) {}

    // Handle resize to reposition buttons (Phaser and DOM)
    try {
      this._onResize = () => {
        this._positionPauseButton();
        this._repositionDomPauseButton();
      };
      if (this.scene.scale && this.scene.scale.on) {
        this.scene.scale.on('resize', this._onResize);
      }
    } catch (_) {}

    // Cleanup on scene shutdown to avoid leaks
    try {
      this.scene.events.once('shutdown', () => this.destroy());
    } catch (_) {}
  }

  destroy() {
    // Remove overlay and listeners
    this._destroyOverlay();
    this._unbindKeys();
    this._destroyPauseButton();
  this._destroyDomPauseButton();
    try { if (this.scene.scale && this.scene.scale.off && this._onResize) this.scene.scale.off('resize', this._onResize); } catch (_) {}
    this.isPaused = false;
  }

  // Public API
  toggle() { this.isPaused ? this.resume() : this.pause(); }
  pause() {
    if (this.isPaused) return;
    if (!this._canPause()) return;
    this.isPaused = true;
    // Freeze gameplay (TimerController will stop ticking via shouldTick)
    this._prevFreeze = !!this.scene.freezeGameplay;
    this.scene.freezeGameplay = true;
    // Pause audio softly
    try { if (this.scene.sound && this.scene.sound.pauseAll) this.scene.sound.pauseAll(); } catch (_) {}
    // Pause any countdown event if present
    try { if (this.scene.countdownEvent) this.scene.countdownEvent.paused = true; } catch (_) {}
    // Show overlay
    this._createOverlay();
  }
  resume() {
    if (!this.isPaused) return;
    if (this.scene._timeUpHandled || this.scene._resultShown) return; // don't resume after end states
    this.isPaused = false;
    // Restore previous freeze state
    this.scene.freezeGameplay = !!this._prevFreeze;
    this._prevFreeze = false;
    // Resume audio
    try { if (this.scene.sound && this.scene.sound.resumeAll) this.scene.sound.resumeAll(); } catch (_) {}
    // Resume countdown if applicable
    try { if (this.scene.countdownEvent) this.scene.countdownEvent.paused = false; } catch (_) {}
    this._destroyOverlay();
  }

  // Internal helpers
  _canPause() {
    // Allow pausing during active, non-interstitial gameplay
    return !!(this.scene.gameStarted && !this.scene.quizActive && !this.scene.powerUpActive && !this.scene._timeUpHandled && !this.scene._resultShown);
  }

  _bindKeys() {
    try {
      if (!this.scene.input || !this.scene.input.keyboard) return;
      this._onKeyP = () => this.toggle();
      this._onKeyEsc = () => this.toggle();
      this.scene.input.keyboard.on('keydown-P', this._onKeyP, this);
      this.scene.input.keyboard.on('keydown-ESC', this._onKeyEsc, this);
    } catch (_) {}
  }

  _unbindKeys() {
    try {
      if (!this.scene.input || !this.scene.input.keyboard) return;
      if (this._onKeyP) this.scene.input.keyboard.off('keydown-P', this._onKeyP, this);
      if (this._onKeyEsc) this.scene.input.keyboard.off('keydown-ESC', this._onKeyEsc, this);
    } catch (_) {}
    this._onKeyP = null;
    this._onKeyEsc = null;
  }

  _createOverlay() {
    if (this._overlay) return;
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const group = this.scene.add.container(0, 0);
    group.setDepth(4000);

    const dim = this.scene.add.rectangle(w / 2, h / 2, w * 2, h * 2, 0x000000, 0.55)
      .setScrollFactor(0)
      .setInteractive();

    const title = this.scene.add.text(w / 2, h / 2 - 60, 'PAUSED', {
      fontFamily: 'Arial',
      fontSize: this.scene.scale.width < 768 ? '72px' : '88px',
      fontWeight: 'bold',
      color: '#00e5ff',
      stroke: '#000000',
      strokeThickness: 10,
      align: 'center'
    }).setOrigin(0.5).setScrollFactor(0);

    const info = this.scene.add.text(w / 2, h / 2 + 20, 'Press P or Esc to resume', {
      fontFamily: 'Arial',
      fontSize: this.scene.scale.width < 768 ? '22px' : '26px',
      fontWeight: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 5,
      align: 'center'
    }).setOrigin(0.5).setScrollFactor(0);

    const btnW = this.scene.scale.width < 768 ? 260 : 300, btnH = this.scene.scale.width < 768 ? 64 : 72;
    const btn = this.scene.add.rectangle(w / 2, h / 2 + 90, btnW, btnH, 0x00bcd4, 0.9)
      .setScrollFactor(0)
      .setStrokeStyle(4, 0x006064, 1)
      .setInteractive({ useHandCursor: true });
    const btnText = this.scene.add.text(w / 2, h / 2 + 90, 'RESUME', {
      fontFamily: 'Arial', fontSize: this.scene.scale.width < 768 ? '26px' : '30px', fontWeight: 'bold', color: '#002b36'
    }).setOrigin(0.5).setScrollFactor(0);
    btn.on('pointerdown', () => this.resume());

    group.add([dim, title, info, btn, btnText]);
    this._overlay = group;
  }

  _destroyOverlay() {
    if (!this._overlay) return;
    try { this._overlay.destroy(); } catch (_) {}
    this._overlay = null;
  }

  // ---- Pause toggle button (Phaser UI) ----
  _createPauseButton() {
    try {
      if (this._btnContainer) { this._btnContainer.destroy(); this._btnContainer = null; }
      const isMobile = this.scene.scale.width < 768;
      const size = isMobile ? 64 : 52;

      const container = this.scene.add.container(0, 0);
      container.setScrollFactor(0);
      container.setDepth(1500);

      const bg = this.scene.add.rectangle(0, 0, size, size, 0x003d4d, 0.78)
        .setStrokeStyle(3, 0x00e5ff, 0.95)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true });
      const icon = this.scene.add.text(0, 0, '⏸', {
        fontFamily: 'Arial',
        fontSize: (isMobile ? 34 : 28) + 'px',
        color: '#00e5ff',
        fontWeight: 'bold'
      }).setOrigin(0.5).setScrollFactor(0);
      bg.on('pointerdown', () => this.toggle());
      icon.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.toggle());

      container.add([bg, icon]);
      this._btnContainer = container;
      this._btnBg = bg;
      this._btnIcon = icon;
      // initial position
      this._positionPauseButton();
    } catch (_) {}
  }

  _positionPauseButton() {
    if (!this._btnBg || !this._btnIcon) return;
    const isMobile = this.scene.scale.width < 768;
    const hudHeight = isMobile ? 84 : 72;
    const size = isMobile ? 64 : 52;
    const margin = isMobile ? 14 : 12;
    const x = this.scene.scale.width - margin - size / 2;
    const y = hudHeight + margin + size / 2;
    try {
      this._btnBg.setPosition(x, y).setSize(size, size);
      this._btnIcon.setPosition(x, y).setFontSize((isMobile ? 34 : 28) + 'px');
    } catch (_) {}
  }

  _destroyPauseButton() {
    try { if (this._btnContainer) this._btnContainer.destroy(); } catch (_) {}
    this._btnContainer = null;
    this._btnBg = null;
    this._btnIcon = null;
  }

  // ---- DOM HUD pause button (preferred) ----
  _createDomPauseButton(retryCount = 0) {
    try {
      const wrapper = (typeof document !== 'undefined') ? document.getElementById('desktop-game-hud') : null;
      if (!wrapper) {
        if (retryCount < 12) { // retry for ~12*120ms ≈ 1.4s
          const delay = 120;
          if (this.scene?.time?.delayedCall) this.scene.time.delayedCall(delay, () => this._createDomPauseButton(retryCount + 1));
          else setTimeout(() => this._createDomPauseButton(retryCount + 1), delay);
        }
        return;
      }
      // If already exists, do nothing
      if (this._domBtn && this._domBtn.parentElement) return;

      // Build button element
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Pause');
      btn.title = 'Pause (P/Esc)';
      btn.textContent = '⏸';
      Object.assign(btn.style, {
        position: 'absolute',
        right: '14px',
        top: '10px',
        width: '52px',
        height: '52px',
        borderRadius: '10px',
        border: '3px solid #00e5ff',
        background: 'rgba(0,61,77,0.78)',
        color: '#00e5ff',
        fontWeight: 'bold',
        fontSize: '28px',
        lineHeight: '48px',
        textAlign: 'center',
        cursor: 'pointer',
        zIndex: '10000',
        pointerEvents: 'auto',
        outline: 'none',
        outlineOffset: '0',
        textDecoration: 'none',
        padding: '0',
        margin: '0',
        boxSizing: 'border-box',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        appearance: 'none',
        WebkitAppearance: 'none',
        MozAppearance: 'none'
      });
      // Mobile sizing
      try {
        const vw = window?.innerWidth || this.scene.scale?.width || 800;
        if (vw < 768) {
          btn.style.width = '64px';
          btn.style.height = '64px';
          btn.style.top = '12px';
          btn.style.fontSize = '34px';
          btn.style.lineHeight = '58px';
          btn.style.borderRadius = '12px';
        }
      } catch (_) {}

      // Reposition pause button below the course name (top line of the right HUD stack)
      this._repositionDomPauseButton();

      // Accessible focus style (inset ring to avoid being clipped by HUD overflow)
      const onFocus = () => { try { btn.style.boxShadow = 'inset 0 0 0 3px rgba(160, 240, 255, 0.9)'; } catch (_) {} };
      const onBlur = () => { try { btn.style.boxShadow = 'none'; } catch (_) {} };
      btn.addEventListener('focus', onFocus);
      btn.addEventListener('blur', onBlur);
      // Avoid persistent focus ring after mouse/touch click; keyboard focus still works
      const onPointerDown = () => { try { btn.blur(); } catch (_) {} };
      btn.addEventListener('pointerdown', onPointerDown);

      const onClick = (e) => { e.preventDefault(); try { this.toggle(); } catch (_) {} };
      btn.addEventListener('click', onClick);
      wrapper.appendChild(btn);

      this._domBtn = btn;
      this._domBtnListener = onClick;
      this._domBtnFocusListener = onFocus;
      this._domBtnBlurListener = onBlur;
      this._domBtnPointerListener = onPointerDown;

      // Inject a small, scoped style block to fix Firefox dotted focus inner border
      try {
        if (!document.getElementById('hudPauseBtnStyle')) {
          const styleEl = document.createElement('style');
          styleEl.id = 'hudPauseBtnStyle';
          styleEl.textContent = `#desktop-game-hud button{outline:none !important;text-decoration:none !important;-webkit-tap-highlight-color:transparent}#desktop-game-hud button::-moz-focus-inner{border:0 !important}#desktop-game-hud button:focus,#desktop-game-hud button:focus-visible,#desktop-game-hud button:-moz-focusring{outline:none !important;text-decoration:none !important}`;
          document.head.appendChild(styleEl);
        }
      } catch (_) {}

      // Reposition after layout settles (rAF + slight timeout) so we measure accurate heights
      try {
        if (typeof requestAnimationFrame !== 'undefined') {
          requestAnimationFrame(() => this._repositionDomPauseButton());
        }
        setTimeout(() => this._repositionDomPauseButton(), 120);
      } catch (_) {}

      // Optional: remove Phaser canvas button to avoid duplication
      this._destroyPauseButton();
    } catch (_) {}
  }

  _destroyDomPauseButton() {
    try {
      if (this._domBtn) {
        if (this._domBtnListener) this._domBtn.removeEventListener('click', this._domBtnListener);
        if (this._domBtnFocusListener) this._domBtn.removeEventListener('focus', this._domBtnFocusListener);
        if (this._domBtnBlurListener) this._domBtn.removeEventListener('blur', this._domBtnBlurListener);
        if (this._domBtnPointerListener) this._domBtn.removeEventListener('pointerdown', this._domBtnPointerListener);
        if (this._domBtn.parentElement) this._domBtn.parentElement.removeChild(this._domBtn);
      }
    } catch (_) {}
    this._domBtn = null;
    this._domBtnListener = null;
    this._domBtnFocusListener = null;
    this._domBtnBlurListener = null;
    this._domBtnPointerListener = null;
  }

  // Compute DOM pause button top so it sits right below the course name,
  // and clamp within the HUD wrapper height to avoid clipping
  _repositionDomPauseButton() {
    try {
      if (!this._domBtn) return;
      const hud = document.getElementById('desktop-game-hud');
      if (!hud) return;
      const right = hud.querySelector('#hud-right');
      const courseName = hud.querySelector('#hud-course-name');
      if (!right || !courseName) return;
      const btn = this._domBtn;
      const gap = 8;
      const hudRect = hud.getBoundingClientRect();
      const nameRect = courseName.getBoundingClientRect();
      const rightRect = right.getBoundingClientRect();
      // Compute top relative to HUD wrapper: below the first row of the right stack
      const relTop = Math.max(
        Math.round((rightRect.top - hudRect.top) + (nameRect.height || 0) + gap),
        Math.round((nameRect.bottom - hudRect.top) + gap),
        10
      );
      // Clamp so button bottom stays inside HUD
      const btnHeight = parseInt(btn.style.height || '0', 10) || (btn.getBoundingClientRect().height || 52);
      const maxTop = Math.max(10, Math.round(hud.clientHeight - btnHeight - 6));
      btn.style.top = Math.min(relTop, maxTop) + 'px';
    } catch (_) {}
  }
}
