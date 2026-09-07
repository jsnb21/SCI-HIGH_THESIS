import { HttpsError } from 'firebase-functions/v2/https';

export function requireIdentity(request) {
  if (!request.auth || request.auth.token?.firebase?.sign_in_provider === 'anonymous') {
    throw new HttpsError('unauthenticated', 'Sign in with a real account.');
  }
  return request.auth;
}
export function isAdmin(token) {
  return token?.role === 'admin' || token?.admin === true;
}
export function isProfessor(token) {
  return token?.role === 'professor' || token?.professor === true;
}
export function validateUid(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) {
    throw new HttpsError('invalid-argument', 'Invalid account identifier.');
  }
  return value;
}
export function requireStudentAccess(auth, uid, assigned) {
  if (!isAdmin(auth.token) && !(isProfessor(auth.token) && assigned === true)) {
    throw new HttpsError('permission-denied', 'Access to this student is not assigned.');
  }
  return uid;
}
