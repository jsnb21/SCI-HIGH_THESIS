import Phaser from 'phaser';
import customQuizService from '../../services/customQuizService.js';
import authService from '../../services/authService.js';
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
    this.currentUser = null;
  }

  preload() {
    this.load.font('Caprasimo-Regular', 'assets/font/Caprasimo-Regular.ttf');
  }

  create() {
    this.cameras.main.setBackgroundColor('#1b1f2a');
    this.add.text(this.scale.width / 2, 60, 'Select a Custom Quiz', {
      fontFamily: 'Caprasimo-Regular',
      fontSize: '48px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 8
    }).setOrigin(0.5);

    this.statusText = this.add.text(this.scale.width / 2, 140, 'Loading quizzes...', {
      fontFamily: 'Caprasimo-Regular',
      fontSize: '28px',
      color: '#ffeb3b'
    }).setOrigin(0.5);

    this.createBackButton();
    // Wait for auth state reliably instead of immediate read (prevents race if scene loads before auth ready)
    this.waitForAuthThenLoad();
  }

  createBackButton() {
    const btn = this.add.text(40, 40, '< Back', {
      fontFamily: 'Caprasimo-Regular',
      fontSize: '32px',
      color: '#ffffff',
      backgroundColor: '#333',
      padding: { x: 16, y: 8 }
    }).setInteractive({ useHandCursor: true });
    btn.on('pointerup', () => {
      this.scene.start('ComputerLab');
    });
    this.backButton = btn;
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
        // Show subtle waiting message
        this.statusText.setText('Waiting for authentication...');
        const unsubscribe = window.firebase.auth().onAuthStateChanged(user => {
          if (user) {
            this.statusText.setText('Loading quizzes...');
            unsubscribe();
            this.fetchQuizzes();
          } else {
            // Keep listening briefly, but provide a timeout fallback
          }
        });
        // Safety timeout in case no user appears
        this.time.delayedCall(4000, () => {
          if (!this.getAuthUser() && this.statusText.text.includes('Waiting')) {
            this.statusText.setText('Not signed in. Return and login.');
          }
        });
      } else {
        this.statusText.setText('Firebase auth not available.');
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
        this.statusText.setText('No custom quizzes available.');
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
        this.statusText.setText('No custom quizzes available.');
        return;
      }
      this.statusText.setText('');
      this.renderQuizListFlattened(flattened);
    } catch (e) {
      console.error('Failed to load quizzes', e);
      if (e && /permission_denied/i.test(e.message || '')) {
        this.statusText.setText('Access denied. (Rules not deployed?)');
      } else {
        this.statusText.setText('Failed to load quizzes.');
      }
    }
  }

  renderQuizListFlattened(flatList) {
    // Basic vertical scroll if items exceed viewport
    const startY = 200;
    const gap = 90;
    const maxVisibleHeight = this.scale.height - startY - 40;

    const container = this.add.container(0,0);
    this.scrollContainer = container;

    flatList.forEach((entry, idx) => {
      const { ownerId, quizId, quizData } = entry;
      const y = startY + idx * gap;
      const meta = quizData.meta || {};
      const title = meta.title || quizId;
      const subject = meta.subject || meta.topic || 'Custom';
      const ownerShort = ownerId.slice(0,6)+'…';
      const displayText = `${title} (${subject})  [${ownerShort}]`;
      const item = this.add.text(this.scale.width / 2, y, displayText, {
        fontFamily: 'Caprasimo-Regular',
        fontSize: '34px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 6,
        backgroundColor: '#263238',
        padding: { x: 20, y: 10 }
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      item.on('pointerover', () => item.setStyle({ backgroundColor: '#37474f' }));
      item.on('pointerout', () => item.setStyle({ backgroundColor: '#263238' }));
      item.on('pointerup', () => this.handleQuizSelect(ownerId, quizId, quizData));
      this.quizItems.push(item);
      container.add(item);
    });

    // Scroll logic (wheel)
    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
      if (!this.scrollContainer) return;
      const totalHeight = startY + (flatList.length * gap);
      if (totalHeight <= maxVisibleHeight) return; // no scroll needed
      const delta = deltaY * 0.5; // reduce sensitivity
      this.scrollContainer.y -= delta;
      const minY = 0 - (totalHeight - maxVisibleHeight);
      if (this.scrollContainer.y < minY) this.scrollContainer.y = minY;
      if (this.scrollContainer.y > 0) this.scrollContainer.y = 0;
    });
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
}
