// Vraie logique d'interface, DOM/SDK simulés. OAuth réel à recetter.
const assert=require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm');
const source=fs.readFileSync('public/modules/crewmongus/crew-app.js','utf8');
const authCode=source.slice(source.indexOf("  'use strict';"),source.indexOf('function syncEditorNavigation'));
function setup(scenario={}){
  const nodes=new Map(), calls=[];
  class Element{
    constructor(){this.hidden=false;this.textContent='';this.listeners={};this.value='';}
    set innerHTML(html){this.html=html;for(const match of html.matchAll(/id="([^"]+)"/g))nodes.set(match[1],new Element());}
    get innerHTML(){return this.html;}
    addEventListener(name,fn){this.listeners[name]=fn;}
  }
  const node=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);};
  const user=scenario.anonymous?null:{id:'same-crew-account',email:'admin@example.test',user_metadata:{preferred_username:'Compte test'},identities:[{provider:scenario.twitch?'twitch':'email'}]};
  let session=user?{user,provider_token:scenario.twitch?'provider-test':null}:null,resolveRole;
  const client={from(){const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:scenario.manual?{role:scenario.manual}:null,error:null})};return q;},
    functions:{async invoke(name,args){calls.push({method:'invoke',name,args});if(scenario.delay)await new Promise(resolve=>resolveRole=resolve);return scenario.failure?{error:new Error('backend unavailable')}:{data:{role:scenario.role||null,expires_at:new Date(Date.now()+300000).toISOString()}};}},
    auth:{getSession:async()=>({data:{session},error:null}),signInWithOAuth:async input=>{calls.push({method:'signInWithOAuth',input});return {error:null};},linkIdentity:async input=>{calls.push({method:'linkIdentity',input});return {error:null};},signOut:async()=>{session=null;return {error:null};}}};
  const context={root:{querySelector:selector=>node(selector.slice(1))},CSS:{escape:x=>x},sdk:{createClient(url,key,options){calls.push({method:'createClient',options});return client;}},window:{location:{hash:'',search:scenario.search||'',origin:'https://preview.example',pathname:'/'}},URLSearchParams,setTimeout:()=>1,clearTimeout:()=>{},Date,console,history:{replaceState(){}},latestMonth:()=>'',esc:x=>String(x).replaceAll('<','&lt;'),clearProtectedImportLogs(){},loadLoggerImportsFromSupabase:async()=>{},renderAdmin(){},syncEditorNavigation(){}};
  vm.createContext(context);vm.runInContext(authCode+'\nwindow.test={refreshAdminAuth,handleTwitchLogin,handleAdminLogout,editorCanWrite,adminCanWrite,accountSetupNeeded};',context);
  return {api:context.window.test,calls,node,finish:()=>resolveRole()};
}
(async()=>{
  let t=setup({anonymous:true});await t.api.refreshAdminAuth();
  assert.equal(t.node('admin-protected').hidden,true);assert.ok(t.node('admin-auth-panel').innerHTML.includes('Se connecter avec Twitch'));assert.equal(t.api.accountSetupNeeded(),false);
  await t.api.handleTwitchLogin();let call=t.calls.find(c=>c.method==='signInWithOAuth');
  assert.equal(call.input.provider,'twitch');assert.ok(call.input.options.scopes.includes('user:read:moderated_channels'));assert.equal(call.input.options.redirectTo,'https://preview.example/?crew_auth=1');assert.equal(t.calls[0].options.auth.flowType,'pkce');
  t=setup({twitch:true});await t.api.refreshAdminAuth();assert.equal(t.node('admin-protected').hidden,true);assert.equal(t.api.editorCanWrite(),false);assert.equal(t.api.accountSetupNeeded(),false);
  t=setup({twitch:true,role:'helper'});await t.api.refreshAdminAuth();assert.equal(t.node('admin-protected').hidden,false);assert.equal(t.api.editorCanWrite(),true);assert.equal(t.api.adminCanWrite(),false);assert.match(t.node('admin-auth-panel').innerHTML,/Helper/);
  t=setup({twitch:true,role:'admin'});await t.api.refreshAdminAuth();assert.equal(t.api.adminCanWrite(),true);
  t=setup({manual:'admin'});await t.api.refreshAdminAuth();assert.ok(t.node('admin-link-twitch').listeners.click);await t.api.handleTwitchLogin(true);call=t.calls.find(c=>c.method==='linkIdentity');assert.equal(call.input.provider,'twitch');assert.equal(t.api.adminCanWrite(),true);
  t=setup({twitch:true,failure:true});await t.api.refreshAdminAuth();assert.equal(t.api.editorCanWrite(),false);assert.match(t.node('admin-auth-status').textContent,/indisponible/);
  t=setup({twitch:true,manual:'admin',failure:true});await t.api.refreshAdminAuth();assert.equal(t.api.adminCanWrite(),true);
  t=setup({twitch:true,role:'admin',delay:true});const pending=t.api.refreshAdminAuth();while(!t.calls.some(c=>c.method==='invoke'))await new Promise(resolve=>setImmediate(resolve));await t.api.handleAdminLogout();t.finish();await pending;assert.equal(t.node('admin-protected').hidden,true);assert.equal(t.api.adminCanWrite(),false);
  t=setup({anonymous:true,search:'?type=recovery'});assert.equal(t.calls[0].options.auth.flowType,'implicit');
  const portal=fs.readFileSync('public/assets/site-auth.js','utf8'), element=()=>({hidden:true,textContent:'',setAttribute(){},addEventListener(){},contains(){return false;}});
  for(const [search,expected] of [['?crew_auth=1&code=crew-code',false],['?code=portal-code',true]]){
    let options=null;const doc={getElementById:element,addEventListener(){},querySelector(){return null;}};
    const win={location:{search,hash:'',origin:'https://preview.example',pathname:'/'},supabase:{createClient(url,key,input){options=input;return {auth:{onAuthStateChange(){},getUser:async()=>({data:{user:null}})}};}},dispatchEvent(){}};
    vm.runInNewContext(portal,{window:win,document:doc,URLSearchParams,sessionStorage:{getItem(){return null;},removeItem(){}},setTimeout,clearTimeout,CustomEvent:class{}});await new Promise(resolve=>setImmediate(resolve));
    if(!expected)assert.equal(options,null);await win.DEADELUSTV_AUTH.getClient();assert.equal(options.auth.detectSessionInUrl,expected);
  }
  console.log('11 parcours de logique UI réussis : droits, association, panne, déconnexion concurrente, récupération et isolation OAuth.');
})().catch(error=>{console.error(error);process.exitCode=1;});
