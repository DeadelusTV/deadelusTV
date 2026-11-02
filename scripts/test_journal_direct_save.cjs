'use strict';
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const source=fs.readFileSync('public/modules/phasmophobia/journal-preview-sync.js','utf8');
const copy=value=>JSON.parse(JSON.stringify(value));
const documentV7=label=>({version:7,elements:[{id:'text-1',kind:'text',text:label}],fonts:[],records:[],folders:[]});

function editor(options={}){
 const local=documentV7('Travail local non sauvegardé');
 const server={revision:options.empty?0:15,payload:options.empty?null:documentV7('Version distante')};
 const history=server.payload?[copy(server.payload)]:[];
 const state={local,server,history,queries:[],confirmations:[],imports:0,prepared:0,writes:0,accept:true};
 const nodes=new Map();
 const node=id=>{
  if(!nodes.has(id))nodes.set(id,{textContent:'',disabled:false,events:{},addEventListener(name,handler){this.events[name]=handler;}});
  return nodes.get(id);
 };
 function query(table){
  let action='select',columns='',values,filters={};
  async function execute(){
   state.queries.push({table,action,columns,filters:copy(filters)});
   if(table==='phasmo_journal_admins'||table==='phasmo_journal_editors')
    return {data:{enabled:!options.forbidden},error:null};
   assert.equal(table,'phasmo_journal_preview_drafts');
   assert.equal(filters.stage,'preview');
   if(action==='select'){
    if(state.readError)return {data:null,error:{message:'Réseau indisponible'}};
    return {data:server.payload?{revision:server.revision,...(columns.includes('payload')?{payload:copy(server.payload)}:{})}:null,error:null};
   }
   if(state.writeError)return {data:null,error:{message:'Écriture refusée',code:'42501'}};
   if(action==='insert'&&server.payload)return {data:null,error:{message:'duplicate key',code:'23505'}};
   if(action==='update'&&filters.revision!==server.revision)return {data:null,error:null};
   state.writes++;
   server.payload=copy(values.payload);server.revision=values.revision;history.push(copy(values.payload));
   return {data:{revision:server.revision},error:null};
  }
  const builder={
   select(value){columns=value;return this;},
   eq(key,value){filters[key]=value;return this;},
   update(value){action='update';values=value;return this;},
   insert(value){action='insert';values=value;filters.stage=value.stage;return this;},
   maybeSingle:execute,
   then(resolve,reject){return execute().then(resolve,reject);}
  };
  return builder;
 }
 const client={auth:{getUser:async()=>({data:{user:options.signedOut?null:{id:'test-editor'}},error:null})},from:query};
 const bridge={exportPayload:()=>copy(state.local),importPayload:async value=>{state.imports++;state.local=copy(value);}};
 const context={
  document:{getElementById:node},location:{search:options.viewer?'?viewer=1':''},URLSearchParams,TextEncoder,
  confirm:message=>{state.confirmations.push(message);return state.accept;},
  window:{DEADELUSTV_AUTH:{getClient:async()=>client},PHASMO_JOURNAL_REMOTE_BRIDGE:bridge,
   PHASMO_JOURNAL_STORAGE_MEDIA:{
    prepareForSave:async payload=>{
     state.prepared++;if(state.onPrepare)await state.onPrepare();
     if(state.mediaError)throw Error('Média indisponible');
     return copy(payload);
    },restoreForEditor:async payload=>copy(payload)
   }
  }
 };
 vm.runInNewContext(source,context);
 return Object.assign(state,{node,api:context.window.PHASMO_JOURNAL_REMOTE_SYNC,
  async click(id='journal-remote-save'){await node(id).events.click();},
  status:()=>node('journal-remote-status').textContent
 });
}

(async()=>{
 let checks=0;
 const test=async(label,work)=>{await work();checks++;console.log('OK '+label);};
 await test('enregistrer sans aucun chargement conserve le travail affiché et la version précédente',async()=>{
  const e=editor(),before=copy(e.local);await e.click();
  assert.equal(e.writes,1);assert.equal(e.server.revision,16);assert.deepEqual(e.server.payload,before);
  assert.equal(e.imports,0);assert.deepEqual(e.local,before);assert.equal(e.history.length,2);
  assert.equal(e.history[0].elements[0].text,'Version distante');
  assert.match(e.status(),/enregistré.*16/);
  assert.deepEqual(e.queries.filter(q=>q.table.endsWith('_drafts')&&q.action==='select').map(q=>q.columns),['revision']);
 });
 await test('créer le premier brouillon directement',async()=>{
  const e=editor({empty:true});await e.click();assert.equal(e.server.revision,1);assert.equal(e.writes,1);assert.equal(e.imports,0);
 });
 await test('annuler ne prépare aucun média et ne modifie ni le carnet ni le serveur',async()=>{
  const e=editor(),before=copy(e.local);e.accept=false;await e.click();
  assert.equal(e.prepared,0);assert.equal(e.writes,0);assert.deepEqual(e.local,before);assert.match(e.status(),/annulé/);
 });
 await test('un échec de lecture conserve les modifications et permet de réessayer',async()=>{
  const e=editor();e.readError=true;await e.click();assert.equal(e.prepared,0);assert.equal(e.writes,0);
  assert.match(e.status(),/Impossible de vérifier/);e.readError=false;await e.click();assert.equal(e.writes,1);
 });
 await test('un échec média ne touche pas au brouillon et ne charge aucun contenu',async()=>{
  const e=editor(),before=copy(e.local);e.mediaError=true;await e.click();
  assert.equal(e.writes,0);assert.equal(e.imports,0);assert.deepEqual(e.local,before);
  e.mediaError=false;await e.click();assert.equal(e.writes,1);
 });
 await test('concurrence pendant un transfert : refus atomique puis reprise sans chargement',async()=>{
  const e=editor(),before=copy(e.local);e.onPrepare=()=>{e.server.revision++;e.server.payload=documentV7('Autre onglet');};
  await e.click();assert.equal(e.writes,0);assert.match(e.status(),/changé pendant/);assert.equal(e.imports,0);assert.deepEqual(e.local,before);
  e.onPrepare=null;await e.click();assert.equal(e.server.revision,17);assert.equal(e.writes,1);
  assert.match(e.confirmations[1],/a changé/);assert.equal(e.imports,0);
 });
 await test('concurrence à la première création : reprise sans écraser silencieusement',async()=>{
  const e=editor({empty:true});e.onPrepare=()=>{e.server.revision=1;e.server.payload=documentV7('Créé ailleurs');};
  await e.click();assert.equal(e.writes,0);assert.match(e.status(),/créé pendant/);
  e.onPrepare=null;await e.click();assert.equal(e.writes,1);assert.equal(e.server.revision,2);assert.match(e.confirmations[1],/a changé/);
 });
 await test('une sauvegarde distante plus récente reste soumise à confirmation',async()=>{
  const e=editor();await e.click();e.server.revision++;e.accept=false;await e.click();
  assert.equal(e.writes,1);assert.match(e.confirmations[1],/anciennes versions.*historique/);
 });
 await test('les refus de permission restent bloquants et conservent le contenu',async()=>{
  for(const options of [{forbidden:true},{signedOut:true}]){
   const e=editor(options);await e.click();assert.equal(e.writes,0);assert.equal(e.prepared,0);assert.equal(e.confirmations.length,0);
  }
  const e=editor();e.writeError=true;await e.click();assert.equal(e.writes,0);assert.match(e.status(),/refusé/);assert.equal(e.imports,0);
 });
 await test('une révision invalide ne peut pas provoquer une sauvegarde',async()=>{
  const e=editor();e.server.revision='15';await e.click();assert.equal(e.writes,0);assert.equal(e.prepared,0);assert.match(e.status(),/invalide/);
 });
 await test('la limite JSON bloque avant toute écriture',async()=>{
  const e=editor();e.local.elements[0].text='x'.repeat(7500001);await e.click();assert.equal(e.writes,0);assert.match(e.status(),/7,5 Mo/);
 });
 await test('le chargement reste volontaire et sauvegarder après réinitialisation est possible',async()=>{
  const e=editor();await e.click('journal-remote-load');assert.equal(e.imports,1);assert.deepEqual(e.local,e.server.payload);
  e.local=documentV7('Nouveau travail après réinitialisation');e.api.invalidateLocalRevision();await e.click();assert.equal(e.writes,1);assert.equal(e.imports,1);
 });
 await test('le mode lecteur ne connecte aucun contrôle de sauvegarde',async()=>{
  const e=editor({viewer:true});assert.equal(e.node('journal-remote-save').events.click,undefined);assert.equal(e.api,undefined);
 });
 console.log(checks+' scénarios validés. Aucun accès réseau ni écriture sur un vrai brouillon.');
})().catch(error=>{console.error(error);process.exitCode=1;});
