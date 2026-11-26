'use strict';
/* Lecture officielle : les références Storage sont vérifiées au chargement,
 * mais les ressources ne sont récupérées par le navigateur que lorsqu'un
 * calque de la page en cours est affiché.
 * Aucune connexion privée ni téléchargement préalable de toutes les fiches.
 */
(() => {
 const BUCKET='phasmo-journal-public-assets';
 const PREFIX='journal-public://';
 const REF=/^journal-public:\/\/(images|fonts)\/releases\/([1-9][0-9]{0,8})\/([a-f0-9]{64})\.(webp|png|jpg|gif|ttf|otf|woff|woff2)$/;
 const IMAGES=new Set(['webp','png','jpg','gif']);
 const FONTS=new Set(['ttf','otf','woff','woff2']);
 const trustedImages=new Set(),trustedFonts=new Set();

 async function restore(payload,client,progress=()=>{}){
  if(!payload||payload.version!==7||!Array.isArray(payload.elements)||!Array.isArray(payload.fonts))
   throw Error('Format publié incompatible.');
  const output=JSON.parse(JSON.stringify(payload)),fields=[];
  for(const e of output.elements)if(e?.kind==='image'&&typeof e.image==='string'&&e.image)
   fields.push({item:e,prop:'image',kind:'images'});
  for(const f of output.fonts)if(typeof f?.data==='string'&&f.data)
   fields.push({item:f,prop:'data',kind:'fonts'});
  if(fields.length>400)throw Error('Trop de médias dans ce carnet publié.');

  // Le bucket est public. getPublicUrl ne télécharge aucun fichier ;
  // les navigateurs chargeront uniquement les <img> et polices nécessaires.
  const nextImages=new Set(),nextFonts=new Set();
  const bucket=client.storage.from(BUCKET);
  for(const field of fields){
   const ref=field.item[field.prop];
   const match=REF.exec(ref);
   if(!match||match[1]!==field.kind)throw Error('Média publié avec une référence non autorisée.');
   if((field.kind==='images'&&!IMAGES.has(match[4]))||
      (field.kind==='fonts'&&!FONTS.has(match[4])))
    throw Error('Extension de média publié incompatible.');
   const path=ref.slice(PREFIX.length);
   const url=bucket.getPublicUrl(path)?.data?.publicUrl;
   if(typeof url!=='string'||!url.startsWith('https://'))
    throw Error('URL publique de média indisponible.');
   (field.kind==='images'?nextImages:nextFonts).add(url);
   field.item[field.prop]=url;
  }
  trustedImages.clear();trustedFonts.clear();
  for(const url of nextImages)trustedImages.add(url);
  for(const url of nextFonts)trustedFonts.add(url);
  progress('Carnet prêt : les illustrations seront chargées à l’ouverture des fiches.');
  return output;
 }
 window.PHASMO_JOURNAL_PUBLIC_MEDIA=Object.freeze({
  restore,BUCKET,
  isTrustedImageUrl:url=>typeof url==='string'&&trustedImages.has(url),
  isTrustedFontUrl:url=>typeof url==='string'&&trustedFonts.has(url)
 });
})();
