'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'../public/modules/phasmophobia'),copy=value=>JSON.parse(JSON.stringify(value));
class Element{
 constructor(tag='div'){this.tagName=tag;this.children=[];this.style={};this.dataset={};this.value='';this.textContent='';this.checked=false;this.open=false;this.listeners={};this.classList={add(){},toggle(){}};}
 append(...nodes){this.children.push(...nodes);}replaceChildren(...nodes){this.children=[...nodes];}
 add(node){this.append(node);if(!this.value)this.value=node.value;}
 addEventListener(key,work){this.listeners[key]=work;}setAttribute(){}focus(){}select(){}
 showModal(){this.open=true;}close(){this.open=false;this.listeners.close?.();}
 querySelectorAll(){return this.children.flatMap(child=>[...(child.tagName==='input'&&child.type==='checkbox'?[child]:[]),...child.querySelectorAll()]);}
}
const nodes=new Map(),node=key=>{if(!nodes.has(key))nodes.set(key,new Element());return nodes.get(key);};
const context={window:{},document:{querySelector:node,createElement:tag=>new Element(tag)},location:{search:''},URLSearchParams,Blob,setTimeout:()=>0,clearTimeout(){},Option:function(label,value){const n=new Element('option');n.textContent=label;n.value=value;return n;}};
vm.createContext(context);
for(const file of ['journal-records.js','journal-folders.js','journal-record-duplicate.js','journal-pagination.js','journal-custom-lists.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
const R=context.window.PHASMO_JOURNAL_RECORDS,F=context.window.PHASMO_JOURNAL_FOLDERS,D=context.window.PHASMO_JOURNAL_RECORD_DUPLICATE;
let count=0,serial=10000;
function check(value,message){assert(value,message);count++;}
function fixture(group='entites'){
 const records=[],folders=[],folder=F.create(folders,group,null,'Fiches classées');
 const source=R.create(records,group,'Modèle',null,folders),a=R.create(records,group,'Obake',folder.id,folders),b=R.create(records,group,'Banshee',null,folders),other=R.create(records,group,'Autre fiche',null,folders);
 const elements=[
  {id:'s1',page:'entry:'+source.id,kind:'heading',text:'MODÈLE',x:11,y:12,w:35,h:8,size:72,locked:true},
  {id:'s2',page:'entry:'+source.id,kind:'text',text:'Texte du modèle',x:55,y:25,w:35,h:45,font:'Kalam',bold:true},
  {id:'s3',page:'entry:'+source.id,kind:'image',image:'data:image/webp;base64,AAAA',opacity:26,blend:'multiply',zoomable:false},
  {id:'s4',page:'entry:'+source.id,kind:'list',listItems:[{label:'Modèle',action:'detail',entry:source.id},{label:'Autre',action:'detail',entry:other.id}]},
  {id:'s5',page:'entry:'+source.id,kind:'text',action:'detail',entry:source.id,target:group},
  {id:'s6',page:'entry:'+source.id,kind:'text',text:'{{nom}}'},
  {id:'a1',page:'entry:'+a.id,kind:'text',text:'Ancien contenu Obake'},
  {id:'a2',page:'entry:'+a.id,kind:'image',image:'data:image/png;base64,BBBB'},
  {id:'b1',page:'entry:'+b.id,kind:'text',text:'Ancien contenu Banshee'},
  {id:'o1',page:'entry:'+other.id,kind:'text',text:'Ne pas modifier'},
  {id:'global',page:'*',kind:'tab',text:'ENTITÉS'},
  {id:'incoming',page:'sommaire',kind:'list',listItems:[{label:'Vers Obake',action:'detail',entry:a.id}]},
  {id:'default',page:'detail:'+group,kind:'heading',text:'{{nom}}'}
 ];
 return {records,folders,source,a,b,other,elements};
}
function apply(f,ids=[f.a.id]){return D.applyTemplate({...f,sourceId:f.source.id,targetIds:ids,nextLayerId:()=> 'element-'+serial++});}
for(const group of R.categories){
 const f=fixture(group),before=copy(f),targetObject=f.a;
 apply(f);const layers=f.elements.filter(e=>e.page==='entry:'+f.a.id);
 assert.deepEqual(copy(f.records),before.records);check(f.a===targetObject,'Même identité, nom, dossier, classement et statut : '+group);
 check(layers.length===6&&!f.elements.some(e=>e.id==='a1'||e.id==='a2'),'Remplacer uniquement les calques de destination');
 check(layers[0].text==='Obake'&&layers[0].locked&&layers[1].x===55&&layers[1].bold,'Titre adapté et styles conservés');
 check(layers[2].image===before.elements[2].image&&layers[2].zoomable===false&&layers[2].opacity===26,'Images et réglages conservés');
 check(layers[3].listItems[0].entry===f.a.id&&layers[4].entry===f.a.id,'Liens du modèle vers soi-même réaffectés à la destination');
 check(layers[3].listItems[1].entry===f.other.id&&layers[5].text==='{{nom}}','Autres destinations et variables conservées');
 check(JSON.stringify(f.elements.find(e=>e.id==='incoming'))===JSON.stringify(before.elements.find(e=>e.id==='incoming')),'Les liens entrants vers la fiche existante ne changent pas');
 check(f.elements.filter(e=>e.page==='*').length===1&&f.elements.find(e=>e.id==='o1').text==='Ne pas modifier','Navigation globale et fiches non choisies intactes');
 assert.deepEqual(copy(f.elements.filter(e=>e.page==='entry:'+f.source.id)),before.elements.filter(e=>e.page==='entry:'+f.source.id));count++;
}
{
 const f=fixture(),before=copy(f.records);apply(f,[f.a.id,f.b.id,f.a.id]);
 const a=f.elements.filter(e=>e.page==='entry:'+f.a.id),b=f.elements.filter(e=>e.page==='entry:'+f.b.id);
 check(a.length===6&&b.length===6,'Application groupée, identifiants de destination dédupliqués');
 check(a[0].text==='Obake'&&b[0].text==='Banshee','Chaque fiche garde son propre titre');
 a[3].listItems[0].label='Copie modifiée';a[1].text='Nouveau texte';
 check(b[3].listItems[0].label==='Banshee'&&b[1].text==='Texte du modèle','Copies indépendantes entre elles');
 assert.deepEqual(copy(f.records),before);count++;
 const length=f.elements.length;apply(f,[f.a.id,f.b.id]);check(f.elements.length===length,'Réappliquer remplace les anciens calques sans accumulation');
 check(new Set(f.elements.map(e=>e.id)).size===f.elements.length,'Identifiants de calques uniques');
}
{
 const f=fixture();f.elements=f.elements.filter(e=>!e.page.startsWith('entry:'+f.source.id));apply(f);
 check(f.elements.filter(e=>e.page==='entry:'+f.a.id).length===1,'Un modèle de catégorie peut servir de source');
}
for(const invalid of ['empty','self','missing','crossGroup','archived','archivedFolder','sourceArchived','sourceFolder','noSource','noLayers','limit','collision']){
 const f=fixture();let ids=[f.a.id,f.b.id],sourceId=f.source.id,nextLayerId=()=> 'element-'+serial++;
 if(invalid==='empty')ids=[];
 if(invalid==='self')ids=[f.source.id];
 if(invalid==='missing')ids.push('fiche-inexistante');
 if(invalid==='crossGroup')f.b.group='cartes';
 if(invalid==='archived')f.b.status='archived';
 if(invalid==='archivedFolder')f.folders[0].status='archived';
 if(invalid==='sourceArchived')f.source.status='archived';
 if(invalid==='sourceFolder'){f.source.folderId=f.folders[0].id;f.folders[0].status='archived';}
 if(invalid==='noSource')sourceId='fiche-inexistante';
 if(invalid==='noLayers')f.elements=[];
 if(invalid==='limit')while(f.elements.length<5000)f.elements.push({id:'extra-'+f.elements.length,page:'*'});
 if(invalid==='collision')nextLayerId=()=> 's1';
 const before=copy(f);assert.throws(()=>D.applyTemplate({...f,sourceId,targetIds:ids,nextLayerId}));assert.deepEqual(copy(f),before);count++;
}
{
 const f=fixture();while(f.elements.length<5000)f.elements.push({id:'old-'+f.elements.length,page:'entry:'+f.a.id});
 apply(f);check(f.elements.length<5000,'La limite tient compte des calques remplacés');
}
const html=fs.readFileSync(path.join(root,'journal-editor.html'),'utf8');
const script=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(code=>code.includes('function manageRecord'));
new vm.Script(script);
const expose=`
window.test={manageRecord,confirmRecordTemplate,templateTargetInputs,updateTemplateSummary,loadSettings,ensureRecordPage,state:()=>state,view:()=>view};
renderLayers=()=>{};renderLayerList=()=>{};renderEditor=()=>{};renderRecordManager=id=>{if(id)$('#record-select').value=id;};renderFolderManager=()=>{};fillGroupEdit=()=>{};fitStage=()=>{};updateInfo=()=>{};
`;
vm.runInContext(script.replace(/\ninit\(\);/,expose),context);
const t=context.window.test,s=t.state(),source=R.create(s.records,'entites','Aswang',null,s.folders),obake=R.create(s.records,'entites','Obake',null,s.folders),banshee=R.create(s.records,'entites','Banshee',null,s.folders);
t.ensureRecordPage(source);t.ensureRecordPage(obake);t.ensureRecordPage(banshee);
node('#group-edit').value='entites';node('#record-select').value=source.id;
const before=copy(s);t.manageRecord('template');
check(node('#template-record-dialog').open&&t.templateTargetInputs().length===2,'Le vrai dialogue exclut la source');
assert.deepEqual(copy(s),before);check(node('#record-template-confirm').disabled,'Aucun remplacement à l’ouverture du dialogue');
t.confirmRecordTemplate();assert.deepEqual(copy(s),before);check(!!node('#template-record-error').textContent,'Aucune application sans destination choisie');
for(const input of t.templateTargetInputs())input.checked=true;t.updateTemplateSummary();
check(node('#record-template-confirm').textContent==='Appliquer à 2 fiches'&&!node('#record-template-confirm').disabled,'Confirmation groupée explicite');
t.confirmRecordTemplate();
check(!node('#template-record-dialog').open&&t.view().entryId===obake.id,'Application puis ouverture de la première fiche existante');
assert.deepEqual(copy(s.records),before.records);count++;
(async()=>{
 const payload=context.window.PHASMO_JOURNAL_REMOTE_BRIDGE.exportPayload();await t.loadSettings(new Blob([JSON.stringify(payload)]),true);
 const restored=t.state();
 check(restored.records.some(r=>r.id===obake.id&&r.title==='Obake')&&restored.records.some(r=>r.id===banshee.id&&r.title==='Banshee'),'Identités des destinations préservées après import/export V7');
 check(restored.elements.filter(e=>e.page==='entry:'+obake.id).length===2&&restored.elements.filter(e=>e.page==='entry:'+banshee.id).length===2,'Nouvelles pages conservées après rechargement');
 console.log(count+' contrôles validés : cinq catégories, identités, liens entrants, copie groupée, indépendance, erreurs atomiques, limites et vrai dialogue.');
})().catch(error=>{console.error(error);process.exitCode=1;});
