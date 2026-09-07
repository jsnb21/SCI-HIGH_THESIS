# Firebase authorization and rollout

Phase 2 rules are versioned in database.rules.json, firestore.rules, and storage.rules. firebase.json binds them to deployment and local emulators. Nothing in this change deploys rules or mutates live data.

## Local verification

Use Node 22 and Java 21 or later:

```sh
npm ci
npm ci --prefix functions
npm run test:rules
npm test --prefix functions
npm run build
```

Tests use only demo-sci-high and localhost emulators. The backend integration test refuses to run without the local database emulator. Permission-denied messages for negative test cases are expected. CI runs the tests on pull requests and before a Pages artifact can deploy.

Verified on 2026-09-07: all 16 emulator tests and all 3 backend authorization tests passed. Production build, JavaScript syntax checks, and diff whitespace checks passed. Build output retains existing script-bundling and large-chunk warnings. The root dependency audit after non-breaking updates reported nine moderate tooling findings and no high/critical findings; previously recorded Functions dependency advisories still require upstream remediation.

## Access boundaries

| Data | Client read | Client write |
| --- | --- | --- |
| students/{uid} | Owner, assigned professor, administrator | Owner's server-timestamp login/activity only |
| general_users/{uid} | Owner, administrator | Validated initial general profile and login timestamp |
| professors/{uid} | Owner, administrator | None |
| professor_students/{professorUid} | That professor, administrator | None |
| student_career_stats/{uid} | Owner, assigned professor, administrator | None |
| public_leaderboards | Public | None |
| gameplay_data/{uid}/{session} | Owner, assigned professor, administrator | Owner creates a bounded, unverified report once |
| story_progress/{uid}/{character} | Owner | Owner's bounded personal save |
| feedbacks/{uid}/{id} | Owner, administrator | Owner creates a bounded message once |
| customQuizzes/{professorUid}/{quiz} | Non-anonymous signed-in users | Owning professor/administrator, validated schema |
| Firestore users/{uid}/gameData/saveData | Owner | Owner's validated personal save |
| Cloud Storage | None | None |
| Roles, password resets, email queues, official scores | Denied unless specifically listed above | Trusted backend only |

The administrator claim does not grant blanket database writes. Professor membership is stored by trusted tooling as professor_students/{professorUid}/{studentUid}: true. Professors cannot enumerate all private student records. Custom quizzes are intentionally shared with all signed-in non-anonymous users; they must not contain private student information.

Gameplay payloads and personal saves are untrusted client data. Their values must never be promoted directly to official scores. Direct updates to career aggregates, published scores, achievements, and mastery aggregates are disabled. A future scoring service must validate question responses and session state before deriving official scores; a callable that merely accepts a numeric client score is insufficient.

## Trusted operations

App Check-enforced callable functions in asia-southeast1:

- setUserRole: administrator only; assigns claims.
- provisionStudent: administrator only; creates student identity/profile.
- exportStudentRecords: administrator or professor assigned to every requested student; maximum 100 accounts; returns a limited field projection and records an audit entry.
- resetStudentProgress: administrator only; resets official career/profile progress for an existing student and audits the operation.
- deleteOwnAccount: only the authenticated account, with authentication within the last five minutes; privileged accounts cannot self-delete. Deletes UID-owned RTDB records and Firestore save, then Auth identity. Cross-service deletion is not atomic; investigate partial failures before retrying. Public entries must use the UID key for deletion to remove them automatically.

Password recovery for synthetic student email identities and AI-provider calls remain disabled. No browser-managed password reset or email-queue write is allowed.

## Required production rollout

1. Back up the live Auth, Realtime Database, and Firestore data. Review existing role claims and remove unauthorized claims before granting access.
2. Migrate legacy student keys and personal saves to Firebase Auth UIDs. Retain no legacy password hashes, reset codes, salts, or recovery secrets in profiles: owner reads include the complete profile node. Remove those fields after a verified backup/migration.
3. Migrate flat gameplay records to gameplay_data/{uid}/{session} with ownerUid, a trusted submittedAt number, and a JSON-string payload. Do not automatically upload legacy queued browser reports whose owner is unknown. Migrate story records to story_progress/{uid}/{character} with payload and updatedAt.
4. Create professor_students assignments using trusted Admin SDK tooling. Do not use a broad professor read rule as a migration shortcut.
5. Seed public_leaderboards/{uid} with reviewed public projections only, e.g. studentInfo.fullName containing a display alias and careerStats.totalPoints containing an approved score. Do not copy private profiles, student numbers, emails, or recent sessions into public projections. Existing private leaderboards are intentionally inaccessible; the public page is empty until projections exist.
6. Register the web app with Firebase App Check using reCAPTCHA v3. Set the public site key as the repository variable FIREBASE_APP_CHECK_SITE_KEY (or local env-config.json appCheckSiteKey). Configure authorized production domains. The backend requires valid App Check tokens.
7. Select and verify the production project explicitly. Deploy Functions and rules using the commands below. Provision Firestore first if deploying its rules and using account deletion. Storage has no application feature; deploy its closed rules if a bucket exists, otherwise omit the storage target.
8. Deploy the matching frontend. Test real student, general, assigned professor, unassigned professor, and administrator accounts in staging, including App Check and recent-auth account deletion. Emulator handler tests exercise authorization and DB mutations but do not prove production App Check configuration or cross-service account deletion.

```sh
npx firebase deploy --project YOUR_PROJECT_ID --only functions
npx firebase deploy --project YOUR_PROJECT_ID --only database,firestore:rules,storage
```

GitHub Pages deployment does not deploy Firebase rules. Verify the active rules in the Firebase console after deployment. Official scoring remains paused until a trusted scoring implementation exists.

## References

- https://firebase.google.com/docs/rules/unit-tests
- https://firebase.google.com/docs/database/security/core-syntax
