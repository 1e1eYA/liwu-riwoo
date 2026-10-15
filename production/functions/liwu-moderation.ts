// FINAL PRODUCTION: generated locally from current handlers. Paste as index.ts.
export {};
const identityPattern = /^[a-zA-Z0-9_-]{8,100}$/;
const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
function invalid(message = 'INVALID_REQUEST') {
  return Object.assign(new Error(message), { status: 400 });
}
function keys(value, allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).some(key => !allowed.includes(key))) throw invalid();
}
function batch(value) {
  if (typeof value !== 'string' || !uuidPattern.test(value)) throw invalid();
  return value;
}
function identity(value) {
  if (typeof value !== 'string' || !identityPattern.test(value)) throw invalid();
  return value;
}
function metadata(value, submission = false) {
  keys(value, ['giftNumber', 'giftBoxName', 'from', 'giftNames', 'letterText', 'language', 'completedAt']);
  const text = (v, max) => typeof v === 'string' && [...v].length <= max && !v.includes('\u0000');
  if (!text(value.giftBoxName, 60) || !text(value.from, 60) ||
      !text(value.letterText, 12000) || !Array.isArray(value.giftNames) ||
      value.giftNames.length !== 3 || !value.giftNames.every(v => text(v, 40)) ||
      !['en', 'zh', 'ko', 'ja'].includes(value.language) ||
      (submission && !value.giftBoxName.trim())) throw invalid('INVALID_METADATA');
  // Number and completion time always come from the completion row, never the client.
  return { giftBoxName: value.giftBoxName, from: value.from, giftNames: value.giftNames,
    letterText: value.letterText, language: value.language };
}
function publicRequest(action, body) {
  const allowed = ['giftId', 'giftSecret', 'batchId'];
  if (action === 'archive') allowed.push('metadata', 'consent');
  if (action === 'submit') allowed.push('metadata','renderFingerprint');
  if (!['complete', 'archive', 'submit', 'submission-status'].includes(action)) throw invalid();
  keys(body, allowed);
  const result = { giftId: identity(body.giftId), batchId: batch(body.batchId) };
  if (typeof body.giftSecret !== 'string' || !/^gift_[a-f0-9]{32}$/.test(body.giftSecret))
    throw invalid('INVALID_CAPABILITY');
  if (action === 'archive' && body.consent !== true) throw invalid('CONSENT_REQUIRED');
  if (action === 'archive' || action === 'submit') result.metadata = metadata(body.metadata, action === 'submit');
  if (action === 'archive') result.consent = true;
  if (action === 'submit' && body.renderFingerprint !== undefined) {
    if (typeof body.renderFingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(body.renderFingerprint)) throw invalid('INVALID_FINGERPRINT');
    result.renderFingerprint=body.renderFingerprint;
  }
  return result;
}


function environment() {
  const value = Deno.env.get('LIWU_ENVIRONMENT') || 'production';
  if (value !== 'production') throw new Error('CONFIGURATION_MISSING');
  return value;
}
function cors(req: Request) {
  const defaults = ''; 
  const origins = (Deno.env.get('LIWU_ALLOWED_ORIGINS') || defaults).split(',').map(s => s.trim()).filter(Boolean);
  const origin = req.headers.get('origin');
  if (origin && !origins.includes(origin)) throw Object.assign(new Error('ORIGIN_DENIED'), { status: 403 });
  return { ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Headers': 'apikey, authorization, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Vary': 'Origin',
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
}
function json(value: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(value), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
}
async function body(req: Request) {
  if (!req.headers.get('content-type')?.startsWith('application/json')) throw invalid();
  const reader = req.body?.getReader();
  if (!reader) throw invalid();
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const { value, done } = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > 65536) { await reader.cancel(); throw Object.assign(new Error('PAYLOAD_TOO_LARGE'), { status: 413 }); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { throw invalid(); }
}
function publicKey(req: Request) {
  const expected = Deno.env.get('LIWU_PUBLISHABLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY');
  if (!expected) throw new Error('CONFIGURATION_MISSING');
  if (req.headers.get('apikey') !== expected) throw Object.assign(new Error('UNAUTHORIZED'), { status: 401 });
}
async function capability(secret: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}
async function rpc(action: string, data: Record<string, unknown> = {}, functionName='liwu_api') {
  const url = Deno.env.get('SUPABASE_URL');
  // Platform-managed secrets only; never supplied through the frontend or repo.
  const platformKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
  const key = platformKeys.default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('CONFIGURATION_MISSING');
  const response = await fetch(url + '/rest/v1/rpc/'+functionName, {
    method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json',
      ...(!key.startsWith('sb_secret_') ? { Authorization: 'Bearer ' + key } : {}) },
    body: JSON.stringify({ p_action: action, p_data: data }), signal: AbortSignal.timeout(10000),
  });
  const result = await response.json();
  if (!response.ok) {
    const known = ['STALE_BATCH', 'INVALID_CAPABILITY', 'COMPLETION_REQUIRED', 'CONSENT_REQUIRED',
      'GALLERY_FULL', 'INVALID_METADATA', 'NAME_REQUIRED', 'MEDIA_REQUIRED', 'SUBMISSION_NOT_FOUND', 'MEDIA_SNAPSHOT_MISMATCH','LEGACY_CONFIRMATION_REQUIRED',
      'INVALID_FINGERPRINT','PENDING_REQUIRED','INVALID_MEDIA','UPLOAD_LIMIT','UPLOAD_NOT_FOUND','MEDIA_ALREADY_READY','MEDIA_NOT_PUBLIC','MEDIA_NOT_READY','FINALIZE_IN_PROGRESS',
      'MODERATION_NOT_FOUND','MODERATION_STALE','MODERATION_BUSY','MODERATION_RETRY_LIMIT','INVALID_MODERATION'];
    const code = known.find(code => result.message?.includes(code));
    throw Object.assign(new Error(code || 'DATABASE_UNAVAILABLE'), {
      status: code === 'INVALID_CAPABILITY' ? 403 : code ? 409 : 503,
    });
  }
  if (result.environment !== environment()) throw new Error('ENVIRONMENT_MISMATCH');
  return result;
}
async function administrator(req: Request) {
  publicKey(req);
  const token = req.headers.get('authorization');
  if (!token?.startsWith('Bearer ')) throw Object.assign(new Error('UNAUTHORIZED'), { status: 401 });
  const response = await fetch(Deno.env.get('SUPABASE_URL') + '/auth/v1/user', {
    headers: { apikey: Deno.env.get('LIWU_PUBLISHABLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '',
      Authorization: token }, signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw Object.assign(new Error('UNAUTHORIZED'), { status: 401 });
  const user = await response.json();
  const admins = (Deno.env.get('LIWU_ADMIN_USER_IDS') || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!user.id || !admins.includes(user.id)) throw Object.assign(new Error('FORBIDDEN'), { status: 403 });
}
function failure(error: unknown, headers: Record<string, string>) {
  const e = error as Error & { status?: number };
  return json({ error: e.status ? e.message : 'SERVICE_UNAVAILABLE' }, e.status || 503, headers);
}

// Dependency-free SigV4, usable in Deno Edge and isolated Node tests.
const enc=value=>encodeURIComponent(value).replace(/[!'()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase());
const hex=bytes=>[...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');
const utf8=value=>new TextEncoder().encode(value);
const sha=async value=>hex(await crypto.subtle.digest('SHA-256',utf8(value)));
async function hmac(key,value){const k=await crypto.subtle.importKey('raw',typeof key==='string'?utf8(key):key,{name:'HMAC',hash:'SHA-256'},false,['sign']);return crypto.subtle.sign('HMAC',k,utf8(value));}
function createR2(config,fetchImpl=globalThis.fetch.bind(globalThis)){
  const endpoint=new URL(config.endpoint);
  if(endpoint.protocol!=='https:'||!/^([a-f0-9]{32})(\.(eu|us|fedramp))?\.r2\.cloudflarestorage\.com$/.test(endpoint.hostname)||endpoint.username||endpoint.password||endpoint.search||endpoint.hash||endpoint.pathname!=='/'||!config.accessKeyId||!config.secretAccessKey||!config.bucket)throw Error('R2_CONFIGURATION_MISSING');
  const keyPath=key=>'/'+enc(config.bucket)+'/'+key.split('/').map(enc).join('/');
  async function presign(method,key,expires=120,headers={},date=new Date()){
    if(!['GET','HEAD','PUT'].includes(method)||!Number.isInteger(expires)||expires<1||expires>300)throw Error('INVALID_SIGNATURE_REQUEST');
    const stamp=date.toISOString().replace(/[:-]|\.\d{3}/g,''),day=stamp.slice(0,8),scope=day+'/auto/s3/aws4_request';
    const h={host:endpoint.host};for(const [name,value] of Object.entries(headers))h[name.toLowerCase()]=String(value).trim().replace(/\s+/g,' ');
    const names=Object.keys(h).sort(),signed=names.join(';');
    const query={'X-Amz-Algorithm':'AWS4-HMAC-SHA256','X-Amz-Credential':config.accessKeyId+'/'+scope,'X-Amz-Date':stamp,'X-Amz-Expires':String(expires),'X-Amz-SignedHeaders':signed};
    const canonicalQuery=Object.keys(query).sort().map(k=>enc(k)+'='+enc(query[k])).join('&');
    const canonical=[method,keyPath(key),canonicalQuery,names.map(n=>n+':'+h[n]+'\n').join(''),signed,'UNSIGNED-PAYLOAD'].join('\n');
    const signingKey=await hmac(await hmac(await hmac(await hmac('AWS4'+config.secretAccessKey,day),'auto'),'s3'),'aws4_request');
    const signature=hex(await hmac(signingKey,'AWS4-HMAC-SHA256\n'+stamp+'\n'+scope+'\n'+await sha(canonical)));
    return endpoint.origin+keyPath(key)+'?'+canonicalQuery+'&X-Amz-Signature='+signature;
  }
  async function send(method,key,headers={}){
    const url=await presign(method,key,120,headers);
    let response;try{response=await fetchImpl(url,{method,headers,signal:AbortSignal.timeout(25000),redirect:'error'});}catch{throw Error('R2_UNAVAILABLE');}
    if(!response.ok){await response.body?.cancel();throw Error(response.status===404?'R2_OBJECT_MISSING':response.status===412?'R2_OBJECT_CHANGED':'R2_UNAVAILABLE');}
    return response;
  }
  async function head(key){const r=await send('HEAD',key);return {bytes:Number(r.headers.get('content-length')),type:r.headers.get('content-type'),etag:r.headers.get('etag')};}
  async function prefix(key,etag){const r=await send('GET',key,{Range:'bytes=0-4095','If-Match':etag});
    const reader=r.body.getReader();let size=0;const chunks=[];
    try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4096)throw Error('R2_INVALID_RANGE');chunks.push(value);}}finally{await reader.cancel();}
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return bytes;
  }
  async function copy(source,destination,etag){
    const r=await send('PUT',destination,{'x-amz-copy-source':keyPath(source),'x-amz-copy-source-if-match':etag,'x-amz-metadata-directive':'REPLACE','Content-Type':'image/webp','Cache-Control':'private, no-store'});
    const xml=await r.text();if(xml.includes('<Error>'))throw Error('R2_COPY_FAILED');
    return head(destination);
  }
  return {presign,head,prefix,copy};
}

function webpDimensions(bytes,totalBytes){
  const text=(offset,n)=>String.fromCharCode(...bytes.slice(offset,offset+n));
  if(bytes.length<30||text(0,4)!=='RIFF'||text(8,4)!=='WEBP')throw Error('INVALID_MEDIA');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),u24=o=>bytes[o]+bytes[o+1]*256+bytes[o+2]*65536;
  if(view.getUint32(4,true)+8!==totalBytes)throw Error('INVALID_MEDIA');
  for(let offset=12;offset+8<bytes.length;){const kind=text(offset,4),size=view.getUint32(offset+4,true),p=offset+8;
    if(kind==='VP8X'&&p+10<=bytes.length){if(bytes[p]&2)throw Error('INVALID_MEDIA');return {width:u24(p+4)+1,height:u24(p+7)+1};}
    if(kind==='VP8L'&&p+5<=bytes.length){if(bytes[p]!==0x2f)throw Error('INVALID_MEDIA');const bits=view.getUint32(p+1,true);return {width:(bits&0x3fff)+1,height:((bits>>>14)&0x3fff)+1};}
    if(kind==='VP8 '&&p+10<=bytes.length){if(text(p+3,3)!=='\x9d\x01\x2a')throw Error('INVALID_MEDIA');return {width:view.getUint16(p+6,true)&0x3fff,height:view.getUint16(p+8,true)&0x3fff};}
    offset=p+size+(size%2);
  }throw Error('INVALID_MEDIA');
}

// No images, prompts, credentials or signed URLs are logged or persisted here.
const CATEGORY_NAMES=['harassment','harassment/threatening','hate','hate/threatening','illicit','illicit/violent','self-harm','self-harm/intent','self-harm/instructions','sexual','sexual/minors','violence','violence/graphic'];
async function moderationHash(bytes){const digest=await crypto.subtle.digest('SHA-256',typeof bytes==='string'?new TextEncoder().encode(bytes):bytes);return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');}
function validateModeration(value){
 if(!value||typeof value.model!=='string'||!value.model.startsWith('omni-moderation-')||!Array.isArray(value.results)||value.results.length!==1)throw Error('MODERATION_INVALID_RESPONSE');
 const r=value.results[0];if(typeof r.flagged!=='boolean')throw Error('MODERATION_INVALID_RESPONSE');
 for(const c of CATEGORY_NAMES){const score=r.category_scores?.[c],types=r.category_applied_input_types?.[c];
  if(typeof r.categories?.[c]!=='boolean'||!Number.isFinite(score)||score<0||score>1||!Array.isArray(types)||types.some(t=>!['image','text'].includes(t)))throw Error('MODERATION_INVALID_RESPONSE');
 }
 // Inconsistent/new flags cannot accidentally be treated as a clean response.
 const flagged=r.flagged||Object.values(r.categories).some(v=>v!==false);
 return {flagged,categories:Object.fromEntries(CATEGORY_NAMES.map(c=>[c,r.categories[c]])),category_scores:Object.fromEntries(CATEGORY_NAMES.map(c=>[c,r.category_scores[c]])),category_applied_input_types:Object.fromEntries(CATEGORY_NAMES.map(c=>[c,r.category_applied_input_types[c]])),model:value.model};
}
async function callModeration(input,key,fetchImpl=globalThis.fetch.bind(globalThis)){
 if(!key)throw Error('MODERATION_KEY_MISSING');
 let response;try{response=await fetchImpl('https://api.openai.com/v1/moderations',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model:'omni-moderation-latest',input}),signal:AbortSignal.timeout(20000),redirect:'error'});}catch{throw Error('MODERATION_TIMEOUT');}
 if(!response.ok){await response.body?.cancel();throw Error(response.status===429?'MODERATION_RATE_LIMIT':'MODERATION_UNAVAILABLE');}
 try{return validateModeration(await response.json());}catch{throw Error('MODERATION_INVALID_RESPONSE');}
}
function imageDataUrl(bytes){let binary='';for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));return 'data:image/webp;base64,'+btoa(binary);}


Deno.serve(async(req:Request)=>{
 let headers={};
 try{
  headers=cors(req);if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  publicKey(req);if(req.method!=='POST')throw invalid();
  const action=new URL(req.url).searchParams.get('action')||'';
  const admin=['admin-detail','admin-retry'].includes(action);
  if(admin)await administrator(req);
  const health=await rpc('health',{},'liwu_moderation_api');
  if(action==='health')return json({...health,enabled:Deno.env.get('LIWU_AUTO_MODERATION_ENABLED')==='true',autoPublish:Deno.env.get('LIWU_AUTO_PUBLISH_ENABLED')==='true',keyConfigured:!!Deno.env.get('OPENAI_API_KEY')},200,headers);
  let input,bytes:Uint8Array|undefined;
  if(action==='image'){
   // Dedicated bounded multipart parser: never relax the existing 64KB JSON APIs.
   if(!req.headers.get('content-type')?.startsWith('multipart/form-data;'))throw invalid('INVALID_MEDIA');
   const reader=req.body?.getReader();if(!reader)throw invalid();let size=0;const chunks:Uint8Array[]=[];
   while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1600000){await reader.cancel();throw invalid('INVALID_MEDIA');}chunks.push(value);}
   const packed=new Uint8Array(size);let offset=0;for(const c of chunks){packed.set(c,offset);offset+=c.length;}
   const form=await new Response(packed,{headers:{'Content-Type':req.headers.get('content-type')!}}).formData();
   if([...form.keys()].length!==2||typeof form.get('metadata')!=='string'||String(form.get('metadata')).length>4096)throw invalid();
   input=JSON.parse(String(form.get('metadata')));const file=form.get('image');
   if(!(file instanceof Blob)||file.type!=='image/webp'||file.size<20||file.size>1500000)throw invalid('INVALID_MEDIA');
   bytes=new Uint8Array(await file.arrayBuffer());const d=webpDimensions(bytes,bytes.length);
   if(d.width!==838||d.height!==944)throw invalid('INVALID_MEDIA');
  }else input=await body(req);
  keys(input,action==='start'?['batchId','submissionId','giftId','giftSecret','fingerprint']:action==='image'?['batchId','submissionId','giftId','giftSecret','kind']:admin?['batchId','submissionId']:['batchId','submissionId','giftId','giftSecret']);
  batch(input.batchId);batch(input.submissionId);if(input.batchId!==health.batchId)throw invalid('STALE_BATCH');
  let data:Record<string,unknown>={batchId:input.batchId,submissionId:input.submissionId};
  if(admin)data.administrator=true;
  else{
   identity(input.giftId);if(typeof input.giftSecret!=='string'||!/^gift_[a-f0-9]{32}$/.test(input.giftSecret))throw invalid('INVALID_CAPABILITY');
   data={...data,giftId:input.giftId,capabilityHash:await capability(input.giftSecret)};
  }
  const db=(a:string,extra={})=>rpc(a,{...data,...extra},'liwu_moderation_api');
  if(action==='admin-detail')return json(await db(action),200,headers);
  if(Deno.env.get('LIWU_AUTO_MODERATION_ENABLED')!=='true')return json({...health,disabled:true,decision:'needs_review'},200,headers);
  async function acceptInput(kind:string,value:string|Uint8Array,image=false){
   const hash=await moderationHash(value),claim=await db('claim',{kind,inputHash:hash});if(claim.skip)return;
   const work=(async()=>{
   const started=Date.now();let outcome='failed';
   try{
    const modelInput=image?[{type:'image_url',image_url:{url:typeof value==='string'?value:imageDataUrl(value)}}]:value;
    const result=await callModeration(modelInput,Deno.env.get('OPENAI_API_KEY'));
    await db('record',{kind,leaseToken:claim.leaseToken,result});
    outcome='completed';
   }catch(e){
    const allowed=['MODERATION_KEY_MISSING','MODERATION_TIMEOUT','MODERATION_RATE_LIMIT','MODERATION_UNAVAILABLE','MODERATION_INVALID_RESPONSE'];
    const code=allowed.includes((e as Error).message)?(e as Error).message:'MODERATION_UNAVAILABLE';
    await db('record',{kind,leaseToken:claim.leaseToken,errorCode:code});
   }finally{
    console.info('[liwu-moderation-timing]',JSON.stringify({environment:health.environment,policyVersion:'cropped-v2',kind,elapsedMs:Date.now()-started,outcome}));
   }
   await db('finalize',{autoPublish:Deno.env.get('LIWU_AUTO_PUBLISH_ENABLED')==='true'});
   })().catch(()=>{/* Lease expiration fails closed if a worker/DB is interrupted. */});
   // Accept only after bytes, ownership, hash and lease are validated. The worker
   // owns all remaining image work; no browser callbacks are needed to publish.
   const runtime=(globalThis as any).EdgeRuntime;
   if(runtime?.waitUntil)runtime.waitUntil(work);else await work;
  }
  if(action==='start'){
   if(typeof input.fingerprint!=='string'||!/^[a-f0-9]{64}$/.test(input.fingerprint))throw invalid('INVALID_FINGERPRINT');
   const start=await db('start',{fingerprint:input.fingerprint});if(start.skip)return json(start,200,headers);
   const context=await db('context');await acceptInput('text',JSON.stringify(context.text));
   return json({...await db('status'),accepted:true},202,headers);
  }
  if(action==='image'){
   if(!['image_1','image_2','image_3'].includes(input.kind)||!bytes)throw invalid();
   await acceptInput(input.kind,bytes,true);return json({...await db('status'),accepted:true},202,headers);
  }
  if(action==='finish'||action==='admin-retry'){
   if(action==='admin-retry'){const context=await db('context');await acceptInput('text',JSON.stringify(context.text));}
   else await db('seal');
   return json(await db('finalize',{autoPublish:Deno.env.get('LIWU_AUTO_PUBLISH_ENABLED')==='true'}),200,headers);
  }
  if(action==='status')return json(await db('status'),200,headers);
  throw invalid();
 }catch(e){return failure(e,headers);}
});
