#!/usr/bin/env node

/**
 * Console Log Cleaner
 * Removes console.log statements from JavaScript and HTML files
 */

const fs = require('fs');
const path = require('path');

class ConsoleLogCleaner {
  constructor(options = {}) {
    this.options = {
      // File extensions to process
      extensions: ['.js', '.html', '.htm'],
      // Directories to exclude
      excludeDirs: ['node_modules', '.git', 'dist', 'build', 'remove-logs'],
      // Files to exclude
      excludeFiles: [],
      // Whether to make backups
      makeBackups: false,
      // Console methods to remove (you can add console.warn, console.error, etc.)
      consoleMethods: ['console.log'],
      // Dry run mode (just show what would be changed)
      dryRun: false,
      ...options
    };
    
    this.stats = {
      filesProcessed: 0,
      filesChanged: 0,
      logsRemoved: 0
    };
  }

  /**
   * Process a directory recursively
   */
  processDirectory(dirPath) {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        // Skip excluded directories
        if (!this.options.excludeDirs.includes(item)) {
          this.processDirectory(itemPath);
        }
      } else if (stat.isFile()) {
        // Process files with matching extensions
        const ext = path.extname(item);
        if (this.options.extensions.includes(ext) && 
            !this.options.excludeFiles.includes(item)) {
          this.processFile(itemPath);
        }
      }
    }
  }

  /**
   * Process a single file
   */
  processFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;
      
      let modifiedContent = content;
      let removedCount = 0;
      
      // Remove console.log statements
      for (const method of this.options.consoleMethods) {
        const result = this.removeConsoleStatements(modifiedContent, method);
        modifiedContent = result.content;
        removedCount += result.removedCount;
      }
      
      this.stats.filesProcessed++;
      
      if (modifiedContent !== originalContent) {
        this.stats.filesChanged++;
        this.stats.logsRemoved += removedCount;
        
        console.log(`📝 ${filePath}: Removed ${removedCount} console.log(s)`);
        
        if (!this.options.dryRun) {
          // Make backup if requested
          if (this.options.makeBackups) {
            fs.writeFileSync(filePath + '.backup', originalContent);
          }
          
          // Write modified content
          fs.writeFileSync(filePath, modifiedContent);
        }
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error.message);
    }
  }

  /**
   * Remove console statements from content
   */
  removeConsoleStatements(content, method = 'console.log') {
    let removedCount = 0;
    
    // Pattern to match console.log statements
    // This handles various formats:
    // - console.log('message');
    // - console.log("message");
    // - console.log(\`message\`);
    // - console.log(variable);
    // - console.log('msg', variable, 'more');
    // - Multi-line console.log statements
    
    const patterns = [
      // Single line console.log with various quote types and content
      new RegExp(`\\s*${method.replace('.', '\\.')}\\s*\\([^;]*\\)\\s*;?\\s*\\n?`, 'g'),
      
      // Multi-line console.log (opening parenthesis on same line, closing on different line)
      new RegExp(`\\s*${method.replace('.', '\\.')}\\s*\\([\\s\\S]*?\\)\\s*;?\\s*\\n?`, 'g'),
      
      // Console.log in HTML script tags (with more specific matching)
      new RegExp(`\\s*${method.replace('.', '\\.')}\\s*\\([\\s\\S]*?\\)\\s*;?`, 'g')
    ];
    
    let modifiedContent = content;
    
    for (const pattern of patterns) {
      const matches = modifiedContent.match(pattern);
      if (matches) {
        removedCount += matches.length;
        modifiedContent = modifiedContent.replace(pattern, '');
      }
    }
    
    // Clean up any extra blank lines that might be left
    modifiedContent = modifiedContent.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    return {
      content: modifiedContent,
      removedCount
    };
  }

  /**
   * Run the cleaner
   */
  run(targetPath = '.') {
    console.log('🧹 Console Log Cleaner Starting...');
    console.log(`📁 Target: ${path.resolve(targetPath)}`);
    console.log(`🎯 Extensions: ${this.options.extensions.join(', ')}`);
    console.log(`🚫 Console methods: ${this.options.consoleMethods.join(', ')}`);
    
    if (this.options.dryRun) {
      console.log('🔍 DRY RUN MODE - No files will be modified');
    }
    
    console.log('─'.repeat(50));
    
    const startTime = Date.now();
    
    const stat = fs.statSync(targetPath);
    if (stat.isDirectory()) {
      this.processDirectory(targetPath);
    } else {
      this.processFile(targetPath);
    }
    
    const endTime = Date.now();
    
    console.log('─'.repeat(50));
    console.log('📊 Summary:');
    console.log(`   Files processed: ${this.stats.filesProcessed}`);
    console.log(`   Files modified: ${this.stats.filesChanged}`);
    console.log(`   Console.logs removed: ${this.stats.logsRemoved}`);
    console.log(`   Time taken: ${endTime - startTime}ms`);
    
    if (this.options.dryRun && this.stats.logsRemoved > 0) {
      console.log('');
      console.log('💡 Run without --dry-run to actually remove the console.log statements');
    }
  }
}

// CLI interface
function main() {
  const args = process.argv.slice(2);
  
  const options = {
    dryRun: args.includes('--dry-run') || args.includes('-d'),
    makeBackups: args.includes('--backup') || args.includes('-b'),
  };
  
  // Get target path
  // If no path specified and we're in a subdirectory, default to parent directory
  let targetPath = args.find(arg => !arg.startsWith('--') && !arg.startsWith('-'));
  
  if (!targetPath) {
    // Check if we're in the remove-logs directory, if so, default to parent
    const currentDir = path.basename(process.cwd());
    if (currentDir === 'remove-logs') {
      targetPath = '..';
    } else {
      targetPath = '.';
    }
  }
  
  // Show help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Console Log Cleaner - Remove console.log statements from JS and HTML files

Usage: node remove-console-logs.js [target-path] [options]

Options:
  --dry-run, -d     Show what would be changed without modifying files
  --backup, -b      Create backup files before modifying
  --help, -h        Show this help message

Examples:
  node remove-console-logs.js                    # Clean parent directory (when in remove-logs folder)
  node remove-console-logs.js --dry-run          # Preview changes
  node remove-console-logs.js ../src --backup    # Clean src/ with backups
  node remove-console-logs.js ../file.js         # Clean single file

Note: When run from the remove-logs folder, it defaults to cleaning the parent directory.
`);
    return;
  }
  
  const cleaner = new ConsoleLogCleaner(options);
  cleaner.run(targetPath);
}

// Export for use as module
module.exports = ConsoleLogCleaner;

// Run if called directly
if (require.main === module) {
  main();
}