'use strict';
// Remove only in a separately reviewed, coordinated TEST switch.
if(process.env.CF_PAGES==='1'||process.env.WORKERS_CI==='1'||process.argv.includes('--publication')){
 console.error('DCG_PORTAL_PUBLICATION_HOLD: portail multi-DCG retenu avant bascule coordonnée.');
 process.exitCode=1;
}
