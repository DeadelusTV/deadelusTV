'use strict';
const CONFIG = window.DEADELUSTV_CONFIG;
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
$$('[data-link]').forEach(a=>{if(CONFIG[a.dataset.link])a.href=CONFIG[a.dataset.link];});
const nav=$('#main-nav'), menu=$('.menu-toggle');
function closeMenu(){nav.classList.remove('is-open');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Ouvrir le menu');}
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';nav.classList.toggle('is-open',open);menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Fermer le menu':'Ouvrir le menu');});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.getAttribute('aria-expanded')==='true'){closeMenu();menu.focus();}});
document.addEventListener('click',e=>{if(!e.target.closest('.site-header'))closeMenu();});
const routeTitles={'accueil':'Le repaire de la communauté','jeux-de-role':'Pavillon Noir','crewmongus':'Crewmongus','tcg':'Trading Card Game','phasmophobia':'Phasmophobia','pavillon-noir':'Pavillon Noir','mentions-legales':'Mentions légales','confidentialite':'Politique de confidentialité','conditions-utilisation':'Conditions générales d’utilisation','conditions-vente':'Conditions générales de vente','politique-cookies':'Politique de cookies'};
const player=$('#player-shell');
let activeRoute='accueil';
function route(focus=false){
  const requested=location.hash.slice(1)||'accueil';
  if(requested==='main-content'){ $('#main-content').focus();return; }
  const isCampaign=requested==='jeux-de-role'||requested==='pavillon-noir'||requested.startsWith('pavillon-noir/');
  const authHash=new URLSearchParams(location.hash.slice(1));
  const authQuery=new URLSearchParams(location.search);
  const crewAuth=window.DEADELUSTV_CREW_AUTH===true||authQuery.get('crew_auth')==='1'||authHash.has('access_token')||['invite','recovery'].includes(authHash.get('type'));
  if(crewAuth)window.DEADELUSTV_CREW_AUTH=true;
  const isCrew=crewAuth||requested==='crewmongus'||requested.startsWith('crewmongus/');
  const isPhasmoNews=requested==='phasmophobia/news'||requested.startsWith('phasmophobia/news/');
  const name=isCrew?'crewmongus':isCampaign?'pavillon-noir':isPhasmoNews?'phasmophobia':Object.hasOwn(routeTitles,requested)?requested:'accueil';
  const navName=isCampaign&&!isCrew?'jeux-de-role':name;
  $$('[data-page]').forEach(section=>section.hidden=section.dataset.page!==name);
 const communityBanners = $$('[data-community-banner]');
communityBanners.forEach(banner => {
  const target = banner.dataset.communityBanner;
  banner.hidden = target !== name;
});
  $$('[data-nav]').forEach(a=>{const current=a.dataset.nav===navName;if(current)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  document.title='DeadelusTV — '+routeTitles[name];
activeRoute=name;
closeMenu();
syncTwitchPlayer();
  if(isCrew)window.DEADELUSTV_CREW.render(crewAuth?'admin':requested.split('/')[1]||'stats',focus);
  else window.DEADELUSTV_CREW.cancel();
  if(isCampaign&&!isCrew)window.DEADELUSTV_PAVILLON.render(requested.split('/').slice(1).join('/')||'accueil',focus);
  else window.DEADELUSTV_PAVILLON.cancel();
  if(focus&&!isCampaign&&!isCrew){window.scrollTo({top:0,behavior:'instant'});const h=$('[data-page="'+name+'"] h1');if(h)h.focus({preventScroll:true});}
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
function syncTwitchPlayer() {
  if (player) window.DEADELUSTV_TWITCH.sync(player, CONFIG);
}

window.addEventListener('resize', () => {
  syncTwitchPlayer();
  if (window.innerWidth > 900) closeMenu();
});// Réseaux flottants, repris depuis le pied de page
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

// Métadonnées produites par GitHub ; aucun appel à YouTube côté JavaScript.
(() => {
  const link = document.getElementById('latest-youtube-video');
  const title = document.getElementById('latest-youtube-title');
  const thumbnail = document.getElementById('latest-youtube-thumbnail');
  if (!link || !title || !thumbnail) return;

  let pending = false;
  let lastSuccess = 0;
  const refreshDelay = 5 * 60 * 1000;

  async function refreshYoutube() {
    if (pending || document.hidden || activeRoute !== 'accueil' ||
        Date.now() - lastSuccess < refreshDelay) return;

    pending = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch('data/latest-youtube.json', {
        cache: 'no-store',
        signal: controller.signal
      });
      if (!response.ok) throw new Error('Métadonnées YouTube indisponibles');
      const video = await response.json();
      const image = new URL(video.thumbnail);
      if (video.schemaVersion !== 1 ||
          video.channelId !== 'UCTHePQHat_CYO3tqRfxLFRw' ||
          typeof video.videoId !== 'string' ||
          !/^[A-Za-z0-9_-]{11}$/.test(video.videoId) ||
          typeof video.title !== 'string' || !video.title.trim() ||
          image.protocol !== 'https:' || image.hostname !== 'i.ytimg.com') {
        throw new Error('Métadonnées YouTube invalides');
      }

      link.href = 'https://www.youtube.com/watch?v=' + video.videoId;
      link.setAttribute('aria-label', 'Voir « ' + video.title + ' » sur YouTube (nouvel onglet)');
      title.textContent = video.title;
      title.href = CONFIG.youtube;
      if (thumbnail.src !== image.href) thumbnail.src = image.href;
      lastSuccess = Date.now();
    } catch (error) {
      // Conserver le dernier affichage disponible et les liens utilisables.
      console.warn('Dernière vidéo YouTube : actualisation différée.');
    } finally {
      clearTimeout(timeout);
      pending = false;
    }
  }

  refreshYoutube();
  setInterval(refreshYoutube, refreshDelay);
  document.addEventListener('visibilitychange', refreshYoutube);
  window.addEventListener('hashchange', refreshYoutube);
})();
