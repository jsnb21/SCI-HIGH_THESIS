🔧 FIREBASE REALTIME DATABASE INDEX FIX
============================================

ISSUE: 
Firebase warning about missing index on 'studentId' field causing inefficient queries.

SOLUTION:
Update your Firebase Realtime Database security rules to include proper indexing.

STEPS TO FIX:
============

1. Go to Firebase Console:
   https://console.firebase.google.com

2. Select your project: "sci-high-website"

3. Navigate to: "Realtime Database" → "Rules"

4. Replace the existing rules with this optimized version:

{
  "rules": {
    "students": {
      ".indexOn": ["studentId"],
      ".read": true,
      ".write": true
    },
    "professors": {
      ".indexOn": ["email"],
      ".read": true,
      ".write": true
    },
    "general_users": {
      ".indexOn": ["email"],
      ".read": true,
      ".write": true
    },
    "leaderboard": {
      ".indexOn": ["score", "timestamp", "department"],
      ".read": true,
      ".write": true
    },
    "test": {
      ".read": true,
      ".write": true
    }
  }
}

5. Click "Publish" to apply the rules

WHAT THIS DOES:
===============
✅ Creates an index on the 'studentId' field for fast queries
✅ Eliminates client-side filtering (much faster performance)
✅ Removes the Firebase warning
✅ Optimizes database performance for student lookups
✅ Adds indexes for other common query fields (email, score, etc.)

PERFORMANCE IMPROVEMENT:
========================
Before: Downloads ALL student records → filters on client
After:  Only downloads matching records → 10x-100x faster

The warning will disappear once the rules are updated and may take a few minutes to propagate.
