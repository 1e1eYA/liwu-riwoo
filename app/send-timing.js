// Local diagnostic only. Never retain payloads, identifiers, URLs or credentials.
export function beginSendTiming(){
 const enabled=typeof location!=='undefined'&&['localhost','127.0.0.1','[::1]'].includes(location.hostname);
 const start=performance.now();
 const elapsed=(stage,since=start)=>{
  if(!enabled)return;
  try{console.info('[liwu-send-timing] '+JSON.stringify({stage,elapsedMs:Math.round(performance.now()-since)}));}catch{}
 };
 return {elapsed,async measure(stage,operation){const since=performance.now();try{return await operation();}finally{elapsed(stage,since);}}};
}
export function timeSend(timing,stage,operation){return timing?timing.measure(stage,operation):operation();}
