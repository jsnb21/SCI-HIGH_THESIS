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
    const baseHeight = isMobileLike ? 76 : 64;

    const wrapper = document.createElement('div');
    wrapper.id = 'desktop-game-hud';
    Object.assign(wrapper.style, {
      position: 'absolute', top: '0', left: '0', width: '0px', height: baseHeight + 'px',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      padding: (isMobileLike ? '8px 12px 4px 12px' : '6px 20px 4px 20px'), boxSizing: 'border-box',
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
    left.style.display = 'flex';
    left.style.flexDirection = 'column';
    left.style.gap = '4px';

    const scoreFs = isMobileLike ? 18 : 22;
    const streakFs = isMobileLike ? 14 : 18;
    this.domScoreEl = buildTextRow(`Score: ${this.scene.score || 0}`, 'hud-score', scoreFs, '#ffffff');
    this.domStreakEl = buildTextRow(`Streak: ${this.scene.streak || 0}`, 'hud-streak', streakFs, '#ffff00');
    left.appendChild(this.domScoreEl);
    left.appendChild(this.domStreakEl);

    // Center (timer)
    const center = document.createElement('div');
    const timerFs = isMobileLike ? 24 : 30;
    center.style.cssText = `position:absolute;left:50%;top:${isMobileLike ? 4 : 6}px;transform:translateX(-50%);font-weight:bold;font-size:${timerFs}px;color:#fff;text-shadow:2px 2px 4px #000`;
    this.domTimerEl = document.createElement('div');
    this.domTimerEl.textContent = this.scene.getCurrentTimeString ? this.scene.getCurrentTimeString() : '1:00';
    center.appendChild(this.domTimerEl);

    // Right (course)
    const right = document.createElement('div');
    const courseFs = isMobileLike ? 16 : 20;
    right.style.cssText = `display:flex;align-items:center;gap:6px;font-weight:bold;font-size:${courseFs}px;color:#0ff;text-shadow:2px 2px 3px #000;`;
    const courseIcon = document.createElement('img');
    courseIcon.src = iconBase + courseIconFile;
    courseIcon.alt = 'Course';
    const iconSize = isMobileLike ? 24 : 28;
    courseIcon.style.width = iconSize + 'px';
    courseIcon.style.height = iconSize + 'px';
    courseIcon.style.objectFit = 'contain';
    courseIcon.style.filter = 'drop-shadow(0 0 3px rgba(0,0,0,0.6))';
    this.domCourseEl = document.createElement('div');
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

    this._hudBoundsHandler = () => this.updateBounds();
    window.addEventListener('resize', this._hudBoundsHandler);
    this._scaleHudBoundsHandler = () => this.updateBounds();
    if (this.scene.scale) this.scene.scale.on('resize', this._scaleHudBoundsHandler);

    this.updateBounds();
    this.sync({ score: this.scene.score, streak: this.scene.streak, seconds: this.scene.gameTimer, course: name });
  }

  _wireExistingEls() {
    if (!this.domHudWrapper) return;
    this.domScoreEl = this.domHudWrapper.querySelector('#hud-score');
    this.domStreakEl = this.domHudWrapper.querySelector('#hud-streak');
    // Timer and course might not have IDs; leave as null if missing
    this.domTimerEl = this.domHudWrapper.querySelector('#hud-timer') || this.domHudWrapper.querySelector('div');
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
}
