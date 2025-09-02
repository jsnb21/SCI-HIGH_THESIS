# Student Information Collection System

## Overview
The Student Information Collection System has been added to `index.html` to gather essential student details when they first log in or when their profile is incomplete.

## Features

### 1. **Automatic Trigger**
- Shows the information collection modal when:
  - A new student account is created
  - An existing student has incomplete profile information (e.g., name still shows "Student [ID]" or level is "unknown")

### 2. **Form Fields**
- **Full Name** (Required): Student's complete name
- **Academic Level** (Required): College, Senior High School, or Junior High School
- **Course/Program** (Required for College): Specific degree program
- **Strand** (Required for Senior High): Academic strand (STEM, ABM, HUMSS, etc.)
- **Year Level** (Required): 1st to 5th year
- **Programming Experience** (Optional): Beginner, Intermediate, or Advanced
- **Learning Goals** (Optional): Free text field for student aspirations

### 3. **Smart Form Behavior**
- Course field appears only when "College" is selected
- Strand field appears only when "Senior High School" is selected
- Required fields are dynamically adjusted based on academic level

### 4. **Database Integration**
- Updates student information in Firebase Realtime Database
- Falls back to local storage if Firebase is unavailable
- Maintains consistency with existing student data structure

### 5. **User Experience**
- Students can skip the form and complete it later
- Form provides clear visual feedback during submission
- Confirmation messages guide the user through the process

## Technical Implementation

### Modal Structure
```html
<div id="student-info-modal" class="...">
  <!-- Student information collection form -->
</div>
```

### Key Functions
- `showStudentInfoModal()`: Displays the information collection modal
- `hideStudentInfoModal()`: Hides the modal
- `handleLevelChange(level)`: Manages dynamic form fields based on academic level
- `updateStudentInformation(studentData)`: Saves student information to database

### Database Schema
The system updates the following fields in the Firebase `students` collection:
```javascript
{
  name: "Student Full Name",
  fullName: "Student Full Name",
  level: "college|shs|jhs",
  course: "BS Computer Science", // for college students
  strand: "STEM", // for SHS students
  year: 1, // numeric year level
  experience: "beginner|intermediate|advanced",
  goals: "Learning objectives text",
  accountStatus: {
    isFirstLogin: false,
    profileCompleted: true,
    lastProfileUpdate: "2025-01-01T00:00:00.000Z"
  }
}
```

## Integration Points

### 1. **Student Login Flow**
Modified `document.getElementById('student-login-form').addEventListener('submit')` to check for new accounts and incomplete profiles.

### 2. **Firebase Integration**
Uses existing Firebase configuration and database structure from the authentication system.

### 3. **UI Consistency**
Follows the same design patterns as other modals in the application with gaming-themed styling.

## Usage Example

1. Student enters their Student ID in the login form
2. If it's a new account or incomplete profile, the information collection modal appears
3. Student fills in their details (or skips if desired)
4. Information is saved to Firebase and the student is redirected to the game

## Error Handling

- Network errors during information submission are caught and displayed to the user
- Form validation ensures required fields are completed
- Fallback to local storage if Firebase is unavailable
- User can retry submission if an error occurs

## Future Enhancements

1. **Profile Editing**: Allow students to update their information from game settings
2. **Validation**: Add more sophisticated validation for email formats, student ID patterns
3. **Analytics**: Track completion rates and form abandonment
4. **Localization**: Support multiple languages for international students
5. **Bulk Import**: Allow professors to import student information in batches

## Testing

To test the system:
1. Open `index.html`
2. Click "Login" and select "Student"
3. Enter a new Student ID (e.g., "TEST-2025-001")
4. The information collection modal should appear
5. Fill in the form and verify data is saved to Firebase

For existing incomplete profiles, use a Student ID that exists but has default values like "Student [ID]" for the name.
