// Synthetic PNG generator ported verbatim from a9c6303 tests/full-stack/favicon.mjs.
import {deflateSync} from 'node:zlib';
function crc32(data){let crc=0xffffffff;for(const b of data){crc^=b;for(let i=0;i<8;i++)crc=crc&1?0xedb88320^(crc>>>1):crc>>>1;}return (crc^0xffffffff)>>>0;}
export function png(colour,size=64,noise=false){
 const chunk=(type,data)=>{const name=Buffer.from(type),head=Buffer.alloc(4),tail=Buffer.alloc(4);head.writeUInt32BE(data.length);tail.writeUInt32BE(crc32(Buffer.concat([name,data])));return Buffer.concat([head,name,data,tail]);};
 const header=Buffer.alloc(13);header.writeUInt32BE(size,0);header.writeUInt32BE(size,4);header[8]=8;header[9]=6;
 const rows=Buffer.alloc((size*4+1)*size);let seed=87341;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const off=y*(size*4+1)+1+x*4;for(let c=0;c<3;c++){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;rows[off+c]=noise?seed&255:colour[c];}rows[off+3]=255;}
 return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',header),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]);
}
