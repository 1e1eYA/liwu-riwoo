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


Deno.serve(async(req:Request)=>{
 let headers={};
 try{
  headers=cors(req);if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  publicKey(req);
  const action=new URL(req.url).searchParams.get('action')||'';
  if(req.method!=='POST')return json({error:'NOT_FOUND'},404,headers);
  const input=await body(req);
  const admin=action==='admin-read';
  if(admin)await administrator(req);
  const health=await rpc('health',{},'liwu_media_api');
  const r2Environment=Deno.env.get('R2_ENVIRONMENT')||'production';
  const bucket=Deno.env.get('R2_BUCKET')||'';
  if(r2Environment!==environment()||(environment()==='production'&&bucket==='liwu-gallery'))throw Error('R2_ENVIRONMENT_MISMATCH');
  const r2=createR2({endpoint:Deno.env.get('R2_ENDPOINT')||'',bucket,accessKeyId:Deno.env.get('R2_ACCESS_KEY_ID'),secretAccessKey:Deno.env.get('R2_SECRET_ACCESS_KEY')});
  if(action==='health'){keys(input,[]);return json({...health,limits:{box:300000,letter:4000000},putTtl:300,getTtl:120},200,headers);}
  if(input.batchId!==health.batchId)throw invalid('STALE_BATCH');
  batch(input.submissionId);batch(input.batchId);
  let data:Record<string,unknown>={batchId:input.batchId,submissionId:input.submissionId};
  if(['prepare','finish'].includes(action)){
   identity(input.giftId);if(typeof input.giftSecret!=='string'||!/^gift_[a-f0-9]{32}$/.test(input.giftSecret))throw invalid('INVALID_CAPABILITY');
   data={...data,giftId:input.giftId,capabilityHash:await capability(input.giftSecret)};
  }
  if(action==='prepare'){
   keys(input,['batchId','submissionId','giftId','giftSecret','fingerprint','specs','metadata','legacyConfirmed']);
   if(typeof input.fingerprint!=='string'||!/^[a-f0-9]{64}$/.test(input.fingerprint))throw invalid('INVALID_FINGERPRINT');
   keys(input.specs,['box','letter']);
   for(const kind of ['box','letter']){const s=input.specs[kind];keys(s,['bytes','width','height']);
    if(![s.bytes,s.width,s.height].every(Number.isSafeInteger)||s.bytes<20||s.bytes>(kind==='box'?300000:4000000)||s.width<1||s.height<1||Math.max(s.width,s.height)>16384||s.width*s.height>18000000)throw invalid('INVALID_MEDIA');}
   const prepared=await rpc('prepare',{...data,fingerprint:input.fingerprint,specs:input.specs,metadata:metadata(input.metadata),legacyConfirmed:input.legacyConfirmed===true},'liwu_media_api');
   if(prepared.ready)return json(prepared,200,headers);
   const uploaded:Record<string,boolean>={};
   for(const kind of ['box','letter']){uploaded[kind]=false;try{const head=await r2.head(prepared[kind+'TempKey']),spec=prepared.specs[kind];if(head.bytes===spec.bytes&&head.type==='image/webp'&&head.etag){const d=webpDimensions(await r2.prefix(prepared[kind+'TempKey'],head.etag),head.bytes);uploaded[kind]=d.width===spec.width&&d.height===spec.height;}}catch{/* Missing/invalid temporary object can be uploaded again. */}}
   const urls={box:await r2.presign('PUT',prepared.boxTempKey,300,{'Content-Type':'image/webp'}),letter:await r2.presign('PUT',prepared.letterTempKey,300,{'Content-Type':'image/webp'})};
   return json({environment:health.environment,batchId:health.batchId,version:prepared.version,ready:false,uploaded,putUrls:urls,expiresAt:new Date(Date.now()+300000).toISOString()},200,headers);
  }
  if(action==='finish'){
   keys(input,['batchId','submissionId','giftId','giftSecret','version']);batch(input.version);
   const checked=await rpc('finish-check',{...data,version:input.version},'liwu_media_api');
   if(checked.ready)return json({environment:health.environment,batchId:health.batchId,ready:true},200,headers);
   try{
   const etags:Record<string,string>={};
   for(const kind of ['box','letter']){
    const key=checked[kind+'TempKey'],spec=checked.specs[kind],head=await r2.head(key);
    if(head.bytes!==spec.bytes||head.bytes>(kind==='box'?300000:4000000)||head.type?.split(';')[0]!=='image/webp'||!head.etag)throw invalid('INVALID_MEDIA');
    const dimensions=webpDimensions(await r2.prefix(key,head.etag),head.bytes);
    if(dimensions.width!==spec.width||dimensions.height!==spec.height)throw invalid('INVALID_MEDIA');
    const saved=await r2.copy(key,checked[kind+'Key'],head.etag);
    if(saved.bytes!==head.bytes||!saved.etag)throw invalid('INVALID_MEDIA');etags[kind+'Etag']=saved.etag;
   }
   await rpc('commit',{...data,version:input.version,finalizeToken:checked.finalizeToken,...etags},'liwu_media_api');
   // Temporary objects are cleaned only after their PUT grants expire, not now:
   // the URL could otherwise recreate them before expiry.
   return json({environment:health.environment,batchId:health.batchId,ready:true},200,headers);
   }catch(e){try{await rpc('release',{...data,version:input.version,finalizeToken:checked.finalizeToken},'liwu_media_api');}catch{}throw e;}
  }
  if(['public-read','admin-read'].includes(action)){
   keys(input,['batchId','submissionId']);
   const media=await rpc(action,data,'liwu_media_api');
   return json({environment:health.environment,batchId:health.batchId,submissionId:input.submissionId,
    boxUrl:await r2.presign('GET',media.boxKey,120),letterUrl:await r2.presign('GET',media.letterKey,120),expiresAt:new Date(Date.now()+120000).toISOString()},200,headers);
  }
  return json({error:'NOT_FOUND'},404,headers);
 }catch(e){return failure(e,headers);}
});
