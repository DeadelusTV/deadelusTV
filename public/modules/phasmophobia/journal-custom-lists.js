'use strict';
/* Entrées de listes libres : libellés indépendants, destinations internes stables. */
(() => {
 const groups=['entites','cartes','objets','equipements','divers'];
 const text=value=>typeof value==='string'?value.trim().slice(0,100):'';
 function normalize(input){
  return (Array.isArray(input)?input:[]).slice(0,240).filter(row=>row&&typeof row==='object').map(row=>({
   label:text(row.label),
   action:['none','detail','folder','category','home'].includes(row.action)?row.action:'none',
   target:groups.includes(row.target)?row.target:null,
   entry:text(row.entry)
  }));
 }
 function value(item){
  if(item.action==='detail'||item.action==='folder')return item.action+':'+item.entry;
  if(item.action==='category')return 'category:'+item.target;
  return item.action==='home'?'home':'none';
 }
 function destination(selected){
  const [action,...parts]=String(selected).split(':');
  const key=parts.join(':');
  return normalize([{action,target:action==='category'?key:null,entry:['detail','folder'].includes(action)?key:''}])[0];
 }
 function resolve(item,records,folders,available){
  if(item.action==='home')return {action:'home'};
  if(item.action==='category')return groups.includes(item.target)?{action:'category',group:item.target}:null;
  if(item.action==='detail'){
   const rec=records.find(rec=>rec.id===item.entry);
   return rec&&rec.status!=='archived'&&available(folders,rec.group,rec.folderId)
    ?{action:'detail',group:rec.group,entry:rec.id}:null;
  }
  if(item.action==='folder'){
   const folder=folders.find(folder=>folder.id===item.entry);
   return folder&&available(folders,folder.group,folder.id)
    ?{action:'folder',group:folder.group,entry:folder.id}:null;
  }
  return null;
 }
 window.PHASMO_JOURNAL_CUSTOM_LISTS=Object.freeze({normalize,value,destination,resolve});
})();
