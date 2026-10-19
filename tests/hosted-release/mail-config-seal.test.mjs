import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,privateDecrypt,constants} from 'node:crypto';
import {seal} from './mail-config-seal.mjs';
test('only the ephemeral private recipient can recover the bounded test payload',()=>{
 const pair=generateKeyPairSync('rsa',{modulusLength:3072}),data={key:'synthetic-only',recipient:'synthetic@example.test'};
 const encrypted=seal(pair.publicKey.export({type:'spki',format:'der'}).toString('base64'),data);
 assert(!encrypted.includes(data.key));
 const actual=privateDecrypt({key:pair.privateKey,oaepHash:'sha256',padding:constants.RSA_PKCS1_OAEP_PADDING},Buffer.from(encrypted,'base64'));
 assert.deepEqual(JSON.parse(actual),data);
 const wrong=generateKeyPairSync('rsa',{modulusLength:3072});
 assert.throws(()=>privateDecrypt({key:wrong.privateKey,oaepHash:'sha256',padding:constants.RSA_PKCS1_OAEP_PADDING},Buffer.from(encrypted,'base64')));
});
test('weak recipient keys and excessive payloads fail closed',()=>{
 const weak=generateKeyPairSync('rsa',{modulusLength:2048});
 assert.throws(()=>seal(weak.publicKey.export({type:'spki',format:'der'}).toString('base64'),{}));
 const good=generateKeyPairSync('rsa',{modulusLength:3072});
 assert.throws(()=>seal(good.publicKey.export({type:'spki',format:'der'}).toString('base64'),{value:'x'.repeat(301)}));
});
