const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../public/assets/site-auth.js'),'utf8');
const tick=()=>new Promise(r=>setTimeout(r,20));
function page({stored=false,search='',blocked=false}={}){
 const nodes=new Map(),events=[];let created=0;
 const element=id=>{if(!nodes.has(id))nodes.set(id,{hidden:false,textContent:'',setAttribute(){},addEventListener(){},contains(){return false;}});return nodes.get(id);};
 const client={auth:{onAuthStateChange(){},getUser:async()=>({data:{user:{id:'test-user',user_metadata:{preferred_username:'Viewer'}}}}),getSession:async()=>({data:{session:null}}),signOut:async()=>({})},
  from:()=>({select(){return this;},eq(){return this;},maybeSingle:async()=>({data:{enabled:false}})})};
 const window={location:{search,hash:'#accueil'},supabase:{createClient(){++created;return client;}},dispatchEvent(event){events.push(event);}};
 const context={window,document:{getElementById:element,querySelector(){return null;},addEventListener(){}},
  localStorage:{getItem(){if(blocked)throw Error('blocked');return stored?'a-session-already-present':null;}},
  sessionStorage:{getItem(){return null;}},URLSearchParams,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},setTimeout};
 vm.runInNewContext(source,context);return{window,events,get created(){return created;}};
}
test('an anonymous portal visit does not load Supabase for the pass',async()=>{
 const p=page();await tick();assert.equal(p.created,0);assert.equal(p.window.DEADELUSTV_AUTH.userId,null);
});
test('an existing portal session is restored on a plain home visit and exposed to the pass',async()=>{
 const p=page({stored:true});await tick();assert.equal(p.created,1);assert.equal(p.window.DEADELUSTV_AUTH.userId,'test-user');
 assert.equal(p.events.some(e=>e.type==='deadelustv:auth-change'&&e.detail.authenticated),true);
 await p.window.DEADELUSTV_AUTH.signOut();assert.equal(p.window.DEADELUSTV_AUTH.userId,null);
});
test('a Crew callback is left for its own Auth project even when a portal session exists',async()=>{
 const p=page({stored:true,search:'?crew_auth=1&code=crew-code'});await tick();assert.equal(p.created,0);
});
test('blocked browser storage keeps the anonymous portal usable',async()=>{
 const p=page({blocked:true});await tick();assert.equal(p.created,0);assert.ok(p.window.DEADELUSTV_AUTH);
});
