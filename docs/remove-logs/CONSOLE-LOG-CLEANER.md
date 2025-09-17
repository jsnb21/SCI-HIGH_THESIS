# Console Log Cleaner

A utility to remove `console.log` statements from JavaScript and HTML files in your project.

## Features

- ✅ Removes `console.log()` statements from `.js`, `.html`, and `.htm` files
- ✅ Supports single-line and multi-line console.log statements
- ✅ Handles various quote types (single, double, template literals)
- ✅ Preserves code formatting and structure
- ✅ Dry-run mode to preview changes
- ✅ Optional file backups
- ✅ Recursive directory processing
- ✅ Excludes common directories (node_modules, .git, dist, build)

## Usage Options

### 1. Using npm scripts (Recommended)

```bash
# Preview what would be removed (dry run)
npm run clean-logs:dry

# Remove console.logs
npm run clean-logs

# Remove console.logs with backups
npm run clean-logs:backup
```

### 2. Using Node.js directly

```bash
# Preview changes
node remove-console-logs.js --dry-run

# Remove console.logs from current directory
node remove-console-logs.js

# Remove console.logs with backups
node remove-console-logs.js --backup

# Clean specific directory
node remove-console-logs.js src/

# Clean single file
node remove-console-logs.js file.js
```

### 3. Using PowerShell (Windows)

```powershell
# Preview changes
.\remove-console-logs.ps1 -DryRun

# Remove console.logs
.\remove-console-logs.ps1

# Remove console.logs with backups
.\remove-console-logs.ps1 -Backup

# Clean specific directory
.\remove-console-logs.ps1 -Path src
```

## Command Line Options

### Node.js version:
- `--dry-run, -d`: Preview changes without modifying files
- `--backup, -b`: Create backup files before modifying
- `--help, -h`: Show help message

### PowerShell version:
- `-DryRun`: Preview changes without modifying files
- `-Backup`: Create backup files before modifying
- `-Path <path>`: Target directory or file
- `-Help`: Show help message

## Examples

### Before cleaning:
```javascript
function myFunction() {
    console.log('Starting function');
    const result = calculateSomething();
    console.log('Result:', result);
    return result;
}
```

### After cleaning:
```javascript
function myFunction() {
    const result = calculateSomething();
    return result;
}
```

## What gets removed:

- `console.log('message');`
- `console.log("message");`
- `console.log(\`template literal\`);`
- `console.log(variable);`
- `console.log('message', variable, 'more');`
- Multi-line console.log statements
- Console.log statements in HTML `<script>` tags

## What gets preserved:

- Other console methods (`console.error`, `console.warn`, etc.)
- Comments containing "console.log"
- String literals containing "console.log"
- Code structure and formatting

## Safety Features

- **Dry-run mode**: Always test with `--dry-run` first
- **Backup option**: Use `--backup` to create `.backup` files
- **Excluded directories**: Automatically skips node_modules, .git, dist, build
- **File validation**: Only processes .js, .html, .htm files

## Recommended Workflow

1. **Preview first**: Run with dry-run to see what would be changed
   ```bash
   npm run clean-logs:dry
   ```

2. **Create backups**: If you want to be extra safe
   ```bash
   npm run clean-logs:backup
   ```

3. **Clean**: Remove the console.logs
   ```bash
   npm run clean-logs
   ```

4. **Test**: Make sure your application still works correctly

## Notes

- The script preserves your code formatting and structure
- It's designed to be safe and conservative in what it removes
- Always test your application after running the cleaner
- Consider using a linter like ESLint to prevent console.logs in production builds