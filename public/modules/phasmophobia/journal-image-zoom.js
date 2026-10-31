'use strict';
/* Agrandissement de lecture uniquement : aucune modification du carnet. */
(() => {
 let dialog=null,image=null,canvas=null,viewport=null,label=null,minus=null,plus=null;
 let zoom=1,opener=null;
 function enabled(layer){
  if(layer?.kind!=='image')return false;
  if(typeof layer.zoomable==='boolean')return layer.zoomable;
  return layer.role!=='background'&&Number(layer.opacity??100)===100&&(!layer.blend||layer.blend==='normal');
 }
 function render(){
  if(!dialog?.open||!image.naturalWidth||!image.naturalHeight)return;
  const base=Math.min(1,Math.max(1,viewport.clientWidth-24)/image.naturalWidth,Math.max(1,viewport.clientHeight-24)/image.naturalHeight);
  canvas.style.width=Math.max(1,image.naturalWidth*base*zoom)+'px';
  canvas.style.height=Math.max(1,image.naturalHeight*base*zoom)+'px';
  image.style.cursor=zoom===1?'zoom-in':'zoom-out';
  label.textContent=Math.round(zoom*100)+' %';minus.disabled=zoom<=1;plus.disabled=zoom>=4;
 }
 function setZoom(value){
  const next=Number(value);if(!Number.isFinite(next))return;
  const old=zoom;zoom=Math.max(1,Math.min(4,next));
  const x=(viewport.scrollLeft+viewport.clientWidth/2)*zoom/old-viewport.clientWidth/2;
  const y=(viewport.scrollTop+viewport.clientHeight/2)*zoom/old-viewport.clientHeight/2;
  render();viewport.scrollLeft=Math.max(0,x);viewport.scrollTop=Math.max(0,y);
 }
 function create(){
  if(dialog)return;
  dialog=document.createElement('dialog');dialog.id='journal-image-dialog';dialog.className='journal-image-dialog';
  dialog.setAttribute('aria-labelledby','journal-image-title');
  const frame=document.createElement('div');frame.className='journal-image-frame';
  const toolbar=document.createElement('div');toolbar.className='journal-image-toolbar';
  const title=document.createElement('h2');title.id='journal-image-title';toolbar.append(title);
  const button=(caption,name,work)=>{
   const node=document.createElement('button');node.type='button';node.textContent=caption;node.setAttribute('aria-label',name);
   node.addEventListener('click',work);toolbar.append(node);return node;
  };
  minus=button('−','Dézoomer l’image',()=>setZoom(zoom-.5));
  label=document.createElement('output');label.setAttribute('aria-label','Zoom de l’image');label.setAttribute('aria-live','polite');toolbar.append(label);
  plus=button('+','Zoomer l’image',()=>setZoom(zoom+.5));
  button('Ajuster','Ajuster l’image',()=>setZoom(1));
  const close=button('Fermer ×','Fermer l’image',()=>dialog.close());close.autofocus=true;
  viewport=document.createElement('div');viewport.className='journal-image-viewport';
  canvas=document.createElement('div');canvas.className='journal-image-canvas';
  image=document.createElement('img');image.draggable=false;image.addEventListener('load',render);
  image.addEventListener('click',()=>setZoom(zoom===1?2:1));
  image.addEventListener('error',()=>{title.textContent='Image indisponible';});
  canvas.append(image);viewport.append(canvas);
  const help=document.createElement('p');help.className='journal-image-help';help.id='journal-image-help';
  help.textContent='Clique sur l’image pour zoomer ou dézoomer. Utilise + / − pour ajuster, puis fais défiler pour explorer. Échap pour fermer.';
  dialog.setAttribute('aria-describedby',help.id);
  frame.append(toolbar,viewport,help);dialog.append(frame);document.body.append(dialog);
  dialog.addEventListener('close',()=>{image.removeAttribute('src');opener?.focus({preventScroll:true});opener=null;});
  dialog.addEventListener('cancel',event=>event.stopPropagation());
  dialog.addEventListener('click',event=>{
   if(event.target!==dialog)return;
   const box=dialog.getBoundingClientRect();
   if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dialog.close();
  });
  dialog.addEventListener('keydown',event=>{
   if(['+','=','-','0'].includes(event.key)){
    event.preventDefault();event.stopPropagation();setZoom(event.key==='0'?1:zoom+(event.key==='-'?-.5:.5));
   }
  });
  viewport.addEventListener('wheel',event=>{
   if(!event.ctrlKey&&!event.metaKey)return;
   event.preventDefault();setZoom(zoom+(event.deltaY<0?.5:-.5));
  },{passive:false});
  window.addEventListener('resize',render);
 }
 function open(pic,source){
  const src=pic.currentSrc||pic.src;
  if(!src||!enabled(source))return;
  create();opener=pic.parentElement;zoom=1;
  document.getElementById('journal-image-title').textContent=pic.alt||'Image du carnet';
  image.alt=pic.alt||'Image agrandie du carnet';image.src=src;
  if(!dialog.open)dialog.showModal();
  viewport.scrollLeft=viewport.scrollTop=0;render();
 }
 function attach(node,source){
  const pic=node.querySelector('img');if(!pic||!enabled(source))return;
  node.tabIndex=0;node.setAttribute('role','button');node.setAttribute('aria-haspopup','dialog');
  node.setAttribute('data-image-zoom','true');node.setAttribute('aria-label','Agrandir l’image : '+(pic.alt||source.name));
  node.title='Cliquer pour agrandir l’image';
  node.addEventListener('click',event=>{event.stopPropagation();open(pic,source);});
  node.addEventListener('keydown',event=>{
   if(event.key!=='Enter'&&event.key!==' ')return;
   event.preventDefault();event.stopPropagation();open(pic,source);
  });
 }
 window.PHASMO_JOURNAL_IMAGE_ZOOM=Object.freeze({enabled,attach});
})();

