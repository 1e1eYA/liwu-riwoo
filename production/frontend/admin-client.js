// Minimal, memory-only Auth session. No token/password is persisted or exported.
export function createAdminClient(config,fetchImpl=globalThis.fetch.bind(globalThis),now=Date.now){
  const base=config.supabaseUrl.replace(/\/$/,'');
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(base)||!config.publishableKey.startsWith('sb_publishable_'))throw Error('公开配置无效');
  let accessToken='',expiresAt=0,generation=0;
  const clear=()=>{accessToken='';expiresAt=0;generation++;};
  const session=()=>({signedIn:!!accessToken&&now()<expiresAt,expiresAt});
  async function request(path,{method='GET',payload,token}={}){
    const stage=path.startsWith('/auth/v1/token')?'auth-login':path.startsWith('/auth/v1/logout')?'auth-logout':path.includes('action=review&')||path.endsWith('action=review')?'review-action':'review-queue';
    let response;
    try{response=await fetchImpl(base+path,{method,headers:{apikey:config.publishableKey,
      ...(payload?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},
      body:payload?JSON.stringify(payload):undefined,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(path.includes('action=admin-retry')?90000:15000)});}
    catch{throw Object.assign(Error('网络请求失败或超时，请检查连接和 CORS。'),{code:'NETWORK',stage});}
    const data=await response.json().catch(()=>({}));
    if(!response.ok){
      // Only allowlisted error codes/messages are displayed; never echo raw Auth
      // responses, passwords, tokens, emails or arbitrary upstream text.
      const messages={
        invalid_credentials:'Supabase Auth 未接受登录信息。请核对这是本正式项目内的 Auth 用户及其密码；仅创建用户或配置管理员 UID 不代表已经设置登录密码。',
        invalid_grant:'Supabase Auth 未接受邮箱/密码登录，请核对该 Auth 用户的登录方式和密码。',
        email_not_confirmed:'该 Auth 用户邮箱尚未确认。请先完成此账号的邮箱确认，再重新登录。',
        email_provider_disabled:'此项目未启用邮箱密码登录，请在 Authentication 的 Email provider 配置中检查。',
        user_banned:'该 Auth 用户被禁用，请在 Authentication → Users 中检查此账号。',
        user_sso_managed:'该账号由 SSO 管理，不能使用此邮箱密码入口。',
        captcha_failed:'登录需要有效验证码，本最小入口尚未实现验证码流程。',
        validation_failed:'Supabase Auth 拒绝了登录参数，请检查邮箱和密码输入。',
        over_request_rate_limit:'登录请求过于频繁，请稍后重试。',
        UNAUTHORIZED:'会话缺失或无效，请重新登录。',
        FORBIDDEN:'Auth 身份已验证，但此 UID 不在管理员白名单中。',
        ORIGIN_DENIED:'当前页面来源未加入 LIWU_ALLOWED_ORIGINS。',
        DATABASE_UNAVAILABLE:'管理员接口无法读取数据库，请检查已部署 RPC 和函数日志。',
        SERVICE_UNAVAILABLE:'服务暂时不可用，请检查已部署函数配置。',
        MEDIA_NOT_READY:'投稿图片尚未准备完成。',
        STALE_BATCH:'测试批次已改变，请刷新页面并重新登录；未自动重试审核。',
        MEDIA_REQUIRED:'当前投稿没有可公开的展示图片，不能批准进入 Gallery。',
        MODERATION_NOT_FOUND:'该投稿尚无自动审核任务，仍可人工审核。',
        MODERATION_STALE:'任务已到期或已由人工处理，请继续人工审核。',
        MODERATION_BUSY:'该输入正在审核，请稍后重新读取结果。',
        MODERATION_RETRY_LIMIT:'该输入已达到重试上限，请人工审核。',
        SUBMISSION_NOT_FOUND:'当前批次中找不到该投稿，请重新读取队列。',
      };
      const candidate=data.error_code||data.code||data.error;
      const code=Object.hasOwn(messages,candidate)?candidate:undefined;
      const message=code?messages[code]:stage==='auth-login'&&response.status===400?'Supabase Auth 登录返回 400，尚未取得 access token；不能据此判断管理员函数配置错误。':response.status===401?'未登录、会话无效或登录信息错误。':response.status===403?'当前账号没有管理员权限，或访问来源未获允许。':response.status===429?'请求过于频繁，请稍后重试。':'服务请求失败，请检查函数配置。';
      throw Object.assign(Error(message),{status:response.status,code,stage});
    }
    return data;
  }
  return Object.freeze({
    session,clear,
    async login(email,password){
      clear();const active=generation;
      const data=await request('/auth/v1/token?grant_type=password',{method:'POST',payload:{email,password}});
      if(generation!==active)throw Error('登录已取消。');
      if(!data.access_token||data.token_type?.toLowerCase()!=='bearer'||!Number.isFinite(data.expires_in)||data.expires_in<=0)throw Error('登录响应缺少有效 access token。');
      // MFA sessions must not be presented as a completed admin login in this minimal entry.
      if(data.user?.factors?.some(f=>f.status==='verified'))throw Error('此账号已启用 MFA；需要支持二次验证的登录入口。');
      accessToken=data.access_token;expiresAt=now()+data.expires_in*1000;
      return session();
    },
    async readQueue(){
      if(!session().signedIn){clear();throw Object.assign(Error('请先登录；会话过期后需要重新登录。'),{status:401});}
      const active=generation,token=accessToken;
      let data;
      try{data=await request('/functions/v1/liwu-admin?action=review-queue',{token});}
      catch(e){if(e.status===401&&generation===active)clear();throw e;}
      if(generation!==active)throw Error('会话已结束，队列结果已丢弃。');
      if(data.environment!==config.environment||!data.batchId||!Array.isArray(data.items)||!Number.isSafeInteger(data.giftCount)||data.giftCount<0||!Number.isSafeInteger(data.galleryCount)||data.galleryCount<0)throw Error('队列环境或数据格式不匹配。');
      return data;
    },
    async checkAnonymous(){
      try{await request('/functions/v1/liwu-admin?action=review-queue');return {passed:false,status:200};}
      catch(e){if(e.status===401)return {passed:true,status:401};throw e;}
    },
    async readMedia(batchId,submissionId){
      if(!session().signedIn)throw Object.assign(Error('请先登录。'),{status:401});
      const active=generation;
      const data=await request('/functions/v1/liwu-media?action=admin-read',{method:'POST',token:accessToken,payload:{batchId,submissionId}});
      if(generation!==active)throw Error('会话已结束。');
      if(data.environment!==config.environment||data.batchId!==batchId)throw Error('图片环境或批次不匹配。');
      return data;
    },
    async readModeration(batchId,submissionId,retry=false){
      if(!session().signedIn)throw Object.assign(Error('请先登录。'),{status:401});
      const active=generation;
      const data=await request('/functions/v1/liwu-moderation?action='+(retry?'admin-retry':'admin-detail'),{method:'POST',token:accessToken,payload:{batchId,submissionId}});
      if(generation!==active)throw Error('会话已结束。');
      if(data.environment!==config.environment||data.batchId!==batchId)throw Error('审核环境或批次不匹配。');return data;
    },
    async reviewSubmission({batchId,submissionId,status}){
      if(config.environment!=='production')throw Error('正式审核入口仅允许 production 环境。');
      if(!['pending','rejected'].includes(status)&&!(config.mediaEnabled&&status==='approved'))throw Error('当前审核入口仅支持 Pending 与 Rejected，不执行公开批准。');
      if(!session().signedIn){clear();throw Object.assign(Error('请先登录；会话过期后需要重新登录。'),{status:401,stage:'review-action'});}
      const active=generation,token=accessToken;
      const before=await this.readQueue();
      if(before.batchId!==batchId)throw Object.assign(Error('队列批次已改变，请刷新后重试。'),{code:'STALE_BATCH',stage:'review-action'});
      const target=before.items.find(item=>item.submissionId===submissionId);
      if(!target||!['pending','rejected','approved'].includes(target.status))throw Error('投稿已不存在或状态已改变，请重新读取队列。');
      if(status==='approved'&&!target.mediaReady)throw Error('两张图片尚未 ready，不能批准公开。');
      if(target.status===status)throw Error('该投稿已处于目标状态，无需重复审核。');
      if(generation!==active||!session().signedIn)throw Error('会话已结束，未发送审核请求。');
      let response;
      try{response=await request('/functions/v1/liwu-admin?action=review',{method:'POST',token,payload:{batchId,submissionId,status}});}
      catch(e){if(e.status===401&&generation===active)clear();throw e;}
      if(generation!==active)throw Error('会话已结束。审核请求已发送，请重新登录核对状态，不要盲目重复提交。');
      if(response.environment!==config.environment||response.batchId!==batchId||response.submissionId!==submissionId||response.status!==status)throw Error('审核响应与请求不一致，请重新读取队列核对。');
      // A failed verification read must not be presented as a failed mutation.
      // No automatic retry of the status-changing POST.
      try{
        const after=await this.readQueue();
        const gallery=await request('/functions/v1/liwu-public?action=gallery');
        if(generation!==active)throw Error('会话已结束。');
        const updated=after.items.find(item=>item.submissionId===submissionId);
        const expectedGalleryCount=before.galleryCount+(status==='approved'?1:0)-(target.status==='approved'?1:0);
        const isPublic=Array.isArray(gallery.items)&&gallery.items.some(item=>item.id===submissionId||item.giftNumber===target.giftNumber||item.number===target.giftNumber);
        const checks={
          statusUpdated:updated?.status===status,
          giftNumberUnchanged:updated?.giftNumber===target.giftNumber,
          giftCountUnchanged:after.giftCount===before.giftCount&&response.giftCount===before.giftCount&&gallery.giftCount===before.giftCount,
          galleryCountUnchanged:after.galleryCount===expectedGalleryCount&&response.galleryCount===expectedGalleryCount&&gallery.galleryCount===expectedGalleryCount,
          notPublic:gallery.environment===config.environment&&gallery.batchId===batchId&&Array.isArray(gallery.items)&&isPublic===(status==='approved'),
          batchUnchanged:after.batchId===batchId,
        };
        return {before,after,checks,verified:Object.values(checks).every(Boolean),submissionId,giftNumber:target.giftNumber,status};
      }catch{
        return {before,after:null,checks:null,verified:false,submissionId,giftNumber:target.giftNumber,status,verificationUnavailable:true};
      }
    },
    async logout(){const token=accessToken;clear();if(token)await request('/auth/v1/logout?scope=local',{method:'POST',token});},
  });
}
