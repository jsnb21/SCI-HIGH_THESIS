# SCI-HIGH trusted authentication functions

`setUserRole` and `provisionStudent` are App Check-protected callable functions. They accept requests only from a Firebase user whose ID token already contains `admin: true` or `role: "admin"`. Student self-registration is intentionally disabled; `provisionStudent` creates the Firebase Auth identity, student claim, and UID-owned profile from this trusted environment.

Before deployment:

1. Assign the first administrator claim out-of-band with the Firebase Admin SDK or Google Cloud administrative tooling.
2. Enable and enforce Firebase App Check for the web application and callable function.
3. Select the correct Firebase project and verify the Realtime Database URL.
4. Run `npm install` and `npm run check` from this directory.
5. Follow [the Phase 2 rollout guide](../documentation/firebase-security.md) and deploy all functions with an explicitly verified project: `firebase deploy --project YOUR_PROJECT_ID --only functions`.

Phase 2 also adds assigned-student exports, administrator progress resets, and recent-auth self-service account deletion. These operations enforce App Check and authorization on the backend. Run `npm test` for authorization checks; run `npm run test:rules` from the repository root for emulator integration tests.

Never add a client-accessible bootstrap endpoint for the first administrator.
