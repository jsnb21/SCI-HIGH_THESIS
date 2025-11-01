import Phaser from 'phaser';
import { setupGlobalLoadingOverlay } from './ui/globalLoadingOverlay.js';
import Intro from '/src/scenes/intro.js';
import MainMenu from './scenes/mainmenu';
import OptionsScene from './scenes/options.js';
import MainHub from './scenes/mainhub.js';

// Import StartUp
import StartUp from './scenes/startup.js'

// Add Classroom import
import Classroom from './scenes/classroom.js';

// Story Scenes
import LilyStory from './scenes/storyScenes/lily/lilyStory.js';
import DamianStory from './scenes/storyScenes/damian/damianStory.js';
import FinleyStory from './scenes/storyScenes/finley/finleyStory.js';

// Computer Lab
import ComputerLab from './scenes/computerlab.js';

// Roguelike Scenes
import MainGameplay from '/src/scenes/roguelikeBase/main_gameplay.js';
import SampleGameplayScene from './scenes/roguelikeBase/SampleGameplayScene.js';
import QuizScene from '/src/scenes/roguelikeBase/QuizScene.js';
import PowerUpScene from '/src/scenes/roguelikeBase/PowerUpScene.js';
import ResultScreen from './scenes/roguelikeBase/ResultScreen.js';

// Add Custom Quiz Scene import
import CustomQuizScene from './scenes/quizscenes/CustomQuizScene.js';
// Custom Quiz Selection Scene
import CustomQuizSelectScene from './scenes/quizscenes/CustomQuizSelectScene.js';

//Library Scenes
import BaseLibraryScene from './scenes/libraryScenes/baseLibraryScene.js';

// UI Scenes
import CardRewardScene from './scenes/ui/CardRewardScene.js';
import NotificationScene from './scenes/ui/NotificationScene.js';

const config = {
  type: Phaser.AUTO,
  width: 1920,
  height: 1080,
  parent: 'game',
  fps: {
    target: 60,
    forceSetTimeOut: true
  },
  scale: {
    // Use FIT so the game content scales within the rotated container (portrait-rotate fallback)
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    // Mobile-optimized scaling
    // Logical base resolution (consistent across devices)
    width: 1920,
    height: 1080,
    min: {
      width: 320,
      height: 240
    },
    // Remove max so FIT can scale freely to the display while we clamp UI via mobileUtils
    // Mobile-specific scaling options
    zoom: 1,
    expandParent: false,
    autoRound: true
  },
  scene: [
    StartUp,
    MainMenu,
    /* UI Scenes */
    CardRewardScene,
    NotificationScene,
    /* Main Scenes */
    Intro,
    OptionsScene,
    MainHub,
    /* Classroom */
    Classroom,
    /* Story Scenes */
    LilyStory,
  DamianStory,
  FinleyStory,
    /* Computer Lab Scenes */
    ComputerLab,
    /* Roguelike Scenes */
    MainGameplay,
    SampleGameplayScene,
    QuizScene,
    PowerUpScene,
    ResultScreen,
    /* Custom Quiz Scenes */
    CustomQuizScene,
    CustomQuizSelectScene,
    /* Library Scenes */
    BaseLibraryScene
  ],
  dom: {
    createContainer: true
  },
  input: {
    activePointers: 1, // Reduce to single touch to prevent double events
    touch: {
      capture: true, // Capture touch events to prevent double firing
      target: null   // Let Phaser handle the target
    },
    mouse: {
      capture: true  // Also capture mouse events for consistency
    },
    preventDefaultMove: false // Allow default touch behaviors like scrolling
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  }
};

export const DEFAULT_TEXT_STYLE = {
    fontSize: '32px', // Increased base size for better mobile readability
    fontFamily: 'Caprasimo-Regular',
    color: '#ffffff',
    stroke: '#000000',
    strokeThickness: 6 // Increased for better visibility on mobile
};

// Add error handling and debugging

// Check if we're in a problematic environment
if (typeof window.SES !== 'undefined') {
    console.warn('SES detected - this may cause conflicts');
}

// ------------------------------------------------------------------
// Global notification helper (defined early, before scenes run)
// ------------------------------------------------------------------
if(!window.__pendingGameNotifications){
  window.__pendingGameNotifications = [];
}
window.pushGameMessage = function(title, message, opts = {}) {
  const payload = { title, message, ...(opts||{}) };
  // If NotificationScene already ready & game exists -> emit immediately
  if(window.__phaserNotificationsReady && window.game?.events){
    window.game.events.emit('notify', payload);
  } else {
    window.__pendingGameNotifications.push(payload);
  }
};

// ---------------------------------------------------------------
// Test helper to trigger the new top-right achievement toast
// Usage (in browser dev console): testAchievementToast('My Test', 'Legendary')
// Rarity options expected: Common, Uncommon, Rare, Epic, Legendary
// ---------------------------------------------------------------
window.testAchievementToast = function(title = 'Test Achievement', rarity = 'Rare') {
  if(window.game?.events){
    window.game.events.emit('achievement-unlocked', { title, rarity });
  } else {
    console.warn('Game not ready yet; achievement test buffered');
    if(!window.__pendingAchievementTests) window.__pendingAchievementTests = [];
    window.__pendingAchievementTests.push({ title, rarity });
  }
};

window.addEventListener('resize', () => {
    if (window.game && window.game.scale) {
        window.game.scale.refresh();
    }
});

// Handle orientation changes specifically for mobile
window.addEventListener('orientationchange', () => {
    setTimeout(() => {
        if (window.game && window.game.scale) {
            window.game.scale.refresh();
        }
    }, 100); // Small delay to ensure viewport has updated
});

// Add error handling for game initialization
let game;
try {
    game = new Phaser.Game(config);
    
    // Make game globally accessible for debugging
    window.game = game;

  // Initialize global loading overlay and patch scene transitions
  try { setupGlobalLoadingOverlay(Phaser, game); } catch (e) { console.warn('Loading overlay patch failed:', e); }

    // Immediately flush any buffered notifications once NotificationScene signals readiness
    // (NotificationScene itself will also flush, this is a secondary safeguard via interval.)
    if(!window.__notifFlushInterval){
      window.__notifFlushInterval = setInterval(()=>{
        if(window.__phaserNotificationsReady && window.game?.events && window.__pendingGameNotifications?.length){
          const q = window.__pendingGameNotifications.splice(0);
          q.forEach(p=>window.game.events.emit('notify', p));
        }
        if(window.__phaserNotificationsReady){
          clearInterval(window.__notifFlushInterval);
          window.__notifFlushInterval = null;
        }
      }, 300);
    }

    // ---------------------------------------------------------------
    // Global Fullscreen Prompt (DISABLED to avoid duplicate prompts)
    // We now rely on: 
    //  - The orientation overlay in game.html (asks users to rotate to landscape first)
    //  - The in-game StartupScene fullscreen prompt as needed
    // ---------------------------------------------------------------
    const ENABLE_GLOBAL_FULLSCREEN_PROMPT = false;
    (function setupGlobalFullscreenPrompt(){
      if (!ENABLE_GLOBAL_FULLSCREEN_PROMPT) return;
      // Heuristic mobile detection (mirrors mobileUtils.js logic without scene)
      const isMobileViewport = () => {
        const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;
        const vw = (typeof window !== 'undefined') ? window.innerWidth : 1920;
        const vh = (typeof window !== 'undefined') ? window.innerHeight : 1080;
        const cssW = vw / dpr;
        const cssH = vh / dpr;
        return cssW < 820 || cssH < 700 || (dpr > 1.5 && cssW < 900);
      };

      const isFullscreenActive = () => {
        try {
          return !!(game?.scale?.isFullscreen || document.fullscreenElement);
        } catch { return false; }
      };

      // Create overlay once
      let overlay = document.getElementById('fullscreen-prompt-overlay');
      if(!overlay){
        overlay = document.createElement('div');
        overlay.id = 'fullscreen-prompt-overlay';
        overlay.style.cssText = [
          'position:fixed',
          'inset:0',
          'display:none',
          'align-items:center',
          'justify-content:center',
          'background:rgba(0,0,0,0.6)',
          'z-index:10000',
          'backdrop-filter:saturate(120%) blur(2px)',
          'font-family: Arial, sans-serif'
        ].join(';');

        const panel = document.createElement('div');
        panel.style.cssText = [
          'max-width:90%',
          'width:420px',
          'box-sizing:border-box',
          'background:#111',
          'color:#fff',
          'border:2px solid #4CAF50',
          'border-radius:12px',
          'padding:18px',
          'text-align:center',
          'box-shadow:0 8px 24px rgba(0,0,0,0.35)'
        ].join(';');

        const title = document.createElement('div');
        title.textContent = 'Fullscreen Recommended';
        title.style.cssText = 'font-weight:700;font-size:20px;margin-bottom:8px;letter-spacing:0.3px';

        const msg = document.createElement('div');
        msg.innerHTML = 'For the best mobile experience, enable fullscreen.';
        msg.style.cssText = 'font-size:14px;opacity:0.95;margin-bottom:14px;line-height:1.4';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = 'Go Fullscreen';
        btn.style.cssText = [
          'cursor:pointer',
          'background:#4CAF50',
          'color:#fff',
          'border:none',
          'border-radius:8px',
          'padding:12px 16px',
          'font-size:16px',
          'font-weight:600',
          'box-shadow:0 4px 10px rgba(0,0,0,0.25)'
        ].join(';');

        btn.addEventListener('click', () => {
          // User gesture: attempt to enter fullscreen via Phaser Scale
          try {
            if(game?.scale && !game.scale.isFullscreen){
              game.scale.startFullscreen();
            }
          } catch (e) {
            console.warn('Fullscreen request failed:', e);
          }

          // Re-check after a brief delay
          setTimeout(() => {
            if (isFullscreenActive()) {
              overlay.style.display = 'none';
            }
          }, 200);
        });

        panel.appendChild(title);
        panel.appendChild(msg);
        panel.appendChild(btn);
        overlay.appendChild(panel);
        document.body.appendChild(overlay);
      }

      const updateVisibility = () => {
        const show = isMobileViewport() && !isFullscreenActive();
        overlay.style.display = show ? 'flex' : 'none';
      };

  // Initial state
  updateVisibility();

      // Respond to changes
      const onFsChange = () => updateVisibility();
      const onResize = () => updateVisibility();
  document.addEventListener('fullscreenchange', onFsChange);
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', () => setTimeout(updateVisibility, 120));

      // Store cleanup if ever needed
      window.__cleanupFullscreenPrompt = () => {
        document.removeEventListener('fullscreenchange', onFsChange);
        window.removeEventListener('resize', onResize);
        const el = document.getElementById('fullscreen-prompt-overlay');
        if (el && el.parentNode) el.parentNode.removeChild(el);
      };
    })();
} catch (error) {
    console.error('Failed to create Phaser Game:', error);
    console.error('Error stack:', error.stack);
    
    // Display error message on page
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #ff0000;
        color: white;
        padding: 20px;
        border-radius: 5px;
        font-family: Arial;
        z-index: 10000;
        max-width: 500px;
    `;
    errorDiv.innerHTML = `
        <h3>Game Failed to Load</h3>
        <p><strong>Error:</strong> ${error.message}</p>
        <p>Please try:</p>
        <ul>
            <li>Opening in incognito/private mode</li>
            <li>Disabling browser extensions</li>
            <li>Using a different browser</li>
            <li>Check the browser console for more details</li>
        </ul>
    `;
    document.body.appendChild(errorDiv);
}