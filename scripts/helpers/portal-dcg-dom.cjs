'use strict';
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const ids={a:'11111111-1111-4111-8111-111111111111',b:'22222222-2222-4222-8222-222222222222',shared:'33333333-3333-4333-8333-333333333333',onlyA:'44444444-4444-4444-8444-444444444444',ownerA:'55555555-5555-4555-8555-555555555555',ownerB:'66666666-6666-4666-8666-666666666666',admin:'77777777-7777-4777-8777-777777777777'};
const rows=[{dcg_id:ids.a,display_name:'Étoile A',broadcaster_id:'11001',avatar_url:'https://example.invalid/a.png',launched:true,registration_open:true},{dcg_id:ids.b,display_name:'Boréal B',broadcaster_id:'22002',avatar_url:null,launched:true,registration_open:true}];
const tick=async()=>{for(let i=0;i<12;i++)await new Promise(r=>setImmediate(r));};
async function until(fn,message='UI condition timed out'){for(let i=0;i<150;i++){if(await fn())return;await new Promise(r=>setTimeout(r,8));}throw Error(message);}
function page(options={}){
 const errors=[],v=new VirtualConsole();v.on('jsdomError',e=>{if(!/navigation|canvas|scrollTo|scrollIntoView/i.test(e.message))errors.push(e);});
 const dom=new JSDOM(read('public/index.html'),{url:'https://deadelustv.pages.dev/'+(options.hash||'#tcg'),runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:v});
 const w=dom.window,d=w.document,calls=[],passes=[],windows=[];let actor=options.user===undefined?ids.shared:options.user,token='eyJhbGciOiJOT05FX0ZJQ1RJT05fT05MWSJ9.'+Buffer.from(JSON.stringify({session_id:ids.admin})).toString('base64url')+'.FICTION',signed=0;
 w.DEADELUSTV_CONFIG={};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.crypto.randomUUID=crypto.randomUUID;
 w.DEADELUSTV_TWITCH={sync(){}};
 w.DEADELUSTV_CREW={render(){},cancel(){}};w.DEADELUSTV_PAVILLON={render(){},cancel(){}};
 w.IntersectionObserver=class{observe(){}unobserve(){}disconnect(){}};
 w.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});w.fetch=async()=>({ok:true,json:async()=>({})});
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
 w.open=(url,name)=>{const child={location:{href:url},closed:false,name,messages:[],postMessage(value,origin){this.messages.push({value,origin});},close(){this.closed=true;}};windows.push(child);return child;};
 const members=()=>actor===ids.shared?rows:actor===ids.onlyA||actor===ids.ownerA?[rows[0]]:actor===ids.ownerB?[rows[1]]:[];
 const owned=()=>members().map(s=>({...s,owner:actor===ids.ownerA&&s.dcg_id===ids.a||actor===ids.ownerB&&s.dcg_id===ids.b,listed:false}));
 const offer={id:'88888888-8888-4888-8888-888888888888',version:'99999999-9999-4999-8999-999999999999',name:'Univers commun',price:5,cards_per_booster:3};
 const commonState=()=>({actor_id:actor,boosters:[],copies:[],trades:[],can_vote:[ids.ownerA,ids.ownerB].includes(actor),ballots:[{id:ids.a,title:'Choix de collection',options:[offer.id,ids.b],labels:{[offer.id]:'Univers commun',[ids.b]:'Autre collection'},choice:null}]});
 const normal=async(name,args)=>{
  if(name==='tcg_portal_directory')return{data:options.directory||rows,error:null};
  if(name==='tcg_portal'){
   let data;if(args.p_action==='memberships')data={items:owned()};
   else if(args.p_action==='live')data={dcg_id:args.p_payload.dcg_id,broadcaster_id:rows.find(s=>s.dcg_id===args.p_payload.dcg_id).broadcaster_id,online:args.p_payload.dcg_id===ids.b};
   else if(args.p_action==='general_xp')data={scope:'general',total:30,level:2};else if(args.p_action==='listing')data={listed:args.p_payload.listed};else data={};
   return{data:{actor_id:actor,data},error:null};
  }
  if(name==='tcg_dcg_rpc'){
   const s=rows.find(s=>s.dcg_id===args.p_dcg_id);let data;
   if(args.p_rpc==='tcg_my_xp')data={scope:'streamer',broadcaster_id:s.broadcaster_id,total:30,level:2};
   else if(args.p_rpc==='tcg_my_boosters')data={available:s.dcg_id===ids.a?7:9,shop:{dust:{scope:'streamer',broadcaster_id:s.broadcaster_id,balance:s.dcg_id===ids.a?200:300}}};
   else if(args.p_rpc==='tcg_my_dust')data={scope:'streamer',broadcaster_id:s.broadcaster_id,balance:s.dcg_id===ids.a?200:300};else throw Error('Unexpected DCG operation');
   return{data:{actor_id:actor,dcg_id:s.dcg_id,data},error:null};
  }
  if(name==='tcg_portal_stats')return{data:{actor_id:actor,stats_since:'2026-11-27T00:00:00Z',boosters_opened:12,booster_hits:2,alkahests_earned:120,activity_days:3,boosters_purchased:4,legendary_cards:5},error:null};
  if(name==='tcg_portal_inventory')return{data:{actor_id:actor,items:options.inventory||[],total:(options.inventory||[]).length,total_copies:(options.inventory||[]).length,next_offset:null},error:null};
  if(name==='tcg_common_catalogue')return{data:[offer],error:null};
  if(name==='tcg_common')return{data:args.p_action==='state'?commonState():{actor_id:actor,recorded:true},error:null};
  if(name==='tcg_common_admin')return{data:null,error:{code:'42501',message:'Central Admin required'}};
  throw Error('Historical or unexpected RPC refused: '+name);
 };
 const raw={auth:{getUser:options.getUser||(async()=>({data:{user:actor?{id:actor,user_metadata:{preferred_username:'Compte fictif'}}:null},error:null})),getSession:async()=>({data:{session:actor?{user:{id:actor},access_token:token,refresh_token:'NEVER_TRANSFER_THIS'}:null},error:null}),signOut:async()=>{actor=null;return{error:null};}},
  rpc:async(name,args={})=>{calls.push({name,args});return options.rpc?options.rpc(name,args,normal):normal(name,args);},
  functions:{invoke:async(name,args)=>{calls.push({name,args});return{data:{actor_id:actor,data:{status:'recorded',step:1,gains:[]}},error:null};}},
  from(){throw Error('Historical table read refused');}};
 w.DEADELUSTV_AUTH={get userId(){return actor;},getClient:async()=>raw,signIn(){signed++;}};
 if(actor)w.localStorage.setItem('sb-eodtxlhnfzyapkyvvxdi-auth-token','FICTITIOUS_SESSION_HINT');
 w.DCGDailyPass={mount:(node,opts)=>passes.push({node,opts}),unmount(){}};
 for(const file of ['config','portal-session','portal-client','dcg-xp','dcg-xp-rewards','dcg-xp-pass','portal-stock','portal-live','profile','common','portal'])w.eval(read('public/modules/dcg/'+file+'.js'));
 w.eval(read('public/assets/app.js'));
 return{w,d,dom,calls,passes,windows,errors,raw,offer,ids,rows,get signed(){return signed;},get actor(){return actor;},setToken(value){token=value;},
  async go(hash){w.location.hash=hash;w.dispatchEvent(new w.HashChangeEvent('hashchange'));await tick();},
  async auth(id){actor=id;if(id)w.localStorage.setItem('sb-eodtxlhnfzyapkyvvxdi-auth-token','FICTITIOUS_SESSION_HINT');else w.localStorage.clear();w.dispatchEvent(new w.CustomEvent('deadelustv:auth-change',{detail:{authenticated:!!id}}));await tick();},
  close(){w.DCGPortalView?.cancel?.();w.DCGCommon?.unmount();w.DCGProfile?.unmount();dom.window.close();}};
}
module.exports={page,read,ids,rows,tick,until};
