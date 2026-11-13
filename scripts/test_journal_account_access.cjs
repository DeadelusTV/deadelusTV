'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {accountElement}=require('./helpers/account-dom.cjs');
const source=fs.readFileSync('public/assets/site-auth.js','utf8');
async function scenario(options){
 const nodes=new Map(),seen=[];
 const node=id=>{
  if(!nodes.has(id))nodes.set(id,accountElement({hidden:true}));
  return nodes.get(id);
 };
 const user={id:'test-user',user_metadata:options.metadata||{}};
 const session={user,access_token:'test-session',provider_token:'test-twitch-token'};
 const client={auth:{onAuthStateChange(){},getSession:async()=>({data:{session}}),getUser:async()=>({data:{user:options.anonymous?null:user}})},
  from(table){
   seen.push(table);
   const enabled=table==='phasmo_journal_admins'?options.admin:table==='phasmo_journal_editors'?options.editor:table==='phasmo_news_editors'?options.news:false;
   const q={select(){return q;},eq(key,value){assert.equal(key,'user_id');assert.equal(value,user.id);return q;},maybeSingle:async()=>({data:enabled===undefined?null:{enabled},error:table===options.errorTable?{message:'lecture refusée'}:null})};
   return q;
  }
 };
 const window={location:{search:'',hash:'#accueil',origin:'https://www.deadelustv.com',pathname:'/'},supabase:{createClient:()=>client},dispatchEvent(){}};
 vm.runInNewContext(source,{window,document:{createElement:()=>accountElement(),getElementById:node,querySelector:()=>null,addEventListener(){}},URL,URLSearchParams,AbortSignal,Date,fetch:async()=>new Response(JSON.stringify({role:options.crew||null})),sessionStorage:{getItem:()=>null,setItem(){},removeItem(){}},setTimeout,CustomEvent:class{}});
 await window.DEADELUSTV_AUTH.refresh();
 assert.equal(node('site-account-journal-link').hidden,!options.allowed);
 if(!options.anonymous){assert.ok(seen.includes('phasmo_journal_admins'));assert.ok(seen.includes('phasmo_journal_editors'));}
 else assert.equal(seen.length,0);
}
(async()=>{
 const cases=[
  {label:'admin du carnet',admin:true,allowed:true},
  {label:'éditrice du carnet',editor:true,allowed:true},
  {label:'éditrice désactivée',editor:false,allowed:false},
  {label:'modo/helper sans droit journal',crew:'helper',allowed:false},
  {label:'admin Crew sans droit journal',crew:'admin',allowed:false},
  {label:'rédacteur News sans droit journal',news:true,allowed:false},
  {label:'métadonnées utilisateur non fiables',metadata:{role:'admin',is_moderator:true,journal_admin:true},allowed:false},
  {label:'lecture des droits refusée',admin:true,errorTable:'phasmo_journal_editors',allowed:false},
  {label:'visiteur déconnecté',anonymous:true,allowed:false}
 ];
 for(const value of cases){await scenario(value);console.log('OK '+value.label);}
 console.log(cases.length+' scénarios de menu validés, sans appel réseau réel.');
})().catch(error=>{console.error(error);process.exitCode=1;});
