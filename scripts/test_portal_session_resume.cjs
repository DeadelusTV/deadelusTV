'use strict';const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');const{JSDOM}=require('jsdom');const{page,read,ids,tick}=require('./helpers/portal-dcg-dom.cjs');
const source=read('public/modules/dcg/portal-session.js'),game='https://tcg.yekelle-boulet.workers.dev',site='https://deadelustv.pages.dev';
function gamePage({url=game+'/#/boosters?dcg='+ids.a+'&portal_bridge='+ids.ownerA,saved=null,closed=false}={}){
 const dom=new JSDOM('',{url,runScripts:'outside-only'}),w=dom.window;let sid=ids.admin,reads=0;
 w.crypto.randomUUID=crypto.randomUUID;const token=()=>['eyJhbGciOiJOT05FX0ZJQ1RJT05fT05MWSJ9',Buffer.from(JSON.stringify({session_id:sid})).toString('base64url'),'FICTION'].join('.');
 const portal={closed,postMessage(m,origin){assert.equal(origin,site);if(m.action!=='read')return;reads++;queueMicrotask(()=>{const event=new w.MessageEvent('message',{origin:site,data:{kind:'dcg-session-response',nonce:m.nonce,request:m.request,session:{access_token:token(),session_id:sid,expires_at:9999999999,user:{id:ids.shared}}}});Object.defineProperty(event,'source',{value:portal});w.dispatchEvent(event);});}};
 Object.defineProperty(w,'opener',{value:portal});w.fetch=async(u,init)=>{assert.equal(u,'https://eodtxlhnfzyapkyvvxdi.supabase.co/auth/v1/user');assert.equal(init.headers.Authorization,'Bearer '+token());return{ok:true,json:async()=>({id:ids.shared,user_metadata:{preferred_username:'Viewer fictif'}})};};
 if(saved)w.sessionStorage.setItem('dcg:portal-window-binding',saved);w.eval(source);
 return{w,dom,get reads(){return reads;},binding:()=>w.sessionStorage.getItem('dcg:portal-window-binding'),changeSession(){sid=ids.ownerB;},close(){dom.window.close();}};
}
test('game navigation then F5 restores only a portal binding, without persisting either token',async()=>{
 const first=gamePage();let saved;try{const b=await first.w.DCGSession.connectGame();assert.equal((await b.auth.getUser()).data.user.id,ids.shared);first.w.history.replaceState(null,'','#/catalogue?dcg='+ids.a+'&collection='+ids.b);first.w.dispatchEvent(new first.w.HashChangeEvent('hashchange'));saved=first.binding();assert.doesNotMatch(saved,/access_token|refresh_token|FICTION|eyJ/);assert.match(saved,/catalogue/);}finally{first.close();}
 const reload=gamePage({url:game+'/#/catalogue?dcg='+ids.a+'&collection='+ids.b,saved});try{const b=await reload.w.DCGSession.connectGame();assert.equal((await b.auth.getSession()).data.session.user.id,ids.shared);assert.ok(reload.reads>=2);}finally{reload.close();}
});
test('Twitch callback returns to the persistent draft route with the same verified Viewer session',async()=>{
 const first=gamePage({url:game+'/#/streamer-creation?dcg='+ids.a+'&portal_bridge='+ids.ownerA});let saved;try{await first.w.DCGSession.connectGame();saved=first.binding();}finally{first.close();}
 const callback=gamePage({url:game+'/?streamer_oauth=return#/streamer-creation',saved});try{const b=await callback.w.DCGSession.connectGame();assert.equal(new URLSearchParams(callback.w.location.hash.split('?')[1]).get('dcg'),ids.a);assert.equal((await b.auth.getSession()).data.session.session_id,ids.admin);assert.doesNotMatch(callback.w.location.href,/access_token|refresh_token|code=/);}finally{callback.close();}
});
test('session change or lost portal refuses reuse and clears the game binding',async()=>{
 const s=gamePage();try{const b=await s.w.DCGSession.connectGame();s.changeSession();const r=await b.auth.getSession();assert.ok(r.error);assert.equal(r.data.session,null);assert.equal(s.binding(),null);}finally{s.close();}
 const s2=gamePage({closed:true});try{await assert.rejects(s2.w.DCGSession.connectGame(),/portail/);}finally{s2.close();}
});
test('portal F5 rebinds only a previously approved direct child and same Auth session',async()=>{
 const first=page({hash:'#phasmophobia'});let child,nonce,saved;try{child=await first.w.DCGSession.openGame(ids.a);nonce=new URLSearchParams(new URL(child.location.href).hash.split('?')[1]).get('portal_bridge');saved=first.w.sessionStorage.getItem('dcg:portal-approved-windows');}finally{first.close();}
 const dom=new JSDOM('',{url:site,runScripts:'outside-only'}),w=dom.window;const token=['e30',Buffer.from(JSON.stringify({session_id:ids.admin})).toString('base64url'),'FICTION'].join('.');
 const client={auth:{getSession:async()=>({data:{session:{access_token:token,user:{id:ids.shared}}}}),getUser:async()=>({data:{user:{id:ids.shared}}})}};
 w.DEADELUSTV_AUTH={getClient:async()=>client};w.sessionStorage.setItem('dcg:portal-approved-windows',saved);w.eval(source);
 function send(target){const e=new w.MessageEvent('message',{origin:game,data:{kind:'dcg-session-request',nonce,dcg:ids.a,request:crypto.randomUUID(),action:'read'}});Object.defineProperty(e,'source',{value:target});w.dispatchEvent(e);}
 try{child.messages=[];child.opener={};send(child);await tick();assert.equal(child.messages.length,0);child.opener=w;send(child);await tick();assert.equal(child.messages.length,1);assert.equal(child.messages[0].value.session.session_id,ids.admin);}finally{w.close();}
});
