// Exécute la logique réelle avec DOM et services simulés. OAuth réel séparé.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('public/modules/crewmongus/crew-app.js','utf8');
const authCode=source.slice(source.indexOf("  'use strict';"),source.indexOf('function syncEditorNavigation'));
function setup(o={}){
 const nodes=new Map(),calls=[];
 class Element{constructor(){this.hidden=false;this.textContent='';this.listeners={};this.value='';}set innerHTML(v){this.html=v;for(const m of v.matchAll(/id="([^"]+)"/g))nodes.set(m[1],new Element());}get innerHTML(){return this.html;}addEventListener(n,f){this.listeners[n]=f;}}
 const node=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);};
 let session=o.legacy?{user:{id:'crew-old',email:'old@example.test'}}:null,common=o.common?{user:{id:'portal-user'}}:null;
 let finish;
 const client={from(){const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:o.legacy?{role:'admin'}:null})};return q;},
 auth:{getSession:async()=>({data:{session}}),setSession:async s=>{calls.push('setSession');session={...s,user:{id:'crew-mapped',user_metadata:{}}};return {data:{session}};},signOut:async()=>{session=null;calls.push('crewLogout');return {};}}};
 const portal={getClient:async()=>({auth:{getSession:async()=>({data:{session:common}})}}),
 getCrewAccess:async args=>{calls.push(args);if(o.delay)await new Promise(r=>finish=r);if(o.failure)throw Error('down');return {role:o.role||null,session:o.role?{access_token:'CREW',refresh_token:'REFRESH'}:null,expires_at:new Date(Date.now()+300000).toISOString()};},
 signIn:async()=>calls.push('commonLogin'),signOut:async()=>{common=null;calls.push('commonLogout');},refresh:async()=>{}};
 const context={root:{querySelector:s=>node(s.slice(1))},CSS:{escape:x=>x},sdk:{createClient(url,key,options){calls.push(options);return client;}},window:{location:{hash:'',search:'',origin:'https://preview.test',pathname:'/'},DEADELUSTV_AUTH:portal},URLSearchParams,setTimeout:()=>1,clearTimeout(){},Date,history:{replaceState(){}},latestMonth:()=>'',esc:x=>String(x),clearProtectedImportLogs(){},loadLoggerImportsFromSupabase:async()=>{},renderAdmin(){},syncEditorNavigation(){}};
 vm.createContext(context);vm.runInContext(authCode+'\nwindow.test={refreshAdminAuth,handleTwitchLogin,handleAdminLogout,editorCanWrite,adminCanWrite};',context);
 return {api:context.window.test,node,calls,finish:()=>finish()};
}
(async()=>{
 let t=setup();await t.api.refreshAdminAuth();assert.equal(t.api.editorCanWrite(),false);await t.api.handleTwitchLogin();assert.ok(t.calls.includes('commonLogin'));assert.equal(t.calls[0].auth.detectSessionInUrl,false);assert.equal(t.calls[0].auth.persistSession,false);
 t=setup({common:true,role:'helper'});await t.api.refreshAdminAuth();assert.equal(t.api.editorCanWrite(),true);assert.equal(t.api.adminCanWrite(),false);assert.ok(t.calls.includes('setSession'));assert.equal(t.node('admin-protected').hidden,false);
 await t.api.handleAdminLogout();assert.ok(t.calls.includes('commonLogout'));assert.equal(t.api.editorCanWrite(),false);
 t=setup({common:true,role:'admin'});await t.api.refreshAdminAuth();assert.equal(t.api.adminCanWrite(),true);
 t=setup({common:true});await t.api.refreshAdminAuth();assert.equal(t.api.editorCanWrite(),false);assert.ok(!t.calls.includes('setSession'));
 t=setup({legacy:true});await t.api.refreshAdminAuth();assert.equal(t.api.adminCanWrite(),true);await t.api.handleTwitchLogin(true);assert.match(t.node('admin-auth-status').textContent,/Connecte d’abord Twitch/);
 t=setup({common:true,role:'admin',failure:true});await t.api.refreshAdminAuth();assert.equal(t.api.editorCanWrite(),false);
 t=setup({common:true,role:'admin',delay:true});const pending=t.api.refreshAdminAuth();while(!t.calls.some(x=>x?.action==='session'))await new Promise(r=>setImmediate(r));await t.api.handleAdminLogout();t.finish();await pending;assert.equal(t.api.adminCanWrite(),false);assert.ok(!t.calls.includes('setSession'));
 // Le menu compte vérifie les trois permissions indépendamment.
 const portal=fs.readFileSync('public/assets/site-auth.js','utf8');
 function menuSetup(role){
  const elements=new Map(),node=id=>{if(!elements.has(id))elements.set(id,{hidden:true,textContent:'',listeners:{},setAttribute(){},addEventListener(n,f){this.listeners[n]=f;},contains(){return false;}});return elements.get(id);};
  const session={user:{id:'portal-user'},access_token:'PORTAL',provider_token:'TWITCH'};let login;
  const auth={auth:{onAuthStateChange(){},getSession:async()=>({data:{session}}),getUser:async()=>({data:{user:session.user}}),signInWithOAuth:async p=>{login=p;return {};}}};
  const window={location:{search:'',hash:'#accueil',origin:'https://preview.test',pathname:'/'},supabase:{createClient:()=>auth},dispatchEvent(){}};
  const doc={getElementById:node,querySelector(){return null;},addEventListener(){}};
  vm.runInNewContext(portal,{window,document:doc,URLSearchParams,AbortSignal,Date,fetch:async()=>new Response(JSON.stringify({role})),sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}},setTimeout,CustomEvent:class{}});
  return {api:window.DEADELUSTV_AUTH,node,auth,getLogin:()=>login};
 }
 for(const role of ['helper',null]){
  const m=menuSetup(role);m.api.canManageNews=()=>true;
  m.auth.from=table=>{const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:{enabled:table==='phasmo_news_editors'}})};return q;};
  await m.api.refresh();assert.equal(m.node('site-account-crew-link').hidden,!role);assert.equal(m.node('site-account-news-link').hidden,false);assert.equal(m.node('site-account-journal-link').hidden,true);
  await m.api.signIn();assert.equal(m.getLogin().provider,'twitch');assert.match(m.getLogin().options.scopes,/user:read:moderated_channels/);assert.equal(m.getLogin().options.redirectTo,'https://preview.test/');
 }
 console.log('10 scénarios UI réussis : connexion commune, menu, droits séparés, transition, déconnexion et concurrence.');
})().catch(e=>{console.error(e);process.exitCode=1;});
