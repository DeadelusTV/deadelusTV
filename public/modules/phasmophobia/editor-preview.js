'use strict';
/* PROTOTYPE LOCAL UNIQUEMENT.
   Pas de Supabase, pas de connexion, pas d'API de publication.
   Ne jamais déduire les permissions de l'affichage de cette page. */
(() => {
  const KEY = 'deadelustv.phasmo.editor.demo.v1';
  const $ = selector => document.querySelector(selector);
  const draftList = $('#editor-draft-list');
  const blocksRoot = $('#editor-blocks');
  const status = $('#editor-save-status');
  const form = $('#editor-form');
  const preview = $('#editor-preview');
  const previewRoot = $('#editor-preview-article');
  if (!draftList || !blocksRoot || !status || !form || !preview || !previewRoot) return;

  const BLOCK_TYPES = new Set(['paragraph', 'heading', 'list', 'image']);
  const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
  const validAsset = path => typeof path === 'string' &&
    /^assets\/phasmo-news\/[a-zA-Z0-9/_-]+\.(?:webp|png|jpg|jpeg)$/.test(path) &&
    !path.includes('..');
  const imageUrl = path => validAsset(path) ? '../../' + path : '';
  const temporaryImages = new Map();
  let drafts = [];
  let selectedId = null;
  let showingPreview = false;
  let saveTimer = null;
  let counter = 0;
  const uid = () => (globalThis.crypto && typeof crypto.randomUUID === 'function')
    ? crypto.randomUUID() : 'local-' + Date.now() + '-' + (++counter);
  const today = () => new Date().toISOString().slice(0, 10);
  const slugify = text => String(text || '').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100);

  function node(tag, className, text) {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (text !== undefined) n.textContent = String(text);
    return n;
  }
  function action(label, command, value, extra) {
    const b = node('button', 'phasma-editor-btn' + (extra ? ' ' + extra : ''), label);
    b.type = 'button';
    b.dataset[command] = value;
    return b;
  }
  function plainBlock(type) {
    return { id: uid(), type, text: '', items: '', src: '', alt: '', caption: '' };
  }
  function createDraft() {
    return {
      id: uid(), title: '', excerpt: '', publishedAt: today(),
      translator: '', sourceUrl: '', slug: '', slugCustomized: false,
      cover: '', updatedAt: Date.now(), blocks: [plainBlock('paragraph')]
    };
  }
  function cleanDraft(raw) {
    if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string') return null;
    const d = createDraft();
    d.id = raw.id;
    for (const k of ['title', 'excerpt', 'publishedAt', 'translator', 'sourceUrl', 'slug', 'cover']) {
      d[k] = typeof raw[k] === 'string' ? raw[k].slice(0, k === 'excerpt' ? 350 : 12000) : d[k];
    }
    d.slugCustomized = raw.slugCustomized === true;
    d.updatedAt = Number.isFinite(raw.updatedAt) ? raw.updatedAt : Date.now();
    d.blocks = Array.isArray(raw.blocks) ? raw.blocks.slice(0, 150).map(block => {
      if (!block || !BLOCK_TYPES.has(block.type)) return null;
      const b = plainBlock(block.type);
      b.id = typeof block.id === 'string' ? block.id : uid();
      for (const k of ['text','items','src','alt','caption']) {
        b[k] = typeof block[k] === 'string' ? block[k].slice(0, 30000) : '';
      }
      return b;
    }).filter(Boolean) : [plainBlock('paragraph')];
    return d;
  }
  function current() { return drafts.find(d => d.id === selectedId); }

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (raw && Array.isArray(raw.drafts)) {
        drafts = raw.drafts.slice(0, 40).map(cleanDraft).filter(Boolean);
        selectedId = typeof raw.selectedId === 'string' ? raw.selectedId : null;
      }
    } catch { status.textContent = 'Stockage local inaccessible : ce prototype ne garantit pas la sauvegarde.'; }
    if (!drafts.length) drafts = [createDraft()];
    if (!current()) selectedId = drafts[0].id;
  }
  function persist() {
    clearTimeout(saveTimer);
    saveTimer = null;
    try {
      localStorage.setItem(KEY, JSON.stringify({drafts, selectedId}));
      status.textContent = 'Brouillon sauvegardé dans ce navigateur uniquement';
    } catch {
      status.textContent = 'Sauvegarde locale impossible. Exportez votre brouillon pour le conserver.';
    }
  }
  function changed() {
    const d = current();
    if (!d) return;
    d.updatedAt = Date.now();
    status.textContent = 'Modifications locales non encore enregistrées…';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 350);
    renderDraftList();
  }
  function titleFor(d) { return (d.title || '').trim() || 'Article sans titre'; }
  function renderDraftList() {
    draftList.replaceChildren();
    drafts.forEach(d => {
      const btn = node('button', 'phasma-editor-draft');
      btn.type = 'button';
      btn.dataset.draftId = d.id;
      btn.setAttribute('aria-current', String(d.id === selectedId));
      const label = node('span', 'phasma-editor-draft-title', titleFor(d));
      const when = new Date(d.updatedAt);
      const text = Number.isNaN(when.valueOf()) ? 'Brouillon local'
        : 'Brouillon · ' + when.toLocaleDateString('fr-FR');
      btn.append(label, node('span', 'phasma-editor-draft-meta', text));
      draftList.append(btn);
    });
  }
  function renderFields() {
    const d = current();
    if (!d) return;
    document.querySelectorAll('#editor-form [data-field]').forEach(input => {
      input.value = d[input.dataset.field] || '';
    });
    $('#editor-cover-upload').value = '';
  }
  function blockInput(label, field, value, blockId, rows) {
    const wrapper = node('label');
    wrapper.textContent = label;
    const input = rows ? node('textarea') : node('input');
    if (rows) input.rows = rows;
    if (!rows) input.type = 'text';
    input.dataset.blockField = field;
    input.dataset.blockId = blockId;
    input.value = value || '';
    if (field === 'src') input.placeholder = 'assets/phasmo-news/illustration.webp';
    if (field === 'items') input.placeholder = 'Un élément de liste par ligne';
    wrapper.append(input);
    return wrapper;
  }
  function renderBlocks() {
    blocksRoot.replaceChildren();
    const d = current();
    if (!d) return;
    d.blocks.forEach((block, i) => {
      const section = node('section', 'phasma-editor-block');
      section.dataset.block = block.id;
      const bar = node('div', 'phasma-editor-block-bar');
      const names = {paragraph:'Paragraphe', heading:'Intertitre', list:'Liste', image:'Image'};
      bar.append(node('span', 'phasma-editor-block-label', (i + 1) + '. ' + names[block.type]));
      const controls = node('div', 'phasma-editor-block-controls');
      const up = action('↑ Monter', 'move', block.id + ':up');
      const down = action('↓ Descendre', 'move', block.id + ':down');
      up.disabled = i === 0;
      down.disabled = i === d.blocks.length - 1;
      controls.append(up, down, action('Supprimer', 'removeBlock', block.id, 'phasma-editor-btn--danger'));
      bar.append(controls);
      section.append(bar);
      const fields = node('div', 'phasma-editor-block-fields');
      if (block.type === 'paragraph') {
        fields.append(blockInput('Texte du paragraphe', 'text', block.text, block.id, 6));
      } else if (block.type === 'heading') {
        fields.append(blockInput('Texte de l’intertitre', 'text', block.text, block.id));
      } else if (block.type === 'list') {
        fields.append(blockInput('Éléments de la liste', 'items', block.items, block.id, 5));
      } else if (block.type === 'image') {
        fields.append(blockInput('Chemin du média (pour la publication future)', 'src', block.src, block.id));
        fields.append(blockInput('Description de l’image (accessibilité)', 'alt', block.alt, block.id));
        fields.append(blockInput('Légende facultative', 'caption', block.caption, block.id));
        const uploader = node('label');
        uploader.textContent = 'Tester une image depuis votre ordinateur (temporaire, 2 Mo max)';
        const input = node('input');
        input.type = 'file';
        input.accept = 'image/png,image/jpeg,image/webp';
        input.dataset.imageUpload = block.id;
        uploader.append(input);
        fields.append(uploader);
        const src = temporaryImages.get(d.id + ':' + block.id) || imageUrl(block.src);
        if (src) {
          const img = node('img', 'phasma-editor-img-preview');
          img.src = src;
          img.alt = block.alt || 'Image pour l’aperçu';
          fields.append(img);
        }
      }
      section.append(fields);
      blocksRoot.append(section);
    });
  }
  function showDraft(id) {
    if (saveTimer) persist();
    selectedId = id;
    renderDraftList();
    renderFields();
    renderBlocks();
    setPreviewMode(false);
  }
  function setPreviewMode(value) {
    showingPreview = value;
    form.hidden = value;
    preview.hidden = !value;
    $('#editor-mode-edit').setAttribute('aria-pressed', String(!value));
    $('#editor-mode-preview').setAttribute('aria-pressed', String(value));
    $('#editor-mode-edit').classList.toggle('phasma-editor-btn--selected', !value);
    $('#editor-mode-preview').classList.toggle('phasma-editor-btn--selected', value);
    if (value) renderPreview();
  }
  function dateFR(value) {
    const date = new Date(value + 'T12:00:00Z');
    return isNaN(date.valueOf()) ? 'Date à compléter'
      : new Intl.DateTimeFormat('fr-FR', {dateStyle: 'long', timeZone: 'UTC'}).format(date);
  }
  function renderPreview() {
    previewRoot.replaceChildren();
    const d = current();
    if (!d) return;
    const missing = [];
    if (!d.title.trim()) missing.push('titre');
    if (!d.excerpt.trim()) missing.push('résumé');
    if (!/^https:\/\/(?:www\.)?kineticgames\.co\.uk\/news(?:\/|$)/.test(d.sourceUrl)) missing.push('source Kinetic');
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(d.slug)) missing.push('identifiant');
    if (missing.length) {
      previewRoot.append(node('p', 'phasma-editor-preview-hint',
        'Avant une publication réelle, complétez : ' + missing.join(', ') + '.'));
    }
    previewRoot.append(
      node('span','eyebrow','ACTUALITÉ PHASMOPHOBIA · APERÇU'),
      node('h2','phasma-news-reader-title',d.title || 'Titre de l’article'),
      node('p','phasma-news-article-date','Publié le ' + dateFR(d.publishedAt))
    );
    const coverUrl = temporaryImages.get(d.id + ':cover') || imageUrl(d.cover);
    if (coverUrl) {
      const cover = node('img','phasma-news-article-cover');
      cover.src = coverUrl; cover.alt = '';
      previewRoot.append(cover);
    }
    const body = node('article','phasma-news-article');
    d.blocks.forEach(block => {
      if (block.type === 'paragraph') {
        body.append(node('p','phasma-news-article-paragraph',block.text || '…'));
      } else if (block.type === 'heading') {
        body.append(node('h4','phasma-news-article-heading',block.text || 'Intertitre'));
      } else if (block.type === 'list') {
        const list = node('ul','phasma-news-article-list');
        block.items.split('\n').map(x => x.trim()).filter(Boolean).forEach(x => list.append(node('li','',x)));
        body.append(list);
      } else if (block.type === 'image') {
        const fig = node('figure','phasma-news-article-figure');
        const src = temporaryImages.get(d.id + ':' + block.id) || imageUrl(block.src);
        if (src) {
          const img = node('img');
          img.src = src;
          img.alt = block.alt || '';
          fig.append(img);
        } else fig.append(node('p','phasma-news-empty','Image à choisir'));
        if (block.caption) fig.append(node('figcaption','',block.caption));
        body.append(fig);
      }
    });
    previewRoot.append(body);
    const credits = node('div','phasma-news-credits');
    if (d.translator) credits.append(node('p','','Traduction française : ' + d.translator));
    credits.append(node('span','','Source : ' + (d.sourceUrl || 'à renseigner')));
    previewRoot.append(credits);
  }

  $('#editor-new').addEventListener('click', () => {
    if (drafts.length >= 40) { status.textContent = 'Limite de 40 brouillons locaux atteinte.'; return; }
    const d = createDraft();
    drafts.unshift(d); persist(); showDraft(d.id);
  });
  draftList.addEventListener('click', event => {
    const b = event.target.closest('[data-draft-id]');
    if (b && current()?.id !== b.dataset.draftId) showDraft(b.dataset.draftId);
  });
  $('#editor-mode-edit').addEventListener('click', () => setPreviewMode(false));
  $('#editor-mode-preview').addEventListener('click', () => {if (saveTimer) persist(); setPreviewMode(true);});
  form.addEventListener('input', event => {
    const d = current();
    if (!d) return;
    const field = event.target.dataset.field;
    if (field) {
      d[field] = event.target.value;
      if (field === 'slug') d.slugCustomized = true;
      if (field === 'title' && !d.slugCustomized) {
        d.slug = slugify(d.title);
        const slug = $('[data-field="slug"]');
        if (slug) slug.value = d.slug;
      }
      changed();
      return;
    }
    const blockField = event.target.dataset.blockField;
    const blockId = event.target.dataset.blockId;
    if (blockField && blockId) {
      const b = d.blocks.find(x => x.id === blockId);
      if (b) { b[blockField] = event.target.value; changed(); }
    }
  });
  document.querySelector('.phasma-editor-add').addEventListener('click', event => {
    const b = event.target.closest('[data-add]');
    if (!b || !BLOCK_TYPES.has(b.dataset.add)) return;
    current().blocks.push(plainBlock(b.dataset.add));
    changed(); renderBlocks();
    blocksRoot.lastElementChild?.querySelector('textarea,input')?.focus();
  });
  blocksRoot.addEventListener('click', event => {
    const d = current();
    const remove = event.target.closest('[data-remove-block]');
    const move = event.target.closest('[data-move]');
    if (remove) {
      const index = d.blocks.findIndex(b => b.id === remove.dataset.removeBlock);
      if (index < 0 || !confirm('Supprimer ce bloc du brouillon local ?')) return;
      const [deleted] = d.blocks.splice(index, 1);
      const key = d.id + ':' + deleted.id;
      if (temporaryImages.has(key)) URL.revokeObjectURL(temporaryImages.get(key));
      temporaryImages.delete(key);
      changed(); renderBlocks();
    } else if (move) {
      const [id, dir] = move.dataset.move.split(':');
      const index = d.blocks.findIndex(b => b.id === id);
      const next = index + (dir === 'up' ? -1 : 1);
      if (index < 0 || next < 0 || next >= d.blocks.length) return;
      [d.blocks[index], d.blocks[next]] = [d.blocks[next], d.blocks[index]];
      changed(); renderBlocks();
    }
  });
  function registerImage(file, key) {
    if (!file) return false;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > MAX_IMAGE_BYTES) {
      status.textContent = 'Image non acceptée : utilisez JPG, PNG ou WebP de moins de 2 Mo.';
      return false;
    }
    if (temporaryImages.has(key)) URL.revokeObjectURL(temporaryImages.get(key));
    temporaryImages.set(key, URL.createObjectURL(file));
    status.textContent = 'Image chargée pour cet aperçu uniquement : elle ne sera pas enregistrée.';
    return true;
  }
  $('#editor-cover-upload').addEventListener('change', event => {
    if (registerImage(event.target.files?.[0], current().id + ':cover')) changed();
  });
  blocksRoot.addEventListener('change', event => {
    const blockId = event.target.dataset.imageUpload;
    if (!blockId) return;
    if (registerImage(event.target.files?.[0], current().id + ':' + blockId)) {
      changed(); renderBlocks();
    }
  });
  $('#editor-delete').addEventListener('click', () => {
    const d = current();
    if (!d || !confirm('Supprimer « ' + titleFor(d) + ' » de ce navigateur ? Cette action est définitive.')) return;
    drafts = drafts.filter(x => x.id !== d.id);
    for (const [key, url] of temporaryImages) {
      if (key.startsWith(d.id + ':')) { URL.revokeObjectURL(url); temporaryImages.delete(key); }
    }
    if (!drafts.length) drafts = [createDraft()];
    selectedId = drafts[0].id;
    persist(); showDraft(selectedId);
  });
  $('#editor-export').addEventListener('click', () => {
    if (saveTimer) persist();
    const d = current();
    const exportData = {
      schemaVersion: 1, status: 'draft', localPrototype: true,
      note: 'Brouillon local de démonstration. Aucun média temporaire inclus, aucune publication effectuée.',
      article: {
        slug: d.slug, title: d.title, excerpt: d.excerpt, publishedAt: d.publishedAt,
        translator: d.translator, sourceUrl: d.sourceUrl, cover: d.cover,
        blocks: d.blocks.map(b => b.type === 'list'
          ? {type:'list', items:b.items.split('\n').map(s => s.trim()).filter(Boolean)}
          : b.type === 'image'
            ? {type:'image', src:b.src, alt:b.alt, caption:b.caption}
            : {type:b.type, text:b.text})
      }
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(exportData, null, 2)], {type:'application/json'}));
    const a = node('a');
    a.href = url; a.download = (d.slug || 'brouillon-phasmo') + '.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = 'Brouillon exporté en JSON. Il ne s’agit pas d’une publication.';
  });
  window.addEventListener('pagehide', () => {
    if (saveTimer) persist();
    for (const url of temporaryImages.values()) URL.revokeObjectURL(url);
  });
  load(); renderDraftList(); renderFields(); renderBlocks();
})();
