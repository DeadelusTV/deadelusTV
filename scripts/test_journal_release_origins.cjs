const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module');
let handler;
const source=fs.readFileSync('supabase/functions/phasmo-journal-release/index.ts','utf8').replace(/^import[^\n]*\n/,'');
const code=stripTypeScriptTypes(source,{mode:'transform'});
vm.runInNewContext(code,{Deno:{env:{get:key=>key==='SUPABASE_URL'?'https://project.test':'server-key'},serve:work=>handler=work},Request,Response,Set,createClient:()=>assert.fail('No database call expected')});
(async()=>{
 let count=0;
 for(const origin of ['https://deadelustv.pages.dev','https://www.deadelustv.com','https://deadelustv.com']){
  const r=await handler(new Request('https://project.test',{method:'OPTIONS',headers:{origin}}));assert.equal(r.status,204);assert.equal(r.headers.get('access-control-allow-origin'),origin);count++;
  const anonymous=await handler(new Request('https://project.test',{method:'POST',headers:{origin}}));assert.equal(anonymous.status,401);count++;
 }
 for(const origin of ['https://www.deadelustv.com.evil.test','null','https://evil.test','']){
  const r=await handler(new Request('https://project.test',{method:'OPTIONS',headers:{origin}}));assert.equal(r.status,403);assert.equal(r.headers.get('access-control-allow-origin'),null);count++;
 }
 assert.match(source,/if\(locked\)return answer/);assert.match(source,/rightsApproved!==true/);assert.match(source,/phasmo_journal_reserve_official_release/);count+=3;
 console.log(count+' contrôles réussis : trois origines exactes, refus anonyme et tiers, verrou et réservations conservés.');
})().catch(error=>{console.error(error);process.exitCode=1;});
