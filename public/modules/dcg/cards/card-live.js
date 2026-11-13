/* Carte animée publique, dérivée visuellement du générateur V8.1.
   Présentation uniquement : aucune fonctionnalité admin, tirage ou sauvegarde. */
(() => {
  'use strict';
  const starsMarkup = "<span class=\"spark\" style=\"--sx:7%;--sy:13%;--ss:17px;--dur:2.0s;--delay:-0.2s\"></span><span class=\"spark\" style=\"--sx:95%;--sy:13%;--ss:17px;--dur:2.7s;--delay:-1.5s\"></span><span class=\"spark\" style=\"--sx:14%;--sy:22%;--ss:14px;--dur:2.4s;--delay:-0.8s\"></span><span class=\"spark\" style=\"--sx:83%;--sy:24%;--ss:18px;--dur:2.9s;--delay:-2.0s\"></span><span class=\"spark\" style=\"--sx:8%;--sy:41%;--ss:15px;--dur:1.7s;--delay:-1.0s\"></span><span class=\"spark\" style=\"--sx:94%;--sy:47%;--ss:17px;--dur:2.4s;--delay:-0.2s\"></span><span class=\"spark\" style=\"--sx:26%;--sy:54%;--ss:13px;--dur:2.2s;--delay:-1.7s\"></span><span class=\"spark\" style=\"--sx:89%;--sy:58%;--ss:18px;--dur:3.1s;--delay:-0.8s\"></span><span class=\"spark\" style=\"--sx:12%;--sy:69%;--ss:15px;--dur:2.7s;--delay:-2.2s\"></span><span class=\"spark\" style=\"--sx:95%;--sy:75%;--ss:19px;--dur:2.3s;--delay:-1.0s\"></span><span class=\"spark\" style=\"--sx:35%;--sy:85%;--ss:14px;--dur:2.4s;--delay:-0.5s\"></span><span class=\"spark\" style=\"--sx:87%;--sy:92%;--ss:16px;--dur:2.9s;--delay:-2.0s\"></span><span class=\"spark\" style=\"--sx:52%;--sy:17%;--ss:11px;--dur:2.4s;--delay:-1.4s\"></span><span class=\"spark\" style=\"--sx:71%;--sy:68%;--ss:12px;--dur:2.2s;--delay:-0.7s\"></span><span class=\"spark\" style=\"--sx:9%;--sy:94%;--ss:12px;--dur:2.4s;--delay:-1.5s\"></span><span class=\"spark pin\" style=\"--sx:17%;--sy:11%;--ss:2px;--dur:2.0s;--delay:-0.0s\"></span><span class=\"spark pin\" style=\"--sx:72%;--sy:10%;--ss:3px;--dur:2.21s;--delay:-0.19s\"></span><span class=\"spark pin\" style=\"--sx:52%;--sy:11%;--ss:2px;--dur:2.42s;--delay:-0.38s\"></span><span class=\"spark pin\" style=\"--sx:88%;--sy:18%;--ss:4px;--dur:2.63s;--delay:-0.57s\"></span><span class=\"spark pin\" style=\"--sx:37%;--sy:19%;--ss:3px;--dur:2.84s;--delay:-0.76s\"></span><span class=\"spark pin\" style=\"--sx:7%;--sy:28%;--ss:2px;--dur:3.05s;--delay:-0.95s\"></span><span class=\"spark pin\" style=\"--sx:59%;--sy:28%;--ss:3px;--dur:3.26s;--delay:-1.14s\"></span><span class=\"spark pin\" style=\"--sx:96%;--sy:34%;--ss:2px;--dur:2.0s;--delay:-1.33s\"></span><span class=\"spark pin\" style=\"--sx:15%;--sy:35%;--ss:4px;--dur:2.21s;--delay:-1.52s\"></span><span class=\"spark pin\" style=\"--sx:77%;--sy:36%;--ss:3px;--dur:2.42s;--delay:-1.71s\"></span><span class=\"spark pin\" style=\"--sx:9%;--sy:49%;--ss:2px;--dur:2.63s;--delay:-1.9s\"></span><span class=\"spark pin\" style=\"--sx:48%;--sy:48%;--ss:3px;--dur:2.84s;--delay:-2.09s\"></span><span class=\"spark pin\" style=\"--sx:89%;--sy:51%;--ss:2px;--dur:3.05s;--delay:-2.28s\"></span><span class=\"spark pin\" style=\"--sx:36%;--sy:58%;--ss:4px;--dur:3.26s;--delay:-2.47s\"></span><span class=\"spark pin\" style=\"--sx:95%;--sy:63%;--ss:3px;--dur:2.0s;--delay:-2.66s\"></span><span class=\"spark pin\" style=\"--sx:8%;--sy:63%;--ss:2px;--dur:2.21s;--delay:-2.85s\"></span><span class=\"spark pin\" style=\"--sx:19%;--sy:77%;--ss:3px;--dur:2.42s;--delay:-3.04s\"></span><span class=\"spark pin\" style=\"--sx:65%;--sy:78%;--ss:2px;--dur:2.63s;--delay:-3.23s\"></span><span class=\"spark pin\" style=\"--sx:40%;--sy:73%;--ss:4px;--dur:2.84s;--delay:-3.42s\"></span><span class=\"spark pin\" style=\"--sx:94%;--sy:84%;--ss:3px;--dur:3.05s;--delay:-3.61s\"></span><span class=\"spark pin\" style=\"--sx:17%;--sy:89%;--ss:2px;--dur:3.26s;--delay:-3.8s\"></span><span class=\"spark pin\" style=\"--sx:70%;--sy:90%;--ss:3px;--dur:2.0s;--delay:-3.99s\"></span><span class=\"spark pin\" style=\"--sx:56%;--sy:93%;--ss:2px;--dur:2.21s;--delay:-4.18s\"></span><span class=\"spark pin\" style=\"--sx:29%;--sy:96%;--ss:4px;--dur:2.42s;--delay:-4.37s\"></span><span class=\"spark pin\" style=\"--sx:81%;--sy:80%;--ss:3px;--dur:2.63s;--delay:-4.56s\"></span><span class=\"spark pin\" style=\"--sx:8%;--sy:85%;--ss:2px;--dur:2.84s;--delay:-4.75s\"></span><span class=\"spark pin\" style=\"--sx:95%;--sy:96%;--ss:3px;--dur:3.05s;--delay:-4.94s\"></span><span class=\"spark pin\" style=\"--sx:30%;--sy:31%;--ss:2px;--dur:3.26s;--delay:-5.13s\"></span><span class=\"spark pin\" style=\"--sx:63%;--sy:62%;--ss:4px;--dur:2.0s;--delay:-5.32s\"></span><span class=\"spark pin\" style=\"--sx:72%;--sy:43%;--ss:3px;--dur:2.21s;--delay:-5.51s\"></span>";
  const rarityLevels = {Basique:1,Commune:2,Commun:1,'Peu commun':2,Rare:3,'Épique':4,'Légendaire':5,Exclusive:7};
  const finishing = {normal:'normal',gold:'gold',holo:'holo','holo-gold':'holo-gold',ultimate:'ultimate','black-diamond':'black-diamond'};
  // Six éclats du prototype Diamant noir validé, à l'écart du centre de l'illustration.
  const diamondGlints=[[6,11,15,3.6,-.7],[7,37,14,3.1,-1.8],[11,69,15,3.7,-2.9],
    [12,94,13,3.5,-.4],[32,4,12,4.4,-1.4],[18,18,11,3.9,-2.6]];
  const htmlEscape = s => String(s??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  // Le thème appartient à la collection, jamais au titre de la carte ni à sa
  // famille de jeu. Les anciens payloads transmettent son nom, sans identifiant.
  const isCrewCollection = value => {
    const name=value && typeof value==='object'?value.name:value;
    return typeof name==='string' && name.normalize('NFKC').trim().replace(/\s+/gu,' ').toLowerCase()==='le crew';
  };
  window.TCGCardTheme=Object.freeze({isCrewCollection});
  const assetBase = document.currentScript.src;
  const sheetUrl = new URL('card-live.css?rev=crew-design-1', assetBase).href;
  const galacticSheetUrl = new URL('card-galactic.css?rev=galactique-spirale-1', assetBase).href;
  const auraSheetUrl = new URL('card-aura.css?rev=crew-design-1', assetBase).href;
  const supporterSheetUrl = new URL('../../../assets/supporter.css?rev=supporter-1', sheetUrl).href;
  const auraCards=new Set();
  const auraObserver=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{
    for(const entry of entries){entry.target.auraInView=entry.isIntersecting;entry.target.updateAura();}
  });
  document.addEventListener('visibilitychange',()=>{for(const card of auraCards)card.updateAura();});
  class TCGCard extends HTMLElement {
    static get observedAttributes(){return ['image-framing','aura','model-id'];}
    attributeChangedCallback(name){if(name==='model-id'){if(this.isConnected)window.TCGSupport?.registerCard(this);return;}if(name==='aura')this.syncAura();else window.TCGCardFraming?.apply(this);}
    connectedCallback() {
      window.TCGSupport?.registerCard(this);
      if(this.shadowRoot){
        this.observer?.observe(this);
        const artwork=this.shadowRoot.querySelector('.art-box');
        if(artwork)this.observer?.observe(artwork);
        this.connectGalactic();
        this.syncAura();
        return;
      }
      const get = (key, def='') => this.getAttribute(key) || def;
      const rarity=get('rarity','Commun');
      const family=get('family','classic');
      const suppliedStars=get('stars');
      const starCount=/^[1-7]$/.test(suppliedStars)?Number(suppliedStars):(rarityLevels[rarity]||1);
      const finish=finishing[get('finish','normal')]||'normal';
      const name=get('name','DeadelusTV'), collection=get('collection','Crew’mong Us');
      const theme=isCrewCollection(collection)?'crew':'';
      const subtitle=get('subtitle',''), description=get('description','');
      // Seules les balises produites par notre formateur sécurisé sont affichées.
      const formattedDescription=window.TCGRichText?.render(description) ?? htmlEscape(description);
      const hasStats=this.getAttribute('stats')!=='false'&&rarity!=='Exclusive';
      const atk=/^\d{1,4}$/.test(get('atk'))?get('atk'):'490';
      const def=/^\d{1,4}$/.test(get('def'))?get('def'):'570';
      const image=get('image');
      const placeholder=get('placeholder','viewer')==='noel'?'noel':'viewer';
      const art=image ? `<img src="${htmlEscape(image)}" alt="Illustration de ${htmlEscape(name)}">` : `<div class="art-placeholder ${placeholder}" aria-hidden="true"><span>${placeholder==='noel'?'✧':'◎'}</span>${placeholder==='noel'?'NOËL':'VIEWERS'}</div>`;
      const frame=`<div class="live-fit"><div class="trading-card ${finish} ${hasStats?'has-stats':''} ${subtitle?'':'no-role'} ${description?'':'no-description'}" data-family="${htmlEscape(family)}" data-rarity="${htmlEscape(rarity)}" data-theme="${theme}">
        <div class="shine-layer" aria-hidden="true"></div><div class="sparkle-layer" aria-hidden="true"></div>
        <div class="sky-stars" aria-hidden="true">${starsMarkup}</div>
        <div class="laminate-glint" aria-hidden="true"></div>
        ${finish==='black-diamond'?`<div class="diamond-facets" aria-hidden="true"></div><div class="diamond-rim" aria-hidden="true"></div><div class="diamond-glints" aria-hidden="true">${diamondGlints.map(([x,y,size,duration,delay])=>`<span class="diamond-glint" style="--x:${x}%;--y:${y}%;--s:${size}px;--dur:${duration}s;--delay:${delay}s"></span>`).join('')}</div>`:''}
        <div class="inner">
          <div class="band card-head"><span class="chevrons">❯❯❯❯</span><span class="title-value" title="${htmlEscape(name)}">${htmlEscape(name)}</span><span class="chevrons right">❮❮❮❮</span></div>
          <div class="stars-bar" aria-label="${starCount} étoiles, ${htmlEscape(rarity)}"><div class="stars">${'<span class="star" aria-hidden="true">★</span>'.repeat(starCount)}</div></div>
          <div class="art-box">${art}${get('first')==='true'?'<span class="first-badge" aria-label="Exemplaire First">FIRST</span>':''}</div>
          ${subtitle?`<div class="band card-role"><span class="role-value">${window.TCGRichText?.renderEmotes?.(subtitle) ?? htmlEscape(subtitle)}</span></div>`:''}
          <div class="card-bottom"><p class="desc">${formattedDescription}</p><div class="card-footer">
            ${hasStats?`<div class="stat-strip" aria-label="Attaque ${atk}, défense ${def}"><span class="stat-line"><b>ATK</b><strong>${atk}</strong></span><span class="stat-line"><b>DEF</b><strong>${def}</strong></span></div>`:''}
            <span class="collection-plaque" title="${htmlEscape(collection)}">${htmlEscape(collection)}</span>
          </div></div>
        </div>
      </div></div>`;
      const shadow=this.attachShadow({mode:'open'});
      // Réserver le format et cacher le contenu brut avant le chargement du CSS.
      // Sans ce socle, l'image apparaît seule puis saute dans le cadre final.
      shadow.innerHTML=`<style>:host{display:block;position:relative;width:100%;aspect-ratio:591/1004;contain:layout}.live-fit{position:absolute;left:0;top:0;visibility:hidden}</style><link rel="stylesheet" href="${sheetUrl}"><link rel="stylesheet" href="${supporterSheetUrl}">${frame}`;
      const titleFrame=shadow.querySelector('.card-head');
      if(titleFrame&&window.TCGSupport)titleFrame.append(window.TCGSupport.sparks());
      const artwork=shadow.querySelector('.art-box'),illustration=artwork.querySelector('img');
      illustration?.addEventListener('load',()=>window.TCGCardFraming?.apply(this));
      const card=shadow.querySelector('.trading-card');
      const fit=shadow.querySelector('.live-fit');
      // La carte a une base interne de 365px : les libellés sont ajustés dans
      // cet espace avant la réduction CSS du composant. Les textes courts restent inchangés.
      let stylesheetReady=false;
      const fitLabel=(selector,originalSize,minSize)=>{
        const el=shadow.querySelector(selector);
        if(!el || el.clientWidth===0)return;
        el.style.fontSize=originalSize+'px';
        for(let size=originalSize-.5;size>=minSize && el.scrollWidth>el.clientWidth+1;size-=.5){
          el.style.fontSize=size+'px';
        }
      };
      const fitCollection=()=>{
        const label=shadow.querySelector('.collection-plaque');
        if(!label || label.clientWidth===0)return;
        // Court : conserver le cartouche original sur une seule ligne.
        label.classList.remove('collection-multiline');
        label.style.fontSize='16px';
        if(label.scrollWidth<=label.clientWidth+1)return;
        // Long : élargir le cartouche dans son espace via un affichage sur 2 lignes,
        // plutôt que d'abaisser la police jusqu'à 10px et tronquer le texte.
        label.classList.add('collection-multiline');
        for(let size=16;size>=12;size-=.5){
          label.style.fontSize=size+'px';
          if(label.scrollHeight<=label.clientHeight+1 && label.scrollWidth<=label.clientWidth+1)break;
        }
      };
      const recalc=()=>{
        window.TCGCardFraming?.apply(this);
        // La boîte visible inclut les rotations et le zoom des parents (éventail,
        // sortie du paquet). Dimensionner le contenu dans sa boîte de mise en page.
        const cssWidth=getComputedStyle(this).width;
        const width=cssWidth.endsWith('px')?parseFloat(cssWidth):this.clientWidth;
        if(width<=0)return;
        fit.style.setProperty('--fit',String(width/365));
        if(stylesheetReady){
          fitLabel('.title-value',25,12);
          fitLabel('.role-value',25,12);
          fitCollection();
          // Respecter aussi la face masquée du parent (booster ou retournement).
          fit.style.visibility='inherit';
          this.cardStylesReady=true;
          this.connectGalactic();
          this.syncAura();
        }
      };
      const cssLink=shadow.querySelector('link[rel="stylesheet"]');
      cssLink.addEventListener('load',()=>{stylesheetReady=true;recalc();},{once:true});
      recalc();
      if(typeof ResizeObserver!=='undefined') {this.observer=new ResizeObserver(recalc);this.observer.observe(this);this.observer.observe(artwork);}
      card.addEventListener('pointermove',e=>{
        if(e.pointerType==='touch')return;
        const r=card.getBoundingClientRect();
        const x=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));
        const y=Math.max(0,Math.min(1,(e.clientY-r.top)/r.height));
        card.style.setProperty('--pointer-x',(x*100).toFixed(1)+'%');card.style.setProperty('--pointer-y',(y*100).toFixed(1)+'%');
        card.style.setProperty('--rx',((.5-y)*12).toFixed(1)+'deg');card.style.setProperty('--ry',((x-.5)*12).toFixed(1)+'deg');
        // Reflet de vernis localisé : sa position dépend de l'angle de la carte,
        // sans halo centré sur la souris ou voile permanent sur l'illustration.
        card.style.setProperty('--laminate-x',(50+(x-.5)*110).toFixed(1)+'%');
        card.style.setProperty('--laminate-y',(50+(y-.5)*48).toFixed(1)+'%');
        card.style.setProperty('--laminate-mask-x',(50+(x-.5)*55).toFixed(1)+'%');
        card.style.setProperty('--laminate-mask-y',(50+(y-.5)*50).toFixed(1)+'%');
        card.style.setProperty('--laminate-angle',(115+(x-.5)*18-(y-.5)*9).toFixed(1)+'deg');
        card.classList.add('laminate-active');
      });
      card.addEventListener('pointerleave',()=>{
        card.classList.remove('laminate-active');
        for (const [k,v] of Object.entries({
          '--rx':'0deg','--ry':'0deg','--pointer-x':'50%','--pointer-y':'50%',
          '--laminate-x':'50%','--laminate-y':'50%','--laminate-mask-x':'50%',
          '--laminate-mask-y':'50%','--laminate-angle':'115deg'
        }))card.style.setProperty(k,v);
      });
    }
    syncAura(){
      if(!this.shadowRoot)return;
      if(!this.hasAttribute('aura')||!this.isConnected||!this.cardStylesReady){
        this.stopAura();
        if(!this.hasAttribute('aura')){this.auraElement?.remove();this.auraElement=null;}
        return;
      }
      if(!this.auraSheet){
        const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href=auraSheetUrl;
        sheet.dataset.auraStyle='true';
        sheet.addEventListener('load',()=>{this.auraStylesReady=true;this.updateAura();},{once:true});
        this.auraSheet=sheet;this.shadowRoot.append(sheet);
      }
      if(!this.auraElement){
        const aura=document.createElement('span');aura.className='card-aura';aura.setAttribute('aria-hidden','true');
        const rim=document.createElement('span');rim.className='detail-card-rim';aura.append(rim);
        this.auraElement=aura;this.shadowRoot.querySelector('.trading-card').append(aura);
      }
      if(!auraCards.has(this)){
        auraCards.add(this);this.auraInView=!auraObserver;auraObserver?.observe(this);
      }
      this.updateAura();
    }
    updateAura(){
      if(this.auraElement)this.auraElement.dataset.active=String(this.isConnected&&this.hasAttribute('aura')&&
        this.auraStylesReady&&this.auraInView&&!document.hidden);
    }
    stopAura(){
      auraCards.delete(this);auraObserver?.unobserve(this);this.auraInView=false;
      if(this.auraElement)this.auraElement.dataset.active='false';
    }
    connectGalactic(){
      // Galactique conserve la clé historique « ultimate ». Le composant partagé
      // couvre catalogue, agrandissement, cadrage, laboratoire et boosters.
      if(!this.isConnected||!this.cardStylesReady||!window.TCGGalactic||
        !this.shadowRoot?.querySelector('.trading-card.ultimate'))return;
      if(!this.galacticSheet){
        const sheet=document.createElement('link');
        sheet.rel='stylesheet';sheet.href=galacticSheetUrl;
        sheet.dataset.galacticStyle='true';
        sheet.addEventListener('load',()=>{this.galacticStylesReady=true;this.connectGalactic();},{once:true});
        this.galacticSheet=sheet;
        this.shadowRoot.append(sheet);
      }
      if(!this.galacticStylesReady)return;
      this.galacticRenderer??=window.TCGGalactic.attach(this);
      this.galacticRenderer?.refresh();
    }
    disconnectedCallback(){
      window.TCGSupport?.unregisterCard(this);
      this.stopAura();
      this.observer?.disconnect();
      this.galacticRenderer?.destroy();
      this.galacticRenderer=null;
    }
  }
  customElements.define('tcg-card',TCGCard);
})();

