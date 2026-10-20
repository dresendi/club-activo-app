import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMobileApi } from './app.js';
import { createActivationProof, verifyActivationProof } from './ported/activation-proof.js';
const id='11111111-1111-4111-8111-111111111111';
function fixture(){
 let mutations=0;
 const db = {
  auth: { async getUser(token) {
   return {data:{user:['admin','member','committee'].includes(token) ? {id:token,app_metadata:{role:token==='admin'?'admin':'family'}} : null}};
  }},
  schema() { return { from() {
   let token; let update;
   return {
    select(){return this;},
    eq(key,value){if(key==='auth_user_id')token=value;return this;},
    update(value){mutations++;update=value;return this;},
    async maybeSingle(){return {data:update ? {id,roles:update.roles} : {id,auth_user_id:token,full_name:'Test',status:'active',role:token==='admin'?'admin':'family',roles:token==='committee'?['comite']:[]}};}
   };
  }}; }
 };
 return {db,count:()=>mutations};
}
async function withApi(config,run){const f=fixture();const server=createMobileApi(f.db,config).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));try{await run(`http://127.0.0.1:${server.address().port}`,f);}finally{await new Promise(r=>server.close(r));}}
const headers=token=>({'Authorization':`Bearer ${token}`,'Content-Type':'application/json'});
test('admin routes and actions reject unauthenticated, member and committee requests',()=>withApi({enableMutations:true},async(base,f)=>{
 for(const token of ['missing','member','committee'])for(const [path,method] of [['/api/admin/users','DELETE'],['/api/admin/payments','POST'],['/api/admin/users/roles','PATCH'],['/actions/approveRequestAction','POST'],['/v1/admin/dashboard','GET']]){
 const result=await fetch(base+path,{method,headers:headers(token),...(method==='GET'?{}:{body:'{}'})});assert.equal(result.status,token==='missing'?401:403);
 }assert.equal(f.count(),0);
}));
test('mutations require explicit enablement; CORS and action allowlist fail closed',()=>withApi({allowedOrigins:'capacitor://localhost'},async(base,f)=>{
 assert.equal((await fetch(base+'/actions/requestActivationOtpAction',{method:'POST',body:'{}'})).status,503);
 assert.equal((await fetch(base+'/api/admin/users/roles',{method:'PATCH',headers:headers('admin'),body:'{}'})).status,503);
 assert.equal((await fetch(base+'/health',{headers:{Origin:'https://untrusted.invalid'}})).status,403);
 assert.equal((await fetch(base+'/health',{headers:{Origin:'capacitor://localhost'}})).status,200);
 assert.equal((await fetch(base+'/actions/toString',{method:'POST',body:'{}'})).status,404);
 assert.equal(f.count(),0);
}));
test('roles bridge rejects privilege escalation and persists valid committee role',()=>withApi({enableMutations:true},async(base,f)=>{
 const send=roles=>fetch(base+'/api/admin/users/roles',{method:'PATCH',headers:headers('admin'),body:JSON.stringify({id,roles})});
 assert.equal((await send(['admin'])).status,400);assert.equal(f.count(),0);
 const result=await send(['comite']);assert.equal(result.status,200);assert.deepEqual(await result.json(),{success:true,roles:['comite']});assert.equal(f.count(),1);
}));
test('activation proof is account-bound, signed and expires',()=>{
 const proof=createActivationProof('user-a','test-only-secret',1000);
 assert.equal(verifyActivationProof(proof,'user-a','test-only-secret',1001),true);
 for(const [value,user,secret,time] of [[proof,'user-b','test-only-secret',1001],[proof,'user-a','wrong',1001],[proof,'user-a','test-only-secret',601000],[proof+'x','user-a','test-only-secret',1001]])assert.equal(verifyActivationProof(value,user,secret,time),false);
});
