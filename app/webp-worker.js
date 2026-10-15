import createEncoder from './vendor/webp/webp_enc.js';
import {defaultOptions} from './vendor/webp/meta.js';
let codec,queue=Promise.resolve();
self.onmessage=({data})=>{
 queue=queue.then(async()=>{
  try{
   codec=codec||createEncoder({noInitialRun:true});const module=await codec;
   const encoded=module.encode(new Uint8ClampedArray(data.pixels),data.width,data.height,{...defaultOptions,quality:data.quality*100,method:3,low_memory:1});
   if(!encoded)throw Error();const buffer=encoded.buffer.slice(encoded.byteOffset,encoded.byteOffset+encoded.byteLength);
   self.postMessage({id:data.id,buffer},[buffer]);
  }catch{self.postMessage({id:data.id,error:true});}
 });
};
