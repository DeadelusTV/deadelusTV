'use strict';
/* Prototype de rédaction WYSIWYG Phasmo, sans authentification ni publication.
   Le JS utilise Tiptap 3 via modules CDN, pour rester compatible avec le site statique.
   NE PAS réutiliser le stockage navigateur comme base de publication. */
(async () => {
  const $ = selector => document.querySelector(selector);
  const root = $('#wys-editor');
  const status = $('#editor-save-status');
  const errorBox = $('#wys-editor-error');
  if (!root || !status || !errorBox) return;
  const KEY = 'deadelustv.phasmo.editor.wysiwyg.v1';
  const LEGACY_KEY = 'deadelustv.phasmo.editor.demo.v1';
  const MAX_FILE_BYTES = 2 * 1024 * 1024;
  const MAX_DRAFTS = 40;
  const MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const temporary = new Set();
  const coverFiles = new Map();

  function el(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = String(text);
    return element;
  }
  function report(text) {
    errorBox.textContent = text;
    errorBox.hidden = !text;
  }
  function normalizedUrl(value, mode = 'link') {
    if (typeof value !== 'string' || value.length > 2048) return '';
    const candidate = value.trim();
    if (mode === 'image' && /^assets\/phasmo-news\/[a-zA-Z0-9/_-]+\.(?:png|jpg|jpeg|webp)$/i.test(candidate) && !candidate.includes('..')) {
      return '../../' + candidate;
    }
    if (mode === 'image' && candidate.startsWith('blob:') && temporary.has(candidate)) return candidate;
    try {
      const u = new URL(candidate);
      if (u.username || u.password || !u.hostname) return '';
      if (mode === 'image' && u.protocol !== 'https:') return '';
      if (mode === 'link' && !['https:', 'http:'].includes(u.protocol)) return '';
      if (mode === 'image' && /\.svg$/i.test(u.pathname)) return '';
      return u.href;
    } catch { return ''; }
  }
  function defaultDoc() { return {type:'doc', content:[{type:'paragraph'}]}; }
  function paragraph(text) {
    return {type:'paragraph', content:text ? [{type:'text', text:String(text).slice(0,15000)}] : []};
  }
  function scrubDoc(doc, persist = true) {
    let visited = 0;
    const limit = 1500;
    const nodeNames = new Set(['doc','paragraph','heading','text','image','bulletList','orderedList','listItem','hardBreak','blockquote','horizontalRule','codeBlock']);
    const markNames = new Set(['bold','italic','underline','strike','code']);
    function clean(raw, depth) {
      if (!raw || typeof raw !== 'object' || depth > 15 || ++visited > limit ||
          !nodeNames.has(raw.type)) return null;
      if (raw.type === 'text') {
        const value = typeof raw.text === 'string' ? raw.text.slice(0,25000) : '';
        if (!value) return null;
        const marks = (Array.isArray(raw.marks) ? raw.marks : []).slice(0,12).map(mark => {
          if (!mark || typeof mark.type !== 'string') return null;
          if (markNames.has(mark.type)) return {type:mark.type};
          if (mark.type === 'link') {
            const href = normalizedUrl(mark.attrs?.href);
            return href ? {type:'link',attrs:{href,target:'_blank',rel:'noopener noreferrer'}} : null;
          }
          return null;
        }).filter(Boolean);
        return {type:'text', text:value, ...(marks.length ? {marks} : {})};
      }
      if (raw.type === 'image') {
        const src = normalizedUrl(raw.attrs?.src, 'image');
        if (!src || (persist && src.startsWith('blob:')))
          return paragraph('Image temporaire du PC : réinsérez le fichier avant publication.');
        return {type:'image',attrs:{src,
          alt:typeof raw.attrs?.alt === 'string' ? raw.attrs.alt.slice(0,180) : '',
          title:typeof raw.attrs?.title === 'string' ? raw.attrs.title.slice(0,120) : ''}};
      }
      const out = {type:raw.type};
      if (raw.type === 'heading') out.attrs = {level:raw.attrs?.level === 3 ? 3 : 2};
      if (['heading','paragraph'].includes(raw.type) &&
          ['left','center','right'].includes(raw.attrs?.textAlign)) {
        out.attrs = {...(out.attrs || {}),textAlign:raw.attrs.textAlign};
      }
      if (Array.isArray(raw.content)) {
        const children = raw.content.map(child => clean(child,depth+1)).filter(Boolean);
        if (children.length) out.content = children;
      }
      return out;
    }
    const safe = clean(doc,0);
    if (!safe || safe.type !== 'doc' || !safe.content?.length) return defaultDoc();
    return safe;
  }
  function convertLegacy(draft) {
    const doc = [];
    for (const b of (Array.isArray(draft.blocks) ? draft.blocks : []).slice(0,150)) {
      if (!b || typeof b !== 'object') continue;
      if (b.type === 'paragraph') doc.push(paragraph(b.text));
      if (b.type === 'heading') doc.push({type:'heading',attrs:{level:2},content:paragraph(b.text).content});
      if (b.type === 'list') {
        const items = String(b.items || '').split('\n').map(x=>x.trim()).filter(Boolean)
          .slice(0,100).map(x=>({type:'listItem',content:[paragraph(x)]}));
        if (items.length) doc.push({type:'bulletList',content:items});
      }
      if (b.type === 'image') {
        const src = normalizedUrl(b.src,'image');
        if (src) doc.push({type:'image',attrs:{src,alt:String(b.alt||'').slice(0,180)}});
        else doc.push(paragraph('Image du brouillon précédent : fichier à réinsérer.'));
        if (typeof b.caption === 'string' && b.caption.trim())
          doc.push(paragraph(b.caption));
      }
    }
    return {type:'doc',content:doc.length?doc:[paragraph('')]};
  }
  let uidNum = 0;
  function uid() {
    return globalThis.crypto?.randomUUID?.() || ('local-' + Date.now() + '-' + (++uidNum));
  }
  function slugify(value) {
    return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,100);
  }
  function newDraft() {
    return {id:uid(),title:'',excerpt:'',publishedAt:new Date().toISOString().slice(0,10),
      translator:'',sourceUrl:'',slug:'',slugCustomized:false,cover:'',
      updatedAt:Date.now(),doc:defaultDoc()};
  }
  function readDraft(raw, fromLegacy = false) {
    if (!raw || typeof raw !== 'object') return null;
    const out = newDraft();
    if (typeof raw.id === 'string') out.id = raw.id.slice(0,130);
    for (const field of ['title','excerpt','publishedAt','translator','sourceUrl','slug','cover'])
      if (typeof raw[field] === 'string') out[field] = raw[field].slice(0,field==='excerpt'?350:2048);
    out.slugCustomized = raw.slugCustomized === true;
    if (Number.isFinite(raw.updatedAt)) out.updatedAt = raw.updatedAt;
    out.doc = scrubDoc(fromLegacy ? convertLegacy(raw) : raw.doc,true);
    return out;
  }
  let drafts=[], selectedId=null, saveTimer=null, editor=null, previewEditor=null;
  function current() { return drafts.find(item=>item.id===selectedId); }
  function loadDrafts() {
    let incoming;
    try {
      const newRaw = localStorage.getItem(KEY);
      const originalRaw = newRaw || localStorage.getItem(LEGACY_KEY);
      incoming = originalRaw ? JSON.parse(originalRaw) : null;
      const fromLegacy = !newRaw;
      if (Array.isArray(incoming?.drafts)) {
        drafts = incoming.drafts.slice(0,MAX_DRAFTS).map(d=>readDraft(d,fromLegacy)).filter(Boolean);
        selectedId = incoming.selectedId;
        if (fromLegacy && drafts.length)
          status.textContent = 'Anciens brouillons retrouvés : ils sont conservés dans leur emplacement d’origine.';
      }
    } catch {
      status.textContent = 'Impossible de lire les brouillons enregistrés localement.';
    }
    if (!drafts.length) drafts = [newDraft()];
    if (!current()) selectedId=drafts[0].id;
  }
  function syncFromEditor() {
    const d = current();
    if (d && editor) d.doc=editor.getJSON();
  }
  function persist() {
    clearTimeout(saveTimer);
    saveTimer=null;
    try {
      localStorage.setItem(KEY,JSON.stringify({selectedId,drafts:drafts.map(d=>({
        ...d,doc:scrubDoc(d.doc,true)
      }))}));
      status.textContent='Texte sauvegardé ici · les images PC restent temporaires';
    } catch {
      status.textContent='Sauvegarde impossible : exportez votre brouillon pour éviter une perte de texte.';
    }
  }
  function modified() {
    const d=current();
    if (!d) return;
    d.updatedAt=Date.now();
    status.textContent='Enregistrement du brouillon…';
    renderList();
    clearTimeout(saveTimer);
    saveTimer=setTimeout(persist,450);
  }
  function renderList() {
    const list=$('#editor-draft-list');
    list.replaceChildren();
    for (const d of drafts) {
      const button=el('button','phasma-editor-draft');
      button.type='button';
      button.dataset.draftId=d.id;
      button.setAttribute('aria-current',String(d.id===selectedId));
      button.append(
        el('span','phasma-editor-draft-title',d.title.trim()||'Article sans titre'),
        el('span','phasma-editor-draft-meta',
          'Brouillon · '+new Date(d.updatedAt).toLocaleDateString('fr-FR'))
      );
      list.append(button);
    }
  }
  function putFields() {
    const d=current();
    for (const input of document.querySelectorAll('#editor-form [data-field]'))
      input.value = d?.[input.dataset.field]||'';
    $('#editor-cover-upload').value='';
    renderCoverPreview();
  }
  function coverUrl() {
    const d=current();
    return (d&&coverFiles.get(d.id)) || normalizedUrl(d?.cover,'image');
  }
  function addPicture(box,url,className='',alt='') {
    const img=el('img',className);
    img.src=url;
    img.alt=alt;
    img.loading='lazy';
    img.referrerPolicy='no-referrer';
    img.addEventListener('error',()=>{
      img.remove();
      box.append(el('p','phasma-editor-image-error','L’image ne peut pas être affichée à cette adresse.'));
    },{once:true});
    box.append(img);
  }
  function renderCoverPreview() {
    const box=$('#editor-cover-preview');
    if(!box)return;
    box.replaceChildren();
    const src=coverUrl();
    if(src) addPicture(box,src,'phasma-editor-img-preview','Aperçu de la couverture');
    else box.append(el('p','phasma-editor-media-placeholder','Aucune couverture sélectionnée.'));
  }
  function applyImageFile(file,isCover=false) {
    if(!file)return;
    if(!MEDIA_TYPES.includes(file.type)||file.size>MAX_FILE_BYTES||!file.size){
      report('Choisissez une image JPEG, PNG ou WebP de moins de 2 Mo.');
      return;
    }
    const blob=URL.createObjectURL(file);
    temporary.add(blob);
    report('');
    if(isCover){
      const d=current();
      const existing=coverFiles.get(d.id);
      if(existing){URL.revokeObjectURL(existing);temporary.delete(existing);}
      coverFiles.set(d.id,blob);
      d.cover='';
      $('[data-field="cover"]').value='';
      renderCoverPreview();
      modified();
    }else {
      editor.chain().focus().setImage({src:blob,alt:file.name.slice(0,180)})
        .insertContent({type:'paragraph'}).run();
      report('Image insérée pour cette session. Elle devra être réinsérée après rechargement de la page.');
    }
  }
  function showDraft(id, initialLoad = false) {
    if (saveTimer)persist();
    // Important : ne pas écraser le document sauvegardé par l'éditeur vierge
    // lors de la toute première ouverture du prototype.
    if (!initialLoad) syncFromEditor();
    selectedId=id;
    const d=current();
    if(!d)return;
    editor.commands.setContent(d.doc,{emitUpdate:false});
    putFields();
    renderList();
    showPreview(false);
    persist();
  }
  function dateLabel(value) {
    const date=new Date(value+'T12:00:00Z');
    return Number.isNaN(date.valueOf())?value:
      new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(date);
  }
  function showPreview(enabled) {
    $('#editor-form').hidden=enabled;
    $('#editor-preview').hidden=!enabled;
    for(const [id,state] of [['editor-mode-edit',!enabled],['editor-mode-preview',enabled]]){
      const button=$('#'+id);
      button.setAttribute('aria-pressed',String(state));
      button.classList.toggle('phasma-editor-btn--selected',state);
    }
    if(!enabled)return;
    syncFromEditor();
    const d=current();
    const head=$('#wys-preview-heading'),foot=$('#wys-preview-source');
    head.replaceChildren();foot.replaceChildren();
    head.append(
      el('span','eyebrow','ACTUALITÉ PHASMOPHOBIA · APERÇU NON PUBLIÉ'),
      el('h2','phasma-news-reader-title',d.title||'Titre de votre article'),
      el('p','phasma-news-article-date','Publié le '+dateLabel(d.publishedAt))
    );
    const src=coverUrl();
    if(src)addPicture(head,src,'phasma-news-article-cover','');
    previewEditor.commands.setContent(d.doc,{emitUpdate:false});
    if(d.translator)foot.append(el('p','','Traduction française : '+d.translator));
    const source=normalizedUrl(d.sourceUrl,'link');
    if(source&&new URL(source).hostname.match(/^(?:www\.)?kineticgames\.co\.uk$/)){
      const a=el('a','','Consulter la source originale chez Kinetic Games ↗');
      a.href=source;a.target='_blank';a.rel='noopener noreferrer';
      foot.append(a);
    }else foot.append(el('p','','Lien de source à compléter.'));
    const missing=[];
    if(!d.title.trim())missing.push('titre');
    if(!d.excerpt.trim())missing.push('résumé');
    if(!d.slug.trim())missing.push('identifiant');
    if(!source)missing.push('lien source');
    if(missing.length)foot.append(el('p','phasma-editor-image-error',
      'Avant publication : renseignez '+missing.join(', ')+'.'));
  }
  function updateToolbar() {
    if(!editor)return;
    const tests={
      bold:editor.isActive('bold'),italic:editor.isActive('italic'),
      underline:editor.isActive('underline'),
      'align-left':editor.isActive({textAlign:'left'}),
      'align-center':editor.isActive({textAlign:'center'}),
      'align-right':editor.isActive({textAlign:'right'}),
      'bullet-list':editor.isActive('bulletList'),
      'ordered-list':editor.isActive('orderedList'),
      link:editor.isActive('link')
    };
    for(const btn of document.querySelectorAll('#wys-toolbar [data-format]')){
      if(btn.dataset.format in tests)
        btn.setAttribute('aria-pressed',String(tests[btn.dataset.format]));
      if(btn.dataset.format==='undo')btn.disabled=!editor.can().undo();
      if(btn.dataset.format==='redo')btn.disabled=!editor.can().redo();
    }
    const heading=$('#wys-block-style');
    if(heading)
      heading.value=editor.isActive('heading',{level:2})?'heading-2':
        editor.isActive('heading',{level:3})?'heading-3':'paragraph';
  }

  // Le prototype reste utilisable même si les scripts externes sont indisponibles :
  // une erreur explicite est affichée plutôt qu'un champ silencieusement inerte.
  let Editor,StarterKit,Image,TextAlign;
  try {
    const [core,starter,image,textalign]=await Promise.all([
      import('https://cdn.jsdelivr.net/npm/@tiptap/core@3.31.3/+esm'),
      import('https://cdn.jsdelivr.net/npm/@tiptap/starter-kit@3.31.3/+esm'),
      import('https://cdn.jsdelivr.net/npm/@tiptap/extension-image@3.31.3/+esm'),
      import('https://cdn.jsdelivr.net/npm/@tiptap/extension-text-align@3.31.3/+esm')
    ]);
    Editor=core.Editor;
    StarterKit=starter.default||starter.StarterKit;
    Image=image.default||image.Image;
    TextAlign=textalign.default||textalign.TextAlign;
    if(!Editor||!StarterKit||!Image||!TextAlign)throw new Error('Modules incomplets');
  }catch(err){
    root.replaceChildren(el('p','phasma-wysiwyg-library-error',
      'L’éditeur n’a pas pu se charger. Vérifiez votre connexion Internet, désactivez temporairement les bloqueurs du CDN ou rechargez la page.'));
    status.textContent='Éditeur non chargé : aucun brouillon n’a été modifié.';
    console.error('Impossible de charger Tiptap:',err);
    for(const button of document.querySelectorAll('#editor-form button,#editor-mode-preview,#editor-export'))
      button.disabled=true;
    return;
  }
  const extensions=[
    StarterKit.configure({
      heading:{levels:[2,3]},
      link:{openOnClick:false,autolink:true,
        isAllowedUri:(url,ctx)=>ctx.defaultValidate(url)&&!!normalizedUrl(url,'link')},
    }),
    Image.configure({inline:false,allowBase64:false}),
    TextAlign.configure({types:['paragraph','heading'],alignments:['left','center','right']})
  ];
  editor=new Editor({
    element:root,
    extensions,
    content:defaultDoc(),
    editorProps:{
      attributes:{'aria-label':'Texte de l’article, modifiable comme dans un traitement de texte',spellcheck:'true'},
      handlePaste:(view,event)=>{
        const file=Array.from(event.clipboardData?.files||[]).find(f=>MEDIA_TYPES.includes(f.type));
        if(!file)return false;event.preventDefault();applyImageFile(file);return true;
      },
      handleDrop:(view,event)=>{
        const file=Array.from(event.dataTransfer?.files||[]).find(f=>MEDIA_TYPES.includes(f.type));
        if(!file)return false;
        event.preventDefault();
        const point=view.posAtCoords({left:event.clientX,top:event.clientY});
        if(point)editor.commands.setTextSelection(point.pos);
        applyImageFile(file);
        return true;
      }
    },
    onUpdate:({editor:instance})=>{
      const d=current();
      if(!d)return;
      d.doc=instance.getJSON();
      modified();
      updateToolbar();
    },
    onSelectionUpdate:updateToolbar
  });
  previewEditor=new Editor({
    element:$('#wys-preview-body'),
    extensions,
    content:defaultDoc(),
    editable:false,
    editorProps:{attributes:{'aria-label':'Aperçu de votre article'}}
  });
  loadDrafts();
  showDraft(selectedId, true);
  updateToolbar();
  $('#editor-new').addEventListener('click',()=>{
    if(drafts.length>=MAX_DRAFTS){report('Limite de 40 brouillons locaux atteinte.');return;}
    const d=newDraft();drafts.unshift(d);showDraft(d.id);editor.commands.focus();
  });
  $('#editor-draft-list').addEventListener('click',event=>{
    const button=event.target.closest('[data-draft-id]');
    if(button&&button.dataset.draftId!==selectedId)showDraft(button.dataset.draftId);
  });
  document.querySelectorAll('#editor-form [data-field]').forEach(input=>
    input.addEventListener('input',()=>{
      const d=current();if(!d)return;
      d[input.dataset.field]=input.value;
      if(input.dataset.field==='title'&&!d.slugCustomized){
        d.slug=slugify(d.title);$('[data-field="slug"]').value=d.slug;
      }
      if(input.dataset.field==='slug')d.slugCustomized=true;
      if(input.dataset.field==='cover'){
        const old=coverFiles.get(d.id);
        if(old){coverFiles.delete(d.id);temporary.delete(old);URL.revokeObjectURL(old);}
      }
      modified();
    })
  );
  $('[data-field="cover"]').addEventListener('change',renderCoverPreview);
  $('#editor-cover-upload').addEventListener('change',event=>{
    applyImageFile(event.target.files?.[0],true);
    event.target.value='';
  });
  $('#wys-toolbar').addEventListener('mousedown',event=>{
    if(event.target.closest('button'))event.preventDefault();
  });
  $('#wys-toolbar').addEventListener('click',event=>{
    const button=event.target.closest('[data-format]');
    if(!button||button.disabled)return;
    const t=button.dataset.format;
    const c=editor.chain().focus();
    if(t==='bold')c.toggleBold().run();
    else if(t==='italic')c.toggleItalic().run();
    else if(t==='underline')c.toggleUnderline().run();
    else if(t==='align-left')c.setTextAlign('left').run();
    else if(t==='align-center')c.setTextAlign('center').run();
    else if(t==='align-right')c.setTextAlign('right').run();
    else if(t==='bullet-list')c.toggleBulletList().run();
    else if(t==='ordered-list')c.toggleOrderedList().run();
    else if(t==='undo')c.undo().run();
    else if(t==='redo')c.redo().run();
    else if(t==='link'){
      const old=editor.getAttributes('link').href||'';
      const response=prompt('Adresse du lien HTTPS : (laisser vide pour supprimer le lien)',old);
      if(response===null)return;
      if(!response.trim()){c.unsetLink().run();return;}
      const href=normalizedUrl(response,'link');
      if(!href){report('Lien invalide : utilisez une adresse http:// ou https://.');return;}
      report('');
      if(editor.state.selection.empty){
        c.insertContent({type:'text',text:href,marks:[{type:'link',attrs:{href,target:'_blank',rel:'noopener noreferrer'}}]}).run();
      }else c.setLink({href,target:'_blank',rel:'noopener noreferrer'}).run();
    }
    updateToolbar();
  });
  $('#wys-block-style').addEventListener('change',event=>{
    if(event.target.value==='paragraph')editor.chain().focus().setParagraph().run();
    else editor.chain().focus().toggleHeading({level:event.target.value==='heading-3'?3:2}).run();
    updateToolbar();
  });
  $('#wys-image-pc').addEventListener('click',()=>$('#wys-image-file').click());
  $('#wys-image-file').addEventListener('change',event=>{
    applyImageFile(event.target.files?.[0]);
    event.target.value='';
  });
  $('#wys-image-url').addEventListener('click',()=>{
    const response=prompt('Collez le lien direct HTTPS de l’image :','');
    if(response===null)return;
    const src=normalizedUrl(response,'image');
    if(!src){report('URL d’image invalide. Utilisez un lien HTTPS direct vers une image (hors SVG).');return;}
    report('');
    editor.chain().focus().setImage({src}).insertContent({type:'paragraph'}).run();
  });
  $('#editor-mode-edit').addEventListener('click',()=>showPreview(false));
  $('#editor-mode-preview').addEventListener('click',()=>{syncFromEditor();persist();showPreview(true);});
  $('#editor-delete').addEventListener('click',()=>{
    const d=current();
    if(!d||!confirm('Supprimer ce brouillon local « '+(d.title||'sans titre')+' » ?'))return;
    drafts=drafts.filter(x=>x.id!==d.id);
    const cover=coverFiles.get(d.id);
    if(cover){URL.revokeObjectURL(cover);temporary.delete(cover);coverFiles.delete(d.id);}
    if(!drafts.length)drafts=[newDraft()];
    selectedId=drafts[0].id;showDraft(selectedId);
  });
  $('#editor-export').addEventListener('click',()=>{
    syncFromEditor();persist();
    const d=current();
    const data={
      schemaVersion:2,status:'draft',localPrototype:true,
      note:'Export de brouillon. Les images PC sont temporaires et remplacées par une note à réinsérer. Publication impossible depuis ce prototype.',
      article:{slug:d.slug,title:d.title,excerpt:d.excerpt,publishedAt:d.publishedAt,
        translator:d.translator,sourceUrl:d.sourceUrl,cover:d.cover,
        document:scrubDoc(d.doc,true)}
    };
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=el('a');a.href=url;a.download=(slugify(d.slug)||'brouillon-phasmo')+'.json';
    a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    status.textContent='Brouillon exporté. Aucun article n’a été publié.';
  });
  window.addEventListener('pagehide',()=>{
    syncFromEditor();if(saveTimer)persist();
    for(const url of temporary)URL.revokeObjectURL(url);
    editor.destroy();previewEditor.destroy();
  });
})();
