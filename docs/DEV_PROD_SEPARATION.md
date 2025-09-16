# Development vs Production Code Separation Guide

## 🎯 **Overview**
You now have a complete system to separate development and production code. Console logs, debug features, and experimental code will only appear in development builds, while production builds are clean and optimized.

## 📁 **File Structure**
```
docs/
├── src/utils/devUtils.js       # Main dev utilities
├── src/utils/convertLogs.js    # Helper for converting existing code
├── vite.config.dev.js          # Development build config
├── vite.config.prod.js         # Production build config
└── package.json                # Updated with build:dev & build:prod scripts
```

## 🔧 **Environment Variables**
### Development Build (`npm run build:dev`)
- `__DEV__` = true
- `__PROD__` = false
- `__DEBUG_MODE__` = true
- `__ENABLE_CONSOLE_LOGS__` = true
- Source maps enabled
- Code not minified

### Production Build (`npm run build:prod`)
- `__DEV__` = false
- `__PROD__` = true
- `__DEBUG_MODE__` = false
- `__ENABLE_CONSOLE_LOGS__` = false
- No source maps
- Code minified

## 🛠️ **Usage Examples**

### 1. **Conditional Logging**
```javascript
import { devLog } from '../utils/devUtils.js';

// OLD (appears in both dev and prod):
console.log('Player moved to:', x, y);

// NEW (only appears in dev):
devLog.log('Player moved to:', x, y);
devLog.debug('Detailed player info:', playerData);
devLog.warn('Performance warning:', frameRate);
```

### 2. **Conditional Code Execution**
```javascript
import { devOnly, prodOnly } from '../utils/devUtils.js';

// Code that only runs in development
devOnly(() => {
    // Add debug UI
    // Enable cheat codes
    // Show performance metrics
});

// Code that only runs in production
prodOnly(() => {
    // Initialize analytics
    // Enable crash reporting
});
```

### 3. **Error Reporting**
```javascript
import { reportError } from '../utils/devUtils.js';

// OLD:
console.error('Failed to load asset:', error);

// NEW (better error handling):
reportError(error, 'Asset loading failed');
// In dev: Shows detailed error with stack trace
// In prod: Could send to error tracking service
```

### 4. **Performance Monitoring**
```javascript
import { devPerf } from '../utils/devUtils.js';

// Only tracks performance in dev builds
devPerf.time('level-loading');
// ... level loading code ...
devPerf.timeEnd('level-loading');
```

## 🚀 **Deployment URLs**

### Production (Default)
- **URL:** `https://jsnb21.github.io/SCI-HIGH_THESIS/`
- **Features:** Clean, optimized, no debug output
- **Audience:** End users

### Development
- **URL:** `https://jsnb21.github.io/SCI-HIGH_THESIS/dev/`
- **Features:** Debug logs, source maps, experimental features
- **Audience:** Developers only

### Developer Access Portal
- **URL:** `https://jsnb21.github.io/SCI-HIGH_THESIS/dev-access.html`
- **Purpose:** Gateway for developers with warnings

## 📝 **Converting Existing Code**

### Quick Find/Replace Patterns (Use in VS Code):
1. **Find:** `console\.log\(`  **Replace:** `devLog.log(`
2. **Find:** `console\.warn\(`  **Replace:** `devLog.warn(`
3. **Find:** `console\.error\(`  **Replace:** `reportError(`
4. **Find:** `console\.debug\(`  **Replace:** `devLog.debug(`

### Add Imports:
```javascript
import { devLog, reportError, devOnly, devPerf } from '../utils/devUtils.js';
```

## 🎮 **Game-Specific Features**

### Development-Only Features Available:
- **Debug Panel:** Shows build info, toggles
- **Console Logs:** All debug output visible
- **Source Maps:** For easier debugging
- **Performance Metrics:** Frame rate, load times
- **Global Dev Tools:** Available via `window.devUtils`

### Production Features:
- **Clean Console:** No debug spam
- **Optimized Performance:** Minified code
- **Error Tracking:** Could integrate with services
- **Analytics Ready:** Track user behavior

## 🧪 **Testing Your Setup**

### Test Development Build:
```bash
cd docs
npm run build:dev
# Check dist-dev folder - should have source maps, unminified code
```

### Test Production Build:
```bash
cd docs
npm run build:prod
# Check dist-prod folder - should be minified, no source maps
```

### Deploy Both:
```bash
git add .
git commit -m "Add dev/prod separation"
git push
# GitHub Actions will build and deploy both versions
```

## 🔍 **Verification**

After deployment, check:
1. **Production site** - no console logs in browser dev tools
2. **Development site** - debug logs visible, debug panel appears
3. **Both sites work** - same functionality, different debug levels

## 🎯 **Benefits Achieved**

✅ **Clean Production Builds** - No console spam for users  
✅ **Rich Development Experience** - Full debug info for developers  
✅ **Single Codebase** - No duplicate files to maintain  
✅ **Automatic Deployment** - Both versions deploy on every push  
✅ **Environment-Specific Features** - Different behaviors per environment  
✅ **Easy Debugging** - Source maps and debug tools in dev  
✅ **Performance Optimized** - Minified production builds  

## 🚀 **Next Steps**

1. **Convert More Files:** Use find/replace patterns on your existing `.js` files
2. **Add Dev Features:** Use `devOnly()` to add debug panels, cheat codes, etc.
3. **Enhance Error Tracking:** Integrate production error reporting service
4. **Performance Monitoring:** Add more detailed performance tracking in dev
5. **Feature Flags:** Use environment variables for experimental features