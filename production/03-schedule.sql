-- Execute once AFTER enabling pg_cron in Dashboard Database > Extensions.
-- Task only expires incomplete moderation; it does not delete/reset anything.
select cron.schedule('liwu-moderation-expiry','*/5 * * * *','select public.liwu_expire_moderation();');
select jobname,schedule,command,active from cron.job where jobname='liwu-moderation-expiry';
