'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'../public/modules/phasmophobia');
const copy=value=>JSON.parse(JSON.stringify(value));
class Element{
 constructor(tag='div'){this.tagName=tag;this.children=[];this.style={};this.dataset={};this.value='';this.textContent='';this.open=false;this.listeners={};this.classList={add(){},toggle(){}};}
 append(...nodes){this.children.push(...nodes);}replaceChildren(...nodes){this.children=[...nodes];}
 add(node){this.append(node);if(!this.value)this.value=node.value;}
 addEventListener(key,work){this.listeners[key]=work;}setAttribute(){}focus(){}select(){}
 showModal(){this.open=true;}close(){this.open=false;this.listeners.close?.();}
}
const nodes=new Map(),node=selector=>{if(!nodes.has(selector))nodes.set(selector,new Element());return nodes.get(selector);};
const context={window:{},document:{querySelector:node,createElement:tag=>new Element(tag)},location:{search:''},URLSearchParams,Blob,setTimeout:()=>0,clearTimeout(){},Option:function(label,value){const n=new Element('option');n.textContent=label;n.value=value;return n;}};
vm.createContext(context);
for(const file of ['journal-records.js','journal-folders.js','journal-record-duplicate.js','journal-pagination.js','journal-custom-lists.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
const R=context.window.PHASMO_JOURNAL_RECORDS,F=context.window.PHASMO_JOURNAL_FOLDERS,D=context.window.PHASMO_JOURNAL_RECORD_DUPLICATE;
let count=0,layerSerial=1000;
function check(value,message){assert(value,message);count++;}
function fixture(group='entites'){
 const records=[],folders=[],folder=F.create(folders,group,null,'Mes modèles');
 const record=R.create(records,group,group==='cartes'?'Bleasdale':'Aswang',folder.id,folders);
 const other=R.create(records,group,'Autre fiche',null,folders),page='entry:'+record.id;
 const elements=[
  {id:'a',page,kind:'heading',text:record.title,x:11,y:12,w:35,h:8,size:72,font:'Caveat',locked:true},
  {id:'b',page,kind:'text',text:'Comportement de '+record.title,x:53,y:21,w:40,h:60},
  {id:'c',page,kind:'image',image:'data:image/webp;base64,AAAA',opacity:25,blend:'multiply',z:1,hidden:true},
  {id:'d',page,kind:'text',action:'detail',entry:record.id,target:group},
  {id:'e',page,kind:'list',listItems:[{label:record.title,action:'detail',entry:record.id},{label:'Autre lien',action:'detail',entry:other.id}]},
  {id:'f',page:'*',kind:'tab',text:'Onglet global'},
  {id:'g',page:'detail:'+group,kind:'heading',text:'{{nom}}'}
 ];
 return {records,folders,elements,record,other};
}
function duplicate(f,title='Nouvelle fiche'){return D.duplicate({...f,recordId:f.record.id,title,nextLayerId:()=> 'element-'+layerSerial++});}
for(const group of R.categories){
 const f=fixture(group),original=copy(f.record),layersBefore=copy(f.elements),record=duplicate(f);
 const layers=f.elements.filter(e=>e.page==='entry:'+record.id);
 check(record.id!==original.id&&record.group===group&&record.folderId===original.folderId&&record.status==='draft','Copie indépendante dans la même catégorie et rubrique : '+group);
 check(layers.length===5&&f.elements.filter(e=>e.page==='*').length===1,'Toute la double page, sans doubler les calques globaux');
 check(layers[0].text===record.title&&layers[0].w===35&&layers[0].locked,'Titre et mise en page');
 check(layers[1].text==='Comportement de '+original.title&&layers[1].x===53,'Paragraphes du modèle conservés');
 check(layers[2].image===layersBefore[2].image&&layers[2].opacity===25&&layers[2].hidden,'Images et filigranes conservés');
 check(layers[3].entry===record.id&&layers[4].listItems[0].entry===record.id,'Les liens vers soi-même visent la copie');
 check(layers[4].listItems[1].entry===f.other.id,'Les liens vers les autres fiches sont conservés');
 layers[4].listItems[0].label='Modifié';layers[1].text='Texte de la copie';
 assert.deepEqual(copy(f.record),original);assert.deepEqual(copy(f.elements.slice(0,7)),layersBefore);
 check(new Set(f.elements.map(e=>e.id)).size===f.elements.length,'Identifiants de calques uniques, original intact');
}
{
 const f=fixture();f.elements=f.elements.filter(e=>!e.page.startsWith('entry:'));
 const record=duplicate(f),layers=f.elements.filter(e=>e.page==='entry:'+record.id);
 check(layers.length===1&&layers[0].text==='{{nom}}','Fiche sans calques propres : recopier le modèle de sa catégorie');
}
{
 const f=fixture();R.create(f.records,'entites','Aswang (copie)',null,f.folders);
 check(D.suggestedTitle(f.records,f.record)==='Aswang (copie 2)','Nom proposé disponible');
 f.record.title='A'.repeat(100);check(D.suggestedTitle(f.records,f.record).length===100,'Nom proposé limité à 100 caractères');
}
for(const invalid of ['','Aswang','aswang','x'.repeat(101)]){
 const f=fixture(),before=copy(f);assert.throws(()=>duplicate(f,invalid));assert.deepEqual(copy(f),before);count++;
}
for(const scenario of ['archive','parentArchive','recordLimit','layerLimit','idCollision','empty']){
 const f=fixture();
 if(scenario==='archive')f.record.status='archived';
 if(scenario==='parentArchive')f.folders[0].status='archived';
 if(scenario==='recordLimit')while(f.records.length<5000)f.records.push({id:'extra-'+f.records.length,group:'cartes',title:'X'+f.records.length,status:'draft'});
 if(scenario==='layerLimit')while(f.elements.length<5000)f.elements.push({id:'extra-'+f.elements.length,page:'*'});
 if(scenario==='empty')f.elements=[];
 const before=copy(f);
 assert.throws(()=>D.duplicate({...f,recordId:f.record.id,title:'Copie',nextLayerId:()=>scenario==='idCollision'?'a':'element-'+layerSerial++}));
 assert.deepEqual(copy(f),before);count++;
}
const html=fs.readFileSync(path.join(root,'journal-editor.html'),'utf8');
const script=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('function manageRecord'));
new vm.Script(script);
const expose=`
window.test={manageRecord,confirmRecordDuplicate,loadSettings,state:()=>state,view:()=>view};
renderLayers=()=>{};renderLayerList=()=>{};renderEditor=()=>{};renderRecordManager=id=>{if(id)$('#record-select').value=id;};renderFolderManager=()=>{};fillGroupEdit=()=>{};fitStage=()=>{};updateInfo=()=>{};
`;
vm.runInContext(script.replace(/\ninit\(\);/,expose),context);
const t=context.window.test,s=t.state(),source=R.create(s.records,'entites','Aswang',null,s.folders);
node('#group-edit').value='entites';node('#record-select').value=source.id;
t.manageRecord('duplicate');check(node('#duplicate-record-dialog').open&&s.records.length===1,'Ouvrir la fenêtre ne crée aucune fiche');
node('#duplicate-record-name').value='Aswang';t.confirmRecordDuplicate();check(s.records.length===1&&!!node('#duplicate-record-error').textContent,'Le nom existant laisse corriger la saisie');
node('#duplicate-record-name').value='Obambo';t.confirmRecordDuplicate();
const clone=s.records.find(r=>r.title==='Obambo');
check(!!clone&&t.view().entryId===clone.id&&!node('#duplicate-record-dialog').open,'Créer la copie ouvre la nouvelle fiche');
check(s.elements.filter(e=>e.page==='entry:'+clone.id).length===2,'Le vrai gestionnaire reprend les deux calques du modèle');
(async()=>{
 const payload=context.window.PHASMO_JOURNAL_REMOTE_BRIDGE.exportPayload();
 await t.loadSettings(new Blob([JSON.stringify(payload)]),true);
 const restored=t.state();
 check(restored.records.some(r=>r.id===source.id)&&restored.records.some(r=>r.id===clone.id),'Original et copie survivent à un export/import V7');
 check(restored.elements.some(e=>e.page==='entry:'+clone.id),'Calques de la copie conservés après rechargement');
 console.log(count+' contrôles validés : cinq catégories, double page, médias, indépendance, liens, limites, vrai dialogue et import/export V7.');
})().catch(error=>{console.error(error);process.exitCode=1;});
