// These records are unverified client reports, never authoritative scores.
export function submissionFor(user, payload, firebase) {
  if (!user || user.isAnonymous) throw new Error('Sign in to save gameplay');
  const serialized = JSON.stringify(payload);
  if (serialized.length > 20000) throw new Error('Gameplay report is too large');
  return { ownerUid: user.uid, submittedAt: firebase.database.ServerValue.TIMESTAMP, payload: serialized };
}
