const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),html=read('public/index.html');
test('Contact is in the common footer and signed-in history and administration are in the account menu',()=>{
 const footer=html.slice(html.indexOf('<footer'),html.indexOf('</footer>'));
 const account=html.slice(html.indexOf('id="site-account-menu"'),html.indexOf('id="site-account-signin"'));
 assert.match(footer,/<a[^>]+href="#contact"[^>]+data-contact-open/);
 assert.match(account,/href="#mes-demandes"[^>]+data-contact-mine-open[^>]+hidden/);
 assert.match(account,/href="admin\/access-center\.html"[^>]+data-contact-admin-open[^>]+hidden/);
 assert.match(html,/id="site-account-news-link"/);assert.match(html,/id="site-account-journal-link"/);assert.match(html,/id="site-account-crew-link"/);
});
test('the shared contact assets exist and load after the original router with the website auth adapter',()=>{
 assert.match(html,/<link[^>]+href="assets\/contact-centre\.css\?rev=admin-panel-1"/);
 assert.match(html,/<script[^>]+src="assets\/contact-centre\.js\?rev=admin-panel-1"[^>]+data-contact-host="site"/);
 assert.ok(html.indexOf('assets/contact-centre.js')>html.indexOf('assets/app.js'));
 assert.doesNotThrow(()=>new vm.Script(read('public/assets/contact-centre.js')));
 assert.ok(read('public/assets/contact-centre.css').length>1000);
});
test('the contact module reuses existing auth without embedding privileged credentials or a second Supabase client',()=>{
 const source=read('public/assets/contact-centre.js');assert.doesNotMatch(source,/createClient\s*\(|sb_secret_|service_role/);
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
});
