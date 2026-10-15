import {BACKEND} from './backend-config.js';
import {createAdminClient} from './admin-client.js';
const $=id=>document.getElementById(id),client=createAdminClient(BACKEND);
let busy=false,viewGeneration=0;
$('project').textContent=`环境：${BACKEND.environment} · 项目：${new URL(BACKEND.supabaseUrl).hostname}`;
function parkReviewResult(){$('review-feedback-home').append($('review-result'));}
function clearQueue(){viewGeneration++;parkReviewResult();$('queue').hidden=true;$('items').replaceChildren();$('summary').textContent='';}
function reviewFeedback(item,text,outcome){
  const result=$('review-result'),article=[...$('items').children].find(node=>node.dataset.submissionId===item.submissionId);
  (article||$('review-feedback-home')).append(result);result.textContent=text;result.dataset.outcome=outcome;
  result.scrollIntoView({block:'nearest',behavior:'auto'});
}
function update(){const s=client.session();$('login').disabled=busy;$('reload').disabled=busy||!s.signedIn;$('logout').disabled=!s.signedIn;$('anonymous').disabled=busy;
  document.querySelectorAll('[data-review-status],[data-media-preview]').forEach(button=>button.disabled=busy||!s.signedIn);
  $('session').textContent=s.signedIn?`已取得 access token（不显示）。会话到期：${new Date(s.expiresAt).toLocaleTimeString()}`:'尚未登录或会话已到期';}
function showQueue(data){
  parkReviewResult();
  $('items').replaceChildren();
  const pending=data.items.filter(item=>item.status==='pending');
  $('summary').textContent=`环境：${data.environment} · 批次：${data.batchId}\n共 ${data.items.length} 份投稿，其中 Pending ${pending.length} 份，Rejected ${data.items.filter(item=>item.status==='rejected').length} 份。\nGifts Count：${data.giftCount} · Gallery Count：${data.galleryCount}`;
  for(const item of data.items){
    const article=document.createElement('article'),heading=document.createElement('h3');
    article.dataset.submissionId=item.submissionId;
    heading.textContent=`Gift No.${item.giftNumber} · ${item.status}`;article.append(heading);
    const dl=document.createElement('dl');
    for(const [name,value] of [['礼盒名字',item.giftBoxName],['投稿 ID',item.submissionId],['投稿时间',item.submittedAt],['语言',item.language]]){
      const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=name;dd.textContent=String(value??'');dl.append(dt,dd);
    }
    article.append(dl);
    const details=document.createElement('details'),summary=document.createElement('summary'),text=document.createElement('pre');
    summary.textContent='查看 FROM、三个礼物名称和完整信件';
    text.textContent=`FROM: ${item.from??''}\n礼物：${(item.giftNames||[]).join(' / ')}\n\n${item.letterText??''}`;
    details.append(summary,text);article.append(details);$('items').append(article);
    if(BACKEND.moderationEnabled){
      const auto=document.createElement('p');auto.textContent=`自动审核：${item.moderationDecision||'尚无结果'} · ${item.moderationState||'未运行'}${item.manualOverride?' · 人工决定优先':''}`;article.append(auto);
      const copy=document.createElement('button');copy.type='button';copy.textContent='复制结构化原文';
      copy.onclick=async()=>{try{await navigator.clipboard.writeText(JSON.stringify({giftNumber:item.giftNumber,giftBoxName:item.giftBoxName,from:item.from,giftNames:item.giftNames,letterText:item.letterText,language:item.language},null,2));copy.textContent='已复制原文';}catch{copy.textContent='复制失败，请选取下方原文复制';}};article.append(copy);
      const read=document.createElement('button'),report=document.createElement('pre');read.type='button';read.textContent='查看自动审核分项';
      read.onclick=async()=>{read.disabled=true;try{const result=await client.readModeration(data.batchId,item.submissionId);if(!report.isConnected||!client.session().signedIn)return;
       const names={text:'结构化文本',image_1:'裁切图 1',image_2:'裁切图 2',image_3:'裁切图 3',box:'box.webp（历史审核）',letter:'letter.webp（历史审核）'};
       report.textContent=`${result.decision} · ${result.state}\n模型：${result.model} · 规则：${result.policyVersion}\n`+(result.inputs||[]).map(input=>{
        const r=input.result;return `${names[input.kind]||input.kind}：${input.state}${input.errorCode?' / '+input.errorCode:''}${r?' / flagged='+r.flagged:''}\n`+(r?Object.entries(r.categories).map(([category,flag])=>`${flag?'命中':'未命中'} ${category}：${r.category_scores[category]}（适用：${r.category_applied_input_types[category].join(', ')||'不适用'}）`).join('\n'):'');
       }).join('\n\n');
      }catch(e){report.textContent=e.message;}finally{read.disabled=false;}};article.append(read,report);
      const retry=document.createElement('button');retry.type='button';retry.textContent='重试失败的文字审核';retry.onclick=async()=>{retry.disabled=true;try{const r=await client.readModeration(data.batchId,item.submissionId,true);if(report.isConnected&&client.session().signedIn)report.textContent=`${r.decision} · ${r.state}（裁切图无法在后台重新取得；异常仍需人工复核）`;}catch(e){report.textContent=e.message;}finally{retry.disabled=false;}};article.append(retry);
    }
    if(BACKEND.mediaEnabled){
      const info=document.createElement('p');info.textContent=item.mediaReady?'图片：ready':'图片：尚未完成上传';article.append(info);
      if(item.mediaReady){const preview=document.createElement('button');preview.type='button';preview.dataset.mediaPreview='true';preview.textContent='查看私有展示图片';
       const images=document.createElement('div');images.className='admin-media';
       preview.onclick=async()=>{preview.disabled=true;images.textContent='正在获取短时预览链接……';try{const media=await client.readMedia(data.batchId,item.submissionId);if(!images.isConnected||!client.session().signedIn)return;images.replaceChildren();for(const kind of ['boxUrl','letterUrl']){const img=document.createElement('img');img.src=media[kind];img.alt=kind==='boxUrl'?'礼盒展示图':'展开信展示图';img.referrerPolicy='no-referrer';img.onerror=()=>{img.alt='链接已过期或图片不可用，请再次点击预览。';};images.append(img);}}catch(e){images.textContent=e.message;}finally{preview.disabled=false;}};article.append(preview,images);
      }
    }
    if(BACKEND.environment==='production'&&data.environment==='production'&&['pending','rejected'].includes(item.status)){
      const action=document.createElement('button'),status=item.status==='pending'?'rejected':'pending';
      action.type='button';action.dataset.reviewStatus=status;action.textContent=status==='rejected'?'标记为 Rejected':'恢复为 Pending';
      action.onclick=()=>reviewItem(data.batchId,item,status);article.append(action);
    }
    if(BACKEND.environment==='production'&&BACKEND.mediaEnabled&&item.mediaReady&&item.status!=='approved'){
      const approve=document.createElement('button');approve.type='button';approve.dataset.reviewStatus='approved';approve.textContent='批准进入 Gallery';approve.onclick=()=>reviewItem(data.batchId,item,'approved');article.append(approve);
    }
    if(BACKEND.environment==='production'&&BACKEND.mediaEnabled&&item.status==='approved'){
      const remove=document.createElement('button');remove.type='button';remove.dataset.reviewStatus='pending';remove.textContent='Remove → Pending';remove.onclick=()=>reviewItem(data.batchId,item,'pending');article.append(remove);
      const reject=document.createElement('button');reject.type='button';reject.dataset.reviewStatus='rejected';reject.textContent='撤回为 Rejected';reject.onclick=()=>reviewItem(data.batchId,item,'rejected');article.append(reject);
    }
  }
  $('queue').hidden=false;
}
async function reviewItem(batchId,item,status){
  if(busy)return;busy=true;update();
  reviewFeedback(item,`正在将 Gift No.${item.giftNumber} 从 ${item.status} 改为 ${status}……`,'waiting');
  try{
    const result=await client.reviewSubmission({batchId,submissionId:item.submissionId,status});
    if(!client.session().signedIn){clearQueue();return;}
    if(result.after)showQueue(result.after);
    if(result.verificationUnavailable){clearQueue();reviewFeedback(item,`Gift No.${result.giftNumber} 审核请求已成功，后续核对读取失败。请重新读取队列核对，不要重复提交。`,'warning');}
    else{
      const before=result.before,after=result.after;
      const labels={statusUpdated:'审核状态已更新',giftNumberUnchanged:'Gift Number 不变',giftCountUnchanged:'Gifts Count 不变',galleryCountUnchanged:'Gallery Count 符合审核状态',notPublic:'公开性符合审核状态',batchUnchanged:'部署批次不变'};
      reviewFeedback(item,`${result.verified?'✓ 核对通过':'⚠ 核对未全部通过（可能有并发变更，请重新读取并检查）'}\nGift No.${result.giftNumber} → ${result.status}\nGifts Count：${before.giftCount} → ${after.giftCount}\nGallery Count：${before.galleryCount} → ${after.galleryCount}\n`+Object.entries(result.checks).map(([key,ok])=>`${ok?'✓':'✗'} ${labels[key]}`).join('\n'),result.verified?'passed':'warning');
    }
  }catch(e){reviewFeedback(item,`${e.status?'HTTP '+e.status+'：':''}${e.message}\n若请求超时，先重新读取队列确认服务器状态，再决定是否重试。`,'error');}
  finally{busy=false;update();}
}
async function loadQueue(){
  clearQueue();const active=viewGeneration;
  $('result').textContent='正在验证管理员权限并读取队列……';
  const data=await client.readQueue();if(viewGeneration!==active)return;
  showQueue(data);$('result').textContent='HTTP 200：管理员权限验证通过，队列读取成功。';
}
function failure(e){
  clearQueue();
  const stage={ 'auth-login':'Supabase Auth 登录（/auth/v1/token）','review-queue':'管理员队列（liwu-admin / review-queue）','review-action':'审核操作（liwu-admin / review）','auth-logout':'退出登录' }[e.stage];
  $('result').textContent=`${stage?'失败阶段：'+stage+'\n':''}${e.status?'HTTP '+e.status+'：':''}${e.message}${e.code?'\n错误码：'+e.code:''}`;
}
$('login-form').addEventListener('submit',async e=>{
  e.preventDefault();if(busy)return;busy=true;clearQueue();$('review-result').textContent='';update();
  const email=$('email').value.trim(),password=$('password').value;$('password').value='';
  try{$('result').textContent='正在登录 Supabase Auth……';await client.login(email,password);update();await loadQueue();}
  catch(e){failure(e);}finally{busy=false;update();}
});
$('reload').onclick=async()=>{if(busy)return;busy=true;update();try{await loadQueue();}catch(e){failure(e);}finally{busy=false;update();}};
$('logout').onclick=async()=>{clearQueue();$('review-result').textContent='';$('password').value='';try{await client.logout();$('result').textContent='已退出当前登录会话。';}catch{$('result').textContent='当前页面凭证已清除，远程退出请求未成功。';}finally{update();}};
$('anonymous').onclick=async()=>{if(busy)return;busy=true;update();try{const result=await client.checkAnonymous();$('anonymous-result').textContent=result.passed?'HTTP 401：未登录请求被拒绝，检查通过。':'检查失败：未登录请求意外读取成功，请停止使用并检查后台权限。';}catch(e){$('anonymous-result').textContent=e.message;}finally{busy=false;update();}};
setInterval(()=>{const session=client.session();if(session.expiresAt&&!session.signedIn){client.clear();clearQueue();$('review-result').textContent='';}update();},1000);
window.addEventListener('pagehide',()=>{client.clear();clearQueue();$('review-result').textContent='';$('password').value='';});
update();
