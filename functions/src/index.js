import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

initializeApp();

export { exportStudentRecords, resetStudentProgress, deleteOwnAccount } from './studentOperations.js';

const ALLOWED_ROLES = new Set(['admin', 'professor', 'student', 'general']);

function requireAdministrator(request) {
  if (!request.auth || request.auth.token?.firebase?.sign_in_provider === 'anonymous') throw new HttpsError('unauthenticated', 'Sign-in is required.');
  const token = request.auth.token || {};
  const role = typeof token.role === 'string' ? token.role.toLowerCase() : '';
  if (token.admin !== true && role !== 'admin') {
    throw new HttpsError('permission-denied', 'A server-issued administrator claim is required.');
  }
}

function validateRoleRequest(data) {
  const uid = typeof data?.uid === 'string' ? data.uid.trim() : '';
  const role = typeof data?.role === 'string' ? data.role.trim().toLowerCase() : '';
  if (!/^[A-Za-z0-9_-]{20,128}$/.test(uid)) throw new HttpsError('invalid-argument', 'A valid Firebase UID is required.');
  if (!ALLOWED_ROLES.has(role)) throw new HttpsError('invalid-argument', 'Unsupported role.');
  return { uid, role };
}

function requiredText(value, field, maxLength = 100) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text || text.length > maxLength) {
    throw new HttpsError('invalid-argument', `${field} is required and must be at most ${maxLength} characters.`);
  }
  return text;
}

export const provisionStudent = onCall({
  region: 'asia-southeast1',
  enforceAppCheck: true,
  timeoutSeconds: 30,
  memory: '256MiB',
  maxInstances: 5
}, async request => {
  requireAdministrator(request);

  const studentId = requiredText(request.data?.studentId, 'studentId', 12);
  if (!/^[0-9]{2}-[0-9]{4}-[0-9]{3}$/.test(studentId)) {
    throw new HttpsError('invalid-argument', 'Student ID must use the XX-XXXX-XXX format.');
  }
  const firstName = requiredText(request.data?.firstName, 'firstName');
  const lastName = requiredText(request.data?.lastName, 'lastName');
  const department = requiredText(request.data?.department, 'department');
  const strandYear = requiredText(request.data?.strandYear, 'strandYear');
  const temporaryPassword = typeof request.data?.temporaryPassword === 'string' ? request.data.temporaryPassword : '';
  if (temporaryPassword.length < 12 || temporaryPassword.length > 128) {
    throw new HttpsError('invalid-argument', 'Temporary password must be 12 to 128 characters.');
  }

  const database = getDatabase();
  const duplicate = await database.ref('students').orderByChild('studentId').equalTo(studentId).limitToFirst(1).once('value');
  if (duplicate.exists()) throw new HttpsError('already-exists', 'That student ID is already provisioned.');

  const email = `${studentId.replace(/-/g, '.')}@students.sci-high.invalid`.toLowerCase();
  const auth = getAuth();
  let created = null;
  try {
    created = await auth.createUser({ email, password: temporaryPassword, displayName: `${firstName} ${lastName}` });
    await auth.setCustomUserClaims(created.uid, { role: 'student' });
    const now = Date.now();
    await database.ref(`students/${created.uid}`).set({
      studentId,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      department,
      strandYear,
      accountType: 'student',
      ownerUid: created.uid,
      profileCompleted: true,
      accountStatus: { isActive: true, createdAt: now, lastLogin: null },
      progress: { completedQuizzes: [], completedStories: [], totalScore: 0, lastActivity: null },
      gameData: { totalPoints: 0, achievements: [], currentLevel: 1, courseProgress: {} }
    });
    await database.ref('security_audit/student_provisioning').push({
      targetUid: created.uid,
      studentId,
      provisionedBy: request.auth.uid,
      provisionedAt: now
    });
    return { success: true, uid: created.uid, studentId };
  } catch (error) {
    if (created?.uid) {
      await database.ref(`students/${created.uid}`).remove().catch(() => {});
      await auth.deleteUser(created.uid).catch(() => {});
    }
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'Student provisioning failed.');
  }
});

export const setUserRole = onCall({
  region: 'asia-southeast1',
  enforceAppCheck: true,
  timeoutSeconds: 30,
  memory: '256MiB',
  maxInstances: 5
}, async request => {
  requireAdministrator(request);
  const { uid, role } = validateRoleRequest(request.data);

  if (uid === request.auth.uid && role !== 'admin') {
    throw new HttpsError('failed-precondition', 'Administrators cannot remove their own administrator role.');
  }

  const auth = getAuth();
  const target = await auth.getUser(uid);
  const existing = target.customClaims || {};
  const claims = { ...existing, role };
  delete claims.admin;
  delete claims.professor;
  if (role === 'admin') claims.admin = true;
  if (role === 'professor') claims.professor = true;

  await auth.setCustomUserClaims(uid, claims);
  await getDatabase().ref('security_audit/role_changes').push({
    targetUid: uid,
    previousRole: existing.role || null,
    newRole: role,
    changedBy: request.auth.uid,
    changedAt: Date.now()
  });

  return { success: true, uid, role, tokenRefreshRequired: true };
});
