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


Deno.serve(async (req: Request) => {
  let headers = {};
  try {
    headers = cors(req);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    publicKey(req); // Public app key identifies configuration; it is not visitor authorization.
    const action = new URL(req.url).searchParams.get('action') || '';
    if (req.method === 'GET' && ['counts', 'gallery'].includes(action))
      return json(await rpc(action), 200, headers);
    if (req.method !== 'POST') return json({ error: 'NOT_FOUND' }, 404, headers);
    const input = await body(req);
    const data = publicRequest(action, input);
    // Fail closed before any mutation if function/project environments disagree.
    const runtime = await rpc('counts');
    if (runtime.batchId !== data.batchId) return json({ error: 'STALE_BATCH' }, 409, headers);
    return json(await rpc(action, { ...data, capabilityHash: await capability(input.giftSecret) }), 200, headers);
  } catch (e) { return failure(e, headers); }
});
