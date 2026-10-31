'use strict';
/* Arborescence locale des sous-catégories Phasmophobia.
 * Chaque branche du carnet est une des 5 catégories fixes.
 * Les dossiers ne contiennent pas de calques : ceux-ci restent liés aux fiches par UUID.
 */
(() => {
 const GROUPS=['entites','cartes','objets','equipements','divers'];
 const newId=()=> 'rubrique-'+(globalThis.crypto?.randomUUID?.() || (Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)));
 const validGroup=x=>GROUPS.includes(x);
 const titleKey=s=>s.toLocaleLowerCase('fr');
 const sort=(a,b)=>a.order-b.order||a.title.localeCompare(b.title,'fr');
 function find(folders,id){return (folders||[]).find(x=>x.id===id)||null;}
 function normalize(input){
  const rows=Array.isArray(input)?input.slice(0,1000):[];
  const result=[],ids=new Set();
  for(const row of rows){
   if(!row||!validGroup(row.group))continue;
   const title=String(row.title??'').trim().slice(0,100);
   if(!title)continue;
   let id=typeof row.id==='string'&&/^rubrique-[a-zA-Z0-9-]{4,100}$/.test(row.id)?row.id:newId();
   while(ids.has(id))id=newId();
   ids.add(id);
   result.push({id,group:row.group,parentId:typeof row.parentId==='string'?row.parentId:null,
    title,order:Number.isSafeInteger(row.order)&&row.order>=0?row.order:result.length,
    status:row.status==='archived'?'archived':'active'});
  }
  // Orphelins, références vers autre onglet et cycles reviennent à la racine.
  for(const f of result){
   const visited=new Set([f.id]);let ancestor=find(result,f.parentId),ok=true;
   if(f.parentId&&!ancestor)ok=false;
   while(ancestor){
    if(visited.has(ancestor.id)||ancestor.group!==f.group){ok=false;break;}
    visited.add(ancestor.id);
    if(ancestor.parentId&&!find(result,ancestor.parentId)){ok=false;break;}
    ancestor=find(result,ancestor.parentId);
   }
   if(!ok)f.parentId=null;
  }
  const seen=new Set();
  for(const f of result){
   const key=f.group+'|'+String(f.parentId)+'|'+titleKey(f.title);
   if(seen.has(key)){f.title=(f.title+' '+f.id.slice(-6)).slice(0,100);}
   seen.add(f.group+'|'+String(f.parentId)+'|'+titleKey(f.title));
  }
  return result;
 }
 function list(folders,group,parentId=null,includeArchived=false){
  if(!validGroup(group))return [];
  return (folders||[]).filter(f=>f.group===group&&f.parentId===(parentId||null)&&
   (includeArchived||f.status!=='archived')).sort(sort);
 }
 function available(folders,group,id){
  if(!id)return true;
  const visited=new Set();let current=find(folders,id);
  while(current){
   if(visited.has(current.id)||current.group!==group||current.status==='archived')return false;
   visited.add(current.id);
   if(!current.parentId)return true;
   current=find(folders,current.parentId);
  }
  return false;
 }
 function validateParent(folders,group,parentId,excludeId){
  if(!parentId)return null;
  const parent=find(folders,parentId);
  if(!parent||parent.group!==group||!available(folders,group,parentId))throw Error('Sous-catégorie parente indisponible.');
  if(excludeId){
   let p=parent;const seen=new Set();
   while(p){if(p.id===excludeId||seen.has(p.id))throw Error('Un dossier ne peut pas être son propre descendant.');seen.add(p.id);p=find(folders,p.parentId);}
  }
  return parent.id;
 }
 function unique(folders,group,parentId,title,excludeId){
  return !list(folders,group,parentId,true).some(f=>f.id!==excludeId&&titleKey(f.title)===titleKey(title));
 }
 function create(folders,group,parentId,title){
  title=String(title??'').trim();if(!validGroup(group)||!title||title.length>100)throw Error('Nom de sous-catégorie invalide.');
  parentId=validateParent(folders,group,parentId);
  if(!unique(folders,group,parentId,title))throw Error('Cette sous-catégorie existe déjà à cet emplacement.');
  const f={id:newId(),group,parentId,title,order:list(folders,group,parentId,true).length,status:'active'};
  folders.push(f);return f;
 }
 function rename(folders,id,title){
  const f=find(folders,id);title=String(title??'').trim();
  if(!f||!title||title.length>100||!unique(folders,f.group,f.parentId,title,id))throw Error('Renommage impossible.');
  f.title=title;return f;
 }
 function move(folders,id,parentId){
  const f=find(folders,id);if(!f)throw Error('Sous-catégorie introuvable.');
  parentId=validateParent(folders,f.group,parentId,id);
  if(!unique(folders,f.group,parentId,f.title,id))throw Error('Nom déjà utilisé dans la destination.');
  if(f.parentId===parentId)return f;
  const old=f.parentId;f.parentId=parentId;
  f.order=list(folders,f.group,parentId,true).length;
  list(folders,f.group,old,true).forEach((x,i)=>x.order=i);
  return f;
 }
 function archive(folders,id){
  const f=find(folders,id);if(!f)throw Error('Sous-catégorie introuvable.');
  // La restauration d'un dossier dans un ancêtre archivé est admise, mais reste invisible.
  f.status=f.status==='archived'?'active':'archived';return f;
 }
 function reorder(folders,id,delta){
  const f=find(folders,id);if(!f)return false;
  const siblings=list(folders,f.group,f.parentId,true);
  const i=siblings.findIndex(x=>x.id===id),j=i+delta;
  if(i<0||j<0||j>=siblings.length)return false;
  [siblings[i],siblings[j]]=[siblings[j],siblings[i]];
  siblings.forEach((x,k)=>x.order=k);return true;
 }
 function remove(folders,records,id){
  const f=find(folders,id);if(!f)return null;
  if(folders.some(x=>x.parentId===id)||(records||[]).some(x=>x.folderId===id))
   throw Error('Déplace ou supprime d’abord les fiches et sous-catégories contenues dans ce dossier.');
  folders.splice(folders.indexOf(f),1);
  list(folders,f.group,f.parentId,true).forEach((x,i)=>x.order=i);
  return f;
 }
 function lineage(folders,id){
  const items=[],seen=new Set();let current=find(folders,id);
  while(current&&!seen.has(current.id)){seen.add(current.id);items.unshift(current);current=find(folders,current.parentId);}
  return items;
 }
 window.PHASMO_JOURNAL_FOLDERS=Object.freeze({normalize,find,list,available,create,rename,move,archive,reorder,remove,lineage});
})();
