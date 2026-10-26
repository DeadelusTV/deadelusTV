(() => {
  'use strict';
  // Interface de publication isolée de la démo locale et des rôles TCG.
  // Les RLS Postgres/Storage sont les garde-fous réels, pas les boutons HTML.
  const STAGE='preview';
  const BUCKET_PUBLIC='phasmo-news-published-images';
  const BUCKET_PRIVATE='phasmo-news-draft-images';
  const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const MIME={png:'image/png',jpg:'image/jpeg',webp:'image/webp'};
  const ALLOWED_BLOCKS=new Set(['doc','paragraph','heading','text','image','bulletList','orderedList','listItem','hardBreak','blockquote']);
  const ALLOWED_MARKS=new Set(['bold','italic','underline','strike','code']);
  const slugValid=x=>typeof x==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(x)&&x.length<=100;
  const cleanHttps=value=>{
    if(typeof value!=='string'||value.length>2048)return '';
    try{
      const u=new URL(value);
      return u.protocol==='https:'&&!u.username&&!u.password&&!/\.svg$/i.test(u.pathname)?u.href:'';
    }catch{return '';}
  };
  function isKineticNews(value){
    const url=cleanHttps(value);
    if(!url)return false;
    const u=new URL(url);
    return ['www.kineticgames.co.uk','kineticgames.co.uk'].includes(u.hostname)
      &&(u.pathname==='/news'||u.pathname.startsWith('/news/'));
  }
  const privatePath=src=>{
    if(typeof src!=='string'||!src.startsWith('phasmo-media:'))return null;
    const path=src.slice(13);
    const parts=path.split('/');
    if(parts.length!==2||!UUID.test(parts[0])||!UUID.test(parts[1].split('.')[0]))return null;
    const ext=parts[1].split('.')[1];
    return MIME[ext]?{path,ext}:null;
  };
  window.PhasmoNewsPublication=function makePublication(client,userId){
    if(!UUID.test(userId))throw new Error('Session Twitch invalide.');
    const storage=client.storage.from(BUCKET_PUBLIC);
    async function publicImage(src,uploaded){
      const privateRef=privatePath(src);
      if(!privateRef){
        const safe=cleanHttps(src);
        if(!safe)throw new Error('Une image doit être envoyée avant publication.');
        return safe;
      }
      if(uploaded.has(src))return uploaded.get(src);
      const {data:blob,error:downloadError}=await client.storage.from(BUCKET_PRIVATE).download(privateRef.path);
      if(downloadError||!blob)throw new Error('Impossible de récupérer une image privée avant publication.');
      const path=STAGE+'/'+userId+'/'+crypto.randomUUID()+'.'+privateRef.ext;
      const {error:uploadError}=await storage.upload(path,blob,{contentType:MIME[privateRef.ext],upsert:false});
      if(uploadError)throw new Error('Publication de l’image refusée : '+uploadError.message);
      const {data}=storage.getPublicUrl(path);
      if(!cleanHttps(data?.publicUrl))throw new Error('Adresse publique de l’image indisponible.');
      uploaded.set(src,data.publicUrl);
      return data.publicUrl;
    }
    async function publishDocument(doc,uploaded){
      let count=0,images=0;
      async function walk(raw,depth){
        if(!raw||typeof raw!=='object'||depth>15||++count>1800||!ALLOWED_BLOCKS.has(raw.type))
          throw new Error('Format de document non valide.');
        if(raw.type==='text'){
          const text=String(raw.text||'').slice(0,20000);
          const marks=[];
          for(const m of (Array.isArray(raw.marks)?raw.marks:[]).slice(0,12)){
            if(ALLOWED_MARKS.has(m?.type))marks.push({type:m.type});
            else if(m?.type==='link'){
              const href=cleanHttps(m.attrs?.href);
              if(href)marks.push({type:'link',attrs:{href}});
            }
          }
          return {type:'text',text,...(marks.length?{marks}:{})};
        }
        if(raw.type==='image'){
          if(++images>40)throw new Error('Limite de 40 images par article.');
          return {type:'image',attrs:{src:await publicImage(raw.attrs?.src,uploaded),
            alt:String(raw.attrs?.alt||'').slice(0,180)}};
        }
        const result={type:raw.type};
        if(raw.type==='heading')result.attrs={level:raw.attrs?.level===3?3:2};
        if(['paragraph','heading'].includes(raw.type)&&['left','center','right'].includes(raw.attrs?.textAlign))
          result.attrs={...result.attrs,textAlign:raw.attrs.textAlign};
        if(Array.isArray(raw.content))result.content=await Promise.all(raw.content.slice(0,200).map(x=>walk(x,depth+1)));
        return result;
      }
      if(!doc||doc.type!=='doc'||!Array.isArray(doc.content)||!doc.content.length)
        throw new Error('L’article doit contenir un texte.');
      return walk(doc,0);
    }
    function validate(draft){
      if(!slugValid(draft.slug))throw new Error('Identifiant d’article invalide. Utilisez uniquement minuscules, chiffres et tirets.');
      if(!draft.title?.trim()||draft.title.trim().length>160)throw new Error('Titre obligatoire (160 caractères maximum).');
      if(!draft.excerpt?.trim()||draft.excerpt.trim().length>350)throw new Error('Résumé obligatoire (350 caractères maximum).');
      if(!isKineticNews(draft.sourceUrl))throw new Error('Ajoutez le lien vers l’annonce originale de Kinetic Games.');
      if(!/^\d{4}-\d\d-\d\d$/.test(draft.publishedAt||''))throw new Error('Date de publication invalide.');
      if(draft.publishedId&&(!UUID.test(draft.publishedId)||draft.publishedSlug!==draft.slug))
        throw new Error('Le lien d’un article publié ne peut pas être modifié. Conservez son identifiant.');
    }
    return {
      async list(){
        const {data,error}=await client.from('phasmo_news_articles')
          .select('id,slug,status,payload,author_id,published_on')
          .eq('stage',STAGE).order('published_on',{ascending:false}).limit(100);
        if(error)throw error;
        return data||[];
      },
      async publish(draft){
        validate(draft);
        const uploaded=new Map();
        const doc=await publishDocument(draft.doc,uploaded);
        const cover=draft.cover?await publicImage(draft.cover,uploaded):'';
        const payload={title:draft.title.trim(),excerpt:draft.excerpt.trim(),
          translator:String(draft.translator||'').slice(0,120),sourceUrl:cleanHttps(draft.sourceUrl),
          cover,document:doc};
        if(draft.publishedId){
          const {data,error}=await client.from('phasmo_news_articles')
            .update({payload,status:'published',published_on:draft.publishedAt,updated_at:new Date().toISOString()})
            .eq('id',draft.publishedId).eq('stage',STAGE).select('id,slug').maybeSingle();
          if(error)throw error;
          if(!data)throw new Error('Publication introuvable ou modification non autorisée.');
          return data;
        }
        const {data,error}=await client.from('phasmo_news_articles')
          .insert({stage:STAGE,status:'published',slug:draft.slug,
            payload,published_on:draft.publishedAt})
          .select('id,slug').single();
        if(error)throw error;
        return data;
      },
      async unpublish(id){
        if(!UUID.test(id))throw new Error('Identifiant de publication invalide.');
        const {data,error}=await client.from('phasmo_news_articles')
          .update({status:'unpublished',updated_at:new Date().toISOString()})
          .eq('id',id).eq('stage',STAGE).select('id').maybeSingle();
        if(error)throw error;
        if(!data)throw new Error('Retrait refusé ou publication introuvable.');
      }
    };
  };
})();