'use strict';
/* Phasmo V7 : copie des images/polices dans Storage PRIVÉ lors des sauvegardes.
 * Le format local/JSON utilisateur reste en data:base64; seul le JSON distant
 * contient des références journal-storage://. Aucun média n'est rendu public.
 */
(() => {
 const BUCKET='phasmo-journal-draft-assets';
 const PREFIX='journal-storage://';
 const REFERENCE=/^journal-storage:\/\/(images|fonts)\/([0-9a-f-]{36})\/([a-f0-9]{64})\.(webp|png|jpg|gif|ttf|otf|woff|woff2)$/;
 const IMAGE_MIME={webp:'image/webp',png:'image/png',jpg:'image/jpeg',gif:'image/gif'};
 const FONT_MIME={ttf:'font/ttf',otf:'font/otf',woff:'font/woff',woff2:'font/woff2'};
 const MAX_FILE_BYTES=6_000_000;
 const MAX_ITEMS=400;
 const MAX_HYDRATED_BYTES=85_000_000;
 const MEMORY=new Map();

 function parseDataUri(data){
  if(typeof data!=='string')return null;
  const m=/^data:([^;,]+)(?:;[^,]*)?;base64,([A-Za-z0-9+/=]+)$/.exec(data);
  if(!m)return null;
  const raw=atob(m[2]);
  if(raw.length>MAX_FILE_BYTES)throw Error('Média trop volumineux pour Storage (6 Mo maximum par fichier).');
  const bytes=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
  return {mime:m[1].toLowerCase(),bytes};
 }
 function mimeAndExtension(data,kind){
  const parsed=parseDataUri(data);
  if(!parsed)throw Error('Format média incorrect dans le JSON.');
  if(kind==='images'){
   const extension=Object.keys(IMAGE_MIME).find(ext=>IMAGE_MIME[ext]===parsed.mime);
   if(!extension)throw Error('Image non reconnue pour Storage.');
   return {...parsed,mime:IMAGE_MIME[extension],extension};
  }
  const bytes=parsed.bytes;
  const magic=String.fromCharCode(...bytes.slice(0,4));
  const extension=magic==='OTTO'?'otf':magic==='wOFF'?'woff':magic==='wOF2'?'woff2':
    (magic==='true'||magic==='typ1'||(bytes[0]===0&&bytes[1]===1&&bytes[2]===0&&bytes[3]===0))?'ttf':null;
  if(!extension)throw Error('Police inconnue : seules TTF, OTF, WOFF et WOFF2 sont prises en charge.');
  return {...parsed,mime:FONT_MIME[extension],extension};
 }
 async function sha256(bytes){
  if(!globalThis.crypto?.subtle)throw Error('Chiffrement SHA-256 indisponible : utilise HTTPS.');
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
  return Array.from(digest,b=>b.toString(16).padStart(2,'0')).join('');
 }
 function items(payload){
  if(!payload||payload.version!==7||!Array.isArray(payload.elements)||!Array.isArray(payload.fonts))
    throw Error('Document V7 invalide.');
  const matches=[];
  for(const e of payload.elements)if(e&&e.kind==='image'&&typeof e.image==='string'&&e.image)
    matches.push({object:e,key:'image',kind:'images'});
  for(const f of payload.fonts)if(f&&typeof f.data==='string'&&f.data)
    matches.push({object:f,key:'data',kind:'fonts'});
  if(matches.length>MAX_ITEMS)throw Error('Trop de médias dans ce carnet pour le pilote Storage.');
  return matches;
 }
 async function uploadOne(client,userId,data,kind){
  const file=mimeAndExtension(data,kind);
  const hash=await sha256(file.bytes);
  const path=kind+'/'+userId+'/'+hash+'.'+file.extension;
  const alreadyLoaded=MEMORY.get('known:'+kind+':'+hash);
  if(alreadyLoaded)return alreadyLoaded;
  if(MEMORY.has(path))return PREFIX+path;
  // Meme contenu chez un autre editeur ? Reutiliser l'objet prive existant.
  const found=await client.rpc('phasmo_journal_find_private_asset',{
   p_kind:kind,p_sha256:hash,p_extension:file.extension
  });
  if(found.error)throw Error('Recherche des doublons impossible : '+found.error.message);
  if(found.data){
   const ref=PREFIX+found.data;
   if(!REFERENCE.test(ref))throw Error('Fichier de bibliothèque invalide.');
   const existing=await client.storage.from(BUCKET).download(found.data);
   if(existing.error||!existing.data)throw Error('Impossible de vérifier le média existant.');
   if(existing.data.size>MAX_FILE_BYTES)throw Error('Média existant trop volumineux.');
   const digest=await sha256(new Uint8Array(await existing.data.arrayBuffer()));
   if(digest!==hash)throw Error('Empreinte incorrecte du média existant.');
   MEMORY.set('known:'+kind+':'+hash,ref);
   return ref;
  }
  const upload=await client.storage.from(BUCKET).upload(path,
   new Blob([file.bytes],{type:file.mime}),{contentType:file.mime,upsert:false,cacheControl:'31536000'});
  const err=upload.error;
  if(err){
   const conflict=String(err.statusCode||err.status)==='409'||
     /already exists|duplicate/i.test(String(err.message||''));
   if(!conflict)throw Error('Envoi Storage refusé : '+(err.message||'erreur inconnue'));
   // Vérifier réellement l'objet avant d'accepter un conflit 409/duplicate.
   const existing=await client.storage.from(BUCKET).download(path);
   if(existing.error||!existing.data)throw Error('Média déjà présent mais impossible à vérifier dans Storage.');
  }
  MEMORY.set(path,true);
  MEMORY.set('known:'+kind+':'+hash,PREFIX+path);
  return PREFIX+path;
 }
 async function prepareForSave(payload,client,userId,progress=()=>{}){
  if(!/^[0-9a-f-]{36}$/.test(String(userId)))throw Error('Identité Twitch/Supabase invalide.');
  const remote=JSON.parse(JSON.stringify(payload));
  const fields=items(remote),cached=new Map();
  let done=0;
  for(const field of fields){
   const value=field.object[field.key];
   if(value.startsWith(PREFIX)){
    if(!REFERENCE.test(value))throw Error('Référence média invalide dans le carnet.');
    done++;continue;
   }
   if(!value.startsWith('data:'))throw Error('Média non reconnu dans le carnet.');
   let ref=cached.get(value);
   if(!ref){ref=await uploadOne(client,userId,value,field.kind);cached.set(value,ref);}
   field.object[field.key]=ref;
   progress('Médias envoyés vers Storage : '+(++done)+'/'+fields.length);
  }
  return remote;
 }
 async function downloadOne(client,ref){
  const m=REFERENCE.exec(ref);
  if(!m)throw Error('Référence Storage incorrecte : '+ref.slice(0,55));
  if(MEMORY.has('base64:'+ref))return MEMORY.get('base64:'+ref);
  const path=ref.slice(PREFIX.length);
  const result=await client.storage.from(BUCKET).download(path);
  if(result.error||!result.data)throw Error('Média privé introuvable ou interdit : '+(result.error?.message||path));
  if(result.data.size>MAX_FILE_BYTES)throw Error('Média privé trop volumineux.');
  const mime=m[1]==='images'?IMAGE_MIME[m[4]]:FONT_MIME[m[4]];
  const file=new Blob([await result.data.arrayBuffer()],{type:mime});
  const data=await new Promise((resolve,reject)=>{
   const reader=new FileReader();
   reader.onload=()=>resolve(reader.result);
   reader.onerror=()=>reject(Error('Impossible de restaurer un média privé.'));
   reader.readAsDataURL(file);
  });
  MEMORY.set('base64:'+ref,data);
  MEMORY.set('known:'+m[1]+':'+m[3],ref);
  return data;
 }
 async function restoreForEditor(payload,client,progress=()=>{}){
  const local=JSON.parse(JSON.stringify(payload));
  const fields=items(local);
  const cached=new Map();
  let size=0,done=0;
  for(const field of fields){
   const value=field.object[field.key];
   if(!value.startsWith(PREFIX))continue;
   let restored=cached.get(value);
   if(!restored){restored=await downloadOne(client,value);cached.set(value,restored);}
   size+=restored.length;
   if(size>MAX_HYDRATED_BYTES)throw Error('Le carnet dépasse la limite mémoire de lecture (85 Mo).');
   field.object[field.key]=restored;
   progress('Médias restaurés depuis Storage : '+(++done)+'/'+fields.length);
  }
  return local;
 }
 async function listPrivateAssets(client,kind,page=0){
  if(!['images','fonts'].includes(kind)||!Number.isInteger(page)||page<0||page>1000)
   throw Error('Page de bibliothèque invalide.');
  const {data,error}=await client.rpc('phasmo_journal_list_private_assets',{p_kind:kind,p_page:page});
  if(error)throw Error('Bibliothèque privée inaccessible : '+error.message);
  if(!Array.isArray(data))throw Error('Réponse de bibliothèque invalide.');
  return data.filter(item=>item?.kind===kind&&REFERENCE.test(PREFIX+item.path));
 }
 async function readPrivateAsset(client,kind,path){
  if(!['images','fonts'].includes(kind)||typeof path!=='string')throw Error('Média de bibliothèque invalide.');
  const ref=PREFIX+path,m=REFERENCE.exec(ref);
  if(!m||m[1]!==kind)throw Error('Chemin de bibliothèque interdit.');
  return downloadOne(client,ref);
 }
 window.PHASMO_JOURNAL_STORAGE_MEDIA=Object.freeze({
  prepareForSave,restoreForEditor,listPrivateAssets,readPrivateAsset,BUCKET
 });
})();