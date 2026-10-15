# riwoo1022.com：正式域名接入

主域名 https://riwoo1022.com，根路径 `/`。www 作为兼容入口，由 GitHub Pages 自动重定向到主域名。
不修改数据库、不改变 batch/编号、不清数据、不更换 Supabase 或 R2。

## DNSPod

域名的现有权威 DNS 为 cetus.dnspod.net / washer.dnspod.net。
腾讯云 DNSPod 控制台 https://console.cloud.tencent.com/cns → riwoo1022.com → 解析记录。
添加以下五条记录，线路选默认，TTL 600 秒：

| 类型 | 主机记录 | 记录值 |
| --- | --- | --- |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | 1e1eya.github.io |

无需 URL 转发、额外重定向服务或改 nameserver；不更改其他域名记录。

## Supabase production

https://supabase.com/dashboard/project/vqtjkpowzwrixyowegof/functions/secrets

编辑 LIWU_ALLOWED_ORIGINS，完整值为：

```text
https://riwoo1022.com,https://www.riwoo1022.com
```

只更改这一项，不更改其他 Secrets，不需要重部署函数，不调整 Auth/数据库。
当前管理员用密码登录，没有 OAuth/email callback，不需要为本次域名修改 Auth 回调逻辑。

## Cloudflare R2

R2 → liwu-gallery-production → Settings → CORS Policy → Edit。
将 production/r2-cors.json 全文作为策略保存；仅正式桶，不改测试桶，Public Access 保持 Disabled。

## GitHub Pages HTTPS

https://github.com/1e1eYA/liwu-riwoo/settings/pages

Custom domain 应为 riwoo1022.com；代码、Pages 设置与 LIWU_PAGES_BASE 已针对根路径配置。
DNS 生效、GitHub 完成证书签发后，勾选 Enforce HTTPS；证书未就绪时此选项暂不可用。
GitHub 官方说明 DNS/证书处理可能需要最多 24 小时。www 的 CNAME 生效后自动跳转至主域名，
无需自行增加 www 重定向规则。

GitHub Actions 模式由 Pages API 的域名设置生效，CNAME 文件不作为配置依据。
后续发布保持 require_empty=false，不因域名切换生成礼物/投稿或清零。

官方依据：https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site
