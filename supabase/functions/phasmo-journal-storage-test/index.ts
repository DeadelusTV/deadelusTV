import { createClient } from 'npm:@supabase/supabase-js@2.76.1';

// Recette PHASMO V7 : copies PHYSIQUES exclusivement dans un bucket PRIVE.
// Ni la publication officielle, ni le bucket public, ni le verrou ne sont modifiés.
const PROJECT_URL=Deno.env.get('SUPABASE_URL')||'';
const SERVICE_KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const ORIGIN='https://deadelustv.pages.dev';
const FROM='phasmo-journal-draft-assets';
const STAGING='phasmo-journal-release-test-private';
const REF=/^journal-storage:\/\/(images|fonts)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/([a-f0-9]{64})\.(webp|png|jpg|gif|ttf|otf|woff|woff2)$/;
const MIME:Record<string,string>={
 webp:'image/webp',png:'image/png',jpg:'image/jpeg',gif:'image/gif',
 ttf:'font/ttf',otf:'font/otf',woff:'font/woff',woff2:'font/woff2'
};
const headers={
 'Access-Control-Allow-Origin':ORIGIN,
 'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info',
 'Access-Control-Allow-Methods':'POST,OPTIONS',
 'Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8',
 'Vary':'Origin'
};
const respond=(obj:unknown,status=200)=>
 new Response(JSON.stringify(obj),{status,headers});
const hex=async(data:ArrayBuffer)=>{
 const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',data));
 return Array.from(hash,v=>v.toString(16).padStart(2,'0')).join('');
};
function expectedSources(payload:Record<string,unknown>){
 if(payload.version!==7||!Array.isArray(payload.elements)||!Array.isArray(payload.fonts))
  throw Error('Version candidate non compatible V7.');
 const paths:string[]=[];
 for(const e of payload.elements){
  if(e&&e.kind==='image'&&typeof e.image==='string'&&e.image)paths.push(e.image);
 }
 for(const f of payload.fonts){
  if(f&&typeof f.data==='string'&&f.data)paths.push(f.data);
 }
 return [...new Set(paths)].sort();
}
function assetList(candidate:Record<string,unknown>){
 if(!Array.isArray(candidate.asset_manifest)||!candidate.payload||
    typeof candidate.payload!=='object')
  throw Error('Manifest de préparation indisponible.');
 const sources=expectedSources(candidate.payload as Record<string,unknown>);
 const manifest=candidate.asset_manifest as Record<string,unknown>[];
 if(sources.length<1||sources.length>400||sources.length!==manifest.length)
  throw Error('Prépare d’abord un candidat avec au moins un média.');
 const parsed=manifest.map(a=>{
  if(!a||typeof a.source!=='string'||typeof a.path!=='string'||
      typeof a.hash!=='string'||typeof a.kind!=='string'||typeof a.extension!=='string')
   throw Error('Manifest de média invalide.');
  const m=REF.exec(a.source);
  if(!m||a.path!==a.source.slice('journal-storage://'.length)||
     a.kind!==m[1]||a.hash!==m[3]||a.extension!==m[4]||
     a.mime!==MIME[m[4]]||
     (m[1]==='images'&&!['png','jpg','webp','gif'].includes(m[4]))||
     (m[1]==='fonts'&&!['ttf','otf','woff','woff2'].includes(m[4])))
    throw Error('Manifest du candidat non conforme au média privé.');
  return {source:a.source,path:a.path,kind:m[1],hash:m[3],ext:m[4],mime:MIME[m[4]]};
 });
 if(JSON.stringify(parsed.map(v=>v.source).sort())!==JSON.stringify(sources))
  throw Error('Manifest différent des fichiers de la publication privée.');
 return parsed;
}
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return respond({error:'Méthode non autorisée.'},405);
 if(req.headers.get('Origin')!==ORIGIN)return respond({error:'Origine non autorisée.'},403);
 if(!SERVICE_KEY||!PROJECT_URL)return respond({error:'Configuration serveur absente.'},503);
 const token=(req.headers.get('Authorization')||'').replace(/^Bearer /,'');
 if(!token||token===req.headers.get('Authorization'))return respond({error:'Session Twitch requise.'},401);
 try {
  const body=await req.json();
  const fault=body?.mode==='fault';
  if(!['normal','fault'].includes(body?.mode))return respond({error:'Test inconnu.'},400);
  const client=createClient(PROJECT_URL,SERVICE_KEY,
   {auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const who=await client.auth.getUser(token);
  if(who.error||!who.data.user)return respond({error:'Session invalide.'},401);
  const actor=who.data.user.id;
  const role=await client.from('phasmo_journal_admins').select('enabled').eq('user_id',actor).maybeSingle();
  if(role.error||role.data?.enabled!==true)return respond({error:'Test réservé aux administrateurs Phasmo.'},403);

  // L'essai doit se faire AVANT toute activation de la publication.
  const lock=await client.from('phasmo_journal_production_release_controls')
   .select('activation_enabled').eq('singleton',true).single();
  if(lock.error||!lock.data||lock.data.activation_enabled!==false)
   return respond({error:'Test permis uniquement quand la publication publique est verrouillée.'},423);
  const bucket=await client.storage.getBucket(STAGING);
  if(bucket.error||!bucket.data||bucket.data.public!==false)
   throw Error('Bucket de test absent ou non privé : transfert refusé.');

  const result=await client.from('phasmo_journal_production_candidates')
   .select('source_preview_revision,source_preview_release,payload,asset_manifest')
   .eq('stage','production').single();
  if(result.error||!result.data)throw Error('Aucune version officielle privée à tester.');
  const c=result.data;
  const preview=await client.from('phasmo_journal_preview_publications')
   .select('source_revision,release_number,payload').eq('stage','preview').single();
  if(preview.error||!preview.data||
     preview.data.source_revision!==c.source_preview_revision||
     preview.data.release_number!==c.source_preview_release||
     JSON.stringify(preview.data.payload)!==JSON.stringify(c.payload))
   throw Error('La publication test a changé. Prépare-la de nouveau.');
  const assets=assetList(c as Record<string,unknown>);
  const run='runs/'+crypto.randomUUID();
  const written:string[]=[];
  let failure:unknown=null;
  let cleanupFailure:string|null=null;
  const counted={images:0,fonts:0,bytes:0};
  try {
   for(const a of assets){
    const downloaded=await client.storage.from(FROM).download(a.path);
    if(downloaded.error||!downloaded.data)throw Error('Source privée introuvable.');
    if(downloaded.data.size>6_000_000)throw Error('Fichier source trop volumineux.');
    const content=await downloaded.data.arrayBuffer();
    if(await hex(content)!==a.hash)throw Error('SHA-256 source incorrect.');
    const dest=run+'/'+a.kind+'/'+a.hash+'.'+a.ext;
    const uploaded=await client.storage.from(STAGING).upload(dest,
      new Blob([content],{type:a.mime}),{contentType:a.mime,upsert:false,cacheControl:'0'});
    if(uploaded.error)throw Error('Échec du transfert physique vers le staging privé.');
    written.push(dest);
    if(fault)throw Error('PHASMO_SIMULATED_INTERRUPTION');
    const check=await client.storage.from(STAGING).download(dest);
    if(check.error||!check.data)throw Error('Copie privée non récupérable.');
    const checkBytes=await check.data.arrayBuffer();
    if(await hex(checkBytes)!==a.hash)throw Error('SHA-256 de copie incorrect.');
    counted[a.kind as 'images'|'fonts']++;
    counted.bytes+=checkBytes.byteLength;
   }
  } catch(err){failure=err;}
  finally {
   if(written.length){
    const removed=await client.storage.from(STAGING).remove(written);
    if(removed.error)cleanupFailure='Suppression des copies de test refusée.';
    else{
     const leftover=await client.storage.from(STAGING).list(run,{limit:1});
     // listing a folder containing subfolders can be misleading: verify paths individually.
     if(leftover.error)cleanupFailure='Impossible de contrôler le nettoyage du bucket de test.';
     if(!cleanupFailure){
      for(const p of written){
       const confirm=await client.storage.from(STAGING).download(p);
       if(!confirm.error){cleanupFailure='Copie de test encore présente après nettoyage.';break;}
      }
     }
    }
   }
  }
  if(cleanupFailure)return respond({error:cleanupFailure,
    note:'Un administrateur doit examiner le bucket de test privé avant de réessayer.'},500);
  if(failure){
   if(fault&&failure instanceof Error&&failure.message==='PHASMO_SIMULATED_INTERRUPTION')
    return respond({ok:true,mode:'fault',simulated_failure:true,cleaned:true,
      images_expected:assets.filter(a=>a.kind==='images').length,
      fonts_expected:assets.filter(a=>a.kind==='fonts').length,
      note:'Interruption simulée après le premier fichier ; copie supprimée.'});
   throw failure;
  }
  return respond({ok:true,mode:'normal',cleaned:true,release:c.source_preview_release,
   revision:c.source_preview_revision,images:counted.images,fonts:counted.fonts,bytes:counted.bytes,
   note:'Médias copiés et vérifiés dans un bucket privé, puis supprimés. Aucune publication publique.'});
 }catch(err){
  return respond({error:err instanceof Error?err.message:'Test de stockage impossible.'},422);
 }
});
