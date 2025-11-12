import Phaser from 'phaser';
import customQuizService from '../../services/customQuizService.js';
import authService from '../../services/authService.js';
import { createBackButton } from '../../components/buttons/backbutton.js';
import LoadingScreen from '../../ui/LoadingScreen.js';

/**
 * CustomQuizSelectScene
 * Lists available custom quizzes for the currently signed-in professor (owner)
 * or globally visible quizzes (future). Student flow: professor must be the creator
 * of quizzes they can see (rules: customQuizzes/{profUid}/{quizId}).
 */
export default class CustomQuizSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CustomQuizSelectScene' });
    this.quizItems = [];
    this.scrollContainer = null;
    this.statusText = null;
    this.backButton = null;
    this.backButtonBg = null;
    this.panelBg = null;
    this.searchBar = null;
    this.searchBarText = null;
    this.searchIcon = null;
    this.panelMetrics = null;
    // Search-related state
    this.searchHitZone = null;
    this.searchQuery = '';
    this.isSearchActive = false;
    this.caretText = null;
    this.caretTimer = null;
    this.keyDownHandler = null;
    // Data and input handlers
    this.allQuizzes = [];
    this.wheelHandler = null;
    this.currentUser = null;
    // Loading overlay
    this.loadingOverlay = null;
    this.loadingText = null;
  }

  preload() {
    this.load.font('Caprasimo-Regular', 'assets/font/Caprasimo-Regular.ttf');
    // Background texture used across scenes
    this.load.image('BinaryBG', 'assets/img/bg/BinaryBG.png');
  }

  create() {
    // Background color aligned with the design (deep purple)
    this.cameras.main.setBackgroundColor('#2a1b4b');

    // Scrolling binary background behind all UI
    const { width, height } = this.scale;
    this.bg = this.add.tileSprite(0, 0, width, height, 'BinaryBG').setOrigin(0, 0);
    this.bg.setDepth(-10);
  // Reduce opacity for a softer background presence
  this.bg.setAlpha(0.175);

    // Shared back button component
    const backBtn = createBackButton(this, 'ComputerLab');
    this.backButton = backBtn.backButton;
    this.backButtonBg = backBtn.buttonBg;

    // Visual search bar and list panel
    this.renderSearchBarAndPanel();

    // Status text (used for errors/info). Hidden during loading overlay.
    this.statusText = this.add.text(this.scale.width / 2, this.panelMetrics.y - 28, '', {
      fontFamily: 'Caprasimo-Regular',
      fontSize: '26px',
      color: '#ffeb3b'
    }).setOrigin(0.5).setVisible(false);

    // Show dim loading overlay
    this.showLoadingOverlay('Loading Quizzes...');

    // Wait for auth state reliably instead of immediate read (prevents race if scene loads before auth ready)
    this.waitForAuthThenLoad();
  }

  renderSearchBarAndPanel() {
    const width = this.scale.width;
    const barWidth = Math.min(980, Math.max(560, width * 0.7));
    const barHeight = 72;
    const x = width / 2;
    const y = 90;

    // Search bar backdrop
    const searchGfx = this.add.graphics();
    searchGfx.fillStyle(0x1d1533, 1);
    searchGfx.fillRoundedRect(x - barWidth / 2, y - barHeight / 2, barWidth, barHeight, 36);
    searchGfx.lineStyle(2, 0x2b2350, 1);
    searchGfx.strokeRoundedRect(x - barWidth / 2, y - barHeight / 2, barWidth, barHeight, 36);
    this.searchBar = searchGfx;

  // Make the search bar clickable
  const hit = this.add.zone(x, y, barWidth, barHeight).setOrigin(0.5).setInteractive({ useHandCursor: true });
  hit.on('pointerdown', () => this.activateSearch());
  this.searchHitZone = hit;

  // Magnifier icon (vector)
    const icon = this.add.graphics();
    const cx = x - barWidth / 2 + 36;
    const cy = y;
    icon.lineStyle(3, 0xffffff, 0.9);
    icon.strokeCircle(cx, cy, 12);
    icon.lineBetween(cx + 10, cy + 10, cx + 22, cy + 22);
    this.searchIcon = icon;

    // Placeholder text
    this.searchBarText = this.add.text(x - barWidth / 2 + 64, y, 'Search by id....', {
      fontFamily: 'Caprasimo-Regular',
      fontSize: '30px',
      color: '#d6c9ff'
    }).setOrigin(0, 0.5);

    // Panel for list
    const panelTop = y + barHeight / 2 + 30;
    const panelHeight = this.scale.height - panelTop - 40;
    const panelX = x - barWidth / 2 - 20;
    const panelW = barWidth + 40;
    const panelGfx = this.add.graphics();
    panelGfx.fillStyle(0x1a1431, 0.85);
    panelGfx.fillRoundedRect(panelX, panelTop, panelW, panelHeight, 30);
    panelGfx.lineStyle(2, 0x2a2348, 0.9);
    panelGfx.strokeRoundedRect(panelX, panelTop, panelW, panelHeight, 30);
    this.panelBg = panelGfx;
    this.panelMetrics = { x: panelX, y: panelTop, w: panelW, h: panelHeight, innerX: panelX + 40, innerW: panelW - 80, listStartY: panelTop + 70 };
  }

  activateSearch() {
    if (this.isSearchActive) return;
    this.isSearchActive = true;
    // Highlight border by redrawing
    const width = this.scale.width;
    const barWidth = Math.min(980, Math.max(560, width * 0.7));
    const x = width / 2;
    const y = 90;
    this.searchBar.clear();
    this.searchBar.fillStyle(0x1d1533, 1);
    this.searchBar.fillRoundedRect(x - barWidth / 2, y - 36, barWidth, 72, 36);
    this.searchBar.lineStyle(3, 0x8b7dff, 1);
    this.searchBar.strokeRoundedRect(x - barWidth / 2, y - 36, barWidth, 72, 36);

    // Caret
    if (!this.caretText) {
      this.caretText = this.add.text(this.searchBarText.x + this.searchBarText.displayWidth + 4, this.searchBarText.y, '|', {
        fontFamily: 'Caprasimo-Regular', fontSize: '30px', color: '#ffffff'
      }).setOrigin(0, 0.5);
      this.caretTimer = this.time.addEvent({ delay: 450, loop: true, callback: () => {
        if (this.caretText) this.caretText.visible = !this.caretText.visible;
      }});
    }
    // Keyboard
    if (!this.keyDownHandler) {
      this.keyDownHandler = (ev) => this.handleKeyDown(ev);
      this.input.keyboard.on('keydown', this.keyDownHandler);
    }
    this.updateSearchTextVisual();
  }

  deactivateSearch() {
    this.isSearchActive = false;
    if (this.caretTimer) { this.caretTimer.remove(false); this.caretTimer = null; }
    if (this.caretText) { this.caretText.destroy(); this.caretText = null; }
    if (this.keyDownHandler) { this.input.keyboard.off('keydown', this.keyDownHandler); this.keyDownHandler = null; }
    // Restore border
    const width = this.scale.width;
    const barWidth = Math.min(980, Math.max(560, width * 0.7));
    const x = width / 2;
    const y = 90;
    this.searchBar.clear();
    this.searchBar.fillStyle(0x1d1533, 1);
    this.searchBar.fillRoundedRect(x - barWidth / 2, y - 36, barWidth, 72, 36);
    this.searchBar.lineStyle(2, 0x2b2350, 1);
    this.searchBar.strokeRoundedRect(x - barWidth / 2, y - 36, barWidth, 72, 36);
  }

  handleKeyDown(ev) {
    if (!this.isSearchActive) return;
    const key = ev.key;
    if (key === 'Escape') {
      this.searchQuery = '';
      this.deactivateSearch();
      this.updateSearchTextVisual();
      this.applyFilter(this.searchQuery);
      return;
    }
    if (key === 'Enter') {
      this.deactivateSearch();
      this.applyFilter(this.searchQuery);
      return;
    }
    if (key === 'Backspace') {
      this.searchQuery = this.searchQuery.slice(0, -1);
      this.updateSearchTextVisual();
      this.applyFilter(this.searchQuery);
      return;
    }
    if (/^[\w-]$/.test(key)) {
      if (this.searchQuery.length < 40) {
        this.searchQuery += key;
        this.updateSearchTextVisual();
        this.applyFilter(this.searchQuery);
      }
    }
  }

  updateSearchTextVisual() {
    const text = this.searchQuery.length ? this.searchQuery : 'Search by id....';
    const color = this.searchQuery.length ? '#ffffff' : '#d6c9ff';
    this.searchBarText.setText(text).setColor(color);
    if (this.caretText) {
      this.caretText.x = this.searchBarText.x + this.searchBarText.displayWidth + 4;
    }
  }

  getAuthUser() {
    try {
      if (window.firebase && typeof window.firebase.auth === 'function') {
        return window.firebase.auth().currentUser;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  waitForAuthThenLoad() {
    // If already signed in, proceed immediately
    const existing = this.getAuthUser();
    if (existing) {
      this.fetchQuizzes();
      return;
    }

    // Proactively initialize Firebase and sign in anonymously to satisfy rules on localhost
    (async () => {
      try {
        const ok = await authService.ensureFirebaseInitialized();
        if (ok) {
          await authService.ensureAuthenticated();
          this.statusText.setText('Loading quizzes...');
          this.fetchQuizzes();
          return;
        }
      } catch (_) {
        // Fall back to listener approach below
      }

      if (window.firebase && typeof window.firebase.auth === 'function') {
        const unsubscribe = window.firebase.auth().onAuthStateChanged(user => {
          if (user) {
            unsubscribe();
            this.fetchQuizzes();
          } else {
            // Keep listening briefly, but provide a timeout fallback
          }
        });
        // Safety timeout in case no user appears
        this.time.delayedCall(4000, () => {
          if (!this.getAuthUser()) {
            this.hideLoadingOverlay();
            this.statusText.setText('Not signed in. Return and login.').setVisible(true);
          }
        });
      } else {
        this.hideLoadingOverlay();
        this.statusText.setText('Firebase auth not available.').setVisible(true);
      }
    })();
  }

  async fetchQuizzes() {
    this.currentUser = this.getAuthUser();
    if (!this.currentUser) {
      this.statusText.setText('Not signed in. Return to main menu to login.');
      return;
    }

    const db = customQuizService.ensureFirebase();
    if (!db) {
      this.statusText.setText('Firebase not ready.');
      return;
    }

    try {
      // Attempt global read of all customQuizzes (rules allow auth != null)
      const snapshot = await db.ref('customQuizzes').once('value');
      if (!snapshot.exists()) {
        this.hideLoadingOverlay();
        this.statusText.setText('No custom quizzes available.').setVisible(true);
        return;
      }
      const allByProf = snapshot.val();
      const flattened = [];
      Object.entries(allByProf).forEach(([ownerId, quizzes]) => {
        if (quizzes && typeof quizzes === 'object') {
          Object.entries(quizzes).forEach(([quizId, quizData]) => {
            flattened.push({ ownerId, quizId, quizData });
          });
        }
      });
      if (!flattened.length) {
        this.hideLoadingOverlay();
        this.statusText.setText('No custom quizzes available.').setVisible(true);
        return;
      }
      // Sort newest first by meta.createdAtMs or createdAt timestamp
      flattened.sort((a, b) => this.getQuizTimestamp(b) - this.getQuizTimestamp(a));
      this.statusText.setText('').setVisible(false);
      this.allQuizzes = flattened;
      this.applyFilter(this.searchQuery);
      this.hideLoadingOverlay();
    } catch (e) {
      console.error('Failed to load quizzes', e);
      if (e && /permission_denied/i.test(e.message || '')) {
        this.hideLoadingOverlay();
        this.statusText.setText('Access denied. (Rules not deployed?)').setVisible(true);
      } else {
        this.hideLoadingOverlay();
        this.statusText.setText('Failed to load quizzes.').setVisible(true);
      }
    }
  }

  showLoadingOverlay(message = 'Loading...') {
    const { width, height } = this.scale;
    if (!this.loadingOverlay) {
      this.loadingOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6)
        .setDepth(9998);
    } else {
      this.loadingOverlay.setSize(width, height).setPosition(width / 2, height / 2).setVisible(true);
    }
    if (!this.loadingText) {
      this.loadingText = this.add.text(width / 2, height / 2, message, {
        fontFamily: 'Caprasimo-Regular',
        fontSize: '44px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 6,
        align: 'center'
      }).setOrigin(0.5).setDepth(9999);
    } else {
      this.loadingText.setText(message).setPosition(width / 2, height / 2).setVisible(true);
    }
  }

  hideLoadingOverlay() {
    if (this.loadingOverlay) this.loadingOverlay.setVisible(false);
    if (this.loadingText) this.loadingText.setVisible(false);
  }

  getQuizTimestamp(entry) {
    try {
      const meta = entry?.quizData?.meta || {};
      // Prefer explicit numeric millis if present
      if (typeof meta.createdAtMs === 'number') return meta.createdAtMs;
      if (typeof meta.updatedAtMs === 'number') return meta.updatedAtMs;
      // Try parsing ISO/date strings
      const c = meta.createdAt || meta.updatedAt || meta.timestamp;
      const t = c ? Date.parse(c) : NaN;
      return Number.isFinite(t) ? t : 0;
    } catch {
      return 0;
    }
  }

  clearList() {
    if (this.scrollContainer) {
      this.scrollContainer.destroy(true);
      this.scrollContainer = null;
    }
    if (this.wheelHandler) {
      this.input.off('wheel', this.wheelHandler);
      this.wheelHandler = null;
    }
    this.quizItems = [];
  }

  applyFilter(query) {
    const q = (query || '').trim().toLowerCase();
    let list = q ? this.allQuizzes.filter(e => String(e.quizId).toLowerCase().includes(q)) : this.allQuizzes.slice();
    // Always show newest first; requirement emphasizes default empty state
    list.sort((a, b) => this.getQuizTimestamp(b) - this.getQuizTimestamp(a));
    this.clearList();
    this.renderQuizListFlattened(list);
  }

  renderQuizListFlattened(flatList) {
    // Remove any existing list before rendering anew
    this.clearList();
    const metrics = this.panelMetrics;
    const startY = metrics.listStartY;
    const gap = 140; // card spacing
    const cardH = 110;
    const cardW = metrics.innerW;
    const centerX = metrics.x + metrics.w / 2;
    const maxVisibleHeight = metrics.h - (startY - metrics.y) - 40;

    const container = this.add.container(0, 0);
    this.scrollContainer = container;

    flatList.forEach((entry, idx) => {
      const { ownerId, quizId, quizData } = entry;
      const y = startY + idx * gap;
      const meta = quizData.meta || {};
      const title = meta.title || quizId;
      const subject = meta.subject || meta.topic || '';

      // Card background
      const bg = this.add.graphics();
      const leftX = centerX - cardW / 2;
      bg.fillStyle(0x000000, 1);
      bg.fillRoundedRect(leftX, y - cardH / 2, cardW, cardH, 28);
      // Interactive zone
      const hit = this.add.zone(centerX, y, cardW, cardH).setRectangleDropZone(cardW, cardH).setInteractive({ useHandCursor: true });
      hit.on('pointerover', () => { bg.clear(); bg.fillStyle(0x0b0b0b, 1); bg.fillRoundedRect(leftX, y - cardH / 2, cardW, cardH, 28); });
      hit.on('pointerout', () => { bg.clear(); bg.fillStyle(0x000000, 1); bg.fillRoundedRect(leftX, y - cardH / 2, cardW, cardH, 28); });
      hit.on('pointerup', () => this.handleQuizSelect(ownerId, quizId, quizData));

      // Title
      const titleText = this.add.text(centerX, y - 16, title, {
        fontFamily: 'Caprasimo-Regular',
        fontSize: '34px',
        color: '#ffffff',
        align: 'center'
      }).setOrigin(0.5);

      // ID line: "ID:" in yellow, id value in white
      const label = this.add.text(centerX - 120, y + 18, 'ID:', {
        fontFamily: 'Caprasimo-Regular',
        fontSize: '24px',
        color: '#ffbf00'
      }).setOrigin(1, 0.5);
      const idText = this.add.text(centerX - 115, y + 18, quizId, {
        fontFamily: 'Caprasimo-Regular',
        fontSize: '24px',
        color: '#ffffff'
      }).setOrigin(0, 0.5);

      // Optional subject tag on right
      if (subject) {
        const sub = this.add.text(centerX + cardW / 2 - 20, y - 16, subject, {
          fontFamily: 'Caprasimo-Regular',
          fontSize: '20px',
          color: '#d6c9ff'
        }).setOrigin(1, 0.5);
        container.add(sub);
      }

      [bg, hit, titleText, label, idText].forEach(el => container.add(el));
      this.quizItems.push({ bg, titleText, label, idText, hit });
    });

    // Scroll logic (wheel)
    this.wheelHandler = (pointer, gameObjects, deltaX, deltaY) => {
      if (!this.scrollContainer) return;
      const totalHeight = (flatList.length * gap);
      if (totalHeight <= maxVisibleHeight) return; // no scroll needed
      const delta = deltaY * 0.6; // reduce sensitivity
      this.scrollContainer.y -= delta;
      const minY = 0 - (totalHeight - maxVisibleHeight);
      if (this.scrollContainer.y < minY) this.scrollContainer.y = minY;
      if (this.scrollContainer.y > 0) this.scrollContainer.y = 0;
    };
    this.input.on('wheel', this.wheelHandler);
  }

  async handleQuizSelect(ownerId, quizId, quizData) {
    this.statusText.setText('Loading quiz...');

    // Normalize question set now
    const normalized = customQuizService.normalizeQuestions(quizData.questions || quizData);

    if (!normalized.length) {
      this.statusText.setText('Quiz has no valid questions.');
      return;
    }

    // Transition to MainGameplay with injected quiz
    LoadingScreen.transitionToCourse(this, 'MainGameplay', 'Custom Quiz', {
      topic: 'custom',
      customQuiz: {
        ownerId,
        quizId,
        meta: quizData.meta || {},
        questions: normalized
      }
    }, 1200);
  }

  update() {
    if (this.bg) {
      // Subtle parallax scroll, matching other scenes
      this.bg.tilePositionY -= 0.5;
      this.bg.tilePositionX -= 0.2;
    }
  }
}
