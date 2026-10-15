# Liwu for Wuli RIWOO

Static frontend for GitHub Pages, with Supabase Edge Functions/PostgreSQL and a private Cloudflare R2 bucket.

- Website: https://www.riwoo1022.com/
- Administrator sign-in: https://riwoo1022.com/app/admin.html
- Production deployment instructions: [production/README.md](production/README.md)

Deploy through the manually triggered **Deploy Liwu production** GitHub Actions workflow.
The initial release requires empty production counts; normal frontend updates leave that check disabled.
The workflow validates the production backend and builds only static website files into `site-dist`.

Only public frontend configuration belongs in this repository. OpenAI and R2 credentials remain in Supabase Edge Function Secrets.
Gift Numbers are fixed completion identifiers; Gallery Numbers are consecutive display ranks in the current approved pool.

PSD/design source files, planning documents, QA exports, local databases and user-created works are excluded from this repository.

Custom-domain DNS and CORS configuration: [production/CUSTOM_DOMAIN.md](production/CUSTOM_DOMAIN.md).
