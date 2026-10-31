'use strict';
/* Pagination locale des calques de listes.
 * Testable sans DOM, basée sur les dimensions du calque à l'échelle native
 * 1536 x 1024. Les textes restent des données, sans HTML interprété.
 */
(() => {
 function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
 function wrappedLines(text,availableWidth,fontSize,measure){
  const width=Math.max(4,availableWidth),size=Math.max(8,fontSize);
  const len=s=>measure?measure(s):String(s).length*size*.58;
  const chunks=String(text).split(/\s+/u).filter(Boolean);
  if(!chunks.length)return 1;
  let lines=1,used=0;
  for(const word of chunks){
   const wordWidth=len(word);
   if(wordWidth>width){
    if(used>0){lines++;used=0;}
    const parts=Math.max(1,Math.ceil(wordWidth/width));
    lines+=parts-1;
    used=wordWidth-(parts-1)*width;
   }else if(used===0)used=wordWidth;
   else if(used+len(' ')+wordWidth<=width)used+=len(' ')+wordWidth;
   else{lines++;used=wordWidth;}
  }
  return lines;
 }
 // Les colonnes partagent l'espace libre après avoir réservé la largeur des noms.
 // Le même calcul sert au rendu et à la pagination, y compris pour les rubriques.
 function listLayout(slice,columns,widthPx,fontSize,measure,columnGap=12){
  const rows=Math.max(1,Math.ceil(slice.length/columns));
  const width=Math.max(1,widthPx-4); // padding du calque : 2 px de chaque côté
  const len=text=>measure?measure(text):String(text).length*Math.max(8,fontSize)*.58;
  const widths=new Array(columns).fill(4);
  slice.forEach((entry,i)=>{
   const title=(entry.kind==='folder'?'▸ ':'')+entry.title;
   const column=Math.floor(i/rows);
   widths[column]=Math.max(widths[column],Math.ceil(len(title))+6);
  });
  const required=widths.reduce((a,b)=>a+b,0);
  let gap=clamp(Number(columnGap)||0,0,80);
  if(required<=width){
   // Un grand espace ne doit pas couper un nom alors qu'il tient dans le calque.
   if(columns>1)gap=Math.min(gap,(width-required)/(columns-1));
   const extra=Math.max(0,(width-required-gap*(columns-1))/columns);
   return {rows,widths:widths.map(w=>w+extra),columnGap:gap,singleLine:true};
  }
  // Zone réellement trop étroite : conserver un retour à la ligne mesuré.
  gap=Math.min(gap,Math.max(0,(width-columns*10)/Math.max(1,columns-1)));
  return {rows,widths:new Array(columns).fill(Math.max(1,(width-gap*(columns-1))/columns)),columnGap:gap,singleLine:false};
 }
 function measuredHeight(slice,columns,widthPx,fontSize,lineHeight,measure,rowGap=0,columnGap=12){
  if(!slice.length)return 0;
  const layout=listLayout(slice,columns,widthPx,fontSize,measure,columnGap);
  const rows=layout.rows;
  const rowHeights=new Array(rows).fill(0);
  slice.forEach((entry,i)=>{
   const title=(entry.kind==='folder'?'▸ ':'')+entry.title;
   const usableWidth=Math.max(1,layout.widths[Math.floor(i/rows)]-4);
   const lines=layout.singleLine?1:wrappedLines(title,usableWidth,fontSize,measure);
   const row=i%rows;
   rowHeights[row]=Math.max(rowHeights[row],lines*fontSize*lineHeight+4);
  });
  return rowHeights.reduce((a,b)=>a+b,0)+Math.max(0,rows-1)*rowGap;
 }
 function paginate(entries,options={}){
  const rows=Array.isArray(entries)?entries:[];
  if(!rows.length)return [[]];
  const cols=clamp(Math.round(Number(options.columns)||1),1,6);
  const width=clamp(Number(options.width)||300,30,1536);
  const height=clamp(Number(options.height)||200,24,1024);
  const size=clamp(Number(options.size)||24,8,120);
  const line=clamp(Number(options.line)||1.16,.75,2.6);
  const measure=typeof options.measure==='function'?options.measure:null;
  const rowGap=clamp(Number(options.rowGap??0)||0,0,80);
  const columnGap=clamp(Number(options.columnGap??12)||0,0,80);
  const minimum= Math.max(size*line+4,1);
  const footer=Math.min(height*.4,Math.max(29,size*line+7));
  const budget=Math.max(minimum,height-footer);
  const pages=[];
  let offset=0;
  while(offset<rows.length){
   // Les colonnes sont remplies verticalement, comme le calque original.
   // Un contrôle strict de hauteur empêche la liste de s'étirer hors de sa zone.
   let count=1;
   const limit=Math.min(rows.length-offset,240);
   for(let test=2;test<=limit;test++){
    // Changer le nombre de lignes change aussi la répartition en colonnes :
    // un candidat plus grand peut mieux tenir que le précédent.
    if(measuredHeight(rows.slice(offset,offset+test),cols,width,size,line,measure,rowGap,columnGap)<=budget)count=test;
   }
   pages.push(rows.slice(offset,offset+count));
   offset+=count;
  }
  return pages;
 }
 window.PHASMO_JOURNAL_PAGINATION=Object.freeze({paginate,wrappedLines,measuredHeight,listLayout});
})();

