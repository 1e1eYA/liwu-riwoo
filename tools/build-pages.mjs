// Static-only GitHub Pages artifact. No Node runtime/server is published.
import {readFile,writeFile,readdir,mkdir,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {BACKEND as LOCAL_BACKEND} from '../app/backend-config.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=Object.fromEntries(process.argv.slice(2).map(v=>{const [k,...rest]=v.replace(/^--/,'').split('=');return [k,rest.join('=')];}));
const BACKEND=args['config-file']?JSON.parse(await readFile(path.resolve(root,args['config-file']),'utf8')):LOCAL_BACKEND;
const environment=process.env.LIWU_ENVIRONMENT||BACKEND.environment||'test';
if(environment!==BACKEND.environment)throw Error('Config/environment mismatch');
if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(BACKEND.supabaseUrl))throw Error('Provide a valid Supabase project URL');
if(environment==='production'&&(!args['config-file']||BACKEND.supabaseUrl===LOCAL_BACKEND.supabaseUrl||BACKEND.mode!=='supabase'||BACKEND.mediaEnabled!==true||BACKEND.moderationEnabled!==true))throw Error('Use an independent production config/project with media and moderation enabled');
const repo=process.env.GITHUB_REPOSITORY?.split('/')[1];
let base=args.base??BACKEND.basePath??(repo&&!repo.endsWith('.github.io')?'/'+repo+'/':'/');
if(!/^\/(?:[a-zA-Z0-9_.-]+\/)*$/.test(base))throw Error('Use a base such as /riwoo/ or /');
if(BACKEND.siteUrl){
 const site=new URL(BACKEND.siteUrl);
 if(site.protocol!=='https:'||site.pathname!=='/'||site.search||site.hash||site.username||site.password||base!=='/')throw Error('Custom-domain builds require an HTTPS origin and root base path');
}
if(!['test','production'].includes(environment))throw Error('Invalid deployment environment');
if(!BACKEND.publishableKey.startsWith('sb_publishable_'))throw Error('Only a publishable key belongs in the static artifact');
let runtime;
if(args['runtime-file']){
 if(environment!=='test')throw Error('Runtime fixture allowed only for local test builds');
 runtime=JSON.parse(await readFile(path.resolve(root,args['runtime-file']),'utf8'));
}else{
 const response=await fetch(BACKEND.supabaseUrl+'/functions/v1/liwu-public?action=counts',{
  headers:{apikey:BACKEND.publishableKey},signal:AbortSignal.timeout(15000),
 });
 if(!response.ok)throw Error('Deploy/validate the Supabase functions before building Pages');
 runtime=await response.json();
}
if(runtime.environment!==environment||!runtime.batchId)throw Error('Deployment/project environment mismatch');
if(environment==='production'){
 for(const [name,flag] of [['liwu-media','mediaEnabled'],['liwu-moderation','enabled']]){
  const response=await fetch(BACKEND.supabaseUrl+'/functions/v1/'+name+'?action=health',{method:'POST',headers:{apikey:BACKEND.publishableKey,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('Production function health failed: '+name);
  const health=await response.json();
  if(health.environment!=='production'||health.batchId!==runtime.batchId||health[flag]!==true||(name==='liwu-moderation'&&(health.policyVersion!=='cropped-v2'||!health.autoPublish||!health.keyConfigured)))throw Error('Production function configuration mismatch: '+name);
 }
 if(args['require-empty']==='true'&&(runtime.giftCount!==0||runtime.galleryCount!==0))throw Error('Initial production deployment must be empty');
}
const out=path.resolve(root,args.out||'site-dist');
if(!out.startsWith(root+path.sep)||out===root)throw Error('Output must be a new directory inside this workspace');
if((await readdir(out).catch(()=>[])).length)throw Error('Output is not empty; choose a new directory (no automatic deletion)');
await mkdir(path.join(out,'app'),{recursive:true});
const rewrite=text=>text.replace(/(["'`(])\/(app|assets|ui)\//g,(_,prefix,dir)=>prefix+base+dir+'/');
const modules=new Set();
async function moduleFile(relative){
 if(modules.has(relative))return;modules.add(relative);
 const adminSource=environment==='production'&&{'app/admin.js':'admin.js','app/admin-client.js':'admin-client.js'}[relative];
 const source=await readFile(adminSource?path.join(root,'production/frontend',adminSource):path.join(root,relative),'utf8');
 for(const match of source.matchAll(/(?:from\s*|import\s*)['"](\.\.?\/[^'"]+\.js)['"]/g))
  await moduleFile(path.posix.normalize(path.posix.join(path.posix.dirname(relative),match[1])));
 const target=path.join(out,relative);await mkdir(path.dirname(target),{recursive:true});
 await writeFile(target,rewrite(source));
}
await moduleFile('app/app.js');
if(environment==='production'){
 await moduleFile('app/admin.js');
 await writeFile(path.join(out,'app/admin.html'),rewrite(await readFile(path.join(root,'production/frontend/admin.html'),'utf8')));
 await copyFile(path.join(root,'production/frontend/admin-test.css'),path.join(out,'app/admin-test.css'));
}
const config={...BACKEND,mode:'supabase',environment,batchId:runtime.batchId};
await writeFile(path.join(out,'app/backend-config.js'),'// Public deployment configuration, generated from the validated API.\nexport const BACKEND=Object.freeze('+JSON.stringify(config,null,2)+');\n');
const html=rewrite(await readFile(path.join(root,'app/index.html'),'utf8'));
await writeFile(path.join(out,'index.html'),html);
await writeFile(path.join(out,'app/index.html'),html);
for(const css of ['style.css','short-screen.css','oct09.css'])
 await writeFile(path.join(out,'app',css),rewrite(await readFile(path.join(root,'app',css),'utf8')));
const allowed=new Set(['.png','.jpg','.jpeg','.webp','.svg','.gif','.ttf','.otf','.woff','.woff2']);
// These two reference rasters are used by the existing tool icons/gold frame.
const productionUi=new Set(['ui/03包装礼盒.jpg','ui/unfolded gifts03.jpg']);
async function assets(relative){
 for(const entry of await readdir(path.join(root,relative),{withFileTypes:true})){
  if(entry.name.startsWith('.'))continue;
  const item=path.join(relative,entry.name);
  if(entry.isDirectory())await assets(item);
  else if(entry.isFile()&&allowed.has(path.extname(entry.name).toLowerCase())&&(environment!=='production'||!relative.startsWith('ui')||productionUi.has(item.split(path.sep).join('/')))){
   const target=path.join(out,item);await mkdir(path.dirname(target),{recursive:true});await copyFile(path.join(root,item),target);
  }
 }
}
for(const folder of ['assets','ui','app/fonts'])await assets(folder);
await writeFile(path.join(out,'.nojekyll'),'');
await writeFile(path.join(out,'deployment.json'),JSON.stringify({environment,batchId:runtime.batchId,base,...(BACKEND.siteUrl?{siteUrl:BACKEND.siteUrl}:{})},null,2));
console.log('Static Pages artifact: '+out+' (environment='+environment+', base='+base+')');
