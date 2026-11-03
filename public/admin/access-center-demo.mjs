import {
  STORAGE_KEY, seedDemo, loadDemo, slugify, counts,
  addCategory, addSection, addPermission, addPerson, setGrant
} from './access-center-demo-model.mjs';

const $=id=>document.getElementById(id);
const element=(tag,text,cls)=>{
  const result=document.createElement(tag);
  if(text!==undefined) result.textContent=String(text);
  if(cls)result.className=cls;
  return result;
};
const option=(text,value)=>{
  const result=element('option',text);result.value=value;return result;
};
let state;
try {state=loadDemo(window.localStorage.getItem(STORAGE_KEY));}
catch {state=seedDemo();}
let previewOpen=false;
let codeEdited=false;

function persist() {
  try{window.localStorage.setItem(STORAGE_KEY,JSON.stringify(state));return true;}
  catch{return false;}
}
function notice(text,error=false) {
  $('notice').textContent=text;
  $('notice').classList.toggle('error',error);
}
function change(transform,message) {
  try{
    const next=transform();
    state=next;
    const kept=persist();
    render();
    notice(message+(kept?'':' Attention : ce navigateur ne conserve pas les changements après F5.'));
    return true;
  }catch(error){
    notice(error?.message||'Action de démonstration impossible.',true);
    return false;
  }
}
function renderStats(){
  const info=counts(state);
  for(const key of Object.keys(info)){
    const target=$('stat-'+key);
    if(target)target.textContent=String(info[key]);
  }
}
function renderRights(){
  const container=$('rights-tables');
  container.replaceChildren();
  const filter=$('filter').value.trim().toLocaleLowerCase('fr');
  const people=state.people.filter(person=>person.name.toLocaleLowerCase('fr').includes(filter));
  if(!state.categories.length){
    container.append(element('p','Ajoute une catégorie dans « Configuration des droits ».','empty'));
    return;
  }
  for(const category of state.categories) {
    const perms=category.sections.flatMap(section=>
      section.permissions.map(permission=>({
        code:permission.code,label:section.label+' · '+permission.label
      })));
    const article=element('article',undefined,'module');
    article.append(element('h2',category.label));
    if(!perms.length){
      article.append(element('p','Aucun droit défini. Ajoute une permission dans la configuration.','empty'));
      container.append(article);continue;
    }
    if(!people.length){
      article.append(element('p','Aucun compte fictif ne correspond à cette recherche.','empty'));
      container.append(article);continue;
    }
    const scroll=element('div',undefined,'table-scroll');
    const table=element('table'),head=element('thead'),header=element('tr');
    const h=element('th','Compte fictif');h.scope='col';header.append(h);
    for(const perm of perms){
      const th=element('th',perm.label);th.scope='col';header.append(th);
    }
    head.append(header);table.append(head);
    const body=element('tbody');
    for(const person of people){
      const row=element('tr'),name=element('th');
      name.scope='row';
      name.append(element('span',person.name,'account-name'));
      name.append(element('span',person.isModerator?'Modérateur fictif':'Non-modérateur fictif','person-note'));
      row.append(name);
      for(const perm of perms){
        const cell=element('td'),input=element('input');
        input.type='checkbox';
        input.checked=person.rights.includes(perm.code);
        input.setAttribute('aria-label',person.name+' : '+perm.label);
        input.addEventListener('change',()=>{
          change(()=>setGrant(state,person.id,perm.code,input.checked),
            'Case mise à jour dans la maquette. Aucun droit réel modifié.');
        });
        cell.append(input);row.append(cell);
      }
      body.append(row);
    }
    table.append(body);scroll.append(table);article.append(scroll);container.append(article);
  }
}
function renderCatalog(){
  const holder=$('catalog-tree');holder.replaceChildren();
  const catSelect=$('section-category'),permSelect=$('permission-section');
  const prevCat=catSelect.value,prevSection=permSelect.value;
  catSelect.replaceChildren();permSelect.replaceChildren();
  for(const category of state.categories){
    const item=element('article',undefined,'tree-card');
    item.append(element('h2',category.label));
    catSelect.append(option(category.label,category.id));
    if(!category.sections.length)item.append(element('p','Aucune sous-catégorie pour le moment.','muted'));
    for(const section of category.sections){
      const line=element('div',undefined,'tree-item');
      line.append(element('strong',section.label));
      if(!section.permissions.length)line.append(element('p','Aucune permission.', 'muted'));
      for(const permission of section.permissions){
        const right=element('div',undefined,'tree-permission');
        right.append(element('span',permission.label+' '));
        right.append(element('span','('+permission.code+')','code'));
        line.append(right);
      }
      item.append(line);
      permSelect.append(option(category.label+' / '+section.label,category.id+'|'+section.id));
    }
    holder.append(item);
  }
  if(Array.from(catSelect.options).some(entry=>entry.value===prevCat))catSelect.value=prevCat;
  if(Array.from(permSelect.options).some(entry=>entry.value===prevSection))permSelect.value=prevSection;
  $('add-section').querySelector('[type=submit]').disabled=!catSelect.options.length;
  $('add-permission').querySelector('[type=submit]').disabled=!permSelect.options.length;
}
function renderPreview(){
  const target=$('mock-results');
  target.replaceChildren();
  target.hidden=!previewOpen;
  $('mock-preview').textContent=previewOpen?'Masquer la simulation Twitch':'Simuler la liste Twitch';
  if(!previewOpen)return;
  const mods=state.people.filter(person=>person.isModerator);
  target.append(element('p',mods.length+' modérateur(s) fictif(s), sans connexion à Twitch.','muted'));
  const list=element('ul');
  for(const person of mods)list.append(element('li',person.name));
  target.append(list);
  target.append(element('p','Cette simulation ne synchronise aucune donnée réelle et ne donne aucun droit.','muted'));
}
function render(){
  renderStats();
  renderRights();
  renderCatalog();
  renderPreview();
}
function suggestedCode(){
  if(codeEdited)return;
  const [cat,section]=($('permission-section').value||'').split('|');
  const name=slugify($('permission-name').value);
  const prefix=(cat||'').replace(/-/g,'');
  $('permission-code').value=prefix&&section&&/^[a-z]/.test(name)
    ?prefix+'.'+section+'.'+name:'';
}
document.querySelectorAll('[data-tab]').forEach(tab=>tab.addEventListener('click',()=>{
  for(const item of document.querySelectorAll('[data-tab]')){
    item.setAttribute('aria-selected',String(item===tab));
  }
  $('rights').hidden=tab.dataset.tab!=='rights';
  $('catalog').hidden=tab.dataset.tab!=='catalog';
  notice('');
}));
$('filter').addEventListener('input',renderRights);
$('mock-preview').addEventListener('click',()=>{previewOpen=!previewOpen;renderPreview();});
$('reset').addEventListener('click',()=>{
  if(!window.confirm('Réinitialiser tous les comptes et droits fictifs de cette maquette ?'))return;
  state=seedDemo();previewOpen=false;codeEdited=false;
  $('filter').value='';
  const kept=persist();
  render();
  notice('Maquette réinitialisée. Aucune donnée réelle concernée.'+
    (kept?'':' Le stockage local est indisponible.'));
});
function onSubmit(id,produce,success){
  $(id).addEventListener('submit',event=>{
    event.preventDefault();
    const form=event.currentTarget;
    const data=new FormData(form);
    if(change(()=>produce(data),success)){
      form.reset();
      if(id==='add-permission'){codeEdited=false;suggestedCode();}
    }
  });
}
onSubmit('add-category',data=>addCategory(state,data.get('label')),
  'Catégorie fictive ajoutée. Elle apparaît désormais dans le tableau.');
onSubmit('add-section',data=>addSection(state,data.get('category_id'),data.get('label')),
  'Sous-catégorie fictive ajoutée.');
onSubmit('add-permission',data=>{
  const [cat,section]=String(data.get('section_ref')||'').split('|');
  return addPermission(state,cat,section,data.get('label'),data.get('code'));
},'Permission fictive créée. Une nouvelle colonne apparaît dans la gestion des accès.');
onSubmit('add-person',data=>addPerson(state,data.get('name'),data.get('moderator')==='true'),
  'Compte fictif ajouté. Il n’existe pas sur Twitch.');
$('permission-name').addEventListener('input',suggestedCode);
$('permission-section').addEventListener('change',suggestedCode);
$('permission-code').addEventListener('input',()=>{codeEdited=true;});

render();
notice('Maquette interactive. Les modifications sont conservées uniquement dans ce navigateur.');
