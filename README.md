# Liwu for Wuli RIWOO

Static frontend for GitHub Pages, with Supabase Edge Functions/PostgreSQL and a private Cloudflare R2 bucket.

- Website: https://1e1eya.github.io/liwu-riwoo/
- Administrator sign-in: https://1e1eya.github.io/liwu-riwoo/app/admin.html
- Production deployment instructions: [production/README.md](production/README.md)

Deploy through the manually triggered **Deploy Liwu production** GitHub Actions workflow.
The initial release requires empty production counts; subsequent frontend updates can disable that check.
The workflow validates the production backend and builds only static website files into `site-dist`.

Only public frontend configuration belongs in this repository. OpenAI and R2 credentials remain in Supabase Edge Function Secrets.
Gift Numbers are fixed completion identifiers; Gallery Numbers are consecutive display ranks in the current approved pool.

PSD/design source files, planning documents, QA exports, local databases and user-created works are excluded from this repository.
