# Student ID Format

## Updated Format: XX-XXXX-XXX

### Structure
- **XX**: 2-digit batch/year code (e.g., 24 for 2024)
- **XXXX**: 4-digit full year (e.g., 2024)
- **XXX**: 3-digit sequence number (e.g., 001, 002, 003...)

### Examples
- `24-2024-001` - First student of 2024 batch
- `24-2024-002` - Second student of 2024 batch
- `23-2023-150` - 150th student of 2023 batch

### Validation Rules
1. Must contain exactly 11 characters
2. Must have dashes in positions 3 and 8
3. All other characters must be digits (0-9)
4. Pattern: `[0-9]{2}-[0-9]{4}-[0-9]{3}`

### Sample Test Accounts
- `24-2024-001` - Juan Dela Cruz (BS Computer Science)
- `24-2024-002` - Maria Santos (BS Information Technology)  
- `24-2024-003` - Pedro Garcia (SHS STEM)

## Technical Implementation

### Firebase Path Fix
- Fixed issue with Firebase update where `progress.lastActivity` was invalid
- Changed to `progress/lastActivity` to use proper Firebase path syntax

### Login Process
1. Student enters Student ID in format XX-XXXX-XXX
2. System validates format using regex pattern
3. If ID exists in database → load existing student data and progress
4. If ID doesn't exist → automatically create new student account
5. Update last login timestamp in Firebase

### Key Features
- **Auto-creation**: New accounts created automatically for new Student IDs
- **Progress preservation**: Existing students retain all their progress
- **Format validation**: Client-side validation ensures correct format
- **Firebase compatibility**: Uses proper Firebase path syntax for updates
