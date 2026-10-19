// Bounded encrypted transfer of existing test-only email configuration.
// Never prints credentials, recipients, private keys or decrypted payloads.
import {createPublicKey,publicEncrypt,constants,generateKeyPairSync,createHash} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
export function seal(publicDer,payload){
 const key=createPublicKey({key:Buffer.from(publicDer,'base64'),format:'der',type:'spki'});
 assert(key.asymmetricKeyType==='rsa'&&key.asymmetricKeyDetails.modulusLength>=3072,'Strong RSA recipient required');
 const bytes=Buffer.from(JSON.stringify(payload));assert(bytes.length<=300,'Bounded test payload only');
 return publicEncrypt({key,oaepHash:'sha256',padding:constants.RSA_PKCS1_OAEP_PADDING},bytes).toString('base64');
}
if(process.argv[2]==='--prepare'){
 const pair=generateKeyPairSync('rsa',{modulusLength:3072}),dir='work/release-remaining/';
 mkdirSync(dir,{recursive:true});
 writeFileSync(dir+'transfer-private.pem',pair.privateKey.export({type:'pkcs8',format:'pem'}),{flag:'wx',mode:0o600});
 writeFileSync(dir+'transfer-public.txt',pair.publicKey.export({type:'spki',format:'der'}).toString('base64'),{flag:'wx'});
 console.log('Prepared temporary encrypted transfer; private key remains in ignored local work.');
}
if(process.argv[2]==='--seal-ci'){
 assert(process.platform==='linux'&&process.env.CI==='true'&&process.env.GITHUB_EVENT_NAME==='workflow_dispatch'&&process.env.GITHUB_REPOSITORY==='tbond24/special-adventure'&&process.env.GITHUB_REF==='refs/heads/codex/vacancy-branch-reconciliation-20261016','Restricted test workflow only');
 const key=process.env.VACANCY_TEST_RESEND_KEY,recipient=process.env.VACANCY_TEST_RESET_RECIPIENT,publicDer=process.env.VACANCY_TRANSFER_PUBLIC_KEY;
 delete process.env.VACANCY_TEST_RESEND_KEY;delete process.env.VACANCY_TEST_RESET_RECIPIENT;
 assert(/^re_[A-Za-z0-9_-]{10,200}$/.test(key||'')&&/^[^\s@]+@gmail\.com$/.test(recipient||''),'Existing test secrets required');
 const ciphertext=seal(publicDer,{key,recipient});
 mkdirSync('work/managed-mail-sealed',{recursive:true});
 writeFileSync('work/managed-mail-sealed/config.json',JSON.stringify({commit:process.env.GITHUB_SHA,publicKeySha256:createHash('sha256').update(Buffer.from(publicDer,'base64')).digest('hex'),ciphertext}));
 console.log('Sealed existing test-only mail configuration to the supplied ephemeral public key.');
}
