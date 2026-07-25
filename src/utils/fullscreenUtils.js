// Fullscreen utility functions for consistent fullscreen handling across scenes

export class FullscreenManager {
    constructor(scene) {
        this.scene = scene;
        this.isSetup = false;
    }

    /**
     * Set up fullscreen event listeners
     * Should be called in the scene's create() method
     */
    setup() {
        if (this.isSetup) return;
        
        this.handleFullscreenChange = this.handleFullscreenChange.bind(this);
        this.handleResize = this.handleResize.bind(this);
        
        window.addEventListener('resize', this.handleResize);
        document.addEventListener('fullscreenchange', this.handleFullscreenChange);
        
        this.isSetup = true;
    }    /**
     * Handle fullscreen state changes
     */
    handleFullscreenChange() {
        if (!document.fullscreenElement && this.scene.scene.isActive()) {
            // Exit fullscreen - restore to proper window dimensions
            this.resizeToWindow();
            
            // Trigger UI redraw if method exists and scene needs it
            if (this.scene.createUI && this.shouldRedrawUI()) {
                this.scene.time.delayedCall(150, () => this.scene.createUI());
            }
        } else if (document.fullscreenElement && this.scene.scene.isActive()) {
            this.resizeToFullscreen();
            
            // Trigger UI redraw if method exists and scene needs it
            if (this.scene.createUI && this.shouldRedrawUI()) {
                this.scene.time.delayedCall(150, () => this.scene.createUI());
            }
        }
    }

    /**
     * Check if UI should be redrawn (can be overridden by scene)
     */
    shouldRedrawUI() {
        // If scene has custom logic for when to redraw, use it
        if (typeof this.scene.shouldRedrawUIOnFullscreenChange === 'function') {
            return this.scene.shouldRedrawUIOnFullscreenChange();
        }
        // Default: always redraw
        return true;
    }    /**
     * Handle window resize events
     */
    handleResize() {
        // Redraw UI on resize to maintain proper scaling
        if (this.scene.createUI && this.shouldRedrawUI()) {
            this.scene.time.delayedCall(100, () => this.scene.createUI());
        }
    }

    /**
     * Resize to window dimensions (non-fullscreen)
     */
    resizeToWindow() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        
        // Reset scale manager first
        this.scene.scale.resize(w, h);
        
        // Ensure canvas styling is consistent
        const canvas = this.scene.game.canvas;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.display = 'block';
        
        // Force a refresh of the scale manager
        this.scene.scale.refresh();
    }

    /**
     * Resize to fullscreen dimensions
     */
    resizeToFullscreen() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        
        // Reset scale manager first
        this.scene.scale.resize(w, h);
        
        // Ensure canvas styling is consistent
        const canvas = this.scene.game.canvas;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.display = 'block';
        
        // Force a refresh of the scale manager
        this.scene.scale.refresh();
    }    /**
     * Enter fullscreen mode
     * @param {Function} onComplete - Optional callback when fullscreen is entered
     */
    enterFullscreen(onComplete) {
        if (!this.scene.scale.isFullscreen) {
            try {
                this.scene.scale.startFullscreen();
                
                // Need a small delay to ensure fullscreen is applied
                this.scene.time.delayedCall(150, () => {
                    this.resizeToFullscreen();
                    
                    // Additional delay for callback to ensure everything is settled
                    if (onComplete) {
                        this.scene.time.delayedCall(100, onComplete);
                    }
                });
            } catch (error) {
                console.warn('Failed to enter fullscreen:', error);
                // Still call the callback even if fullscreen failed
                if (onComplete) {
                    this.scene.time.delayedCall(100, onComplete);
                }
            }
        } else {
            if (onComplete) {
                this.scene.time.delayedCall(50, onComplete);
            }
        }
    }/**
     * Exit fullscreen mode
     * @param {Function} onComplete - Optional callback when fullscreen is exited
     */
    exitFullscreen(onComplete) {
        if (this.scene.scale.isFullscreen) {
            this.scene.scale.stopFullscreen();
            
            this.scene.time.delayedCall(150, () => {
                this.resizeToWindow();
                if (onComplete) {
                    this.scene.time.delayedCall(50, onComplete);
                }
            });
        } else {
            if (onComplete) {
                this.scene.time.delayedCall(50, onComplete);
            }
        }
    }

    /**
     * Toggle fullscreen mode
     * @param {Function} onEnter - Optional callback when entering fullscreen
     * @param {Function} onExit - Optional callback when exiting fullscreen
     */
    toggleFullscreen(onEnter, onExit) {
        if (this.scene.scale.isFullscreen) {
            this.exitFullscreen(onExit);
        } else {
            this.enterFullscreen(onEnter);
        }
    }

    /**
     * Clean up event listeners
     * Should be called in the scene's shutdown() method
     */
    destroy() {
        if (!this.isSetup) return;
        
        window.removeEventListener('resize', this.handleResize);
        document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
        
        this.isSetup = false;
    }

    /**
     * Check if currently in fullscreen
     */
    get isFullscreen() {
        return this.scene.scale.isFullscreen;
    }
}

// Static utility functions for scenes that don't need the full manager
export const FullscreenUtils = {
    /**
     * Quick setup for scenes with createUI method
     */
    setupScene(scene) {
        const manager = new FullscreenManager(scene);
        manager.setup();
        
        // Store manager on scene for cleanup
        scene.fullscreenManager = manager;
        
        return manager;
    },

    /**
     * Quick cleanup for scenes
     */
    cleanupScene(scene) {
        if (scene.fullscreenManager) {
            scene.fullscreenManager.destroy();
            scene.fullscreenManager = null;
        }
    }
};
