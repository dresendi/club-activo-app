import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMobileApi } from './app.js';

test('mobile API validates tokens and live account state without exposing private data', async () => {
  let active = true;
  let queried = 0;
  const user = {id:'auth-test',app_metadata:{role:'family'}};
  const query = {select(){return this;},eq(column,id){assert.equal(column,'auth_user_id');assert.equal(id,user.id);return this;},async maybeSingle(){queried++;return {data:{full_name:'Test Member',auth_user_id:user.id,status:active?'active':'inactive',role:'family',roles:['comite'],private:'never expose'}};}};
  const db = {auth:{async getUser(token){return token==='valid'?{data:{user}}:{data:{user:null},error:{}};}},schema(name){assert.equal(name,'club_activo_v2');return {from(table){assert.equal(table,'guardians');return query;}};}};
  const server = createMobileApi(db).listen(0,'127.0.0.1');
  await new Promise(resolve => server.once('listening',resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await fetch(base+'/v1/me')).status,401);
    assert.equal((await fetch(base+'/v1/me',{headers:{Authorization:'Bearer invalid'}})).status,401);
    assert.equal(queried,0);
    const result=await fetch(base+'/v1/me',{headers:{Authorization:'Bearer valid'}});
    assert.deepEqual(await result.json(),{name:'Test Member',firstName:'Test Member',isLoggedIn:true,isAdmin:false,isCommittee:true,canDownloadReports:true});
    assert.equal(result.headers.get('cache-control'),'no-store');
    active=false;
    assert.equal((await fetch(base+'/v1/events',{headers:{Authorization:'Bearer valid'}})).status,403);
  } finally {await new Promise(resolve=>server.close(resolve));}
});
