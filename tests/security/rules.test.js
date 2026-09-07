import { readFileSync } from 'node:fs';
import { before, after, test } from 'node:test';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';

let env;
const claims = role => ({ role, firebase: { sign_in_provider: 'password' } });
const db = (uid, role = 'student') => env.authenticatedContext(uid, claims(role)).database();
before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-sci-high',
    database: { host: '127.0.0.1', port: 9000, rules: readFileSync('database.rules.json','utf8') },
    firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync('firestore.rules','utf8') },
    storage: { host: '127.0.0.1', port: 9199, rules: readFileSync('storage.rules','utf8') }
  });
  await env.withSecurityRulesDisabled(async ctx => {
    await ctx.database().ref().set({
      students: { alice: { studentId: '24-2024-001', ownerUid: 'alice', progress: { lastActivity: 1 } }, bob: { studentId: '24-2024-002', ownerUid: 'bob' } },
      professor_students: { teacher: { alice: true } },
      student_career_stats: { alice: { careerStats: { totalPoints: 10 } }, bob: { careerStats: { totalPoints: 20 } } },
      public_leaderboards: { alias: { name: 'Player', score: 10 } },
      system: { maintenance: { enabled: false } }
    });
  });
});
after(async () => { await env?.cleanup(); });

test('public reads are restricted to published data and maintenance', async () => {
  const guest = env.unauthenticatedContext().database();
  await assertSucceeds(guest.ref('public_leaderboards').once('value'));
  await assertSucceeds(guest.ref('system/maintenance').once('value'));
  for (const path of ['students','student_career_stats','gameplay_data','feedbacks','roles','security_audit','password_resets']) {
    await assertFails(guest.ref(path).once('value'));
  }
});
test('anonymous identity does not grant private or privileged access', async () => {
  const anon = env.authenticatedContext('alice', { role: 'admin', firebase: { sign_in_provider: 'anonymous' } }).database();
  await assertFails(anon.ref('students/alice').once('value'));
  await assertFails(anon.ref('students').once('value'));
  await assertFails(anon.ref('feedbacks/alice/x').set({ message: 'x', senderUid: 'alice', createdAt: {'.sv':'timestamp'} }));
});
test('student owns only their profile and cannot enumerate or escalate', async () => {
  const alice = db('alice');
  await assertSucceeds(alice.ref('students/alice').once('value'));
  await assertFails(alice.ref('students/bob').once('value'));
  await assertFails(alice.ref('students').once('value'));
  await assertFails(alice.ref('students/alice/role').set('admin'));
  await assertFails(alice.ref('roles/professors/alice').set(true));
  await assertFails(alice.ref('professor_students/alice/bob').set(true));
  await assertFails(alice.ref('students/alice').remove());
  await assertSucceeds(alice.ref('students/alice/lastLogin').set({'.sv':'timestamp'}));
  await assertFails(alice.ref('students/alice/lastLogin').set(1));
});
test('professors read only assigned students; admin can enumerate', async () => {
  const teacher = db('teacher','professor');
  await assertSucceeds(teacher.ref('students/alice').once('value'));
  await assertSucceeds(teacher.ref('student_career_stats/alice').once('value'));
  await assertFails(teacher.ref('students/bob').once('value'));
  await assertFails(teacher.ref('student_career_stats').once('value'));
  await assertFails(teacher.ref('students/alice/studentId').set('changed'));
  await assertSucceeds(db('admin','admin').ref('students').once('value'));
});
test('no client role may write authoritative or backend-only paths', async () => {
  for (const role of ['student','general','professor','admin']) {
    for (const path of ['student_career_stats/alice','leaderboards/alice','public_leaderboards/alice','password_resets/codes/alice','security_audit/x','feedback_email_queue/x','system/maintenance','mastery_aggregates/alice']) {
      await assertFails(db('alice',role).ref(path).set({ score: 999 }));
    }
  }
});
test('gameplay reports enforce owner, append-only, timestamp and size limits', async () => {
  const alice = db('alice');
  const valid = { ownerUid: 'alice', submittedAt: {'.sv':'timestamp'}, payload: '{"score":1}' };
  await assertSucceeds(alice.ref('gameplay_data/alice/session').set(valid));
  await assertFails(alice.ref('gameplay_data/bob/session').set(valid));
  await assertFails(alice.ref('gameplay_data/alice/session').set(valid));
  await assertFails(alice.ref('gameplay_data/alice/forged').set({...valid,ownerUid:'bob'}));
  await assertFails(alice.ref('gameplay_data/alice/oversize').set({...valid,payload:'x'.repeat(20001)}));
  await assertFails(alice.ref('gameplay_data/alice/extra').set({...valid,role:'admin'}));
  await assertFails(alice.ref('gameplay_data/alice/clock').set({...valid,submittedAt:1}));
});
test('feedback is private and cannot choose email recipients', async () => {
  const valid = { message:'Hello',senderUid:'alice',createdAt:{'.sv':'timestamp'} };
  await assertSucceeds(db('alice').ref('feedbacks/alice/one').set(valid));
  await assertFails(db('bob').ref('feedbacks/alice').once('value'));
  await assertFails(db('alice').ref('feedbacks/alice/two').set({...valid,targets:['victim@example.com']}));
  await assertFails(db('alice').ref('feedbacks/alice/three').set({...valid,message:'x'.repeat(1001)}));
  await assertSucceeds(db('admin','admin').ref('feedbacks').once('value'));
});
test('story progress has private ownership and rejects unexpected fields', async () => {
  const valid = { payload:'{}', updatedAt:{'.sv':'timestamp'} };
  await assertSucceeds(db('alice').ref('story_progress/alice/noah').set(valid));
  await assertFails(db('bob').ref('story_progress/alice/noah').once('value'));
  await assertFails(db('alice').ref('story_progress/alice/lily').set({...valid,role:'admin'}));
});
test('quiz ownership requires a server professor claim', async () => {
  const quiz = { meta:{title:'Quiz',subject:'C',createdAt:'2026-09-05',createdBy:'teacher',format:'intensity-schema-v1'},intensity1:{multipleChoice:[{question:'Q',options:['A','B'],correctIndex:0}]} };
  await assertSucceeds(db('teacher','professor').ref('customQuizzes/teacher/quiz').set(quiz));
  await assertFails(db('alice').ref('customQuizzes/alice/quiz').set(quiz));
  await assertFails(db('other','professor').ref('customQuizzes/teacher/quiz').set(quiz));
  await assertFails(db('teacher','professor').ref('customQuizzes/teacher/invalid').set({...quiz,role:'admin'}));
  await assertSucceeds(db('alice').ref('customQuizzes').once('value'));
});
test('Firestore save access is owner-only with schema validation', async () => {
  const own = env.authenticatedContext('alice',claims('student')).firestore();
  const other = env.authenticatedContext('bob',claims('student')).firestore();
  const save = { playerHP:100,playTime:0,gameProgress:0,courseProgress:{},characters:[],lastSaved:'2026-09-05',version:'1.0' };
  await assertSucceeds(own.doc('users/alice/gameData/saveData').set(save));
  await assertSucceeds(own.doc('users/alice/gameData/saveData').get());
  await assertFails(other.doc('users/alice/gameData/saveData').get());
  await assertFails(other.doc('users/alice/gameData/saveData').set(save));
  await assertFails(own.doc('users/alice/gameData/saveData').set({...save,role:'admin'}));
  await assertFails(own.doc('users/alice').set({role:'admin'}));
  await assertFails(env.unauthenticatedContext().firestore().doc('users/alice/gameData/saveData').get());
});
test('general registration permits only own non-privileged profile', async () => {
  const ctx = env.authenticatedContext('personal', {...claims('general'), email:'player@example.com'});
  const personal = ctx.database();
  const profile = {fullName:'Player',email:'player@example.com',department:'General',year:'None',accountType:'general',ownerUid:'personal',createdAt:{'.sv':'timestamp'},lastLogin:{'.sv':'timestamp'},gameData:{totalPoints:0,currentLevel:1}};
  await assertFails(personal.ref('general_users/personal').set({...profile,role:'admin'}));
  await assertFails(personal.ref('general_users/personal').set({...profile,ownerUid:'bob'}));
  await assertSucceeds(personal.ref('general_users/personal').set(profile));
  await assertSucceeds(personal.ref('general_users/personal/lastLogin').set({'.sv':'timestamp'}));
  await assertFails(personal.ref('general_users/personal/accountType').set('admin'));
  await assertFails(personal.ref('general_users/personal/gameData/totalPoints').set(999));
  await assertFails(db('bob').ref('general_users/personal').once('value'));
  await assertFails(personal.ref('general_users/personal').remove());
});
test('all supported quiz formats validate and nested injection is rejected', async () => {
  const teacher = db('teacher','professor');
  const quiz = {meta:{title:'Syntax',subject:'C',createdAt:'2026-09-05',createdBy:'teacher',format:'intensity-schema-v1'},intensity1:{syntaxBlock:[{type:'syntaxBlock',question:'Q',instruction:'Choose',blocks:[{code:'int x;',correct:true},{code:'wrong',correct:false}]}],codeArrangement:[{title:'Arrange',description:'Order',blocks:['a','b'],correctOrder:[0,1]}]}};
  await assertSucceeds(teacher.ref('customQuizzes/teacher/syntax').set(quiz));
  await assertFails(teacher.ref('customQuizzes/teacher/syntax/intensity1/syntaxBlock/0/blocks/0/role').set('admin'));
  await assertFails(teacher.ref('customQuizzes/teacher/syntax/intensity1/syntaxBlock/100').set(quiz.intensity1.syntaxBlock[0]));
  await assertFails(teacher.ref('customQuizzes/teacher/syntax/meta/createdBy').set('bob'));
  await assertSucceeds(teacher.ref('customQuizzes/teacher/syntax').remove());
});
test('Storage remains closed because no upload feature is authorized', async () => {
  for (const ctx of [env.unauthenticatedContext(),env.authenticatedContext('admin',claims('admin'))]) {
    await assertFails(ctx.storage().ref('test.txt').putString('test'));
  }
});
