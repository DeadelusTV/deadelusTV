'use strict';
/* Phasmo journal: structure des fiches indépendante des calques et de la navigation.
 * V1 locale / prototype. Aucune lecture ou écriture Supabase ici.
 * Les identifiants sont persistés dans les exports JSON (schema 5).
 */
(() => {
  const categories = Object.freeze(['entites','cartes','objets','equipements','divers']);
  const safeGroup = group => categories.includes(group);
  const id = () => 'fiche-' + (globalThis.crypto?.randomUUID?.() ||
    (Date.now().toString(36) + '-' + Math.random().toString(36).slice(2)));
  function normalize(input, groups, folders=[]) {
    const source = Array.isArray(input) ? input :
      categories.flatMap(group => (Array.isArray(groups?.[group]?.names) ? groups[group].names : [])
        .map((title, i) => ({group, title, order:i, status:'demo'})));
    const seen = new Set(), titles = new Set(), results = [];
    for (const row of source.slice(0,5000)) {
      if (!row || !safeGroup(row.group)) continue;
      const title = String(row.title ?? '').trim().slice(0,100);
      const key = row.group + '|' + title.toLocaleLowerCase('fr');
      if (!title || titles.has(key)) continue;
      titles.add(key);
      let recordId = typeof row.id === 'string' && /^fiche-[a-zA-Z0-9-]{4,100}$/.test(row.id) ? row.id : id();
      while (seen.has(recordId)) recordId = id();
      seen.add(recordId);
      const order = Number(row.order);
      const folderId=folders.some(f=>f.group===row.group&&f.id===row.folderId)?row.folderId:null;
      results.push({id:recordId,group:row.group,folderId,title,
        order:Number.isSafeInteger(order)&&order>=0?order:results.length,
        status:['demo','draft','archived'].includes(row.status)?row.status:'draft'});
    }
    return results;
  }
  function list(records, group, includeArchived=false) {
    if(!safeGroup(group))return [];
    return (Array.isArray(records)?records:[])
      .filter(x=>x.group===group&&(includeArchived||x.status!=='archived'))
      .sort((a,b)=>a.order-b.order||a.title.localeCompare(b.title,'fr'));
  }
  function find(records,group,value) {
    return (records||[]).find(x=>x.group===group&&(x.id===value||x.title===value))||null;
  }
  function unique(records,group,title,exceptId=null) {
    return !list(records,group,true).some(x=>x.id!==exceptId&&x.title.toLocaleLowerCase('fr')===title.toLocaleLowerCase('fr'));
  }
  function checkDestination(folders,group,folderId){
    if(!safeGroup(group))throw Error('Catégorie invalide.');
    if(!folderId)return null;
    const folder=(folders||[]).find(f=>f.id===folderId);
    if(!folder||folder.group!==group||folder.status==='archived')throw Error('Sous-catégorie de destination indisponible.');
    const visited=new Set();let ancestor=folder;
    while(ancestor){
      if(visited.has(ancestor.id)||ancestor.status==='archived')throw Error('Sous-catégorie archivée.');
      visited.add(ancestor.id);
      ancestor=ancestor.parentId?(folders||[]).find(f=>f.id===ancestor.parentId):null;
    }
    return folderId;
  }
  function create(records,group,title,folderId=null,folders=[]) {
    title=String(title??'').trim();
    folderId=checkDestination(folders,group,folderId);
    if(!title||title.length>100||!unique(records,group,title))throw Error('Nom vide, trop long ou déjà utilisé.');
    const result={id:id(),group,folderId,title,
      order:list(records,group,true).filter(x=>x.folderId===folderId).length,status:'draft'};
    records.push(result);return result;
  }
  function rename(records,group,recordId,title) {
    const rec=find(records,group,recordId);title=String(title??'').trim();
    if(!rec||!title||title.length>100||!unique(records,group,title,rec.id))throw Error('Renommage impossible : nom invalide ou déjà utilisé.');
    rec.title=title;return rec;
  }
  function archive(records,group,recordId) {
    const rec=find(records,group,recordId);if(!rec)throw Error('Fiche introuvable.');
    rec.status=rec.status==='archived'?'draft':'archived';return rec;
  }
  function reorder(records,group,recordId,delta) {
    const rec=find(records,group,recordId);
    if(!rec)return false;
    const all=list(records,group,true).filter(x=>(x.folderId||null)===(rec.folderId||null));
    const index=all.findIndex(x=>x.id===recordId),dest=index+delta;
    if(index<0||dest<0||dest>=all.length)return false;
    [all[index],all[dest]]=[all[dest],all[index]];
    all.forEach((x,i)=>x.order=i);
    return true;
  }
  function move(records,folders,recordId,group,folderId=null){
    const rec=records.find(x=>x.id===recordId);
    if(!rec)throw Error('Fiche introuvable.');
    folderId=checkDestination(folders,group,folderId);
    if(rec.group===group&&(rec.folderId||null)===folderId)return rec;
    if(!unique(records,group,rec.title,rec.id))throw Error('Nom de fiche déjà utilisé dans la catégorie de destination.');
    const oldGroup=rec.group,oldFolder=rec.folderId||null;
    rec.group=group;rec.folderId=folderId;
    rec.order=list(records,group,true).filter(x=>x.folderId===folderId&&x.id!==rec.id).length;
    list(records,oldGroup,true).filter(x=>(x.folderId||null)===oldFolder).forEach((x,i)=>x.order=i);
    return rec;
  }
  function remove(records,group,recordId) {
    const index=records.findIndex(x=>x.id===recordId&&x.group===group);
    if(index<0)return null;
    const [rec]=records.splice(index,1);
    list(records,group,true).filter(x=>(x.folderId||null)===(rec.folderId||null)).forEach((x,i)=>x.order=i);
    return rec;
  }
  window.PHASMO_JOURNAL_RECORDS=Object.freeze({categories,normalize,list,find,create,rename,archive,reorder,move,remove});
})();
