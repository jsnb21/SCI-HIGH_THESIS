// DomHudManager: encapsulates DOM HUD creation, updates, bounds, and teardown.
// Non-visual game code should never touch DOM directly; use this manager.

export default class DomHudManager {
  constructor(scene) {
    this.scene = scene;
    this.domHudActive = false;
    this.domHudWrapper = null;
    this.domScoreEl = null;
    this.domStreakEl = null;
    this.domTimerEl = null;
    this.domCourseEl = null;
    this._hudBoundsHandler = null;
    this._scaleHudBoundsHandler = null;
    this._lowPulseApplied = false;
    this._flashActive = false;
    this._flashTimeoutId = null;
    this._flashParentTimeoutId = null;
  }

  init() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('desktop-game-hud')) {
      this.domHudWrapper = document.getElementById('desktop-game-hud');
      this.domHudActive = true;
      this._wireExistingEls();
      this.updateBounds();
      return;
    }

    const vw = (typeof window !== 'undefined') ? window.innerWidth : this.scene.scale.width;
    const isMobileLike = vw < 768;
    const baseHeight = isMobileLike ? 128 : 120;

    const wrapper = document.createElement('div');
    wrapper.id = 'desktop-game-hud';
    Object.assign(wrapper.style, {
      position: 'absolute', top: '0', left: '0', width: '0px', height: baseHeight + 'px',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      padding: (isMobileLike ? '12px 16px 6px 16px' : '10px 24px 6px 24px'), boxSizing: 'border-box',
      fontFamily: 'Arial, sans-serif', zIndex: '9999', pointerEvents: 'none',
      background: 'linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.25))', overflow: 'hidden'
    });

    const buildTextRow = (labelText, id, fontSizePx, color) => {
      const row = document.createElement('div');
      row.id = id;
      row.textContent = labelText;
      row.style.cssText = `font-weight:bold;font-size:${fontSizePx}px;color:${color};text-shadow:2px 2px 4px #000;`;
      return row;
    };

    const courseIconMap = {
      python: 'python_logo.png', java: 'java_logo.png', c: 'c_logo.png', 'c++': 'cplus_logo.png',
      cpp: 'cplus_logo.png', csharp: 'csharp_logo.png', 'c#': 'csharp_logo.png',
      webdesign: 'web-design_logo.png', custom: 'CustomQuiz.png'
    };
    const iconBase = 'assets/img/comlab/icons/';
    const courseKey = (this.scene.courseTopic || '').toLowerCase();
    const courseIconFile = courseIconMap[courseKey] || 'python_logo.png';

    // Left stack (score + streak)
  const left = document.createElement('div');
  left.id = 'hud-left';
    left.style.display = 'flex';
  left.style.flexDirection = 'column';
  left.style.gap = '6px';

  const scoreFs = isMobileLike ? 22 : 24;
  const streakFs = isMobileLike ? 18 : 20;
    this.domScoreEl = buildTextRow(`Score: ${this.scene.score || 0}`, 'hud-score', scoreFs, '#ffffff');
    this.domStreakEl = buildTextRow(`Streak: ${this.scene.streak || 0}`, 'hud-streak', streakFs, '#ffff00');
    left.appendChild(this.domScoreEl);
    left.appendChild(this.domStreakEl);

    // Center (timer)
  const center = document.createElement('div');
  center.id = 'hud-center';
    const timerFs = isMobileLike ? 32 : 36;
    center.style.cssText = `position:absolute;left:50%;top:${isMobileLike ? 6 : 8}px;transform:translateX(-50%);font-weight:bold;font-size:${timerFs}px;color:#fff;text-shadow:2px 2px 4px #000`;
  this.domTimerEl = document.createElement('div');
  this.domTimerEl.id = 'hud-timer';
    this.domTimerEl.textContent = this.scene.getCurrentTimeString ? this.scene.getCurrentTimeString() : '1:00';
    center.appendChild(this.domTimerEl);

    // Right (course)
  const right = document.createElement('div');
  right.id = 'hud-right';
  const courseFs = isMobileLike ? 20 : 22;
  right.style.cssText = `position:relative;display:flex;align-items:center;gap:8px;font-weight:bold;font-size:${courseFs}px;color:#0ff;text-shadow:2px 2px 3px #000;`;
    const courseIcon = document.createElement('img');
    courseIcon.src = iconBase + courseIconFile;
    courseIcon.alt = 'Course';
  const iconSize = isMobileLike ? 32 : 36;
    courseIcon.style.width = iconSize + 'px';
    courseIcon.style.height = iconSize + 'px';
    courseIcon.style.objectFit = 'contain';
    courseIcon.style.filter = 'drop-shadow(0 0 3px rgba(0,0,0,0.6))';
  this.domCourseEl = document.createElement('div');
  this.domCourseEl.id = 'hud-course-name';
    const name = this.scene.getFormattedCourseName ? this.scene.getFormattedCourseName(this.scene.courseTopic).replace(/^[^A-Z0-9]*\s*/, '') : (this.scene.courseTopic || 'PROGRAMMING');
    this.domCourseEl.textContent = name;
    right.appendChild(courseIcon);
    right.appendChild(this.domCourseEl);

    wrapper.appendChild(left);
    wrapper.appendChild(center);
    wrapper.appendChild(right);

    const parent = this.scene.game.canvas.parentNode || document.body;
    parent.style.position = parent.style.position || 'relative';
    parent.appendChild(wrapper);
    this.domHudWrapper = wrapper;
    this.domHudActive = true;

  this._hudBoundsHandler = () => this._scheduleBoundsUpdate();
  window.addEventListener('resize', this._hudBoundsHandler);
  this._scaleHudBoundsHandler = () => this._scheduleBoundsUpdate();
    if (this.scene.scale) this.scene.scale.on('resize', this._scaleHudBoundsHandler);

    this.updateBounds();
    this.sync({ score: this.scene.score, streak: this.scene.streak, seconds: this.scene.gameTimer, course: name });
  }

  _wireExistingEls() {
    if (!this.domHudWrapper) return;
    const left = this.domHudWrapper.querySelector('#hud-left') || this.domHudWrapper;
    const center = this.domHudWrapper.querySelector('#hud-center') || this.domHudWrapper;
    const right = this.domHudWrapper.querySelector('#hud-right') || this.domHudWrapper;

    // Score
    this.domScoreEl = this.domHudWrapper.querySelector('#hud-score');
    if (!this.domScoreEl) {
      this.domScoreEl = document.createElement('div');
      this.domScoreEl.id = 'hud-score';
      this.domScoreEl.style.cssText = 'font-weight:bold;font-size:20px;color:#fff;text-shadow:2px 2px 4px #000;';
      left.appendChild(this.domScoreEl);
    }

    // Streak
    this.domStreakEl = this.domHudWrapper.querySelector('#hud-streak');
    if (!this.domStreakEl) {
      this.domStreakEl = document.createElement('div');
      this.domStreakEl.id = 'hud-streak';
      this.domStreakEl.style.cssText = 'font-weight:bold;font-size:16px;color:#ffff00;text-shadow:2px 2px 4px #000;';
      left.appendChild(this.domStreakEl);
    }

    // Timer
    this.domTimerEl = this.domHudWrapper.querySelector('#hud-timer');
    if (!this.domTimerEl) {
      this.domTimerEl = document.createElement('div');
      this.domTimerEl.id = 'hud-timer';
      center.appendChild(this.domTimerEl);
    }

    // Course name
    this.domCourseEl = this.domHudWrapper.querySelector('#hud-course-name');
    if (!this.domCourseEl) {
      this.domCourseEl = document.createElement('div');
      this.domCourseEl.id = 'hud-course-name';
      right.appendChild(this.domCourseEl);
    }
  }

  updateBounds() {
    if (!this.domHudActive) return;
    const canvas = this.scene.game && this.scene.game.canvas;
    const wrapper = this.domHudWrapper || document.getElementById('desktop-game-hud');
    if (!canvas || !wrapper) return;
    const parent = canvas.parentNode || document.body;
    const canvasRect = canvas.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    const left = Math.max(0, Math.round(canvasRect.left - parentRect.left));
    const top = Math.max(0, Math.round(canvasRect.top - parentRect.top));
    const width = Math.round(canvas.clientWidth || canvasRect.width);
    wrapper.style.left = left + 'px';
    wrapper.style.top = top + 'px';
    wrapper.style.width = width + 'px';
    wrapper.style.overflow = 'hidden';
    // Update height and font sizes responsively
    this._updateResponsiveStyles();
    // If width momentarily measures as 0 during resize, schedule a follow-up update
    if (width <= 0 && typeof window !== 'undefined') {
      requestAnimationFrame(() => this.updateBounds());
      setTimeout(() => this.updateBounds(), 50);
    }
  }

  _scheduleBoundsUpdate() {
    if (this._rafId) {
      try { cancelAnimationFrame(this._rafId); } catch (_) {}
      this._rafId = null;
    }
    this._rafId = requestAnimationFrame(() => {
      this._rafId = null;
      this.updateBounds();
    });
  }

  _updateResponsiveStyles() {
    if (!this.domHudActive) return;
    const vw = (typeof window !== 'undefined') ? window.innerWidth : (this.scene.scale ? this.scene.scale.width : 800);
    const isMobileLike = vw < 768;
    const baseHeight = isMobileLike ? 128 : 120;
    if (this.domHudWrapper) {
      this.domHudWrapper.style.height = baseHeight + 'px';
      this.domHudWrapper.style.padding = (isMobileLike ? '12px 16px 6px 16px' : '10px 24px 6px 24px');
    }
    // Adjust font sizes
    if (this.domScoreEl) this.domScoreEl.style.fontSize = (isMobileLike ? 22 : 24) + 'px';
    if (this.domStreakEl) this.domStreakEl.style.fontSize = (isMobileLike ? 18 : 20) + 'px';
    const center = this.domHudWrapper && this.domHudWrapper.querySelector('#hud-center');
    if (center) center.style.top = (isMobileLike ? 6 : 8) + 'px';
    if (center) center.style.fontSize = (isMobileLike ? 32 : 36) + 'px';
    if (this.domCourseEl) this.domCourseEl.parentElement && (this.domCourseEl.parentElement.style.fontSize = (isMobileLike ? 20 : 22) + 'px');
    const courseIcon = this.domHudWrapper && this.domHudWrapper.querySelector('#hud-right img');
    if (courseIcon) {
      const iconSize = isMobileLike ? 32 : 36;
      courseIcon.style.width = iconSize + 'px';
      courseIcon.style.height = iconSize + 'px';
    }
  // No padding-top on right; pause button is positioned dynamically below course name
  }

  sync({ score, streak, seconds, course }) {
    if (!this.domHudActive) return;
    if (typeof score === 'number' && this.domScoreEl) this.domScoreEl.textContent = `Score: ${score}`;
    if (typeof streak === 'number' && this.domStreakEl) this.domStreakEl.textContent = `Streak: ${streak}`;
    if (typeof seconds === 'number' && this.domTimerEl) {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      this.domTimerEl.textContent = `${m}:${s.toString().padStart(2, '0')}`;
    }
    if (typeof course === 'string' && this.domCourseEl) this.domCourseEl.textContent = course;
  }

  destroy() {
    if (!this.domHudActive) return;
    try {
      // Clear any pending flash timers to avoid lingering styles
      if (this._flashTimeoutId) { try { clearTimeout(this._flashTimeoutId); } catch (_) {} this._flashTimeoutId = null; }
      if (this._flashParentTimeoutId) { try { clearTimeout(this._flashParentTimeoutId); } catch (_) {} this._flashParentTimeoutId = null; }
      this._flashActive = false;
      if (this.domTimerEl) {
        this.domTimerEl.style.textShadow = '';
        this.domTimerEl.style.animation = '';
      }
      const hud = document.getElementById('desktop-game-hud');
      if (hud && hud.parentNode) hud.parentNode.removeChild(hud);
      if (this._hudBoundsHandler) window.removeEventListener('resize', this._hudBoundsHandler);
      if (this._scaleHudBoundsHandler && this.scene.scale) this.scene.scale.off('resize', this._scaleHudBoundsHandler);
    } catch (_) {}
    this.domHudActive = false;
    this.domHudWrapper = null;
    this.domScoreEl = null;
    this.domStreakEl = null;
    this.domTimerEl = null;
    this.domCourseEl = null;
  }

  // Briefly flash the timer element color for feedback (e.g., green on add, red on subtract)
  flashTimerColor(color = '#00ff66', durationMs = 250) {
    if (!this.domHudActive || !this.domTimerEl) return;
    const el = this.domTimerEl;
    const parent = el.parentElement;
    const prevColor = el.style.color;
    const prevShadow = el.style.textShadow;
    // Apply inline color to override inherited center color
    try {
      // Mark flash active so updateTimerVisual doesn't override during the flash window
      this._flashActive = true;
      // Clear any previous timers so we don't race and leave styles behind
      if (this._flashTimeoutId) { try { clearTimeout(this._flashTimeoutId); } catch (_) {} this._flashTimeoutId = null; }
      if (this._flashParentTimeoutId) { try { clearTimeout(this._flashParentTimeoutId); } catch (_) {} this._flashParentTimeoutId = null; }
      el.style.transition = el.style.transition || 'color 0.2s ease, text-shadow 0.2s ease';
      el.style.color = color;
      // Add a quick colored glow for stronger feedback
      el.style.textShadow = `0 0 6px ${color}, 0 0 12px ${color}`;
      // Optionally echo on parent for stronger effect across browsers
      if (parent) {
        const prevParentColor = parent.style.color;
        parent.style.color = color;
        this._flashParentTimeoutId = setTimeout(() => {
          parent.style.color = prevParentColor || '';
          this._flashParentTimeoutId = null;
        }, durationMs);
      }
      this._flashTimeoutId = setTimeout(() => {
        // End flash: restore styles and let updateTimerVisual set threshold color
        el.style.color = prevColor || '';
        el.style.textShadow = prevShadow || '';
        this._flashActive = false;
        // Re-apply threshold color in case something else changed meanwhile
        if (typeof this.scene?.gameTimer === 'number') {
          this.updateTimerVisual(this.scene.gameTimer);
        }
      }, durationMs);
    } catch (_) {}
  }

  flashTimerDelta(delta, durationMs = 250) {
    const color = delta > 0 ? '#00ff66' : '#ff3333';
    this.flashTimerColor(color, durationMs);
  }

  // Centralized timer threshold coloring and optional shake/glow for DOM HUD
  updateTimerVisual(seconds) {
    if (!this.domHudActive || !this.domTimerEl) return;
    try {
      const baseColor = seconds > 30 ? '#ffffff' : (seconds > 10 ? '#ffff00' : '#ff3333');
      // Avoid overriding color during an active flash
      if (!this._flashActive) {
        this.domTimerEl.style.color = baseColor;
        // Also ensure no lingering glow when not flashing
        if (!this._lowPulseApplied) this.domTimerEl.style.textShadow = '';
      }
      // Ensure scaling happens around the center so it doesn't shift
      this.domTimerEl.style.transformOrigin = 'center';
      // Optional emphasis when critically low: gentle pulse via CSS animation
      if (seconds <= 10) {
        // Inject or update keyframes to use scale only (no translateX) to avoid horizontal offset
        let styleEl = document.getElementById('domTimerPulseKeyframes');
        const correctKeyframes = '@keyframes dom-timer-pulse { 0%{ transform: scale(1); } 50%{ transform: scale(1.06); } 100%{ transform: scale(1); } }';
        if (!styleEl) {
          styleEl = document.createElement('style');
          styleEl.id = 'domTimerPulseKeyframes';
          styleEl.textContent = correctKeyframes;
          document.head.appendChild(styleEl);
        } else if (styleEl.textContent && styleEl.textContent.includes('translateX')) {
          styleEl.textContent = correctKeyframes;
        }
        this.domTimerEl.style.animation = 'dom-timer-pulse 0.8s ease-in-out infinite';
        this._lowPulseApplied = true;
      } else {
        this._lowPulseApplied = false;
        this.domTimerEl.style.animation = '';
        // When leaving low-time pulse, ensure glow is cleared if not actively flashing
        if (!this._flashActive) this.domTimerEl.style.textShadow = '';
      }
    } catch (_) {}
  }
}
