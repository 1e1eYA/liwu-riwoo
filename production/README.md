# 全新 production：按此顺序部署

本包基于 2026-10-15 最终代码。只适用于全新 Supabase 正式项目；本轮没有修改任何远程服务。
不要执行旧 migrations、prepare-empty-production.sql 或测试部署文档。
本包 SQL 不导入作品、不重放测试批次、不提供清场/重置动作；不转换现有 test 项目。

最终架构：GitHub Pages 静态站 + Supabase Edge Functions/PostgreSQL + 独立私有 R2 桶。
四项异步审核：structured text + 三张实际裁切图。全部成功且无 flagged 才自动 Approved；异常/缺失保持 Pending。
两张 WebP ready 后才允许公开。裁切图只在内存中，不写 R2/Storage/DB。
Gift Number 固定为完成顺序；Gallery Number 由当前公开池按 publication order 连续显示为 1…N。
搜索、正倒序、Detail Back 保留。上传成功弹窗点击确认进入 Gallery；Back 回到结束页，Save 可用。

## 1. 创建正式 Supabase 项目和正式 R2 桶

- 新建 Supabase 项目，记录正式 Project URL 与 publishable key。无需复制或提供 service-role/secret key。
- Cloudflare → R2 → Create bucket：`liwu-gallery-production`。保持 Public Access Disabled，勿添加公开域名。
- 创建仅限该正式桶的 **Object Read & Write** S3 凭证。Access Key ID / Secret Access Key 只填正式 Supabase Secrets。
  不需要 Cloudflare 账户管理 Token，也不要复用测试桶凭证。
- 正式桶 → Settings → CORS：粘贴 `r2-cors.example.json`，只将 origin 改为实际站点 origin。
  例如 `https://用户名.github.io`，不含 `/仓库名/`；自定义域名填写实际 HTTPS origin。
  方法 PUT/GET/HEAD、Content-Type、暴露 ETag 已包含。不要开放 `*`。
- 当前版本不配置对象删除生命周期，不执行任何测试清场。正常最终资产只有 box.webp/letter.webp；
  上传机制可能产生私有 staging/失败版本对象，当前仍沿用已验收行为，不在本次部署中新增清理逻辑。

## 2. 只执行这一份安装 SQL

正式 Supabase Dashboard → SQL Editor → New query，全文执行 **`01-install.sql`** 一次。
它直接创建最终 8 张表、正式环境约束、最终四项审核函数、RLS 和 service-only RPC，
自动生成全新 production batch；gift/gallery 两个内部计数器均从 1 开始。
如果项目已有 liwu_private，事务会拒绝安装；不要通过删表绕过。

接着执行只读 **`02-verify-empty.sql`**，应看到：

- environment=production、giftCount=0、galleryCount=0、mock=false，新的 batchId。
- 两个 next_number 均为 1；其余 7 张表行数全部 0。
- 8 张表 RLS=true；所有 liwu RPC：anon/authenticated=false，service_role=true。

不要将 liwu_private 加入 Data API exposed schemas，也不要给访客额外表权限。

表职责：number_counters 分配完成编号与内部公开顺序；gift_completions 防重复完成登记；
gift_archives 经同意或投稿才保存文本；gallery_submissions 保存投稿/公开状态；
gallery_review_events 保存人工/自动审核事件；gallery_media_uploads 关联 R2 版本/ready；
moderation_runs 保存审核汇总；moderation_inputs 保存四项哈希与结果，不保存裁切图。

## 3. 创建正式管理员、设置 Secrets

正式项目 → Authentication → Users → Add user，创建管理员邮箱/密码账号并确认邮箱，记录该项目的用户 UID。
管理员账号不会从 test 项目迁移；在 Auth 设置中关闭公众注册即可，普通礼物访客不需要账号。

Edge Functions → Secrets，添加以下 12 项：

| Secret | 正式值 |
| --- | --- |
| LIWU_ENVIRONMENT | production |
| LIWU_PUBLISHABLE_KEY | 正式项目 publishable key |
| LIWU_ALLOWED_ORIGINS | 正式站点 origin；多域名用逗号分隔，不含路径 |
| LIWU_ADMIN_USER_IDS | 正式管理员 UID；多个用逗号分隔 |
| R2_ENVIRONMENT | production |
| R2_ENDPOINT | 正式桶对应的 S3 API HTTPS endpoint，通常 https://账户ID.r2.cloudflarestorage.com |
| R2_BUCKET | liwu-gallery-production |
| R2_ACCESS_KEY_ID | 正式桶 S3 Access Key ID |
| R2_SECRET_ACCESS_KEY | 正式桶 S3 Secret Access Key |
| OPENAI_API_KEY | 你自己的 OpenAI API key |
| LIWU_AUTO_MODERATION_ENABLED | true |
| LIWU_AUTO_PUBLISH_ENABLED | true |

高权限值只在正式 Supabase Secrets 中填写，不进入 GitHub/前端/聊天。
SUPABASE_URL 与平台服务端凭据由 Supabase 注入，不需要手工获取高权限 Supabase key。
没有任何测试清场开关需要配置。

## 4. 部署最终四个 Edge Functions

Dashboard → Edge Functions → Deploy a new function → Via Editor。按下表函数名创建，
将对应文件全文粘贴成 index.ts，Deploy。**四个均关闭平台 Verify JWT**，保留文件内权限校验。

| 函数名 | 本包单文件 |
| --- | --- |
| liwu-public | functions/liwu-public.ts |
| liwu-admin | functions/liwu-admin.ts |
| liwu-media | functions/liwu-media.ts |
| liwu-moderation | functions/liwu-moderation.ts |

这些是正式专用包，不使用 supabase/dashboard 下包含测试入口的旧文件。
访客仍需对应礼物操作凭证；管理员仍需真实 Auth token + UID 白名单。publishable key 不具有审核权限。

## 5. 启用审核过期定时任务，并只读核对后端

Database → Extensions，启用 pg_cron；然后 SQL Editor 执行 **`03-schedule.sql`** 一次。
每 5 分钟将超时审核标记 needs_review，不删除作品、不重置计数、不请求模型。

Edge Function 测试面板使用 header `apikey: 正式 publishable key`：

| 请求 | 预期 |
| --- | --- |
| GET liwu-public?action=counts | production、giftCount=0、galleryCount=0、mock=false |
| GET liwu-public?action=gallery | items=[] |
| POST liwu-media?action=health，JSON {} | production、mediaEnabled=true、box=300000、letter=4000000、PUT 300s / GET 120s |
| POST liwu-moderation?action=health，JSON {} | production、cropped-v2、enabled=true、autoPublish=true、keyConfigured=true |

四个响应的 batchId 应一致。health 不会分配编号，也不能证明 R2 凭证/OpenAI 实际请求必定成功。
**上线前不要在 production Finish/Send“测试作品”**；这些是真实正式记录，不能清零。
完整业务链路已在独立 test 验收，正式上线前只做以上只读核对。第一份正式完成获得 Gift No.1。

## 6. 部署 GitHub Pages（推荐：手动触发 Actions）

将当前项目代码上传到你的 GitHub 仓库。本工作区目前没有 .git，本次不会替你创建仓库或 push。
只构建/发布静态产物，SQL、Edge Secrets、Node mock 数据不发布到站点。

1. 把本包 **`github-pages.yml`** 复制为仓库 `.github/workflows/deploy-production.yml`。
2. 仓库 Settings → Pages → Source 选择 **GitHub Actions**。
3. Settings → Secrets and variables → Actions → Variables 添加三个公开变量：
   - `LIWU_PRODUCTION_SUPABASE_URL`：正式 Project URL。
   - `LIWU_PRODUCTION_PUBLISHABLE_KEY`：正式 publishable key。
   - `LIWU_PAGES_BASE`：项目站填 `/仓库名/`；用户站或根路径自定义域名填 `/`。
4. Actions → Deploy Liwu production → Run workflow；首次保留 **require_empty=true**。
   构建自动生成正式前端配置，并从正式 API 取得 batchId；不会复制 test batch。
   构建核对正式 environment、四项审核健康状态和初始两项计数 0；不符合就停止发布。
5. 等待成功，打开 Pages 给出的 HTTPS 地址。首页 Gifts=0，Gallery 为空。
   管理员入口为 `站点地址/app/admin.html`，使用正式管理员账号登录；队列初始为空。

公开配置等价于 frontend-config.example.json：mode=supabase、environment=production、
mediaEnabled=true、moderationEnabled=true，仅正式 URL/public key；batchId 由构建读取，勿手填测试批次。
现有 app/backend-config.js 保留本地 test 模式，不用于上述正式构建。

若只想先在本机构建产物：复制 frontend-config.example.json 为 frontend-config.json，填正式两项公开配置，
在项目根目录执行（将 /仓库名/ 改成你的 Pages 路径）：

```powershell
node tools/build-pages.mjs --config-file=production/frontend-config.json --out=site-dist --base=/仓库名/ --require-empty=true
```

产物目录必须为空；不会自动删除原目录。后续版本更新时，保留同一正式项目/桶/SQL/Secrets，
只重新构建发布前端；Actions 取消 require_empty 即可，不重跑安装 SQL、不重置编号。

## 7. 上线后的正式行为

第一份真实礼物 Finish → Gift No.1；未归档/投稿也计数。重复 Finish/Save 不重新编号。
第一份 Approved 投稿 → Gallery Number No.1。撤下/Restore 后，重新读取公开池按当前池连续显示，
不改 Gift Number、图片里的编号、内部 publication order 或审核历史。
管理员可 Remove → Pending、Reject、重新 Approved/Restore；两张图必须 ready。
晚到的自动审核不会覆盖人工决定。已经签发的私有 GET 最长仍可用 120 秒。
异步任务受 Edge 运行期限约束，进程中断或图片丢失会保持 Pending，过期由 Cron 收束，人工兜底。

tools/production-check.mjs 与 tools/production-build-check.mjs 只在本地运行内存/HTTP fixture，不部署到云端。
不需要你挑选任何旧 migration。当前测试项目、测试 R2 桶和浏览器 IndexedDB 均不动。

官方操作参考：[Supabase Secrets](https://supabase.com/docs/guides/functions/secrets)、
[Supabase Cron](https://supabase.com/docs/guides/cron)、
[Cloudflare R2 凭证](https://developers.cloudflare.com/r2/api/tokens/)、
[R2 presigned URL](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)、
[GitHub Pages Actions](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。
