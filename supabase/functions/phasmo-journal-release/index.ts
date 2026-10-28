import { createClient } from 'npm:@supabase/supabase-js@2.76.1';

/** Phasmo V7, preparation et publication officielle.
 * Active publication is server-locked until a separately approved SQL action.
 * No preview draft can ever reach this function: source = preview RELEASE only.
 */
const PROJECT_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const ALLOWED_ORIGIN = 'https://deadelustv.pages.dev';
const PRIVATE_BUCKET = 'phasmo-journal-draft-assets';
const PUBLIC_BUCKET = 'phasmo-journal-public-assets';
const PRIVATE_REF = /^journal-storage:\/\/(images|fonts)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/([a-f0-9]{64})\.(webp|png|jpg|gif|ttf|otf|woff|woff2)$/;
const MIME: Record<string,string> = {
  webp:'image/webp',png:'image/png',jpg:'image/jpeg',gif:'image/gif',
  ttf:'font/ttf',otf:'font/otf',woff:'font/woff',woff2:'font/woff2',
};
const MAX_ASSETS = 400;
const MAX_BYTES = 6_000_000;

type Json = Record<string,unknown>;
type Asset = {kind:'images'|'fonts';source:string;path:string;hash:string;extension:string;mime:string;size:number};
const allow = {'Access-Control-Allow-Origin':ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin'};
const answer=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,
 headers:{...allow,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});

function parseMedia(payload:Json){
  if(payload.version!==7||!Array.isArray(payload.elements)||!Array.isArray(payload.fonts)||
     !Array.isArray(payload.records)||!Array.isArray(payload.folders))
    throw Error('Le snapshot V7 est incomplet.');
  const matches:{kind:'images'|'fonts';source:string}[]=[];
  for(const el of payload.elements){
    if(!el||typeof el!=='object')throw Error('Calque de publication invalide.');
    if(el.kind==='image'&&el.image){
      if(typeof el.image!=='string')throw Error('Image mal formée.');
      matches.push({kind:'images',source:el.image});
    }
  }
  for(const font of payload.fonts){
    if(!font||typeof font!=='object'||typeof font.data!=='string')
      throw Error('Police de publication invalide.');
    matches.push({kind:'fonts',source:font.data});
  }
  if(matches.length>MAX_ASSETS)throw Error('Trop de médias pour publier ce carnet.');
  const unique=new Map<string,Asset>();
  for(const item of matches){
    const m=PRIVATE_REF.exec(item.source);
    if(!m||m[1]!==item.kind)throw Error('Le carnet contient un média non migré ou une référence externe. Réenregistre le brouillon puis republie la preview.');
    if(item.kind==='images'&&!['png','jpg','webp','gif'].includes(m[4]))
      throw Error('Extension image non autorisée.');
    if(item.kind==='fonts'&&!['ttf','otf','woff','woff2'].includes(m[4]))
      throw Error('Extension de police non autorisée.');
    if(!unique.has(item.source))unique.set(item.source,{
      kind:item.kind,source:item.source,path:item.source.slice('journal-storage://'.length),
      hash:m[3],extension:m[4],mime:MIME[m[4]],size:0
    });
  }
  return [...unique.values()];
}
async function verifyAssets(client:ReturnType<typeof createClient>,assets:Asset[]){
  const reports:Asset[]=[];
  for(const asset of assets){
    const file=await client.storage.from(PRIVATE_BUCKET).download(asset.path);
    if(file.error||!file.data)throw Error('Média privé introuvable : '+asset.path);
    if(file.data.size>MAX_BYTES)throw Error('Média trop volumineux : '+asset.path);
    const bytes=await file.data.arrayBuffer();
    const hashBytes=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
    const sha=Array.from(hashBytes,b=>b.toString(16).padStart(2,'0')).join('');
    if(sha!==asset.hash)throw Error('Empreinte du média incorrecte : '+asset.path);
    reports.push({...asset,size:file.data.size});
  }
  return reports;
}
function publishedPayload(payload:Json,assets:Asset[],release:number):Json {
  const output=structuredClone(payload);
  const map=new Map(assets.map(a=>[a.source,
    'journal-public://'+a.kind+'/releases/'+release+'/'+a.hash+'.'+a.extension]));
  for(const element of output.elements as Json[])
    if(element?.kind==='image'&&element.image)
      element.image=map.get(element.image as string) || (()=>{throw Error('Image manquante dans le manifeste.');})();
  for(const font of output.fonts as Json[])
    font.data=map.get(font.data as string)||(()=>{throw Error('Police manquante dans le manifeste.');})();
  return output;
}
function errMessage(err:unknown){return err instanceof Error?err.message:'Erreur de publication. Réessaie.';}
Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:allow});
  if(req.method!=='POST')return answer({error:'Méthode non autorisée.'},405);
  // Restrict browser origin in addition to JWT verification and DB permission check.
  if(req.headers.get('Origin')!==ALLOWED_ORIGIN)return answer({error:'Origine non autorisée.'},403);
  if(!SERVICE_KEY||!PROJECT_URL)return answer({error:'Service Supabase indisponible.'},503);
  const authorization=req.headers.get('Authorization')||'';
  if(!authorization.startsWith('Bearer '))return answer({error:'Connexion Twitch requise.'},401);
  const token=authorization.slice(7);
  try{
    const body=await req.json();
    const action=typeof body?.action==='string'?body.action:'';
    if(!['prepare','status','activate','offline','restore'].includes(action))return answer({error:'Action inconnue.'},400);
    const client=createClient(PROJECT_URL,SERVICE_KEY,{auth:{
      persistSession:false,autoRefreshToken:false,detectSessionInUrl:false
    }});
    const identity=await client.auth.getUser(token);
    if(identity.error||!identity.data.user)return answer({error:'Session expirée ou invalide.'},401);
    const actor=identity.data.user.id;
    const role=await client.from('phasmo_journal_admins').select('enabled')
      .eq('user_id',actor).maybeSingle();
    if(role.error||role.data?.enabled!==true)
      return answer({error:'Seuls les administrateurs Phasmo peuvent préparer une publication.'},403);

    const lock=await client.from('phasmo_journal_production_release_controls')
      .select('activation_enabled,reserved_token,reserved_release').eq('singleton',true).single();
    if(lock.error||!lock.data)return answer({error:'Verrou de publication indisponible.'},503);
    const locked=!lock.data.activation_enabled;

    if(action==='status'){
      const [candidate,official,history]=await Promise.all([
        client.from('phasmo_journal_production_candidates')
          .select('source_preview_revision,source_preview_release,asset_manifest,prepared_at').eq('stage','production').maybeSingle(),
        client.from('phasmo_journal_production_publications')
          .select('visibility,release_number').eq('stage','production').maybeSingle(),
        client.from('phasmo_journal_production_publication_history')
          .select('release_number,source_preview_revision,published_at,approved_at')
          .order('release_number',{ascending:false}).limit(30)
      ]);
      if(candidate.error||official.error||history.error)
        throw Error('Statut et historique officiels inaccessibles.');
      return answer({ok:true,locked,reserved:Boolean(lock.data.reserved_token),
        reserved_release:lock.data.reserved_token?lock.data.reserved_release:null,
        candidate:candidate.data,official:official.data,history:history.data||[]});
    }

    if(action==='prepare'){
      const result=await client.from('phasmo_journal_preview_publications')
        .select('payload,source_revision,release_number').eq('stage','preview').single();
      if(result.error||!result.data)throw Error('Publie d’abord une version de test admin.');
      const source=result.data;
      const sourcePayload=source.payload as Json;
      const assets=await verifyAssets(client,parseMedia(sourcePayload));
      const record={
        stage:'production',source_preview_revision:source.source_revision,
        source_preview_release:source.release_number,payload:sourcePayload,
        asset_manifest:assets,prepared_by:actor,prepared_at:new Date().toISOString()
      };
      const saved=await client.from('phasmo_journal_production_candidates')
        .upsert(record,{onConflict:'stage'}).select('source_preview_revision,source_preview_release,prepared_at').single();
      if(saved.error)throw Error('Préparation non enregistrée : '+saved.error.message);
      return answer({ok:true,locked,prepared:saved.data,media:{
        images:assets.filter(a=>a.kind==='images').length,
        fonts:assets.filter(a=>a.kind==='fonts').length,
        totalBytes:assets.reduce((n,a)=>n+a.size,0)
      },notice:'Version vérifiée et figée en privé. Aucun média n’a été rendu public.'});
    }

    if(action==='offline'){
      if(body?.confirmation!=='METTRE-HORS-LIGNE')
        return answer({error:'Confirmation explicite de mise hors ligne requise.'},400);
      const current=await client.from('phasmo_journal_production_publications')
        .select('visibility,release_number').eq('stage','production').maybeSingle();
      if(current.error||!current.data||current.data.visibility!=='live')
        return answer({error:'Aucune publication en ligne à désactiver.'},409);
      if(body?.expected_release!==current.data.release_number)
        return answer({error:'La version en ligne a changé : actualise les commandes.'},409);
      const result=await client.rpc('phasmo_journal_disable_official_release',{
        p_actor:actor,p_expected_release:body.expected_release
      });
      if(result.error)throw Error(result.error.message);
      if(result.data!==true)return answer({error:'Mise hors ligne non confirmée. Actualise le statut.'},409);
      return answer({ok:true,disabled:true});
    }

    // Activation and rollback are deliberately locked. The UI cannot unlock them.
    if(locked)return answer({error:'La publication publique reste verrouillée en base. Autorisation finale requise.'},423);
    if(action==='restore'){
      if(body?.confirmation!=='RESTAURER-OFFICIELLEMENT'||
         !Number.isSafeInteger(body?.target_release)||body.target_release<1)
        return answer({error:'Confirmation de restauration et numéro historique requis.'},400);
      const history=await client.from('phasmo_journal_production_publication_history')
        .select('release_number').eq('release_number',body.target_release).maybeSingle();
      if(history.error||!history.data)throw Error('Version historique introuvable.');
      const restored=await client.rpc('phasmo_journal_restore_official_release',{
        p_actor:actor,p_target_release:body.target_release
      });
      if(restored.error)throw Error('Restauration refusée : '+restored.error.message);
      return answer({ok:true,restored:restored.data});
    }
    if(body?.confirmation!=='PUBLIER-OFFICIELLEMENT'||body?.rightsApproved!==true)
      return answer({error:'Confirmation officielle et droits des médias requis.'},400);

    const candidate=await client.from('phasmo_journal_production_candidates')
      .select('payload,asset_manifest,source_preview_revision,source_preview_release')
      .eq('stage','production').single();
    if(candidate.error||!candidate.data)throw Error('Aucune version officielle n’a été préparée.');
    const c=candidate.data, source=c.payload as Json;
    if(body?.expected_preview_release!==c.source_preview_release||
       body?.expected_revision!==c.source_preview_revision)
      return answer({error:'Le candidat officiel a changé : actualise les commandes.'},409);
    const manifest=await verifyAssets(client,parseMedia(source));
    const preview=await client.from('phasmo_journal_preview_publications')
      .select('source_revision,release_number,payload').eq('stage','preview').single();
    if(preview.error||!preview.data||
       preview.data.source_revision!==c.source_preview_revision||
       preview.data.release_number!==c.source_preview_release||
       JSON.stringify(preview.data.payload)!==JSON.stringify(source))
      throw Error('La publication preview a changé : reprépare la version officielle.');
    // Reservation exclusive avant copie, protege aussi contre 2 activations simultanees.
    const claimToken=crypto.randomUUID();
    const reserved=await client.rpc('phasmo_journal_reserve_official_release',{
      p_actor:actor,p_source_revision:c.source_preview_revision,
      p_source_release:c.source_preview_release,p_claim_token:claimToken
    });
    if(reserved.error||!Array.isArray(reserved.data)||reserved.data.length!==1)
      throw Error('Reservation exclusive refusée : '+(reserved.error?.message||'réponse incorrecte'));
    const release=Number(reserved.data[0].release_number);
    if(!Number.isSafeInteger(release)||release<1)throw Error('Numéro de release réservé invalide.');
    const uploaded:string[]=[];
    try {
      const publicPayload=publishedPayload(source,manifest,release);
      for(const asset of manifest){
        const publicPath=asset.kind+'/releases/'+release+'/'+asset.hash+'.'+asset.extension;
        const downloaded=await client.storage.from(PRIVATE_BUCKET).download(asset.path);
        if(downloaded.error||!downloaded.data)throw Error('Média source indisponible.');
        const sha=new Uint8Array(await crypto.subtle.digest('SHA-256',await downloaded.data.arrayBuffer()));
        if(Array.from(sha,b=>b.toString(16).padStart(2,'0')).join('')!==asset.hash)
          throw Error('Empreinte du média source incorrecte.');
        const result=await client.storage.from(PUBLIC_BUCKET).upload(publicPath,downloaded.data,
          {contentType:asset.mime,cacheControl:'31536000',upsert:false});
        if(result.error){
          const exists=await client.storage.from(PUBLIC_BUCKET).download(publicPath);
          if(exists.error||!exists.data)throw Error('Transfert public refusé : '+result.error.message);
          const check=new Uint8Array(await crypto.subtle.digest('SHA-256',await exists.data.arrayBuffer()));
          if(Array.from(check,b=>b.toString(16).padStart(2,'0')).join('')!==asset.hash)
            throw Error('Fichier public existant différent : publication refusée.');
        }else uploaded.push(publicPath);
      }
      const committed=await client.rpc('phasmo_journal_commit_official_release',{
        p_actor:actor,p_source_revision:c.source_preview_revision,
        p_source_release:c.source_preview_release,p_public_payload:publicPayload,p_claim_token:claimToken
      });
      if(committed.error)throw Error('Finalisation atomique refusée : '+committed.error.message);
      return answer({ok:true,published:committed.data});
    }catch(error){
      // Ne pas supprimer les fichiers si une coupure réseau a masqué une publication reussie.
      const current=await client.from('phasmo_journal_production_publications')
        .select('release_number,visibility').eq('stage','production').maybeSingle();
      if(!current.error&&current.data?.release_number===release&&current.data.visibility==='live')
        return answer({ok:true,published:[{release_number:release}],
          note:'Publication confirmée après une réponse serveur interrompue.'});
      if(current.error)throw Error('Etat officiel incertain : réservation conservée et contrôle manuel requis.');
      if(uploaded.length){
        const cleaned=await client.storage.from(PUBLIC_BUCKET).remove(uploaded);
        if(cleaned.error)throw Error('Nettoyage public refusé : réservation conservée, intervention nécessaire.');
      }
      const aborted=await client.rpc('phasmo_journal_abort_official_release',{
        p_actor:actor,p_claim_token:claimToken
      });
      if(aborted.error||aborted.data!==true)
        throw Error('Réservation conservée pour contrôle manuel : '+(aborted.error?.message||'annulation impossible'));
      throw error;
    }
  }catch(err){
    return answer({error:errMessage(err)},422);
  }
});
