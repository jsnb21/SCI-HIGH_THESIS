/**
 * Console Log Converter Script
 * Helps convert console.log statements to conditional devLog statements
 * 
 * Usage:
 * 1. Import this in any file: import { convertConsoleLogsInFile } from './convertLogs.js';
 * 2. Or use the provided regex patterns to do find/replace in your editor
 */

// Regex patterns for find/replace in your editor:

/*
FIND/REPLACE PATTERNS FOR YOUR EDITOR:

1. Basic console.log replacement:
   FIND:    console\.log\(
   REPLACE: devLog.log(

2. console.warn replacement:
   FIND:    console\.warn\(
   REPLACE: devLog.warn(

3. console.error replacement:
   FIND:    console\.error\(
   REPLACE: devLog.error(

4. console.info replacement:
   FIND:    console\.info\(
   REPLACE: devLog.info(

5. Add import at top of files (manual):
   ADD: import { devLog, reportError, devPerf } from '../utils/devUtils.js';
*/

// Quick conversion examples:
export const conversionExamples = {
    // Before:
    beforeExamples: [
        'console.log("Game started");',
        'console.warn("Low performance detected");',
        'console.error("Failed to load asset:", error);',
        'console.log("Player position:", x, y);',
        'console.log(`Score: ${score}, Lives: ${lives}`);'
    ],
    
    // After:
    afterExamples: [
        'devLog.log("Game started");',
        'devLog.warn("Low performance detected");',
        'reportError(error, "Failed to load asset");',
        'devLog.debug("Player position:", x, y);',
        'devLog.log(`Score: ${score}, Lives: ${lives}`);'
    ]
};

// File-specific conversion helpers
export const fileConversions = {
    // For service files (like Firebase services)
    serviceFiles: {
        patterns: [
            { from: /console\.log\(/g, to: 'devLog.log(' },
            { from: /console\.warn\(/g, to: 'devLog.warn(' },
            { from: /console\.error\(/g, to: 'reportError(' },
            { from: /console\.info\(/g, to: 'devLog.info(' }
        ],
        requiredImport: "import { devLog, reportError } from '../utils/devUtils.js';"
    },
    
    // For game scenes
    sceneFiles: {
        patterns: [
            { from: /console\.log\(/g, to: 'devLog.debug(' }, // Use debug for game events
            { from: /console\.warn\(/g, to: 'devLog.warn(' },
            { from: /console\.error\(/g, to: 'reportError(' }
        ],
        requiredImport: "import { devLog, reportError, devPerf } from '../utils/devUtils.js';"
    },
    
    // For performance-critical files
    performanceFiles: {
        patterns: [
            { from: /console\.time\(/g, to: 'devPerf.time(' },
            { from: /console\.timeEnd\(/g, to: 'devPerf.timeEnd(' },
            { from: /console\.log\(/g, to: 'devLog.debug(' }
        ],
        requiredImport: "import { devLog, devPerf } from '../utils/devUtils.js';"
    }
};

// Manual conversion checklist
export const conversionChecklist = [
    '1. Add import statement at top of file',
    '2. Replace console.log with devLog.log or devLog.debug',
    '3. Replace console.warn with devLog.warn',
    '4. Replace console.error with reportError (for better error handling)',
    '5. Replace console.time/timeEnd with devPerf.time/timeEnd',
    '6. Test both dev and prod builds to ensure logs appear/disappear correctly'
];

/**
 * Quick test function to verify dev utilities are working
 */
export const testDevUtils = () => {
    console.log('=== Testing Dev Utils ===');
    
    // These should only appear in dev builds
    if (typeof devLog !== 'undefined') {
        devLog.log('✅ devLog.log working');
        devLog.warn('⚠️ devLog.warn working');
        devLog.debug('🐛 devLog.debug working');
        devLog.info('ℹ️ devLog.info working');
    }
    
    // Test conditional execution
    if (typeof devOnly !== 'undefined') {
        devOnly(() => console.log('✅ devOnly function working'));
    }
    
    if (typeof prodOnly !== 'undefined') {
        prodOnly(() => console.log('✅ prodOnly function working'));
    }
    
    console.log('=== Test Complete ===');
};