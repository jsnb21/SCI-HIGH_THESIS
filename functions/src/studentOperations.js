import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { requireIdentity, isAdmin, isProfessor, validateUid, requireStudentAccess } from './access.js';

const options = { region:'asia-southeast1', enforceAppCheck:true, timeoutSeconds:60, maxInstances:5 };

export const exportStudentRecords = onCall(options, async request => {
  const auth = requireIdentity(request);
  if (!isAdmin(auth.token) && !isProfessor(auth.token)) throw new HttpsError('permission-denied','Professor or administrator access required.');
  const uids = request.data?.uids;
  if (!Array.isArray(uids) || uids.length < 1 || uids.length > 100) {
    throw new HttpsError('invalid-argument', 'Choose between 1 and 100 students.');
  }
  const database = getDatabase();
  const unique = [...new Set(uids.map(validateUid))];
  // Authorize every requested record before reading any private profile.
  for (const uid of unique) {
    const assigned = (await database.ref('professor_students/' + auth.uid + '/' + uid).get()).val();
    requireStudentAccess(auth, uid, assigned);
  }
  const rows = await Promise.all(unique.map(async uid => {
    const profile = (await database.ref('students/' + uid).get()).val() || {};
    const stats = (await database.ref('student_career_stats/' + uid + '/careerStats').get()).val() || {};
    return { studentId:profile.studentId || '', fullName:profile.fullName || '', department:profile.department || '', strandYear:profile.strandYear || '', totalPoints:Number(stats.totalPoints) || 0 };
  }));
  await database.ref('security_audit/exports').push({ actorUid:auth.uid, studentUids:unique, createdAt:Date.now() });
  return { rows };
});

export const resetStudentProgress = onCall(options, async request => {
  const auth = requireIdentity(request);
  if (!isAdmin(auth.token)) throw new HttpsError('permission-denied', 'Administrator access required.');
  const uid = validateUid(request.data?.uid);
  const database = getDatabase();
  if (!(await database.ref('students/' + uid).get()).exists()) throw new HttpsError('not-found','Student not found.');
  await database.ref().update({
    ['student_career_stats/' + uid]:null,
    ['students/' + uid + '/gameData']: {totalPoints:0,currentLevel:1},
    ['students/' + uid + '/progress']: {totalScore:0,lastActivity:Date.now()}
  });
  await database.ref('security_audit/progress_resets').push({ actorUid:auth.uid, targetUid:uid, createdAt:Date.now() });
  return { success:true };
});

export const deleteOwnAccount = onCall(options, async request => {
  const auth = requireIdentity(request);
  const uid = validateUid(auth.uid);
  // No caller-supplied UID is accepted for self-service deletion.
  if (request.data?.uid && request.data.uid !== uid) throw new HttpsError('permission-denied','Only your own account may be deleted.');
  const current = await getAuth().getUser(uid);
  if (isAdmin(current.customClaims) || isProfessor(current.customClaims)) throw new HttpsError('permission-denied','Privileged accounts require administrator-managed deletion.');
  const authTime = Number(auth.token.auth_time);
  if (!Number.isFinite(authTime) || Date.now()/1000 - authTime > 300) throw new HttpsError('failed-precondition','Sign in again before deleting your account.');
  const database = getDatabase();
  const updates = {};
  for (const path of ['students','general_users','student_career_stats','leaderboards','public_leaderboards','gameplay_data','story_progress','mastery_aggregates','feedbacks']) {
    updates[path + '/' + uid] = null;
  }
  await database.ref().update(updates);
  await getFirestore().doc('users/' + uid + '/gameData/saveData').delete();
  await getAuth().deleteUser(uid);
  await database.ref('security_audit/account_deletions').push({targetUid:uid,createdAt:Date.now()});
  return {success:true};
});
