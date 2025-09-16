/**
 * Environment and Development Utilities
 * Provides conditional logging and development-only features
 */

// Environment flags (defined by Vite at build time)
export const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : false;
export const isProd = typeof __PROD__ !== 'undefined' ? __PROD__ : true;
export const isDebugMode = typeof __DEBUG_MODE__ !== 'undefined' ? __DEBUG_MODE__ : false;
export const enableConsoleLogs = typeof __ENABLE_CONSOLE_LOGS__ !== 'undefined' ? __ENABLE_CONSOLE_LOGS__ : false;

/**
 * Conditional Console Logging
 * Only logs in development builds
 */
export const devLog = {
    log: (...args) => {
        if (enableConsoleLogs) {
            console.log('[DEV]', ...args);
        }
    },
    
    warn: (...args) => {
        if (enableConsoleLogs) {
            console.warn('[DEV WARNING]', ...args);
        }
    },
    
    error: (...args) => {
        if (enableConsoleLogs) {
            console.error('[DEV ERROR]', ...args);
        }
    },
    
    info: (...args) => {
        if (enableConsoleLogs) {
            console.info('[DEV INFO]', ...args);
        }
    },
    
    debug: (...args) => {
        if (isDebugMode) {
            console.log('[DEBUG]', ...args);
        }
    },
    
    table: (data) => {
        if (enableConsoleLogs && console.table) {
            console.table(data);
        }
    },
    
    group: (label) => {
        if (enableConsoleLogs && console.group) {
            console.group(`[DEV] ${label}`);
        }
    },
    
    groupEnd: () => {
        if (enableConsoleLogs && console.groupEnd) {
            console.groupEnd();
        }
    }
};

/**
 * Performance Monitoring (Dev Only)
 */
export const devPerf = {
    time: (label) => {
        if (isDebugMode && console.time) {
            console.time(`[PERF] ${label}`);
        }
    },
    
    timeEnd: (label) => {
        if (isDebugMode && console.timeEnd) {
            console.timeEnd(`[PERF] ${label}`);
        }
    }
};

/**
 * Development-only function execution
 */
export const devOnly = (fn) => {
    if (isDev && typeof fn === 'function') {
        return fn();
    }
};

/**
 * Production-only function execution
 */
export const prodOnly = (fn) => {
    if (isProd && typeof fn === 'function') {
        return fn();
    }
};

/**
 * Assert function for development
 */
export const devAssert = (condition, message) => {
    if (isDev && !condition) {
        console.error('[DEV ASSERTION FAILED]', message);
        debugger; // Only triggers in dev builds
    }
};

/**
 * Debug panel utilities (Dev Only)
 */
export const devDebugPanel = {
    show: () => {
        if (!isDev) return;
        
        // Create a simple debug panel
        const panel = document.createElement('div');
        panel.id = 'dev-debug-panel';
        panel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            font-size: 12px;
            z-index: 10000;
            max-width: 300px;
        `;
        
        panel.innerHTML = `
            <div style="color: #ff6b6b; font-weight: bold;">🚧 DEV MODE</div>
            <div>Build: ${process.env.BUILD_TYPE || 'unknown'}</div>
            <div>Debug: ${isDebugMode ? 'ON' : 'OFF'}</div>
            <div>Console: ${enableConsoleLogs ? 'ON' : 'OFF'}</div>
            <button onclick="this.parentElement.remove()" style="margin-top: 5px; padding: 2px 5px;">Close</button>
        `;
        
        document.body.appendChild(panel);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (panel.parentElement) {
                panel.remove();
            }
        }, 5000);
    }
};

/**
 * Feature flags for development
 */
export const features = {
    enableExperimentalFeatures: isDev,
    enableDebugUI: isDev,
    enablePerformanceMetrics: isDev,
    enableDetailedErrors: isDev,
    enableAutoSave: true, // Always enabled
    enableAnalytics: isProd // Only in production
};

/**
 * Error reporting (different behavior for dev vs prod)
 */
export const reportError = (error, context = '') => {
    if (isDev) {
        devLog.error('Error occurred:', error, context);
        // In dev, show detailed error info
        if (error.stack) {
            devLog.error('Stack trace:', error.stack);
        }
    } else {
        // In production, you might want to send to error tracking service
        // console.error('An error occurred'); // Minimal logging
        
        // Example: Send to error tracking service
        // if (window.errorTracker) {
        //     window.errorTracker.captureException(error, { context });
        // }
    }
};

// Export environment info for debugging
export const envInfo = {
    isDev,
    isProd,
    isDebugMode,
    enableConsoleLogs,
    buildType: process.env.BUILD_TYPE || 'unknown',
    nodeEnv: process.env.NODE_ENV || 'unknown'
};

// Auto-show debug panel in dev mode
devOnly(() => {
    // Show debug panel when page loads in dev mode
    if (typeof window !== 'undefined') {
        window.addEventListener('load', () => {
            // Only show if not dismissed in this session
            if (!sessionStorage.getItem('dev-panel-dismissed')) {
                setTimeout(() => devDebugPanel.show(), 1000);
                sessionStorage.setItem('dev-panel-dismissed', 'true');
            }
        });
        
        // Make dev utilities available globally in dev mode
        window.devUtils = {
            log: devLog,
            perf: devPerf,
            panel: devDebugPanel,
            features,
            envInfo
        };
    }
});