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
      
      // Safety check: count braces before processing
      const originalOpenBraces = (originalContent.match(/\{/g) || []).length;
      const originalCloseBraces = (originalContent.match(/\}/g) || []).length;
      
      let modifiedContent = content;
      let removedCount = 0;
      
      // Remove console.log statements
      for (const method of this.options.consoleMethods) {
        const result = this.removeConsoleStatements(modifiedContent, method);
        modifiedContent = result.content;
        removedCount += result.removedCount;
      }
      
      // Safety check: verify braces are still balanced
      const newOpenBraces = (modifiedContent.match(/\{/g) || []).length;
      const newCloseBraces = (modifiedContent.match(/\}/g) || []).length;
      
      if (originalOpenBraces !== newOpenBraces || originalCloseBraces !== newCloseBraces) {
        console.error(`⚠️  ${filePath}: Brace mismatch detected! Skipping file to prevent damage.`);
        console.error(`   Original: { ${originalOpenBraces}, } ${originalCloseBraces}`);
        console.error(`   Modified: { ${newOpenBraces}, } ${newCloseBraces}`);
        return; // Don't save the file
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
    let modifiedContent = content;
    
    // Process line by line for maximum safety
    const lines = modifiedContent.split('\n');
    const newLines = [];
    let i = 0;
    
    while (i < lines.length) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Skip empty lines
      if (trimmedLine === '') {
        newLines.push(line);
        i++;
        continue;
      }
      
      // Check for single-line console.log
      const singleLinePattern = new RegExp(`^\\s*${method.replace('.', '\\.')}\\s*\\([^\\n]*\\)\\s*;?\\s*(//.*)?\\s*$`);
      
      if (singleLinePattern.test(line)) {
        // Simple single-line console.log, remove it
        removedCount++;
        i++;
        continue;
      }
      
      // Check for multi-line console.log starting on this line
      const multiLineStartPattern = new RegExp(`^\\s*${method.replace('.', '\\.')}\\s*\\(\\s*$`);
      if (multiLineStartPattern.test(line)) {
        // This starts a multi-line console.log, find where it ends
        let j = i + 1;
        let foundEnd = false;
        let parenCount = 1; // We already have one opening paren
        
        while (j < lines.length && parenCount > 0) {
          const nextLine = lines[j];
          // Count parentheses to find the matching closing paren
          for (const char of nextLine) {
            if (char === '(') parenCount++;
            else if (char === ')') parenCount--;
            
            if (parenCount === 0) {
              foundEnd = true;
              break;
            }
          }
          j++;
        }
        
        if (foundEnd) {
          // Skip all lines from i to j-1 (inclusive)
          removedCount++;
          i = j;
          continue;
        }
      }
      
      // Check for inline console.log (code before console.log on same line)
      const inlinePattern = new RegExp(`^(.+?)\\s*;?\\s*${method.replace('.', '\\.')}\\s*\\([^\\n]*\\)\\s*;?\\s*(//.*)?\\s*$`);
      const inlineMatch = line.match(inlinePattern);
      
      if (inlineMatch) {
        // Keep the code before console.log, remove the console.log part
        const codeBefore = inlineMatch[1].trim();
        if (codeBefore) {
          // Add semicolon if needed
          const needsSemicolon = !codeBefore.endsWith(';') && 
                                 !codeBefore.endsWith('{') && 
                                 !codeBefore.endsWith('}') &&
                                 !/^(if|else|for|while|do|switch|try|catch|finally)\\b/.test(codeBefore.trim());
          newLines.push(needsSemicolon ? codeBefore + ';' : codeBefore);
        }
        removedCount++;
        i++;
        continue;
      }
      
      // Regular line, keep as is
      newLines.push(line);
      i++;
    }
    
    modifiedContent = newLines.join('\n');
    
    // Clean up excessive blank lines
    modifiedContent = modifiedContent.replace(/\n\n\n+/g, '\n\n');
    
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