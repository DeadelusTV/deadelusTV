'use strict';
/* Bibliothèque partagée : uniquement les médias du bucket privé Phasmo.
 * Les RLS continuent à imposer le rôle admin/éditeur, jamais de service key.
 */
(() => {
 if(new URLSearchParams(location.search).get('viewer')==='1')return;
 const $=id=>document.getElementById(id);
 const modal=$('journal-asset-library'),grid=$('journal-library-grid'),info=$('journal-library-info');
 const prev=$('journal-library-prev'),next=$('journal-library-next'),pageLabel=$('journal-library-page');
 const imageButton=$('journal-library-images'),fontButton=$('journal-library-fonts');
 if(!modal||!grid||!info||!prev||!next||!pageLabel||!imageButton||!fontButton)return;
 const PROJECT='https://eodtxlhnfzyapkyvvxdi.supabase.co';
 const KEY='sb_publishable_HwLsESqtQglS7FoSTxBX-Q_GzxyLX_Z';
 let clientPromise=null,kind='images',page=0,entries=[],busy=false,sequence=0;
 const media=()=>window.PHASMO_JOURNAL_STORAGE_MEDIA;
 const bridge=()=>window.PHASMO_JOURNAL_REMOTE_BRIDGE;
 const message=text=>{info.textContent=text;};
 const labelOf=item=>{
  const hash=item.path.split('/').pop()?.split('.')[0]||'';
  return (kind==='images'?'Image ':'Police ')+hash.slice(0,10);
 };
 function bytes(n){
  const size=Math.max(0,Number(n)||0);
  return size>=1024*1024?(size/(1024*1024)).toFixed(2)+' Mo':Math.ceil(size/1024)+' Ko';
 }
 function dateLabel(value){
  const date=new Date(value);
  return Number.isNaN(date.getTime())?'Date inconnue':date.toLocaleDateString('fr-FR');
 }
 async function getClient(){
  if(!clientPromise)clientPromise=(async()=>{
   if(window.DEADELUSTV_AUTH?.getClient)return window.DEADELUSTV_AUTH.getClient();
   if(!window.supabase?.createClient){
    await new Promise((resolve,reject)=>{
     const script=document.createElement('script');
     script.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.76.1';
     script.onload=()=>window.supabase?.createClient?resolve():reject(Error('Bibliothèque Supabase indisponible.'));
     script.onerror=()=>reject(Error('Connexion Supabase indisponible.'));
     document.head.append(script);
    });
   }
   return window.supabase.createClient(PROJECT,KEY,{auth:{
    flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true
   }});
  })().catch(err=>{clientPromise=null;throw err;});
  return clientPromise;
 }
 async function authorized(){
  const client=await getClient();
  const {data,error}=await client.auth.getUser();
  if(error||!data?.user)throw Error('Connecte-toi d’abord à Twitch sur le site DEV.');
  const uid=data.user.id;
  const [a,e]=await Promise.all([
   client.from('phasmo_journal_admins').select('enabled').eq('user_id',uid).maybeSingle(),
   client.from('phasmo_journal_editors').select('enabled').eq('user_id',uid).maybeSingle()
  ]);
  if(a.error||e.error||(!a.data?.enabled&&!e.data?.enabled))
   throw Error('Ce compte ne dispose pas des droits d’édition Phasmo.');
  return client;
 }
 async function preview(item,button,client,requestedKind,token){
  const view=document.createElement(requestedKind==='images'?'img':'span');
  view.className='journal-media-preview';
  if(requestedKind==='images')view.alt='Aperçu privé '+labelOf(item);
  else view.textContent='Aa Bb 123';
  button.prepend(view);
  try{
   const {data,error}=await client.storage.from(media().BUCKET).createSignedUrl(item.path,120);
   if(error||!data?.signedUrl)return;
   if(token!==sequence||!modal.open)return;
   if(requestedKind==='images')view.src=data.signedUrl;
   else{
    const family='JournalApercu_'+item.path.split('/').pop().slice(0,12).replace(/[^a-z0-9]/gi,'');
    const url=data.signedUrl.replaceAll("'",'%27');
    const face=new FontFace(family,"url('"+url+"')");
    await face.load();
    if(token!==sequence||!modal.open)return;
    document.fonts.add(face);view.style.fontFamily="'"+family+"'";
    view.style.fontSize='23px';
   }
  }catch{/* Aperçu facultatif, le téléchargement authentifié est distinct. */}
 }
 async function choose(item,button){
  if(busy)return;
  busy=true;button.disabled=true;message('Chargement du média privé…');
  try{
   const client=await authorized();
   const data=await media().readPrivateAsset(client,kind,item.path);
   if(!bridge()?.useLibraryAsset)throw Error('Moteur du carnet indisponible.');
   await bridge().useLibraryAsset({kind,path:item.path,data});
   modal.close();
  }catch(err){
   message('Sélection impossible : '+(err?.message||'Erreur inconnue.'));
  }finally{busy=false;button.disabled=false;}
 }
 async function renderList(){
  const token=++sequence;
  grid.replaceChildren();entries=[];
  prev.disabled=next.disabled=true;
  pageLabel.textContent='Page '+(page+1);
  modal.querySelector('#journal-asset-library-title').textContent=
   kind==='images'?'Images déjà enregistrées':'Polices déjà enregistrées';
  message('Lecture de la bibliothèque privée…');
  try{
   const client=await authorized();
   const rows=await media().listPrivateAssets(client,kind,page);
   if(token!==sequence||!modal.open)return;
   entries=rows;prev.disabled=page===0;next.disabled=rows.length<24;
   if(!rows.length){message('Aucun fichier '+(kind==='images'?'image':'police')+' enregistré dans cette page.');return;}
   message(rows.length+' fichier(s) sur cette page. Sélectionne un fichier pour le réutiliser dans le calque choisi.');
   const fragment=document.createDocumentFragment();
   for(const item of rows){
    const button=document.createElement('button');
    button.type='button';button.className='journal-media-choice';
    const name=document.createElement('span');name.className='journal-media-name';
    name.textContent=(kind==='images'?'Image ':'Police ')+(item.path.split('/').pop()?.split('.')[0]||'').slice(0,10);
    const meta=document.createElement('span');meta.className='journal-media-details';
    meta.textContent=item.path.split('.').pop().toUpperCase()+' · '+bytes(item.size_bytes)+' · '+dateLabel(item.created_at);
    button.append(name,meta);
    button.addEventListener('click',()=>choose(item,button));
    fragment.append(button);
    void preview(item,button,client,kind,token);
   }
   grid.append(fragment);
  }catch(err){
   if(token!==sequence)return;
   message('Bibliothèque inaccessible : '+(err?.message||'Erreur inconnue.'));
  }
 }
 function open(requested){
  kind=requested;page=0;
  modal.showModal();
  void renderList();
 }
 imageButton.addEventListener('click',()=>open('images'));
 fontButton.addEventListener('click',()=>open('fonts'));
 $('journal-library-close').addEventListener('click',()=>modal.close());
 modal.addEventListener('close',()=>{++sequence;busy=false;});
 prev.addEventListener('click',()=>{if(page>0&&!busy){page--;void renderList();}});
 next.addEventListener('click',()=>{if(!busy&&entries.length===24){page++;void renderList();}});
})();