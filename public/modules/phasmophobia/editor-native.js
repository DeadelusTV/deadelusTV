'use strict';
/*
 * Éditeur natif de test Phasmophobia (aucun CDN, aucune API distante).
 * Les commandes de mise en forme utilisent execCommand pour préserver
 * l'historique natif d'annulation dans Chrome/Edge. API obsolète : ce moteur
 * reste un prototype, pas le composant final de publication.
 * Toujours convertir le DOM vers un document JSON validé, jamais publier
 * le HTML de contenteditable tel quel.
 */
(() => {
  const $ = selector => document.querySelector(selector);
  const root = $('#wys-editor'), toolbar = $('#wys-toolbar');
  const status = $('#editor-save-status'), errorBox = $('#wys-editor-error');
  if (!root || !toolbar || !status || !errorBox) return;

  const BACKEND = window.PhasmoDraftBackend || null;
  const KEY = 'deadelustv.phasmo.editor.wysiwyg.v1';
  const LEGACY = 'deadelustv.phasmo.editor.demo.v1';
  const MAX_DRAFTS = 40, MAX_IMAGE = 10 * 1024 * 1024;
  const MIME = ['image/png','image/jpeg','image/webp','image/gif'];
  const tempUrls = new Set(), covers = new Map();
  const pendingImages=new Map(), failedImages=new Map();
  const isPrivateImage=value=>!!BACKEND?.validImageRef?.(value);
  const today = () => new Date().toISOString().slice(0,10);
  let seq=0, drafts=[], selected=null, timer=null, savedRange=null;

  const el = (tag, css, content) => {
    const node=document.createElement(tag);
    if (css) node.className=css;
    if (content!==undefined) node.textContent=String(content);
    return node;
  };
  const report = (value,bringIntoView=false) => {
    errorBox.textContent=value;
    errorBox.hidden=!value;
    if(value&&bringIntoView) {
      $('#editor-main')?.scrollIntoView({block:'start',behavior:'auto'});
      errorBox.focus({preventScroll:true});
    }
  };
  const slugify = text => String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,100);
  const uid=()=>globalThis.crypto?.randomUUID?.()||'draft-'+Date.now()+'-'+(++seq);
  function url(value,kind='link') {
    if(typeof value!=='string'||value.length>2048)return '';
    const text=value.trim();
    if(kind==='image'&&/^(?:\.\.\/\.\.\/)?assets\/phasmo-news\/[a-z0-9/_-]+\.(?:png|jpg|jpeg|webp)$/i.test(text))
      return text.startsWith('assets/')?'../../'+text:text;
    if(kind==='image'&&isPrivateImage(text))return text;
    if(kind==='image'&&text.startsWith('blob:')&&tempUrls.has(text))return text;
    try{
      const parsed=new URL(text);
      if(!parsed.hostname||parsed.username||parsed.password)return '';
      if(kind==='image'&&(parsed.protocol!=='https:'||/\.svg$/i.test(parsed.pathname)))return '';
      if(kind==='link'&&!['http:','https:'].includes(parsed.protocol))return '';
      return parsed.href;
    }catch{return '';}
  }
  const youtubeId=value=>{
    if(typeof value!=='string'||value.length>2048)return '';
    try{
      const link=new URL(value.trim());
      if(link.protocol!=='https:'||link.username||link.password)return '';
      const host=link.hostname.toLowerCase(),parts=link.pathname.split('/').filter(Boolean);
      let id='';
      if(host==='youtu.be')id=parts.length===1?parts[0]:'';
      else if(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','www.youtube-nocookie.com'].includes(host)){
        if(link.pathname==='/watch')id=link.searchParams.get('v')||'';
        else if(['shorts','live','embed'].includes(parts[0])&&parts.length===2)id=parts[1];
      }
      return /^[A-Za-z0-9_-]{11}$/.test(id)?id:'';
    }catch{return '';}
  };
  const validVideoId=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{11}$/.test(id);
  const blankDoc=()=>({type:'doc',content:[{type:'paragraph'}]});
  const para=text=>({type:'paragraph',content:text?[{type:'text',text:String(text).slice(0,15000)}]:[]});
  function convertLegacy(raw){
    const blocks=[];
    for(const block of(Array.isArray(raw.blocks)?raw.blocks:[]).slice(0,150)){
      if(!block||typeof block!=='object')continue;
      if(block.type==='paragraph')blocks.push(para(block.text));
      else if(block.type==='heading')blocks.push({type:'heading',attrs:{level:2},content:para(block.text).content});
      else if(block.type==='list'){
        const items=String(block.items||'').split('\n').map(x=>x.trim()).filter(Boolean)
          .slice(0,100).map(x=>({type:'listItem',content:[para(x)]}));
        if(items.length)blocks.push({type:'bulletList',content:items});
      }else if(block.type==='image'){
        const src=url(block.src,'image');
        blocks.push(src?{type:'image',attrs:{src,alt:String(block.alt||'').slice(0,180)}}:para('Image locale précédente : à réinsérer.'));
        if(block.caption)blocks.push(para(block.caption));
      }
    }
    return{type:'doc',content:blocks.length?blocks:blankDoc().content};
  }
  const NODE_TYPES=new Set(['doc','paragraph','heading','text','image','youtube','bulletList','orderedList','listItem','hardBreak','blockquote']);
  const MARKS=new Set(['bold','italic','underline','strike','code']);
  function cleanDoc(doc,save=true){
    let count=0;
    function clean(raw,level){
      if(!raw||level>15||++count>1800||!NODE_TYPES.has(raw.type))return null;
      if(raw.type==='text'){
        const text=String(raw.text||'').slice(0,20000);
        if(!text)return null;
        const marks=(Array.isArray(raw.marks)?raw.marks:[]).slice(0,12).map(mark=>{
          if(MARKS.has(mark?.type))return{type:mark.type};
          if(mark?.type==='link'){
            const href=url(mark.attrs?.href);
            return href?{type:'link',attrs:{href}}:null;
          }
          return null;
        }).filter(Boolean);
        return{type:'text',text,...(marks.length?{marks}:{})};
      }
      if(raw.type==='image'){
        const src=url(raw.attrs?.src,'image');
        if(!src||(save&&src.startsWith('blob:')))
          return para('Image du PC : réinsérez le fichier pour continuer.');
        return{type:'image',attrs:{src,alt:String(raw.attrs?.alt||'').slice(0,180)}};
      }
      if(raw.type==='youtube'){
        return validVideoId(raw.attrs?.videoId)
          ?{type:'youtube',attrs:{videoId:raw.attrs.videoId}}:null;
      }
      const out={type:raw.type};
      if(raw.type==='heading')out.attrs={level:raw.attrs?.level===3?3:2};
      if((raw.type==='heading'||raw.type==='paragraph')&&['center','right','left'].includes(raw.attrs?.textAlign))
        out.attrs={...(out.attrs||{}),textAlign:raw.attrs.textAlign};
      if(Array.isArray(raw.content)){
        const children=raw.content.map(child=>clean(child,level+1)).filter(Boolean);
        if(children.length)out.content=children;
      }
      return out;
    }
    const safe=clean(doc,0);
    return safe?.type==='doc'&&safe.content?.length?safe:blankDoc();
  }
  function newDraft(){return{id:uid(),title:'',excerpt:'',publishedAt:today(),translator:'',sourceUrl:'',slug:'',slugCustomized:false,cover:'',publishedId:null,publishedSlug:null,updatedAt:Date.now(),doc:blankDoc()};}
  function readDraft(raw,legacy=false){
    if(!raw||typeof raw!=='object')return null;
    const d=newDraft();
    if(typeof raw.id==='string')d.id=raw.id.slice(0,130);
    for(const key of ['title','excerpt','publishedAt','translator','sourceUrl','slug','cover'])
      if(typeof raw[key]==='string')d[key]=raw[key].slice(0,key==='excerpt'?350:2048);
    d.slugCustomized=raw.slugCustomized===true;
    d.publishedId=typeof raw.publishedId==='string'?raw.publishedId:null;
    d.publishedSlug=typeof raw.publishedSlug==='string'?raw.publishedSlug:null;
    d.updatedAt=Number.isFinite(raw.updatedAt)?raw.updatedAt:Date.now();
    d.doc=cleanDoc(legacy?convertLegacy(raw):raw.doc,true);
    return d;
  }
  const current=()=>drafts.find(d=>d.id===selected);
  function load(){
    try{
      if (BACKEND) {
        const incoming=BACKEND.initial;
        if(!incoming||!Array.isArray(incoming.drafts))throw new Error('Brouillons serveur non initialisés');
        drafts=incoming.drafts.slice(0,MAX_DRAFTS).map(x=>readDraft(x)).filter(Boolean);
        selected=incoming.selectedId;
      }else{
      const modern=localStorage.getItem(KEY);
      const data=JSON.parse(modern||localStorage.getItem(LEGACY)||'null');
      if(Array.isArray(data?.drafts)){
        drafts=data.drafts.slice(0,MAX_DRAFTS).map(x=>readDraft(x,!modern)).filter(Boolean);
        selected=data.selectedId;
      }
      }
    }catch(err){report(BACKEND?'Brouillons serveur non disponibles : '+String(err.message||err):'Anciennes sauvegardes locales illisibles.');}
    if(!drafts.length)drafts=[newDraft()];
    if(!current())selected=drafts[0].id;
  }
  function marks(element){
    const tag=element.tagName?.toLowerCase();
    const found=[];
    if(['b','strong'].includes(tag)||element.style?.fontWeight==='bold'||parseInt(element.style?.fontWeight,10)>=600)found.push({type:'bold'});
    if(['i','em'].includes(tag)||element.style?.fontStyle==='italic')found.push({type:'italic'});
    if(tag==='u'||element.style?.textDecoration?.includes('underline'))found.push({type:'underline'});
    if(['s','strike','del'].includes(tag))found.push({type:'strike'});
    if(tag==='a'){
      const href=url(element.getAttribute('href'));
      if(href)found.push({type:'link',attrs:{href}});
    }
    return found;
  }
  function inlineNodes(parent,active=[]){
    const result=[];
    for(const child of parent.childNodes){
      if(child.nodeType===Node.TEXT_NODE){
        if(!child.nodeValue)continue;
        const entry={type:'text',text:child.nodeValue.slice(0,20000)};
        if(active.length)entry.marks=active;
        result.push(entry);
      }else if(child.nodeType===Node.ELEMENT_NODE){
        if(child.tagName==='BR'){result.push({type:'hardBreak'});continue;}
        if(child.tagName==='IMG')continue;
        const next=[...active,...marks(child)];
        result.push(...inlineNodes(child,next));
      }
    }
    return result;
  }
  function alignOf(element){
    const value=element.style?.textAlign||element.getAttribute?.('align');
    return ['left','center','right'].includes(value)?{textAlign:value}:{};
  }
  function parseList(list,type,depth){
    const items=[];
    for(const li of list.children){
      if(li.tagName!=='LI')continue;
      const blocks=readBlocks(li,'paragraph',depth+1);
      items.push({type:'listItem',content:blocks.length?blocks:[para('')]});
    }
    return{type,content:items};
  }
  // execCommand peut produire <p><ul>…</ul></p> ou des listes dans un div.
  // Lire les blocs à chaque profondeur sans modifier le DOM ni l'annulation.
  function readBlocks(element,tag='paragraph',depth=0){
    if(depth>15)return [];
    const content=[],pending=[];
    const attrs=tag==='heading'?{level:element.tagName==='H3'?3:2,...alignOf(element)}:alignOf(element);
    const flush=()=>{
      if(!pending.length)return;
      content.push({type:tag,...(Object.keys(attrs).length?{attrs}:{}),content:pending.splice(0)});
    };
    for(const child of element.childNodes){
      if(child.nodeType===Node.TEXT_NODE){
        if(child.nodeValue)pending.push({type:'text',text:child.nodeValue});
        continue;
      }
      if(child.nodeType!==Node.ELEMENT_NODE)continue;
      const name=child.tagName;
      if(child.dataset.youtubeId){
        flush();
        if(validVideoId(child.dataset.youtubeId))
          content.push({type:'youtube',attrs:{videoId:child.dataset.youtubeId}});
      }else if(name==='IMG'){
        flush();
        const src=url(child.dataset.remoteImage||child.getAttribute('src'),'image');
        if(src)content.push({type:'image',attrs:{src,alt:child.alt||''}});
      }else if(name==='UL'||name==='OL'){
        flush();
        content.push(parseList(child,name==='UL'?'bulletList':'orderedList',depth+1));
      }else if(['P','DIV','BLOCKQUOTE','H2','H3'].includes(name)){
        flush();
        content.push(...readBlocks(child,name==='H2'||name==='H3'?'heading':'paragraph',depth+1));
      }else if(name==='BR')pending.push({type:'hardBreak'});
      else pending.push(...inlineNodes(child,marks(child)));
    }
    flush();
    if(!element.childNodes.length)content.push({type:tag,...(Object.keys(attrs).length?{attrs}:{})});
    return content;
  }
  function readEditor(){
    const content=readBlocks(root);
    return cleanDoc({type:'doc',content:content.length?content:blankDoc().content},false);
  }
  function renderInline(parent,parts){
    for(const item of (parts||[])){
      if(item.type==='hardBreak'){parent.append(document.createElement('br'));continue;}
      if(item.type!=='text')continue;
      let node=document.createTextNode(item.text||'');
      for(const mark of item.marks||[]){
        let tag={bold:'strong',italic:'em',underline:'u',strike:'s',code:'code',link:'a'}[mark.type];
        if(!tag)continue;
        const wrap=document.createElement(tag);
        if(tag==='a'){
          const href=url(mark.attrs?.href);
          if(!href)continue;
          wrap.href=href;wrap.rel='noopener noreferrer';wrap.target='_blank';
        }
        wrap.append(node);node=wrap;
      }
      parent.append(node);
    }
  }
  function setImageSource(image,src){
    if(isPrivateImage(src)){
      image.dataset.remoteImage=src;
      image.alt=image.alt||'Image privée du brouillon';
      BACKEND.imageUrl(src).then(blobUrl=>{
        if(image.isConnected && image.dataset.remoteImage===src)image.src=blobUrl;
      }).catch(()=>{if(image.isConnected)report('Une image privée ne peut pas être chargée.');});
    }else image.src=src;
  }
  function youtubeCard(videoId,editing){
    const panel=el('div','phasma-youtube-card');
    panel.dataset.youtubeId=videoId;
    panel.contentEditable='false';
    panel.setAttribute('aria-label','Vidéo YouTube intégrée');
    // Miniature publique YouTube. Aucune iframe/lecture avant un clic.
    const thumbnail=el('img','phasma-youtube-thumbnail');
    thumbnail.src='https://i.ytimg.com/vi/'+videoId+'/hqdefault.jpg';
    thumbnail.alt='';
    thumbnail.loading='lazy';
    thumbnail.decoding='async';
    thumbnail.referrerPolicy='no-referrer';
    thumbnail.addEventListener('error',()=>{thumbnail.remove();panel.classList.remove('phasma-youtube-card--with-thumb');},{once:true});
    panel.classList.add('phasma-youtube-card--with-thumb');
    panel.append(thumbnail);
    if(editing){
      const text=el('span','phasma-youtube-card-text','Vidéo YouTube · '+videoId);
      const link=el('a','phasma-youtube-card-link','Voir sur YouTube');
      link.href='https://www.youtube.com/watch?v='+videoId;
      link.target='_blank';link.rel='noopener noreferrer';
      const remove=el('button','phasma-youtube-remove','Retirer la vidéo');
      remove.type='button';
      remove.addEventListener('click',event=>{
        event.preventDefault();
        panel.remove();
        changed();
      });
      panel.append(text,link,remove);
    }else{
      const button=el('button','phasma-youtube-play');
      button.type='button';
      button.setAttribute('aria-label','Charger la vidéo YouTube');
      button.addEventListener('click',()=>{
        const iframe=el('iframe','phasma-youtube-iframe');
        iframe.src='https://www.youtube-nocookie.com/embed/'+videoId+'?autoplay=1&rel=0';
        iframe.title='Vidéo YouTube';
        iframe.loading='lazy';
        iframe.referrerPolicy='strict-origin-when-cross-origin';
        iframe.allow='accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share';
        iframe.allowFullscreen=true;
        panel.replaceChildren(iframe);
      },{once:true});
      panel.append(button);
    }
    return panel;
  }
  function buildDoc(documentRoot,doc){
    documentRoot.replaceChildren();
    const walk=(container,item)=>{
      if(item.type==='youtube'){
        if(validVideoId(item.attrs?.videoId))
          container.append(youtubeCard(item.attrs.videoId,documentRoot===root));
        return;
      }
      if(item.type==='image'){
        const src=url(item.attrs?.src,'image');
        if(src){
          const image=el('img');image.alt=item.attrs?.alt||'';
          image.referrerPolicy='no-referrer';
          setImageSource(image,src);
          container.append(image);
        }else container.append(el('p','', 'Image non disponible.'));
        return;
      }
      const tag={paragraph:'p',heading:item.attrs?.level===3?'h3':'h2',bulletList:'ul',orderedList:'ol',listItem:'li',blockquote:'blockquote'}[item.type];
      if(!tag)return;
      const node=el(tag);
      if(['paragraph','heading'].includes(item.type)&&['left','center','right'].includes(item.attrs?.textAlign))
        node.style.textAlign=item.attrs.textAlign;
      if(['paragraph','heading'].includes(item.type)){
        renderInline(node,item.content);
        if(!node.childNodes.length)node.append(document.createElement('br'));
      }else for(const sub of item.content||[])walk(node,sub);
      container.append(node);
    };
    for(const item of cleanDoc(doc,false).content||[])walk(documentRoot,item);
    if(!documentRoot.childNodes.length)documentRoot.append(el('p'));
  }
  async function store(){
    clearTimeout(timer);timer=null;
    if (BACKEND) {
      const d=current();
      if(!d)return;
      const pending=[...(pendingImages.get(d.id)||[])];
      status.textContent=pending.length?'Envoi des images puis sauvegarde…':'Sauvegarde du brouillon sur Supabase…';
      if(pending.length)await Promise.allSettled(pending);
      const doc=current()?.id===d.id?readEditor():d.doc;
      const errors=failedImages.get(d.id);
      if(errors?.size){
        const present=new Set();
        const collect=item=>{
          if(!item||typeof item!=='object')return;
          if(item.type==='image'&&item.attrs?.src)present.add(item.attrs.src);
          for(const child of item.content||[])collect(child);
        };
        collect(doc);
        if(covers.get(d.id))present.add(covers.get(d.id));
        if([...errors].some(ref=>present.has(ref))){
          status.textContent='Image non envoyée : supprimez et réinsérez cette image pour enregistrer.';
          return false;
        }
        failedImages.delete(d.id);
      }
      d.doc=doc;
      const payload={...d,doc:cleanDoc(d.doc,true)};
      try{
        await BACKEND.save(payload);
        if(current()?.id===payload.id)status.textContent='Brouillon et images enregistrés sur Supabase';
        return true;
      }catch(err){
        status.textContent='ERREUR : brouillon non sauvegardé. Utilisez « Exporter le brouillon ».';
        report('Sauvegarde distante refusée : '+String(err?.message||err));
        return false;
      }
    }
    try{
      localStorage.setItem(KEY,JSON.stringify({selectedId:selected,drafts:drafts.map(d=>({...d,doc:cleanDoc(d.doc,true)}))}));
      status.textContent='Texte enregistré localement · images du PC temporaires';
    }catch{status.textContent='Stockage local impossible : exportez votre article.';}
    return true;
  }
  function changed(){
    const d=current();if(!d)return;
    d.doc=readEditor();d.updatedAt=Date.now();
    status.textContent='Enregistrement du brouillon…';
    listDrafts();
    clearTimeout(timer);timer=setTimeout(store,400);
  }
  function listDrafts(){
    const list=$('#editor-draft-list');list.replaceChildren();
    for(const d of drafts){
      const button=el('button','phasma-editor-draft');button.type='button';
      button.dataset.draftId=d.id;
      button.setAttribute('aria-current',String(d.id===selected));
      button.append(el('span','phasma-editor-draft-title',d.title.trim()||'Article sans titre'),
        el('span','phasma-editor-draft-meta',(d.publishedId?'Révision · ':'Brouillon · ')+new Date(d.updatedAt).toLocaleDateString('fr-FR')));
      list.append(button);
    }
  }
  let publications=Array.isArray(BACKEND?.published)?BACKEND.published:[];
  function editablePublications(){
    return publications.filter(item=>BACKEND?.canEditAll||item.author_id===BACKEND?.viewerId);
  }
  function renderPublications(){
    const list=$('#editor-published-list');
    if(!list)return;
    list.replaceChildren();
    const items=editablePublications();
    if(!items.length){
      list.append(el('p','phasma-editor-sidebar-note','Aucune publication de test.'));
      return;
    }
    for(const item of items){
      const wrapper=el('div','phasma-editor-publication');
      const edit=el('button','phasma-editor-draft');
      edit.type='button';edit.dataset.publicationId=item.id;
      edit.append(el('span','phasma-editor-draft-title',item.payload?.title||item.slug),
        el('span','phasma-editor-draft-meta',item.status==='published'?'Publié sur le site':'Retiré du site'));
      wrapper.append(edit);
      if(item.status==='published'){
        const link=el('a','phasma-editor-published-link','Voir l’article');
        link.href='../../index.html#phasmophobia/news/'+encodeURIComponent(item.slug);
        link.target='_blank';link.rel='noopener noreferrer';
        wrapper.append(link);
        const off=el('button','phasma-editor-unpublish','Retirer du site');
        off.type='button';off.dataset.unpublishId=item.id;wrapper.append(off);
      }
      list.append(wrapper);
    }
  }
  async function refreshPublications(){
    if(!BACKEND?.listPublished)return;
    publications=await BACKEND.listPublished();
    renderPublications();
  }
  function revisionFromPublished(item){
    const p=item.payload||{};
    const d=newDraft();
    for(const key of ['title','excerpt','translator','sourceUrl','cover'])
      if(typeof p[key]==='string')d[key]=p[key];
    d.publishedAt=item.published_on||today();
    d.slug=item.slug;d.slugCustomized=true;
    d.publishedId=item.id;d.publishedSlug=item.slug;
    d.doc=cleanDoc(p.document,true);
    return d;
  }
  function coverUrl(){
    const d=current();
    return covers.get(d?.id)||url(d?.cover,'image');
  }
  function picture(parent,src,cls){
    const image=el('img',cls);image.alt='';
    image.referrerPolicy='no-referrer';
    setImageSource(image,src);
    image.addEventListener('error',()=>{image.remove();parent.append(el('p','phasma-editor-image-error','Image inaccessible depuis ce site.'));},{once:true});
    parent.append(image);
  }
  function coverPreview(){
    const target=$('#editor-cover-preview');target.replaceChildren();
    const src=coverUrl();
    if(src)picture(target,src,'phasma-editor-img-preview');
    else target.append(el('p','phasma-editor-media-placeholder','Aucune couverture sélectionnée.'));
  }
  function showDraft(id,save=true){
    if(timer)store();
    selected=id;const d=current();if(!d)return;
    buildDoc(root,d.doc);
    for(const input of document.querySelectorAll('#editor-form [data-field]'))input.value=d[input.dataset.field]||'';
    $('#editor-cover-upload').value='';
    coverPreview();listDrafts();showPreview(false);
    const publishButton=$('#editor-publish');
    if(publishButton)publishButton.textContent=d.publishedId?'Mettre à jour sur le site':'Publier sur le site';
    if(save)store();
  }
  function showPreview(on){
    $('#editor-form').hidden=on;$('#editor-preview').hidden=!on;
    for(const [id,state] of [['editor-mode-edit',!on],['editor-mode-preview',on]]){
      const btn=$('#'+id);btn.setAttribute('aria-pressed',String(state));
      btn.classList.toggle('phasma-editor-btn--selected',state);
    }
    if(!on)return;
    const d=current();d.doc=readEditor();
    const head=$('#wys-preview-heading'),foot=$('#wys-preview-source'),body=$('#wys-preview-body');
    head.replaceChildren();foot.replaceChildren();body.replaceChildren();
    head.append(el('span','eyebrow','ACTUALITÉ PHASMOPHOBIA · APERÇU NON PUBLIÉ'),
      el('h2','phasma-news-reader-title',d.title||'Titre de l’article'),
      el('p','phasma-news-article-date','Publié le '+(d.publishedAt||today())));
    if(coverUrl())picture(head,coverUrl(),'phasma-news-article-cover');
    const surface=el('div','tiptap');buildDoc(surface,d.doc);body.append(surface);
    if(d.translator)foot.append(el('p','','Traduction française : '+d.translator));
    foot.append(el('p','','Source : '+(d.sourceUrl||'à compléter')));
  }
  function command(command,value){
    root.focus();
    try{
      const ok=document.execCommand(command,false,value||undefined);
      if(!ok)report('Commande non disponible dans ce navigateur : '+command+'.');
      else report('');
      changed();updateToolbar();
    }catch(error){report('Mise en forme indisponible : '+String(error.message||error));}
  }
  function selectionInside(){
    const selection=window.getSelection();
    return selection?.rangeCount&&root.contains(selection.anchorNode);
  }
  function updateToolbar(){
    const map={bold:'bold',italic:'italic',underline:'underline','align-left':'justifyLeft',
      'align-center':'justifyCenter','align-right':'justifyRight',
      'bullet-list':'insertUnorderedList','ordered-list':'insertOrderedList'};
    for(const button of toolbar.querySelectorAll('[data-format]')){
      const key=map[button.dataset.format];
      if(!key)continue;
      let enabled=false;
      if(selectionInside())try{enabled=document.queryCommandState(key);}catch{}
      button.setAttribute('aria-pressed',String(enabled));
    }
    const s=$('#wys-block-style');
    if(!s||!selectionInside())return;
    try{
      const tag=String(document.queryCommandValue('formatBlock')).toLowerCase();
      s.value=tag.includes('h2')?'heading-2':tag.includes('h3')?'heading-3':'paragraph';
    }catch{}
  }
  function insertImage(src){
    if(!src)return;
    root.focus();
    // Les images restent dans le flux du texte, au point d'insertion.
    const ok=document.execCommand('insertImage',false,src);
    if(!ok){report('Impossible d’insérer l’image dans le navigateur.');return;}
    changed();updateToolbar();
  }
  function insertYoutube(videoId){
    if(!validVideoId(videoId))return;
    restoreSelection();
    root.focus();
    const selection=window.getSelection();
    let target=selection?.rangeCount?selection.getRangeAt(0).startContainer:null;
    if(target?.nodeType===Node.TEXT_NODE)target=target.parentNode;
    while(target&&target!==root&&target.parentNode!==root)target=target.parentNode;
    const card=youtubeCard(videoId,true);
    const after=target&&target!==root?target.nextSibling:null;
    root.insertBefore(card,after);
    const next=el('p');
    next.append(document.createElement('br'));
    root.insertBefore(next,card.nextSibling);
    if(selection){
      const caret=document.createRange();
      caret.selectNodeContents(next);caret.collapse(true);
      selection.removeAllRanges();selection.addRange(caret);
      savedRange=caret.cloneRange();
    }
    changed();
    report('');
  }
  function fileImage(file,isCover=false){
    if(!file)return;
    if(!MIME.includes(file.type)||file.size>MAX_IMAGE||file.size===0){
      report('Image refusée : choisissez PNG, JPEG, WebP animé ou GIF (maximum 10 Mo).',true);
      return;
    }
    const d=current();if(!d)return;
    const src=URL.createObjectURL(file);tempUrls.add(src);
    if(isCover){
      const old=covers.get(d.id);
      if(old){URL.revokeObjectURL(old);tempUrls.delete(old);}
      covers.set(d.id,src);d.cover='';$('[data-field="cover"]').value='';
      coverPreview();
    }else insertImage(src);
    report('');
    if(!BACKEND){if(isCover)store();return;}
    const job=BACKEND.uploadImage(file).then(ref=>{
      if(isCover){
        if(covers.get(d.id)===src){
          d.cover=ref;covers.delete(d.id);
          if(current()?.id===d.id){
            $('[data-field="cover"]').value=ref;coverPreview();
          }
        }
      }else{
        const replaceInDoc=entry=>{
          if(!entry||typeof entry!=='object')return;
          if(entry.type==='image'&&entry.attrs?.src===src)entry.attrs.src=ref;
          for(const child of entry.content||[])replaceInDoc(child);
        };
        replaceInDoc(d.doc);
        if(current()?.id===d.id){
          for(const img of root.querySelectorAll('img')){
            if(img.getAttribute('src')===src)img.dataset.remoteImage=ref;
          }
          d.doc=readEditor();
        }
      }
      d.updatedAt=Date.now();
      listDrafts();
      if(current()?.id===d.id)status.textContent='Image envoyée, enregistrement du brouillon…';
      return ref;
    }).catch(err=>{
      if(!failedImages.has(d.id))failedImages.set(d.id,new Set());
      failedImages.get(d.id).add(src);
      if(current()?.id===d.id){
        status.textContent='Image non enregistrée sur Supabase';
        report('Envoi de l’image impossible : '+String(err?.message||err));
      }
      throw err;
    });
    if(!pendingImages.has(d.id))pendingImages.set(d.id,new Set());
    pendingImages.get(d.id).add(job);
    job.then(()=>pendingImages.get(d.id)?.delete(job),()=>pendingImages.get(d.id)?.delete(job));
    job.catch(()=>{});
    if(isCover)store();
  }
  // Lorsqu'on clique une zone vide, placer le curseur à la fin du document.
  root.addEventListener('mousedown',event=>{
    if(event.target!==root)return;
    root.focus();
    const selection=window.getSelection(),range=document.createRange();
    range.selectNodeContents(root);range.collapse(false);
    selection.removeAllRanges();selection.addRange(range);
    savedRange=range.cloneRange();
  });
  root.addEventListener('input',changed);
  root.addEventListener('keyup',updateToolbar);
  document.addEventListener('selectionchange',()=>{
    if(selectionInside()){
      const selection=window.getSelection();
      savedRange=selection.getRangeAt(0).cloneRange();
      updateToolbar();
    }
  });
  toolbar.addEventListener('mousedown',event=>{
    if(event.target.closest('button'))event.preventDefault();
  });
  function restoreSelection(){
    if(!savedRange||!root.contains(savedRange.startContainer))return;
    const selection=window.getSelection();
    selection.removeAllRanges();selection.addRange(savedRange);
  }
  toolbar.addEventListener('click',event=>{
    const button=event.target.closest('[data-format]');
    if(!button)return;
    restoreSelection();
    const key=button.dataset.format;
    const methods={bold:'bold',italic:'italic',underline:'underline',
      'align-left':'justifyLeft','align-center':'justifyCenter','align-right':'justifyRight',
      'bullet-list':'insertUnorderedList','ordered-list':'insertOrderedList',
      undo:'undo',redo:'redo'};
    if(methods[key]){command(methods[key]);return;}
    if(key==='link'){
      const text=prompt('Adresse du lien HTTPS :','');
      if(text===null)return;
      const href=url(text);
      if(!href){report('Lien invalide. Utilisez http:// ou https://.');return;}
      restoreSelection();
      const selection=window.getSelection();
      if(!selection?.rangeCount||!root.contains(selection.anchorNode)){
        root.focus();
        command('insertText',href);
        return;
      }
      if(selection.isCollapsed){
        // Aucun texte sélectionné : créer directement un lien cliquable.
        const link=el('a','',href);
        link.href=href;link.target='_blank';link.rel='noopener noreferrer';
        const range=selection.getRangeAt(0);
        range.insertNode(link);
        range.setStartAfter(link);range.collapse(true);
        selection.removeAllRanges();selection.addRange(range);
        changed();updateToolbar();
      }else command('createLink',href);
    }
  });
  $('#wys-block-style').addEventListener('change',event=>{
    restoreSelection();
    const val={'paragraph':'p','heading-2':'h2','heading-3':'h3'}[event.target.value]||'p';
    command('formatBlock',val);
  });
  const videoButton=$('#wys-video-youtube');
  if(videoButton)videoButton.addEventListener('click',()=>{
    const address=prompt('Collez le lien YouTube (vidéo, Shorts ou lien youtu.be) :','');
    if(address===null)return;
    const id=youtubeId(address);
    if(!id){
      report('Lien vidéo invalide : utilisez une URL YouTube ou youtu.be en HTTPS.',true);
      return;
    }
    insertYoutube(id);
  });
  $('#wys-image-pc').addEventListener('click',()=>$('#wys-image-file').click());
  $('#wys-image-file').addEventListener('change',event=>{
    restoreSelection();fileImage(event.target.files?.[0]);event.target.value='';
  });
  $('#wys-image-url').addEventListener('click',()=>{
    const response=prompt('Collez l’URL HTTPS directe de l’image :','');
    if(response===null)return;
    const src=url(response,'image');
    if(!src){report('Adresse invalide : image HTTPS hors SVG attendue.');return;}
    restoreSelection();insertImage(src);
  });
  root.addEventListener('paste',event=>{
    const file=Array.from(event.clipboardData?.files||[]).find(f=>MIME.includes(f.type));
    if(file){event.preventDefault();fileImage(file);return;}
    // Le texte Discord est collé sans styles étrangers (scripts et HTML exclus).
    const text=event.clipboardData?.getData('text/plain');
    if(text!==undefined){event.preventDefault();document.execCommand('insertText',false,text);changed();}
  });
  root.addEventListener('drop',event=>{
    const file=Array.from(event.dataTransfer?.files||[]).find(f=>MIME.includes(f.type));
    if(file){event.preventDefault();fileImage(file);}
  });
  document.querySelectorAll('#editor-form [data-field]').forEach(input=>{
    input.addEventListener('input',()=>{
      const d=current();if(!d)return;d[input.dataset.field]=input.value;
      input.removeAttribute('aria-invalid');
      if(input.dataset.field==='title'&&!d.slugCustomized){
        d.slug=slugify(d.title);$('[data-field="slug"]').value=d.slug;
      }
      if(input.dataset.field==='slug')d.slugCustomized=true;
      if(input.dataset.field==='cover'){
        const old=covers.get(d.id);
        if(old){covers.delete(d.id);tempUrls.delete(old);URL.revokeObjectURL(old);}
      }
      d.updatedAt=Date.now();clearTimeout(timer);timer=setTimeout(store,400);listDrafts();
    });
  });
  $('[data-field="cover"]').addEventListener('change',coverPreview);
  $('#editor-cover-upload').addEventListener('change',event=>{
    fileImage(event.target.files?.[0],true);event.target.value='';
  });
  $('#editor-new').addEventListener('click',()=>{
    if(drafts.length>=MAX_DRAFTS){report('Limite de 40 brouillons locaux atteinte.');return;}
    const d=newDraft();drafts.unshift(d);showDraft(d.id);root.focus();
  });
  $('#editor-draft-list').addEventListener('click',event=>{
    const btn=event.target.closest('[data-draft-id]');
    if(!btn||btn.dataset.draftId===selected)return;
    const d=current();if(d)d.doc=readEditor();
    showDraft(btn.dataset.draftId);
  });
  const publishedList=$('#editor-published-list');
  if(publishedList)publishedList.addEventListener('click',async event=>{
    const edit=event.target.closest('[data-publication-id]');
    const off=event.target.closest('[data-unpublish-id]');
    if(edit){
      const item=editablePublications().find(item=>item.id===edit.dataset.publicationId);
      if(!item)return;
      const draft=drafts.find(d=>d.publishedId===item.id)||revisionFromPublished(item);
      if(!drafts.includes(draft)){
        if(drafts.length>=MAX_DRAFTS){report('Limite de brouillons atteinte.');return;}
        drafts.unshift(draft);
      }
      const prev=current();if(prev)prev.doc=readEditor();
      showDraft(draft.id);
      report('Révision ouverte : les visiteurs verront toujours la version précédente jusqu’à « Mettre à jour ».');
    }
    if(off){
      const item=editablePublications().find(item=>item.id===off.dataset.unpublishId);
      if(!item||item.status!=='published')return;
      if(!confirm('Retirer « '+(item.payload?.title||item.slug)+' » du blog officiel ?'))return;
      off.disabled=true;
      try{
        await BACKEND.unpublish(item.id);
        await refreshPublications();
        report('Article retiré du site. Le brouillon et ses images privées sont conservés.');
      }catch(error){
        report('Retrait impossible : '+String(error.message||error));
      }finally{off.disabled=false;}
    }
  });
  function validateBeforePublishing(d){
    const fields=[
      ['title','Indiquez le titre de l’article.',v=>!!v.trim()&&v.trim().length<=160],
      ['excerpt','Indiquez un résumé pour la vignette.',v=>!!v.trim()&&v.trim().length<=350],
      ['publishedAt','Choisissez une date de publication.',v=>/^\d{4}-\d{2}-\d{2}$/.test(v)],
      ['sourceUrl','Indiquez le lien HTTPS de l’annonce originale Kinetic Games (rubrique /news).',v=>{
        try{
          const u=new URL(v.trim());
          return u.protocol==='https:'&&!u.username&&!u.password&&
            ['kineticgames.co.uk','www.kineticgames.co.uk'].includes(u.hostname)&&
            (u.pathname==='/news'||u.pathname.startsWith('/news/'));
        }catch{return false;}
      }],
      ['slug','L’identifiant de l’article doit contenir uniquement des minuscules, chiffres et tirets.',v=>/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v)&&v.length<=100]
    ];
    for(const [key,message,test] of fields){
      const input=$('[data-field="'+key+'"]');
      if(!test(String(d[key]||''))){
        input?.setAttribute('aria-invalid','true');
        report(message,true);
        return false;
      }
      input?.removeAttribute('aria-invalid');
    }
    if(d.publishedId && d.publishedSlug!==d.slug){
      $('[data-field="slug"]')?.setAttribute('aria-invalid','true');
      report('L’identifiant d’un article déjà publié doit rester identique pour préserver son lien.',true);
      return false;
    }
    return true;
  }
  const publishButton=$('#editor-publish');
  if(publishButton)publishButton.addEventListener('click',async()=>{
    const d=current();if(!d||!BACKEND?.publish)return;
    d.doc=readEditor();
    if(!validateBeforePublishing(d))return;
    report('');
    if(!d.publishedId&&!confirm('Publier cet article sur le SITE OFFICIEL ? Il sera visible par tous les visiteurs du site.'))return;
    publishButton.disabled=true;
    try{
      const saved=await store();
      if(!saved)throw new Error('Le brouillon n’a pas été sauvegardé. Corrigez les erreurs avant publication.');
      status.textContent='Préparation des images publiques et publication en cours…';
      const result=await BACKEND.publish(d);
      d.publishedId=result.id;d.publishedSlug=result.slug;
      const again=await store();
      if(!again)report('Article publié, mais association au brouillon non sauvegardée. Conservez son lien.');
      else report('');
      await refreshPublications();
      if(current()?.id===d.id){
        publishButton.textContent='Mettre à jour sur le site';
        status.textContent='Article '+(again?'publié':'publié (sauvegarde de la liaison à vérifier)')+' sur le site officiel !';
      }
    }catch(error){
      report('Publication impossible : '+String(error.message||error),true);
      status.textContent='Échec de la publication. Le brouillon reste enregistré séparément.';
    }finally{publishButton.disabled=false;}
  });
  $('#editor-mode-edit').addEventListener('click',()=>showPreview(false));
  $('#editor-mode-preview').addEventListener('click',()=>{const d=current();if(d)d.doc=readEditor();store();showPreview(true);});
  $('#editor-delete').addEventListener('click',()=>{
    const d=current();
    if(!d||!confirm('Supprimer le brouillon « '+(d.title||'sans titre')+' » ?'))return;
    drafts=drafts.filter(x=>x.id!==d.id);
    if(!drafts.length)drafts=[newDraft()];
    if(BACKEND){
      BACKEND.remove(d.id).catch(err=>report('Suppression serveur refusée : '+String(err.message||err)));
    }
    showDraft(drafts[0].id);
  });
  const importButton=$('#editor-import');
  const importFile=$('#editor-import-file');
  if(importButton&&importFile){
    importButton.addEventListener('click',()=>importFile.click());
    importFile.addEventListener('change',async event=>{
      const file=event.target.files?.[0];
      importFile.value='';
      if(!file)return;
      importButton.disabled=true;
      try{
        if(!/\.json$/i.test(file.name)&&file.type!=='application/json')
          throw new Error('Sélectionnez un fichier .json exporté depuis le bureau de rédaction.');
        if(file.size===0||file.size>1200000)
          throw new Error('Fichier JSON vide ou trop volumineux (maximum 1,2 Mo).');
        if(drafts.length>=MAX_DRAFTS)
          throw new Error('La limite de 40 brouillons est atteinte.');
        const raw=JSON.parse(await file.text());
        if(!raw||raw.schemaVersion!==2||raw.status!=='draft'||!raw.article||
          typeof raw.article!=='object'||Array.isArray(raw.article)||
          !raw.article.document||raw.article.document.type!=='doc'||
          !Array.isArray(raw.article.document.content))
          throw new Error('Format non reconnu : importez un brouillon JSON exporté par cet éditeur.');
        if(typeof raw.article.title!=='string')
          throw new Error('Le titre du brouillon est manquant.');
        const imported=readDraft({
          ...raw.article,doc:raw.article.document,
          slugCustomized:!!raw.article.slug,
          publishedId:null,publishedSlug:null
        });
        // Toujours créer un nouveau brouillon : l'import n'écrase pas le
        // brouillon courant et ne restaure pas une publication existante.
        imported.id=uid();
        imported.publishedId=null;
        imported.publishedSlug=null;
        imported.updatedAt=Date.now();
        const previous=current();
        if(previous)previous.doc=readEditor();
        drafts.unshift(imported);
        showDraft(imported.id,false);
        const ok=await store();
        if(!ok)throw new Error('Le brouillon importé est affiché mais sa sauvegarde a échoué. Réessayez avec Enregistrer.');
        status.textContent='Brouillon JSON importé et enregistré sur Supabase.';
        report('');
      }catch(err){
        report('Import JSON impossible : '+String(err?.message||err),true);
      }finally{
        importButton.disabled=false;
      }
    });
  }
  $('#editor-export').addEventListener('click',async()=>{
    const d=current();if(!d)return;
    d.doc=readEditor();
    if(BACKEND)await store();
    else store();
    if(BACKEND&&failedImages.get(d.id)?.size){
      report('Export différé : une image a échoué à être envoyée. Supprimez-la et réinsérez-la.');return;
    }
    const data={schemaVersion:2,status:'draft',localPrototype:!BACKEND,
      note:BACKEND
        ?'Brouillon privé, non publié. Les images privées sont référencées par chemin Supabase ; le fichier JSON ne contient pas leurs octets et ne permet pas une consultation hors connexion.'
        :'Document JSON en brouillon uniquement. Images PC à réinsérer, aucune publication effectuée.',
      article:{slug:d.slug,title:d.title,excerpt:d.excerpt,publishedAt:d.publishedAt,
        translator:d.translator,sourceUrl:d.sourceUrl,cover:d.cover,document:cleanDoc(d.doc,true)}};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const src=URL.createObjectURL(blob),a=el('a');
    a.href=src;a.download=(slugify(d.slug)||'brouillon-phasmo')+'.json';a.click();
    setTimeout(()=>URL.revokeObjectURL(src),1000);
    status.textContent='Brouillon exporté, non publié.';
  });
  const saveButton=$('#editor-save-now');
  if(saveButton)saveButton.addEventListener('click',async()=>{
    const d=current();
    if(!d)return;
    d.doc=readEditor();
    saveButton.disabled=true;
    try{await store();}finally{saveButton.disabled=false;}
  });
  window.addEventListener('pagehide',()=>{const d=current();if(d)d.doc=readEditor();if(timer)store();});
  root.setAttribute('contenteditable','true');
  root.setAttribute('spellcheck','true');
  root.setAttribute('role','textbox');
  root.setAttribute('aria-multiline','true');
  root.classList.add('tiptap');
  load();showDraft(selected);renderPublications();updateToolbar();
})();
