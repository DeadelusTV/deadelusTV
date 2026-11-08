'use strict';
// Session réelle du module du site + contrôleur du Pass, sans réseau ni SDK externe.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const authSource=read('public/assets/site-auth.js'),passSource=read('public/assets/daily-pass.js');
const tick=async()=>{for(let i=0;i<8;i++)await new Promise(r=>setImmediate(r));};
function page({stored=false,search='',blocked=false,uid='alice',handler,getUser}={}){
 const nodes=new Map(),events=[],listeners={},timers=[],calls=[];let created=0,owner=uid,authCallback,now=Date.now(),fail=false;
 const element=id=>{if(!nodes.has(id))nodes.set(id,{hidden:false,innerHTML:'',textContent:'',setAttribute(){},addEventListener(){},removeEventListener(){},contains(){return false;},querySelector(){return null;},replaceChildren(){this.innerHTML='';}});return nodes.get(id);};
 const user=()=>owner?{id:owner,user_metadata:{preferred_username:owner}}:null;
 const client={auth:{onAuthStateChange(fn){authCallback=fn;},getUser:async()=>{if(fail)throw Error('private diagnostic');return getUser?getUser():{data:{user:user()}};},getSession:async()=>({data:{session:owner?{user:user(),access_token:'scoped-session'}:null}}),signOut:async()=>{owner=null;authCallback?.('SIGNED_OUT',null);return{};}},
  from:()=>({select(){return this;},eq(){return this;},maybeSingle:async()=>({data:{enabled:false}})}),
  rpc:async(...args)=>{calls.push(args);return handler?handler(...args):{data:{status:'recorded',step:1,gains:[]}};}};
 const context={location:{search,hash:'#accueil'},supabase:{createClient(){created++;return client;}},
  document:{visibilityState:'visible',getElementById:id=>id==='daily-pass-root'?null:element(id),querySelector(){return null;},addEventListener(){}},
  localStorage:{getItem(){if(blocked)throw Error('blocked');return stored?'stored-session':null;}},sessionStorage:{getItem(){return null;}},
  URLSearchParams,Date:class extends Date{static now(){return now;}},Event:class{constructor(type){this.type=type;}},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail;}},
  addEventListener(type,fn){(listeners[type]??=[]).push(fn);},dispatchEvent(event){events.push(event);for(const fn of listeners[event.type]||[])fn(event);},
  setTimeout,clearTimeout,setInterval(fn){timers.push(fn);return timers.length;},AbortSignal,
  fetch:async()=>({ok:true,json:async()=>({role:null})})};
 context.window=context;vm.createContext(context);vm.runInContext(authSource,context);vm.runInContext(passSource,context);
 return{context,calls,events,timers,element,get created(){return created;},advance(ms){now+=ms;},failAuth(){fail=true;},
  async switchTo(id){owner=id;authCallback?.(id?'SIGNED_IN':'SIGNED_OUT',id?{user:user()}:null);await new Promise(r=>setTimeout(r,5));await tick();}};
}
test('anonymous visits and blocked storage keep Auth lazy and make no Pass call',async()=>{
 for(const blocked of [false,true]){const p=page({blocked});await tick();assert.equal(p.created,0);assert.equal(p.calls.length,0);assert.equal(p.context.DEADELUSTV_AUTH.userId,null);}
});
test('stored session on the site home is validated and records presence without any Pass markup',async()=>{
 const p=page({stored:true});await tick();assert.equal(p.created,1);assert.equal(p.context.DEADELUSTV_AUTH.userId,'alice');assert.deepEqual(p.calls,[['tcg_claim_daily_pass']]);
 const view=p.element('view');p.context.DCGDailyPass.mount(view);assert.match(view.innerHTML,/Jour 1/);assert.equal(p.calls.length,1);
 p.context.DCGDailyPass.unmount();p.advance(61000);p.timers[0]();await tick();assert.equal(p.calls.length,2);
});
test('Crew OAuth callback does not consume its code or restore the other Auth project',async()=>{
 const p=page({stored:true,search:'?crew_auth=1&code=crew-code'});await tick();assert.equal(p.created,0);assert.equal(p.calls.length,0);
});
test('invalid stored session is verified by Auth and never requests rewards',async()=>{
 const p=page({stored:true,getUser:async()=>({error:{message:'expired'}})});await tick();assert.equal(p.created,1);assert.equal(p.context.DEADELUSTV_AUTH.userId,null);assert.equal(p.calls.length,0);
});
test('late reward response after sign-out is discarded, including on a later route mount',async()=>{
 let release;const p=page({stored:true,handler:()=>new Promise(r=>release=r)});await tick();assert.equal(p.calls.length,1);
 await p.context.DEADELUSTV_AUTH.signOut();release({data:{status:'recorded',gains:[{kind:'dust',amount:5,login:'OLD_ACCOUNT'}]}});await tick();
 const view=p.element('view');p.context.DCGDailyPass.mount(view);assert.equal(view.hidden,true);assert.doesNotMatch(view.innerHTML,/OLD_ACCOUNT/);assert.equal(p.events.some(e=>e.type==='tcg:daily-pass-change'),false);
});
test('account switch invalidates the old pending request and records the newly verified identity',async()=>{
 const releases=[];const p=page({stored:true,handler:()=>new Promise(r=>releases.push(r))});await tick();await p.switchTo('bob');assert.equal(p.context.DEADELUSTV_AUTH.userId,'bob');assert.equal(p.calls.length,2);
 releases[0]({data:{status:'recorded',gains:[{kind:'dust',amount:5,login:'OLD_ACCOUNT'}]}});releases[1]({data:{status:'recorded',step:2,gains:[]}});await tick();
 const view=p.element('view');p.context.DCGDailyPass.mount(view);assert.match(view.innerHTML,/Jour 2/);assert.doesNotMatch(view.innerHTML,/OLD_ACCOUNT/);
});
test('failed session revalidation clears identity and suspends further Pass requests',async()=>{
 const p=page({stored:true});await tick();p.failAuth();await p.context.DEADELUSTV_AUTH.refresh();assert.equal(p.context.DEADELUSTV_AUTH.userId,null);
 p.advance(61000);p.timers[0]();await tick();assert.equal(p.calls.length,1);
});
test('the common controller is loaded once before portal routes on every site page',()=>{
 const html=read('public/index.html');assert.equal((html.match(/src="assets\/daily-pass.js\?/g)||[]).length,1);
 assert.ok(html.indexOf('assets/site-auth.js')<html.indexOf('assets/daily-pass.js'));
 assert.ok(html.indexOf('assets/daily-pass.js')<html.indexOf('modules/dcg/portal.js'));
 assert.match(html,/<script src="assets\/daily-pass.js[^>]* defer>/);assert.match(html,/href="assets\/daily-pass.css/);
});
