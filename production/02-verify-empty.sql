-- Read-only. Expected before public launch: all row counts 0; counters 1.
select public.liwu_api('counts');
select kind,environment,batch_id,next_number from liwu_private.number_counters order by kind;
select 'gift_completions' as relation,count(*) as rows from liwu_private.gift_completions;
select 'gift_archives' as relation,count(*) as rows from liwu_private.gift_archives;
select 'gallery_submissions' as relation,count(*) as rows from liwu_private.gallery_submissions;
select 'gallery_review_events' as relation,count(*) as rows from liwu_private.gallery_review_events;
select 'gallery_media_uploads' as relation,count(*) as rows from liwu_private.gallery_media_uploads;
select 'moderation_runs' as relation,count(*) as rows from liwu_private.moderation_runs;
select 'moderation_inputs' as relation,count(*) as rows from liwu_private.moderation_inputs;
select c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='liwu_private' and c.relkind='r' order by c.relname;
select p.proname,has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
 has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,
 has_function_privilege('service_role',p.oid,'EXECUTE') as service_execute
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname like 'liwu_%' order by p.proname;
