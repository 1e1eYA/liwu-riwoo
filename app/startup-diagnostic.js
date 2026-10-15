// Temporary local startup diagnostics: stage names only, never gift data/tokens.
const enabled=['localhost','127.0.0.1'].includes(location.hostname)||new URLSearchParams(location.search).has('bootDiagnostic');
export function startupMark(stage){if(!enabled)return;document.documentElement.dataset.startupStage=stage;console.info('[liwu-startup]',stage);}
export async function startupWait(stage,promise,timeoutMs=0){
 startupMark(stage+':start');const timer=setTimeout(()=>startupMark(stage+':waiting-5s'),5000);
 let deadline;
 try{const value=await (timeoutMs?Promise.race([promise,new Promise((_,reject)=>{deadline=setTimeout(()=>{startupMark(stage+':timeout');reject(Error('STARTUP_OPTIONAL_TIMEOUT'));},timeoutMs);})]):promise);startupMark(stage+':done');return value;}
 catch(e){startupMark(stage+':failed');throw e;}finally{clearTimeout(timer);clearTimeout(deadline);}
}
