// Pinned, local SDK bundle. No runtime CDN or application credentials.
import {build} from 'esbuild';
import {readFile,writeFile} from 'node:fs/promises';
await build({stdin:{contents:"import {RealtimeClient} from '@supabase/realtime-js'; window.VACANCY_REALTIME_CLIENT=RealtimeClient;",resolveDir:process.cwd()},bundle:true,format:'iife',platform:'browser',target:'es2022',minify:true,legalComments:'eof',outfile:'app/vendor/admin-realtime.js'});

const notices=['node_modules/@supabase/realtime-js/LICENSE','node_modules/@supabase/phoenix/LICENSE.md','node_modules/tslib/CopyrightNotice.txt','node_modules/tslib/LICENSE.txt'];
await writeFile('app/vendor/admin-realtime.LICENSE.txt',(await Promise.all(notices.map(async name=>name+'\n\n'+(await readFile(name,'utf8')).replace(/\r\n/g,'\n').replace(/[ \t]+$/gm,'')))).join('\n\n'));
