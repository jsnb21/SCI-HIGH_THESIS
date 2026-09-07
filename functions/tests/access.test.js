import {test} from 'node:test';
import assert from 'node:assert/strict';
import {requireIdentity,requireStudentAccess,validateUid} from '../src/access.js';
import {exportStudentRecords,resetStudentProgress,deleteOwnAccount} from '../src/studentOperations.js';
const auth = role => ({uid:'teacher',token:{role,firebase:{sign_in_provider:'password'}}});
test('assignment access requires a privileged claim and exact true assignment', () => {
  assert.throws(() => requireStudentAccess(auth('student'),'alice',true));
  assert.throws(() => requireStudentAccess(auth('professor'),'alice',false));
  assert.throws(() => requireStudentAccess(auth('professor'),'alice','true'));
  assert.equal(requireStudentAccess(auth('professor'),'alice',true),'alice');
  assert.equal(requireStudentAccess(auth('admin'),'alice',false),'alice');
});
test('anonymous identities and path injection are rejected', () => {
  assert.throws(() => requireIdentity({}));
  assert.throws(() => requireIdentity({auth:{uid:'x',token:{role:'admin',firebase:{sign_in_provider:'anonymous'}}}}));
  for (const value of ['../alice','alice/bob','',null,'x'.repeat(129)]) assert.throws(() => validateUid(value));
});
test('callable denial paths reject before contacting any live service', async () => {
  await assert.rejects(exportStudentRecords.run({auth:auth('student'),data:{uids:['alice'],role:'admin'}}),{code:'permission-denied'});
  await assert.rejects(exportStudentRecords.run({auth:auth('professor'),data:{uids:Array(101).fill('alice')}}),{code:'invalid-argument'});
  await assert.rejects(resetStudentProgress.run({auth:auth('professor'),data:{uid:'alice'}}),{code:'permission-denied'});
  await assert.rejects(deleteOwnAccount.run({auth:auth('general'),data:{uid:'someone-else'}}),{code:'permission-denied'});
  for (const operation of [exportStudentRecords,resetStudentProgress,deleteOwnAccount]) {
    await assert.rejects(operation.run({data:{}}),{code:'unauthenticated'});
  }
});
