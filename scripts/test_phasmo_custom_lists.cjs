const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'../public/modules/phasmophobia');
class Element{
 constructor(tag='div'){this.tagName=tag;this.children=[];this.style={};this.dataset={};this.listeners={};this.attributes={};this.value='';this.textContent='';this.className='';this.classList={add:()=>{},toggle:()=>{}};}
 append(...children){this.children.push(...children);}
 replaceChildren(...children){this.children=[...children];}
 add(option){this.append(option);if(!this.value)this.value=option.value;}
 get options(){return this.children.flatMap(child=>child.tagName==='optgroup'?child.options:[child]);}
 get selectedOptions(){return this.options.filter(option=>option.value===this.value);}
 addEventListener(type,work){this.listeners[type]=work;}
 setAttribute(key,value){this.attributes[key]=value;}
 querySelector(){return null;}
 querySelectorAll(){return [];}
 getContext(){return null;}
}
const nodes=new Map();
const document={querySelector(selector){if(!nodes.has(selector))nodes.set(selector,new Element());return nodes.get(selector);},createElement:tag=>new Element(tag)};
const context={window:{},document,URLSearchParams,Blob,location:{search:''},setTimeout:()=>0,clearTimeout:()=>{},Option:function(label,value){const element=new Element('option');element.textContent=label;element.value=value;return element;}};
vm.createContext(context);
for(const file of ['journal-folders.js','journal-records.js','journal-pagination.js','journal-custom-lists.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
const html=fs.readFileSync(path.join(root,'journal-editor.html'),'utf8');
const main=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(match=>match[1]).find(code=>code.includes('function drawList'));
assert(main,'Script principal absent');new vm.Script(main);
const expose=`
window.test={add,addCustomListItem,renderCustomListEditor,drawList,handleChange,loadSettings,
 state:()=>state,view:()=>view,selected:()=>getSelected(),select:id=>{selected=id;},testMode:()=>{mode='test';}};
renderLayers=()=>{};renderLayerList=()=>{};renderEditor=()=>{};fillGroupEdit=()=>{};fitStage=()=>{};updateInfo=()=>{};
`;
vm.runInContext(main.replace(/\ninit\(\);/,expose),context);
const t=context.window.test,C=context.window.PHASMO_JOURNAL_CUSTOM_LISTS,F=context.window.PHASMO_JOURNAL_FOLDERS,R=context.window.PHASMO_JOURNAL_RECORDS;
const state=t.state(),initialElements=state.elements.length,records=state.records;
const obambo=records.find(row=>row.title==='Obambo'),aswang=records.find(row=>row.title==='Aswang'),map=records.find(row=>row.title==='Bleasdale');
let checks=0;function check(condition,message){assert(condition,message);checks++;}
const lists=[];
for(const [index,record] of [obambo,aswang,map].entries()){
 t.add('list');const list=t.selected();lists.push(list);
 t.addCustomListItem({label:index===0?'Mon Obambo':record.title,action:'detail',entry:record.id});
 check(list.listMode==='custom'&&list.columns===1,'Nouvelle liste personnalisée');
 t.renderCustomListEditor(list);check(nodes.get('#custom-list-items').children.length===1,'Un formulaire par nom');
}
check(state.elements.length===initialElements+3,'Trois calques distincts');
check(lists[0].listItems[0].label==='Mon Obambo'&&lists[1].listItems[0].label==='Aswang','Listes indépendantes');
// Saisie et commandes de chaque ligne du formulaire, sans modifier les fiches.
t.select(lists[0].id);t.renderCustomListEditor(lists[0]);
let row=nodes.get('#custom-list-items').children[0];
const labelInput=row.children[0].children[1];labelInput.value='Mon Obambo';labelInput.listeners.input();
check(lists[0].listItems[0].label==='Mon Obambo','Saisie du libellé');
t.addCustomListItem({label:'Deuxième nom',action:'detail',entry:aswang.id});
row=nodes.get('#custom-list-items').children[0];row.children[2].children[1].listeners.click();
check(lists[0].listItems[0].entry===aswang.id,'Descendre un nom avec son lien');
row=nodes.get('#custom-list-items').children[0];row.children[2].children[2].listeners.click();
check(lists[0].listItems.length===1&&records.includes(aswang),'Retirer le nom préserve la fiche');
row=nodes.get('#custom-list-items').children[0];const destination=row.children[1].children[1];
destination.value='detail:'+obambo.id;destination.listeners.change();
check(lists[0].listItems[0].entry===obambo.id&&lists[0].listItems[0].label==='Mon Obambo','Destination et libellé indépendants');
// Tester les vrais handlers des noms, y compris depuis le sommaire et vers une autre catégorie.
t.testMode();
for(const [index,record] of [obambo,aswang,map].entries()){
 const node=new Element();t.drawList(node,lists[index]);const words=node.children[0];
 check(words.children.length===1,'Un bouton par nom');words.children[0].listeners.click({stopPropagation(){}});
 check(t.view().entryId===record.id&&t.view().group===record.group,'Le nom ouvre sa propre fiche');
}
R.rename(records,'entites',obambo.id,'Nom renommé');check(C.resolve(lists[0].listItems[0],records,state.folders,F.available).entry===obambo.id,'Renommage');
R.move(records,state.folders,obambo.id,'divers');check(C.resolve(lists[0].listItems[0],records,state.folders,F.available).group==='divers','Déplacement');
R.archive(records,'divers',obambo.id);check(C.resolve(lists[0].listItems[0],records,state.folders,F.available)===null,'Archive');
const archived=new Element();t.drawList(archived,lists[0]);check(archived.children[0].children[0].attributes['aria-disabled']==='true','Nom sans cible inactive');
R.archive(records,'divers',obambo.id);
const folder=F.create(state.folders,'cartes',null,'Mes maps');map.folderId=folder.id;
F.archive(state.folders,folder.id);check(C.resolve(lists[2].listItems[0],records,state.folders,F.available)===null,'Parent archivé');F.archive(state.folders,folder.id);
const automatic=state.elements.find(row=>row.kind==='list'&&row.source==='entites');t.select(automatic.id);const before=R.list(records,'entites').length;t.handleChange('listMode','custom');check(automatic.listItems.length===before,'Conversion conserve tous les noms et liens');
check(!state.elements.find(row=>row.kind==='list'&&row.source==='cartes').listItems,'Autres listes automatiques conservées');
for(const target of ['none','home','detail:'+map.id,'folder:'+folder.id,'category:entites'])check(C.value(C.destination(target))===target,'Destination valide');
check(C.normalize([{label:'X',action:'javascript:alert(1)',entry:'x'.repeat(500)}])[0].action==='none','Action non autorisée refusée');
// Import/export du véritable payload V7 : l'historique et le transport média utilisent ce même JSON.
(async()=>{
 const payload=context.window.PHASMO_JOURNAL_REMOTE_BRIDGE.exportPayload();
 vm.runInContext(fs.readFileSync(path.join(root,'journal-storage-media.js'),'utf8'),context);
 const media=context.window.PHASMO_JOURNAL_STORAGE_MEDIA;
 const remote=await media.prepareForSave(payload,{},'00000000-0000-0000-0000-000000000001');
 const local=await media.restoreForEditor(remote,{});
 check(JSON.stringify(local.elements)===JSON.stringify(payload.elements),'Transport des brouillons préserve les liens');
 await t.loadSettings(new Blob([JSON.stringify(local)]),true);
 const restored=t.state().elements.filter(row=>row.kind==='list'&&row.listMode==='custom');
 check(restored.length===4,'Quatre listes personnalisées restaurées');
 check(restored.some(row=>row.listItems.some(item=>item.label==='Mon Obambo'&&item.entry===obambo.id)),'Libellés et identifiants restaurés');
 check(t.state().records.length===records.length,'Aucune fiche supprimée');
 console.log(checks+' contrôles réussis : trois listes, formulaires, vrais clics, catégories, liens stables, archives, conversion et import V7.');
})().catch(error=>{console.error(error);process.exitCode=1;});
