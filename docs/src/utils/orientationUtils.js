/**
 * Orientation utilities for mobile landscape optimization
 */

// Function to check if device is mobile
export function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 768 && window.innerHeight <= 1024);
}

// Function to handle orientation overlay
export function handleOrientationOverlay() {
    const overlay = document.getElementById('orientation-overlay');
    if (!overlay) return;
    
    const isMobile = isMobileDevice();
    const isPortrait = window.innerHeight > window.innerWidth;
    
    if (isMobile && isPortrait) {
        overlay.style.display = 'flex';
    } else {
        overlay.style.display = 'none';
    }
}

// Function to attempt orientation lock
export function tryLockLandscape() {
    if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape-primary').catch(err => {
            console.log('Could not lock orientation to landscape-primary, trying landscape:', err);
            screen.orientation.lock('landscape').catch(err2 => {
                console.log('Could not lock orientation to landscape:', err2);
            });
        });
    } else if (screen.lockOrientation) {
        // Fallback for older browsers
        screen.lockOrientation('landscape-primary') || screen.lockOrientation('landscape');
    } else if (screen.mozLockOrientation) {
        // Firefox fallback
        screen.mozLockOrientation('landscape-primary') || screen.mozLockOrientation('landscape');
    } else if (screen.msLockOrientation) {
        // IE/Edge fallback
        screen.msLockOrientation('landscape-primary') || screen.msLockOrientation('landscape');
    }
}

// Function to setup orientation handling
export function setupOrientationHandling() {
    // Check orientation on load and resize
    window.addEventListener('load', handleOrientationOverlay);
    window.addEventListener('resize', handleOrientationOverlay);
    window.addEventListener('orientationchange', () => {
        setTimeout(handleOrientationOverlay, 100); // Small delay for orientation change
    });
    
    // Try to lock to landscape on mobile
    if (isMobileDevice()) {
        tryLockLandscape();
    }
}

// Function to create orientation overlay HTML
export function createOrientationOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'orientation-overlay';
    overlay.innerHTML = `
        <div class="rotate-icon">📱</div>
        <h2>Please rotate your device</h2>
        <p>This game is best played in landscape mode</p>
    `;
    
    // Add styles
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: none;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        color: white;
        font-family: Arial, sans-serif;
        text-align: center;
        padding: 20px;
    `;
    
    // Add animation styles for rotate icon
    const style = document.createElement('style');
    style.textContent = `
        #orientation-overlay .rotate-icon {
            font-size: 80px;
            margin-bottom: 20px;
            animation: rotate 2s linear infinite;
        }
        
        @keyframes rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        
        #orientation-overlay h2 {
            font-size: 24px;
            margin-bottom: 10px;
        }
        
        #orientation-overlay p {
            font-size: 16px;
            opacity: 0.8;
        }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(overlay);
    
    return overlay;
}
