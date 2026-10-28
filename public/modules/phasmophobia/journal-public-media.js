'use strict';
/* Restauration des medias d'un carnet OFFICIELLEMENT publie.
 * Aucune connexion Twitch, aucun accès au bucket privé ou aux brouillons.
 * Seules les références au bucket public dédié peuvent être chargées.
 */
(() => {
 const BUCKET='phasmo-journal-public-assets';
 const PREFIX='journal-public://';
 const REF=/^journal-public:\/\/(images|fonts)\/releases\/([1-9][0-9]{0,8})\/([a-f0-9]{64})\.(webp|png|jpg|gif|ttf|otf|woff|woff2)$/;
 const IMAGES={webp:'image/webp',png:'image/png',jpg:'image/jpeg',gif:'image/gif'};
 const FONTS={ttf:'font/ttf',otf:'font/otf',woff:'font/woff',woff2:'font/woff2'};
 const LIMIT_FILE=6000000, LIMIT_TOTAL=85000000;
 const CACHE=new Map();
 async function asDataUri(blob,mime){
  if(blob.size>LIMIT_FILE)throw Error('Média publié trop volumineux.');
  const retyped=new Blob([await blob.arrayBuffer()],{type:mime});
  return new Promise((resolve,reject)=>{
   const reader=new FileReader();
   reader.onload=()=>typeof reader.result==='string'?resolve(reader.result):reject(Error('Média illisible.'));
   reader.onerror=()=>reject(Error('Média publié illisible.'));
   reader.readAsDataURL(retyped);
  });
 }
 async function restore(payload,client,progress=()=>{}){
  if(!payload||payload.version!==7||!Array.isArray(payload.elements)||!Array.isArray(payload.fonts))
   throw Error('Format publié incompatible.');
  const output=JSON.parse(JSON.stringify(payload)),fields=[];
  for(const e of output.elements)if(e?.kind==='image'&&typeof e.image==='string'&&e.image)
   fields.push({item:e,prop:'image',kind:'images'});
  for(const f of output.fonts)if(typeof f?.data==='string'&&f.data)
   fields.push({item:f,prop:'data',kind:'fonts'});
  if(fields.length>400)throw Error('Trop de médias dans ce carnet publié.');
  let restoredBytes=0,done=0;
  for(const field of fields){
   const ref=field.item[field.prop];
   const match=REF.exec(ref);
   if(!match||match[1]!==field.kind)throw Error('Média publié avec une référence non autorisée.');
   if((field.kind==='images'&&!IMAGES[match[4]])||(field.kind==='fonts'&&!FONTS[match[4]]))
    throw Error('Extension de média publié incompatible.');
   let data=CACHE.get(ref);
   if(!data){
    const path=ref.slice(PREFIX.length);
    const result=await client.storage.from(BUCKET).download(path);
    if(result.error||!result.data)
     throw Error('Média de la publication indisponible : '+(result.error?.message||path));
    data=await asDataUri(result.data,field.kind==='images'?IMAGES[match[4]]:FONTS[match[4]]);
    CACHE.set(ref,data);
   }
   restoredBytes+=data.length;
   if(restoredBytes>LIMIT_TOTAL)throw Error('Le carnet publié est trop volumineux pour ce navigateur.');
   field.item[field.prop]=data;
   progress('Chargement des médias publiés : '+(++done)+'/'+fields.length);
  }
  return output;
 }
 window.PHASMO_JOURNAL_PUBLIC_MEDIA=Object.freeze({restore,BUCKET});
})();