# SCI-HIGH trusted authentication functions

`setUserRole` and `provisionStudent` are App Check-protected callable functions. They accept requests only from a Firebase user whose ID token already contains `admin: true` or `role: "admin"`. Student self-registration is intentionally disabled; `provisionStudent` creates the Firebase Auth identity, student claim, and UID-owned profile from this trusted environment.

Before deployment:

1. Assign the first administrator claim out-of-band with the Firebase Admin SDK or Google Cloud administrative tooling.
2. Enable and enforce Firebase App Check for the web application and callable function.
3. Select the correct Firebase project and verify the Realtime Database URL.
4. Run `npm install` and `npm run check` from this directory.
5. Deploy with `firebase deploy --only functions:setUserRole,functions:provisionStudent`.

Never add a client-accessible bootstrap endpoint for the first administrator.
