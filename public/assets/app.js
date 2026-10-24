'use strict';
const CONFIG = window.DEADELUSTV_CONFIG;
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
$$('[data-link]').forEach(a=>{if(CONFIG[a.dataset.link])a.href=CONFIG[a.dataset.link];});
const nav=$('#main-nav'), menu=$('.menu-toggle');
function closeMenu(){nav.classList.remove('is-open');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Ouvrir le menu');}
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';nav.classList.toggle('is-open',open);menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Fermer le menu':'Ouvrir le menu');});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.getAttribute('aria-expanded')==='true'){closeMenu();menu.focus();}});
document.addEventListener('click',e=>{if(!e.target.closest('.site-header'))closeMenu();});
const routeTitles={'accueil':'Le repaire de la communauté','jeux-de-role':'Jeux de rôle','crewmongus':'Crewmongus','tcg':'Trading Card Game','phasmophobia':'Phasmophobia'};
const player=$('#player-shell'), playerInitial=player.innerHTML;
let activeRoute='accueil';
function route(focus=false){
  const requested=location.hash.slice(1)||'accueil';
  if(requested==='main-content'){ $('#main-content').focus();return; }
  const name=Object.hasOwn(routeTitles,requested)?requested:'accueil';
  if(activeRoute==='accueil'&&name!=='accueil'&&player.querySelector('iframe'))resetPlayer();
  $$('[data-page]').forEach(section=>section.hidden=section.dataset.page!==name);
  $$('[data-nav]').forEach(a=>{const current=a.dataset.nav===name;if(current)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  document.title='DeadelusTV — '+routeTitles[name];activeRoute=name;closeMenu();
  if(focus){window.scrollTo({top:0,behavior:'instant'});const h=$('[data-page="'+name+'"] h1');if(h)h.focus({preventScroll:true});}
}
window.addEventListener('hashchange',()=>route(true));route();
$$('a[href="#accueil"]').forEach(a=>a.addEventListener('click',()=>{if(activeRoute==='accueil')window.scrollTo({top:0,behavior:'smooth'});}));
$('#back-top').addEventListener('click',()=>{window.scrollTo({top:0,behavior:'smooth'});$('.brand').focus({preventScroll:true});});
const modalTriggers=new WeakMap();
function openDialog(id,trigger){const dialog=document.getElementById(id);if(!dialog)return;modalTriggers.set(dialog,trigger||document.activeElement);dialog.showModal();document.body.classList.add('dialog-open');}
$$('[data-dialog]').forEach(button=>button.addEventListener('click',()=>openDialog(button.dataset.dialog,button)));
$$('dialog').forEach(dialog=>{
  dialog.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>dialog.close()));
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  dialog.addEventListener('close',()=>{document.body.classList.remove('dialog-open');const trigger=modalTriggers.get(dialog);if(trigger&&trigger.isConnected)trigger.focus();});
});
function isEmbeddable(){return (location.protocol==='https:'||['localhost','127.0.0.1'].includes(location.hostname))&&player.getBoundingClientRect().width>=400;}
function liveNote(){const note=$('#embed-note span');if(location.protocol==='file:')note.textContent='Dans cet aperçu local, le live s’ouvre sur Twitch.';else if(isEmbeddable())note.textContent='Lancer la lecture ici ou rejoindre le live et le chat sur Twitch.';else note.textContent='Retrouve le live et le chat directement sur Twitch.';}
function bindPlayer(){const b=$('#play-live');if(b)b.addEventListener('click',()=>{
  if(!isEmbeddable()){
    $('#live-dialog-copy').textContent=location.protocol==='file:'?'Dans cette version ouverte en local, retrouve le live, le chat et les replays directement sur la chaîne.':'Retrouve le live, le chat et les replays sur Twitch. Sur cet écran, ouvre directement la chaîne pour profiter du lecteur et du chat.';
    openDialog('live-dialog',b);return;
  }
  const src=new URL('https://player.twitch.tv/');src.searchParams.set('channel',CONFIG.channel);src.searchParams.set('parent',location.hostname);src.searchParams.set('autoplay','false');src.searchParams.set('muted','false');
  CONFIG.twitchExtraParents.forEach(parent=>src.searchParams.append('parent',parent));
  const iframe=document.createElement('iframe');iframe.src=src.href;iframe.title='Lecteur Twitch de DeadelusTV';iframe.allow='autoplay; fullscreen';iframe.allowFullscreen=true;iframe.referrerPolicy='strict-origin-when-cross-origin';
  player.replaceChildren(iframe);player.classList.add('is-playing');
  $('#embed-note span').textContent='Le lecteur ne démarre pas ? Le bouton « Ouvrir sur Twitch » reste disponible.';
});}
function resetPlayer(){player.innerHTML=playerInitial;player.classList.remove('is-playing');bindPlayer();liveNote();}
bindPlayer();liveNote();
window.addEventListener('resize',()=>{if(activeRoute!=='accueil')return;if(player.querySelector('iframe')&&player.getBoundingClientRect().width<400)resetPlayer();else if(!player.querySelector('iframe'))liveNote();if(window.innerWidth>900)closeMenu();});
const booster=$('#open-booster');let revealed=false,boosterTimer;
booster.addEventListener('click',()=>{
  clearTimeout(boosterTimer);revealed=!revealed;
  $$('.trading-card').forEach(card=>{card.classList.toggle('revealed',revealed);card.querySelector('.card-front').setAttribute('aria-hidden',String(!revealed));});
  booster.innerHTML=revealed?'Rejouer l’animation':'Ouvrir le booster de démo <svg class="icon stroke"><use href="#i-arrow"/></svg>';
  $('#demo-result').textContent='';
  if(revealed)boosterTimer=setTimeout(()=>{$('#demo-result').textContent='Le capitaine · Rare — Dans l’ombre · Épique — Le fidèle du Crew · Commune';},1100);
});

// Réseaux flottants, repris depuis le pied de page
(() => {
  const footerSocials = document.querySelector('.site-footer .socials');
  if (!footerSocials) return;

  const floatingSocials = footerSocials.cloneNode(true);
  floatingSocials.classList.add('floating-socials');
  floatingSocials.setAttribute('aria-label', 'Accès rapide aux réseaux');

  floatingSocials.querySelectorAll('a').forEach(link => {
    const name = link.textContent.trim();
    const icon = link.querySelector('svg');

    link.setAttribute('aria-label', name + ' (nouvel onglet)');
    link.title = name;

    if (icon) link.replaceChildren(icon);
  });

  floatingSocials.hidden = true;
  document.body.append(floatingSocials);
  document.body.classList.add('has-floating-socials');

  const mobile = window.matchMedia('(max-width: 900px)');
  let footerVisible = false;

  function updateSocials() {
    floatingSocials.hidden = footerVisible;;
  }

  const observer = new IntersectionObserver(entries => {
    const entry = entries[entries.length - 1];
    footerVisible = entry.isIntersecting && entry.intersectionRatio >= 1;
    updateSocials();
  }, { threshold: [0, 1] });

  observer.observe(footerSocials);
  mobile.addEventListener('change', updateSocials);
  updateSocials();
})();
