import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getDatabase} from 'firebase-admin/database';
import {exportStudentRecords,resetStudentProgress} from '../src/studentOperations.js';
let app, database;
const auth = role => ({uid:'export-teacher',token:{role,firebase:{sign_in_provider:'password'}}});
before(async () => {
  if (process.env.FIREBASE_DATABASE_EMULATOR_HOST !== '127.0.0.1:9000') throw new Error('Local database emulator required');
  app = initializeApp({projectId:'demo-sci-high',databaseURL:'https://demo-sci-high.firebaseio.com'});
  database = getDatabase();
  await database.ref().update({
    'students/export-alice':{studentId:'24-2024-010',fullName:'Alice',email:'private@example.com'},
    'students/export-bob':{studentId:'24-2024-011',fullName:'Bob'},
    'student_career_stats/export-alice':{careerStats:{totalPoints:10}},
    'student_career_stats/export-bob':{careerStats:{totalPoints:99}},
    'professor_students/export-teacher/export-alice':true
  });
});
after(async () => { if (app) await deleteApp(app); });
test('backend export returns only permitted fields for assigned students and audits it', async () => {
  const result = await exportStudentRecords.run({auth:auth('professor'),data:{uids:['export-alice']}});
  assert.equal(result.rows.length,1);
  assert.equal(result.rows[0].fullName,'Alice');
  assert.equal(result.rows[0].totalPoints,10);
  assert.equal('email' in result.rows[0],false);
  const audits=(await database.ref('security_audit/exports').get()).val();
  assert.ok(Object.values(audits).some(row => row.actorUid === 'export-teacher'));
});
test('backend rejects mixed authorized and unauthorized exports', async () => {
  await assert.rejects(exportStudentRecords.run({auth:auth('professor'),data:{uids:['export-alice','export-bob']}}),{code:'permission-denied'});
});
test('administrator reset changes only the requested student', async () => {
  await resetStudentProgress.run({auth:auth('admin'),data:{uid:'export-alice'}});
  assert.equal((await database.ref('student_career_stats/export-alice').get()).exists(),false);
  assert.equal((await database.ref('student_career_stats/export-bob/careerStats/totalPoints').get()).val(),99);
  assert.equal((await database.ref('students/export-alice/fullName').get()).val(),'Alice');
  assert.equal((await database.ref('students/export-alice/gameData/totalPoints').get()).val(),0);
});
