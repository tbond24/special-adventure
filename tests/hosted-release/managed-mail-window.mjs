import {randomBytes,createHash} from 'node:crypto';
import fs from 'node:fs';
import {testMailSecret} from './managed-mail-config.mjs';
if(process.argv[2]!=='--prepare')throw Error('Explicit --prepare required');
const root='work/release-remaining/',mail=testMailSecret(),nonce=randomBytes(32).toString('hex'),run='vacancy-managed-mail-'+Date.now();
// Gmail alias reaches only the already approved inbox, without touching a pre-existing account.
const recipient=mail.recipient.replace('@','+'+run+'@'),expires=new Date(Date.now()+3600000).toISOString();
const window={nonce,run,recipient,expires};
fs.writeFileSync(root+'mail-window.json',JSON.stringify(window),{flag:'wx',mode:0o600});
const source=fs.readFileSync('tests/hosted-release/managed-mail-edge.ts','utf8').replaceAll('__RECIPIENT_JSON__',JSON.stringify(recipient)).replaceAll('__NONCE_HASH__',createHash('sha256').update(nonce).digest('hex')).replaceAll('__RUN__',run).replaceAll('__EXPIRES__',expires);
fs.writeFileSync(root+'mail-index.ts',source,{flag:'wx',mode:0o600});
console.log('Prepared one fixed synthetic account in the approved inbox; protected one-hour test-only broker.');
