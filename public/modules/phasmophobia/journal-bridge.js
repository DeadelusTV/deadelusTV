'use strict';
/* Carnet brun V4.3 : une visionneuse distincte de l'atelier.
 * Les éditions faites dans l'atelier sont locales au navigateur en attendant
 * la publication sécurisée des fiches via Supabase (travail ultérieur).
 */
(() => {
  const dialog = document.getElementById('phasma-book-dialog');
  const frame = document.getElementById('phasma-book-frame');
  const close = dialog?.querySelector('[data-phasma-close]');
  const home = dialog?.querySelector('[data-phasma-home]');
  const zoomOut = dialog?.querySelector('[data-phasma-zoom-out]');
  const zoomIn = dialog?.querySelector('[data-phasma-zoom-in]');
  const zoomReset = dialog?.querySelector('[data-phasma-zoom-reset]');
  const zoomLabel = dialog?.querySelector('[data-phasma-zoom-label]');
  if (!dialog || !frame || !close || !home || !zoomOut || !zoomIn || !zoomReset || !zoomLabel) return;
  const openers = [...document.querySelectorAll('[data-phasma-open]')];
  const topics = [...document.querySelectorAll('[data-phasma-open-category]')];
  const allowed = new Set(['sommaire','entites','cartes','objets','equipements','divers']);
  let opener = null;
  let pendingPage = 'sommaire';
  let frameReady = false;
  let zoomPercent = 100;
  function sendZoom() {
    if(!frameReady || !frame.contentWindow)return;
    frame.contentWindow.postMessage({type:'deadelustv:journal-zoom',scale:zoomPercent/100},location.origin);
  }
  function setZoom(value,send=true){
    if(!Number.isFinite(value))return;
    zoomPercent=Math.round(Math.min(300,Math.max(100,value)));
    zoomLabel.textContent=zoomPercent+' %';
    zoomOut.disabled=zoomPercent<=100;
    zoomIn.disabled=zoomPercent>=300;
    zoomReset.disabled=zoomPercent<=100;
    if(send)sendZoom();
  }
  function navigate(category) {
    pendingPage = allowed.has(category) ? category : 'sommaire';
    if (!frameReady || !frame.contentWindow) return;
    frame.contentWindow.postMessage({
      type:'deadelustv:journal-nav',
      category:pendingPage
    }, location.origin);
  }
  function open(category, trigger) {
    if (dialog.open) return navigate(category);
    opener = trigger;
    pendingPage = allowed.has(category) ? category : 'sommaire';
    setZoom(100,false);
    dialog.showModal();
    document.body.classList.add('dialog-open');
    if (!frame.src) {
      // Ressource chargée seulement quand un visiteur ouvre le carnet.
      frame.src = frame.dataset.src;
    } else {
      navigate(pendingPage);
      sendZoom();
    }
    close.focus();
  }
  openers.forEach(node => node.addEventListener('click', () => open('sommaire',node)));
  topics.forEach(node => node.addEventListener('click', () => open(node.dataset.phasmaOpenCategory,node)));
  window.addEventListener('message', event => {
    if (event.origin!==location.origin || event.source!==frame.contentWindow) return;
    if (event.data?.type==='deadelustv:journal-ready') {
      frameReady = true;
      navigate(pendingPage);
      sendZoom();
    }else if(event.data?.type==='deadelustv:journal-zoom-state'&&dialog.open){
      const scale=Number(event.data.scale);
      if(Number.isFinite(scale))setZoom(scale*100,false);
    }
  });
  frame.addEventListener('load', () => { /* 'ready' is emitted after the editor initializes. */ });
  home.addEventListener('click', () => navigate('sommaire'));
  zoomOut.addEventListener('click',()=>setZoom(zoomPercent-25));
  zoomIn.addEventListener('click',()=>setZoom(zoomPercent+25));
  zoomReset.addEventListener('click',()=>setZoom(100));
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('dialog-open');
    if (opener?.isConnected) opener.focus({preventScroll:true});
    opener = null;
  });
  window.addEventListener('hashchange', () => { if (dialog.open) dialog.close(); });
})();

