/* Cadrage non destructif : l’image source reste intacte. */
(() => {
  'use strict';
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const number=(n,fallback)=>typeof n==='number'&&Number.isFinite(n)?n:fallback;
  const bounded=(n,fallback,min,max)=>Math.round(clamp(number(n,fallback),min,max)*1e6)/1e6;
  const normalize=value=>{
    if(typeof value==='string')try{value=JSON.parse(value);}catch{value=null;}
    return {x:bounded(value?.x,50,0,100),y:bounded(value?.y,50,0,100),zoom:bounded(value?.zoom,1,.1,4)};
  };
  function geometry(width,height,naturalWidth,naturalHeight,value){
    if(![width,height,naturalWidth,naturalHeight].every(n=>Number.isFinite(n)&&n>0))return null;
    const f=normalize(value),scale=Math.max(width/naturalWidth,height/naturalHeight)*f.zoom;
    const w=naturalWidth*scale,h=naturalHeight*scale;
    return {width:w,height:h,left:(width-w)*f.x/100,top:(height-h)*f.y/100};
  }
  function apply(card){
    const box=card.shadowRoot?.querySelector('.art-box'),img=box?.querySelector('img');
    if(!img)return;
    const g=geometry(box.clientWidth,box.clientHeight,img.naturalWidth,img.naturalHeight,card.getAttribute('image-framing'));
    if(!g)return;
    Object.assign(img.style,{position:'absolute',maxWidth:'none',width:g.width+'px',height:g.height+'px',left:g.left+'px',top:g.top+'px',objectFit:'fill'});
  }
  function controls(value,expanded=false){
    const f=normalize(value);
    return '<div class="card-framing" data-card-framing><strong>Cadrer l’illustration</strong><p>Glisse l’image dans la carte pour la déplacer.</p>'+ 
      '<div class="card-framing-zoom"><button type="button" data-framing-zoom="-.1" aria-label="Dézoomer l’illustration">−</button>'+ 
      '<label>Zoom<input type="range" min="10" max="400" step="1" value="'+Math.round(f.zoom*100)+'" aria-label="Zoom de l’illustration"></label>'+ 
      '<button type="button" data-framing-zoom=".1" aria-label="Zoomer l’illustration">+</button><output>'+Math.round(f.zoom*100)+' %</output></div>'+ 
      '<div class="card-framing-actions"><button type="button" data-framing-fit>Image entière</button><button type="button" data-framing-reset>Réinitialiser</button></div>'+ 
      '<div class="card-framing-position"><label>Position horizontale<input type="range" data-framing-axis="x" min="0" max="100" step="1" value="'+f.x+'"></label>'+ 
      '<label>Position verticale<input type="range" data-framing-axis="y" min="0" max="100" step="1" value="'+f.y+'"></label></div>'+ 
      '<small>Le cadrage sera conservé à l’enregistrement de la carte.</small>'+ 
      (expanded?'':'<button class="card-framing-expand" type="button" data-framing-expand>Agrandir le cadrage</button>')+'</div>';
  }
  // Un contrôleur par aperçu, remplacé proprement lorsque le formulaire est repeint.
  function bind(host,card,value,onChange,{disabled=false}={}){
    host._framingCleanup?.();
    const ui=host.querySelector('[data-card-framing]');if(!ui||!card)return;
    const abort=new AbortController(),signal=abort.signal;
    let framing=normalize(value),drag=null,overlay=null;
    const box=card.shadowRoot?.querySelector('.art-box'),img=box?.querySelector('img');
    const zoom=ui.querySelector('input:not([data-framing-axis])'),output=ui.querySelector('output');
    zoom.value=String(Math.round(framing.zoom*100));output.textContent=Math.round(framing.zoom*100)+' %';
    for(const input of ui.querySelectorAll('[data-framing-axis]'))input.value=String(Math.round(framing[input.dataset.framingAxis]));
    const commit=next=>{
      if(!host.isConnected)return;
      framing=normalize(next);card.setAttribute('image-framing',JSON.stringify(framing));apply(card);
      zoom.value=String(Math.round(framing.zoom*100));output.textContent=Math.round(framing.zoom*100)+' %';
      for(const input of ui.querySelectorAll('[data-framing-axis]'))input.value=String(Math.round(framing[input.dataset.framingAxis]));
      onChange({...framing});
    };
    const ready=()=>{
      const enabled=!!img?.naturalWidth&&!disabled;
      ui.querySelectorAll('button,input').forEach(el=>{el.disabled=!enabled;});
      if(box)box.classList.toggle('framing-editable',enabled);
    };
    ready();img?.addEventListener('load',ready,{signal});img?.addEventListener('error',ready,{signal});
    ui.addEventListener('input',event=>{
      event.stopPropagation();if(disabled)return;
      if(event.target===zoom)commit({...framing,zoom:Number(zoom.value)/100});
      else if(event.target.dataset.framingAxis)commit({...framing,[event.target.dataset.framingAxis]:Number(event.target.value)});
    },{signal});
    ui.addEventListener('change',event=>event.stopPropagation(),{signal});
    ui.addEventListener('click',event=>{
      const button=event.target.closest('button');if(!button||disabled)return;event.stopPropagation();
      if(button.hasAttribute('data-framing-zoom'))commit({...framing,zoom:Math.round((framing.zoom+Number(button.dataset.framingZoom))*100)/100});
      if(button.hasAttribute('data-framing-reset'))commit({});
      if(button.hasAttribute('data-framing-fit')&&img?.naturalWidth){
        const w=box.clientWidth/img.naturalWidth,h=box.clientHeight/img.naturalHeight;
        commit({x:50,y:50,zoom:Math.min(w,h)/Math.max(w,h)});
      }
      if(button.hasAttribute('data-framing-expand')&&!overlay){
        const dialog=document.createElement('dialog');dialog.className='card-framing-dialog';dialog.setAttribute('aria-label','Cadrer l’illustration');
        dialog.innerHTML='<header><h2>Cadrer l’illustration</h2><button type="button" data-framing-done>Terminer le cadrage</button></header><div class="card-framing-dialog-grid"><div class="card-framing-large-preview"></div>'+controls(framing,true)+'</div>';
        const copy=card.cloneNode();copy.setAttribute('aura','');dialog.querySelector('.card-framing-large-preview').append(copy);document.body.append(dialog);
        const observer=new MutationObserver(()=>{if(!host.isConnected)dismiss();});
        const dismiss=()=>{
          if(overlay!==dialog)return;overlay=null;observer.disconnect();dialog._framingCleanup?.();dialog.close();dialog.remove();
        };
        overlay=dialog;overlay._dismiss=dismiss;dialog.showModal();
        bind(dialog,copy,framing,next=>commit(next));
        dialog.querySelector('[data-framing-done]').addEventListener('click',dismiss);
        dialog.addEventListener('close',dismiss);
        dialog.addEventListener('click',event=>{if(event.target===dialog)dismiss();});
        observer.observe(document.body,{childList:true,subtree:true});
      }
    },{signal});
    if(box&&img){
      img.draggable=false;
      box.addEventListener('pointerdown',event=>{
        if(event.button!==0||!img.naturalWidth||disabled)return;
        event.preventDefault();event.stopPropagation();
        const rect=box.getBoundingClientRect();
        const g=geometry(box.clientWidth,box.clientHeight,img.naturalWidth,img.naturalHeight,framing);
        drag={id:event.pointerId,x:event.clientX,y:event.clientY,framing:{...framing},g,sx:rect.width/box.clientWidth,sy:rect.height/box.clientHeight};
        box.setPointerCapture(event.pointerId);box.classList.add('framing-dragging');
      },{signal});
      box.addEventListener('pointermove',event=>{
        event.stopPropagation();if(!drag||drag.id!==event.pointerId)return;
        const dx=box.clientWidth-drag.g.width,dy=box.clientHeight-drag.g.height;
        commit({...framing,x:Math.abs(dx)>.01?drag.framing.x+(event.clientX-drag.x)/drag.sx/dx*100:framing.x,
          y:Math.abs(dy)>.01?drag.framing.y+(event.clientY-drag.y)/drag.sy/dy*100:framing.y});
      },{signal});
      const end=event=>{if(drag?.id===event.pointerId){drag=null;box.classList.remove('framing-dragging');}};
      box.addEventListener('pointerup',end,{signal});box.addEventListener('pointercancel',end,{signal});box.addEventListener('lostpointercapture',end,{signal});
    }
    host._framingCleanup=()=>{abort.abort();overlay?._dismiss();box?.classList.remove('framing-editable','framing-dragging');};
  }
  window.TCGCardFraming={normalize,geometry,apply,controls,bind};
})();
