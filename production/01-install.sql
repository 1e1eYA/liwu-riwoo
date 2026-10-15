-- FINAL PRODUCTION INSTALL. Execute ONCE in a NEW EMPTY Supabase project.
-- No business rows, imported batches, migration replay, reset or cleanup routes.
begin;
do $$ begin
 if exists(select 1 from pg_namespace where nspname='liwu_private') then
  raise exception 'FRESH_PRODUCTION_PROJECT_REQUIRED';
 end if;
end $$;
create schema liwu_private;
revoke all on schema liwu_private from public,anon,authenticated;
create table liwu_private.number_counters (
  kind text primary key check (kind in ('gift', 'gallery')),
  environment text not null default 'production' check (environment = 'production'),
  batch_id uuid not null,
  next_number bigint not null default 1 check (next_number between 1 and 9007199254740991)
);

create table liwu_private.gift_completions (
  environment text not null default 'production' check (environment = 'production'),
  batch_id uuid not null,
  gift_id text not null check (gift_id ~ '^[a-zA-Z0-9_-]{8,100}$'),
  gift_number bigint not null check (gift_number > 0),
  capability_hash text not null check (capability_hash ~ '^[a-f0-9]{64}$'),
  completed_at timestamptz not null default clock_timestamp(),
  primary key (environment, batch_id, gift_id),
  unique (environment, batch_id, gift_number),
  unique (environment, batch_id, gift_id, gift_number)
);

create table liwu_private.gift_archives (
  environment text not null default 'production' check (environment = 'production'),
  batch_id uuid not null,
  gift_number bigint not null,
  source text not null check (source in ('anonymous', 'gallery')),
  gift_box_name text not null check (char_length(gift_box_name) <= 60),
  from_text text not null check (char_length(from_text) <= 60),
  gift_names text[] not null check (cardinality(gift_names) = 3),
  letter_text text not null check (char_length(letter_text) <= 12000),
  language text not null check (language in ('en', 'zh', 'ko', 'ja')),
  primary key (environment, batch_id, gift_number),
  foreign key (environment, batch_id, gift_number)
    references liwu_private.gift_completions(environment, batch_id, gift_number)
);

create table liwu_private.gallery_submissions (
  id uuid primary key default gen_random_uuid(),
  environment text not null default 'production' check (environment = 'production'),
  batch_id uuid not null,
  gift_id text not null,
  gift_number bigint not null,
  submitted_at timestamptz not null default clock_timestamp(),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  published_at timestamptz,
  publication_order bigint,
  box_thumbnail_url text,
  letter_detail_url text,
  unique (environment, batch_id, gift_id),
  unique (environment, batch_id, gift_number),
  unique (environment, batch_id, publication_order),
  foreign key (environment, batch_id, gift_id, gift_number)
    references liwu_private.gift_completions(environment, batch_id, gift_id, gift_number),
  foreign key (environment, batch_id, gift_number)
    references liwu_private.gift_archives(environment, batch_id, gift_number),
  check ((published_at is null) = (publication_order is null)),
  check (status <> 'approved' or
    (published_at is not null and box_thumbnail_url is not null and letter_detail_url is not null)),
  render_fingerprint text,
  active_media_version uuid,
  manual_override boolean not null default false,
  review_revision bigint not null default 0
);

create table liwu_private.gallery_review_events (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references liwu_private.gallery_submissions(id),
  environment text not null default 'production' check (environment = 'production'),
  batch_id uuid not null,
  previous_status text not null check (previous_status in ('pending', 'approved', 'rejected')),
  new_status text not null check (new_status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz not null default clock_timestamp(),
  review_source text not null default 'admin' check(review_source in ('admin','auto')),
  moderation_run_id uuid
);

create table liwu_private.gallery_media_uploads (
  version uuid primary key default gen_random_uuid(),
  submission_id uuid not null references liwu_private.gallery_submissions(id) on delete cascade,
  environment text not null default 'production' check (environment = 'production'),
  batch_id uuid not null,
  fingerprint text not null check(fingerprint ~ '^[a-f0-9]{64}$'),
  specs jsonb not null,
  state text not null default 'prepared' check(state in ('prepared','ready')),
  expires_at timestamptz not null default clock_timestamp()+interval '5 minutes',
  box_key text not null, letter_key text not null,
  box_temp_key text not null, letter_temp_key text not null,
  finalize_token uuid, finalize_until timestamptz,
  box_etag text, letter_etag text,
  created_at timestamptz not null default clock_timestamp(),
  unique(submission_id,version)
);

create table liwu_private.moderation_runs (
 id uuid primary key default gen_random_uuid(),
 submission_id uuid not null references liwu_private.gallery_submissions(id) on delete cascade,
 environment text not null default 'production' check (environment = 'production'), batch_id uuid not null,
 media_version uuid not null references liwu_private.gallery_media_uploads(version),
 fingerprint text not null, policy_version text not null default 'cropped-v2',
 model text not null default 'omni-moderation-latest', review_revision bigint not null,
 state text not null default 'running' check(state in ('running','completed','expired')),
 decision text not null default 'needs_review' check(decision in ('auto_pass','needs_review')),
 has_anomaly boolean not null default false, published boolean not null default false,
 created_at timestamptz not null default clock_timestamp(),
 expires_at timestamptz not null default clock_timestamp()+interval '15 minutes',
 unique(submission_id,media_version,policy_version),
  uploads_closed boolean not null default false
);

create table liwu_private.moderation_inputs (
 run_id uuid not null references liwu_private.moderation_runs(id) on delete cascade,
 environment text not null default 'production' check (environment = 'production'), batch_id uuid not null,
 kind text not null check(kind in ('text','image_1','image_2','image_3')),
 state text not null default 'queued' check(state in ('queued','running','completed','failed')),
 input_hash text, attempts integer not null default 0, lease_token uuid, lease_until timestamptz,
 result jsonb, error_code text, completed_at timestamptz, primary key(run_id,kind)
);
-- A fresh identity and two independent counters; no gift is allocated here.
insert into liwu_private.number_counters(kind,batch_id) values('gift',gen_random_uuid());
insert into liwu_private.number_counters(kind,batch_id)
 select 'gallery',batch_id from liwu_private.number_counters where kind='gift';
create function public.liwu_core_api(p_action text, p_data jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  cfg liwu_private.number_counters%rowtype;
  c liwu_private.gift_completions%rowtype;
  s liwu_private.gallery_submissions%rowtype;
  result jsonb;
  counts jsonb;
  n bigint;
  duplicate boolean := false;
begin
  -- This lock serializes allocation/registration; it rolls back on failure.
  -- Read operations do not need the allocation lock.
  if p_action in ('complete','archive','submit','review') then
    select * into cfg from liwu_private.number_counters where kind = 'gift' for update;
  else
    select * into cfg from liwu_private.number_counters where kind = 'gift';
  end if;
  if cfg.kind is null then raise exception 'CONFIGURATION_MISSING'; end if;
  if p_action not in ('counts','gallery') and
     (p_data->>'batchId' is distinct from cfg.batch_id::text) then
    raise exception 'STALE_BATCH';
  end if;

  if p_action in ('complete','archive','submit','submission-status') then
    if coalesce(p_data->>'giftId','') !~ '^[a-zA-Z0-9_-]{8,100}$' or
       coalesce(p_data->>'capabilityHash','') !~ '^[a-f0-9]{64}$' then
      raise exception 'INVALID_IDENTITY';
    end if;
    select * into c from liwu_private.gift_completions
      where environment=cfg.environment and batch_id=cfg.batch_id and gift_id=p_data->>'giftId';
    if c.gift_id is not null and c.capability_hash <> p_data->>'capabilityHash' then
      raise exception 'INVALID_CAPABILITY';
    end if;
    if p_action <> 'complete' and c.gift_id is null then raise exception 'COMPLETION_REQUIRED'; end if;
  end if;

  if p_action = 'complete' then
    if c.gift_id is null then
      insert into liwu_private.gift_completions(environment,batch_id,gift_id,gift_number,capability_hash)
      values(cfg.environment,cfg.batch_id,p_data->>'giftId',cfg.next_number,p_data->>'capabilityHash')
      returning * into c;
      update liwu_private.number_counters set next_number=next_number+1 where kind='gift';
    else duplicate := true;
    end if;
    result := jsonb_build_object('giftId',c.gift_id,'number',c.gift_number,
      'completedAt',c.completed_at,'duplicate',duplicate);

  elsif p_action in ('archive','submit') then
    if p_action='archive' and p_data->>'consent' is distinct from 'true' then
      raise exception 'CONSENT_REQUIRED';
    end if;
    select * into s from liwu_private.gallery_submissions
      where environment=cfg.environment and batch_id=cfg.batch_id and gift_id=c.gift_id;
    if s.id is null then
      if p_action='submit' and (select count(*) from liwu_private.gallery_submissions
        where environment=cfg.environment and batch_id=cfg.batch_id) >= 1022 then
        raise exception 'GALLERY_FULL';
      end if;
      if jsonb_typeof(p_data->'metadata') is distinct from 'object' or
         jsonb_typeof(p_data->'metadata'->'giftNames') is distinct from 'array' or
         jsonb_array_length(p_data->'metadata'->'giftNames') <> 3 then
        raise exception 'INVALID_METADATA';
      end if;
      insert into liwu_private.gift_archives(environment,batch_id,gift_number,source,
        gift_box_name,from_text,gift_names,letter_text,language)
      values(cfg.environment,cfg.batch_id,c.gift_number,
        case when p_action='submit' then 'gallery' else 'anonymous' end,
        p_data->'metadata'->>'giftBoxName',p_data->'metadata'->>'from',
        array(select jsonb_array_elements_text(p_data->'metadata'->'giftNames')),
        p_data->'metadata'->>'letterText',p_data->'metadata'->>'language')
      on conflict(environment,batch_id,gift_number) do update set
        source=excluded.source,gift_box_name=excluded.gift_box_name,from_text=excluded.from_text,
        gift_names=excluded.gift_names,letter_text=excluded.letter_text,language=excluded.language;
      if p_action='submit' then
        if length(btrim(p_data->'metadata'->>'giftBoxName')) = 0 then raise exception 'NAME_REQUIRED'; end if;
        insert into liwu_private.gallery_submissions(environment,batch_id,gift_id,gift_number)
          values(cfg.environment,cfg.batch_id,c.gift_id,c.gift_number) returning * into s;
      end if;
    else duplicate := true;
    end if;
    result := jsonb_build_object('number',c.gift_number,'giftNumber',c.gift_number,
      'submissionId',s.id,'status',s.status,'submittedAt',s.submitted_at,
      'publishedAt',s.published_at,'publicationOrder',s.publication_order,
      'boxUrl',s.box_thumbnail_url,'letterUrl',s.letter_detail_url,'duplicate',duplicate);

  elsif p_action='submission-status' then
    select * into s from liwu_private.gallery_submissions
      where environment=cfg.environment and batch_id=cfg.batch_id and gift_id=c.gift_id;
    result := jsonb_build_object('submissionId',s.id,'number',c.gift_number,'status',s.status,
      'publishedAt',s.published_at,'publicationOrder',s.publication_order,
      'boxUrl',s.box_thumbnail_url,'letterUrl',s.letter_detail_url);

  elsif p_action='gallery' then
    select coalesce(jsonb_agg(item order by publication_order),'[]'::jsonb) into result from (
      select pub.publication_order,jsonb_build_object('id',pub.id,'number',pub.gift_number,
        'giftNumber',pub.gift_number,'name',a.gift_box_name,'status','approved',
        'publicationOrder',pub.publication_order,'publishedAt',pub.published_at,
        'boxUrl',pub.box_thumbnail_url,'letterUrl',pub.letter_detail_url) item
      from liwu_private.gallery_submissions pub join liwu_private.gift_archives a
        on a.environment=pub.environment and a.batch_id=pub.batch_id and a.gift_number=pub.gift_number
      where pub.environment=cfg.environment and pub.batch_id=cfg.batch_id and pub.status='approved'
    ) approved;
    result := jsonb_build_object('items',result);

  elsif p_action='review' then
    if coalesce(p_data->>'status','') not in ('pending','approved','rejected') then
      raise exception 'INVALID_STATUS';
    end if;
    select * into s from liwu_private.gallery_submissions
      where id=(p_data->>'submissionId')::uuid and environment=cfg.environment and batch_id=cfg.batch_id
      for update;
    if s.id is null then raise exception 'SUBMISSION_NOT_FOUND'; end if;
    if p_data->>'status'='approved' then
      if s.box_thumbnail_url is null or s.letter_detail_url is null then
        raise exception 'MEDIA_REQUIRED';
      end if;
      if s.publication_order is null then
        update liwu_private.number_counters set next_number=next_number+1 where kind='gallery'
          returning next_number-1 into n;
        s.publication_order := n; s.published_at := clock_timestamp();
      end if;
    end if;
    if s.status <> p_data->>'status' then
      insert into liwu_private.gallery_review_events(submission_id,environment,batch_id,previous_status,new_status)
        values(s.id,cfg.environment,cfg.batch_id,s.status,p_data->>'status');
    end if;
    update liwu_private.gallery_submissions set status=p_data->>'status',
      published_at=s.published_at,publication_order=s.publication_order,
      box_thumbnail_url=s.box_thumbnail_url,letter_detail_url=s.letter_detail_url where id=s.id;
    result := jsonb_build_object('submissionId',s.id,'status',p_data->>'status');

  elsif p_action='review-queue' then
    select coalesce(jsonb_agg(jsonb_build_object('submissionId',pub.id,'giftId',pub.gift_id,
      'giftNumber',pub.gift_number,'status',pub.status,'submittedAt',pub.submitted_at,
      'giftBoxName',a.gift_box_name,'from',a.from_text,'giftNames',a.gift_names,
      'letterText',a.letter_text,'language',a.language) order by pub.submitted_at),'[]'::jsonb)
      into result from liwu_private.gallery_submissions pub join liwu_private.gift_archives a
      on a.environment=pub.environment and a.batch_id=pub.batch_id and a.gift_number=pub.gift_number
      where pub.environment=cfg.environment and pub.batch_id=cfg.batch_id;
    result := jsonb_build_object('items',result);

  elsif p_action <> 'counts' then
    raise exception 'UNKNOWN_ACTION';
  end if;

  select jsonb_build_object('giftCount',
    (select count(*) from liwu_private.gift_completions where environment=cfg.environment and batch_id=cfg.batch_id),
    'galleryCount',(select count(*) from liwu_private.gallery_submissions
      where environment=cfg.environment and batch_id=cfg.batch_id and status='approved'),
    'environment',cfg.environment,'batchId',cfg.batch_id,'mock',false) into counts;
  return counts || coalesce(result,'{}'::jsonb);
end;
$$;

create function public.liwu_media_core_api(p_action text,p_data jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r jsonb; extra jsonb; cfg liwu_private.number_counters%rowtype;
begin
 if p_action in ('complete','archive','submit','review') then
   select * into cfg from liwu_private.number_counters where kind='gift' for update;
 else select * into cfg from liwu_private.number_counters where kind='gift'; end if;
 if p_action='review' and p_data->>'status'='approved' and not exists(
   select 1 from liwu_private.gallery_submissions gs join liwu_private.gallery_media_uploads m
   on m.version=gs.active_media_version and m.submission_id=gs.id
   where gs.id=(p_data->>'submissionId')::uuid and gs.environment=cfg.environment and gs.batch_id=cfg.batch_id and m.state='ready'
 ) then raise exception 'MEDIA_REQUIRED'; end if;
 r:=public.liwu_core_api(p_action,p_data);
 if p_action='submit' and not coalesce((r->>'duplicate')::boolean,false) and p_data ? 'renderFingerprint' then
   if p_data->>'renderFingerprint' !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_FINGERPRINT'; end if;
   update liwu_private.gallery_submissions set render_fingerprint=p_data->>'renderFingerprint' where id=(r->>'submissionId')::uuid;
 end if;
 if p_action in ('submit','submission-status') then
   select jsonb_build_object('mediaReady',gs.active_media_version is not null,'legacyMedia',gs.render_fingerprint is null,
     'storedMetadata',jsonb_build_object('giftBoxName',a.gift_box_name,'from',a.from_text,'giftNames',a.gift_names,'letterText',a.letter_text,'language',a.language))
   into extra from liwu_private.gallery_submissions gs join liwu_private.gift_archives a
     on a.environment=gs.environment and a.batch_id=gs.batch_id and a.gift_number=gs.gift_number
   where gs.id=(r->>'submissionId')::uuid;
   r:=r||coalesce(extra,'{}'::jsonb);
 elsif p_action in ('gallery','review-queue') then
   select coalesce(jsonb_agg(item||jsonb_build_object('mediaReady',gs.active_media_version is not null)),'[]'::jsonb) into extra
   from jsonb_array_elements(r->'items') item left join liwu_private.gallery_submissions gs
   on gs.id=coalesce(item->>'submissionId',item->>'id')::uuid;
   r:=r||jsonb_build_object('items',extra);
 end if;
 return r;
end $$;

create function public.liwu_api(p_action text,p_data jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r jsonb;
begin
 if p_action='review' then
  perform 1 from liwu_private.number_counters where kind='gift' for update;
  update liwu_private.gallery_submissions set manual_override=true,review_revision=review_revision+1
  where id=(p_data->>'submissionId')::uuid;
 end if;
 r:=public.liwu_media_core_api(p_action,p_data);
 if p_action='review-queue' then
  select r||jsonb_build_object('items',coalesce(jsonb_agg(item||jsonb_build_object(
   'manualOverride',gs.manual_override,'moderationDecision',m.decision,'moderationState',m.state)), '[]'::jsonb)) into r
  from jsonb_array_elements(r->'items') item
  left join liwu_private.gallery_submissions gs on gs.id=(item->>'submissionId')::uuid
  left join lateral (select * from liwu_private.moderation_runs mr where mr.submission_id=gs.id and mr.media_version=gs.active_media_version order by mr.created_at desc limit 1) m on true;
 end if;
 return r;
end $$;

create function public.liwu_media_api(p_action text,p_data jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare cfg liwu_private.number_counters%rowtype; gs liwu_private.gallery_submissions%rowtype;
  m liwu_private.gallery_media_uploads%rowtype; c liwu_private.gift_completions%rowtype;
  a liwu_private.gift_archives%rowtype; v uuid; prefix text; r jsonb; spec jsonb; k text;
begin
 select * into cfg from liwu_private.number_counters where kind='gift' for update;
 if p_action='health' then return jsonb_build_object('environment',cfg.environment,'batchId',cfg.batch_id,'mediaEnabled',true); end if;
 if p_data->>'batchId' is distinct from cfg.batch_id::text then raise exception 'STALE_BATCH'; end if;
 select * into gs from liwu_private.gallery_submissions where id=(p_data->>'submissionId')::uuid
   and environment=cfg.environment and batch_id=cfg.batch_id for update;
 if gs.id is null then raise exception 'SUBMISSION_NOT_FOUND'; end if;
 if p_action in ('prepare','finish-check','commit','release') then
   select * into c from liwu_private.gift_completions where environment=cfg.environment and batch_id=cfg.batch_id and gift_id=gs.gift_id;
   if p_data->>'giftId' is distinct from gs.gift_id or p_data->>'capabilityHash' is distinct from c.capability_hash then raise exception 'INVALID_CAPABILITY'; end if;
 end if;
 if p_action='prepare' then
   if gs.active_media_version is not null then return jsonb_build_object('ready',true,'environment',cfg.environment,'batchId',cfg.batch_id); end if;
   if gs.status<>'pending' then raise exception 'PENDING_REQUIRED'; end if;
   if coalesce(p_data->>'fingerprint','') !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_FINGERPRINT'; end if;
   select * into a from liwu_private.gift_archives where environment=cfg.environment and batch_id=cfg.batch_id and gift_number=gs.gift_number;
   if p_data->'metadata' is distinct from jsonb_build_object('giftBoxName',a.gift_box_name,'from',a.from_text,'giftNames',a.gift_names,'letterText',a.letter_text,'language',a.language) then raise exception 'MEDIA_SNAPSHOT_MISMATCH'; end if;
   if gs.render_fingerprint is null then
     if p_data->>'legacyConfirmed' is distinct from 'true' then raise exception 'LEGACY_CONFIRMATION_REQUIRED'; end if;
     update liwu_private.gallery_submissions set render_fingerprint=p_data->>'fingerprint' where id=gs.id;
   elsif gs.render_fingerprint<>p_data->>'fingerprint' then raise exception 'MEDIA_SNAPSHOT_MISMATCH'; end if;
   foreach k in array array['box','letter'] loop
     spec:=p_data->'specs'->k;
     if jsonb_typeof(spec) is distinct from 'object' or not (spec ?& array['bytes','width','height'])
       or jsonb_typeof(spec->'bytes') is distinct from 'number' or jsonb_typeof(spec->'width') is distinct from 'number' or jsonb_typeof(spec->'height') is distinct from 'number'
       or (spec->>'bytes')::integer not between 20 and (case when k='box' then 300000 else 4000000 end)
       or (spec->>'width')::integer not between 1 and 16384 or (spec->>'height')::integer not between 1 and 16384
       or (spec->>'width')::bigint*(spec->>'height')::bigint>18000000 then raise exception 'INVALID_MEDIA'; end if;
   end loop;
   select * into m from liwu_private.gallery_media_uploads where submission_id=gs.id and state='prepared'
     and specs=p_data->'specs' and fingerprint=p_data->>'fingerprint' and expires_at>clock_timestamp()+interval '30 seconds' order by created_at desc limit 1;
   if m.version is null then
     if (select count(*) from liwu_private.gallery_media_uploads where submission_id=gs.id)>=20 then raise exception 'UPLOAD_LIMIT'; end if;
     v:=gen_random_uuid();prefix:=cfg.environment||'/'||cfg.batch_id||'/media/'||gs.id||'/'||v||'/';
     insert into liwu_private.gallery_media_uploads(version,submission_id,environment,batch_id,fingerprint,specs,box_key,letter_key,box_temp_key,letter_temp_key)
       values(v,gs.id,cfg.environment,cfg.batch_id,p_data->>'fingerprint',p_data->'specs',prefix||'box.webp',prefix||'letter.webp',replace(prefix,'/media/','/staging/')||'box.webp',replace(prefix,'/media/','/staging/')||'letter.webp') returning * into m;
   end if;
 elsif p_action in ('finish-check','commit','release') then
   select * into m from liwu_private.gallery_media_uploads where version=(p_data->>'version')::uuid and submission_id=gs.id;
   if m.version is null then raise exception 'UPLOAD_NOT_FOUND'; end if;
   if gs.active_media_version is not null and gs.active_media_version<>m.version then raise exception 'MEDIA_ALREADY_READY'; end if;
   if m.state<>'ready' then
     if gs.status<>'pending' then raise exception 'PENDING_REQUIRED'; end if;
     if p_action='finish-check' then
       if m.finalize_until>clock_timestamp() then raise exception 'FINALIZE_IN_PROGRESS'; end if;
       v:=gen_random_uuid();prefix:=cfg.environment||'/'||cfg.batch_id||'/media/'||gs.id||'/'||m.version||'/'||v||'/';
       update liwu_private.gallery_media_uploads set finalize_token=v,finalize_until=clock_timestamp()+interval '5 minutes',box_key=prefix||'box.webp',letter_key=prefix||'letter.webp' where version=m.version returning * into m;
     elsif p_action='release' then
       if m.finalize_token::text=p_data->>'finalizeToken' then update liwu_private.gallery_media_uploads set finalize_until=null where version=m.version; end if;
     end if;
     if p_action='commit' then
       if m.finalize_token::text is distinct from p_data->>'finalizeToken' or m.finalize_until<clock_timestamp() then raise exception 'FINALIZE_IN_PROGRESS'; end if;
       if coalesce(p_data->>'boxEtag','')='' or coalesce(p_data->>'letterEtag','')='' then raise exception 'INVALID_MEDIA'; end if;
       update liwu_private.gallery_media_uploads set state='ready',box_etag=p_data->>'boxEtag',letter_etag=p_data->>'letterEtag' where version=m.version returning * into m;
       update liwu_private.gallery_submissions set active_media_version=m.version,
         box_thumbnail_url='r2:'||m.box_key,letter_detail_url='r2:'||m.letter_key where id=gs.id;
     end if;
   end if;
 elsif p_action in ('public-read','admin-read') then
   if p_action='public-read' and gs.status<>'approved' then raise exception 'MEDIA_NOT_PUBLIC'; end if;
   select * into m from liwu_private.gallery_media_uploads where version=gs.active_media_version and submission_id=gs.id and state='ready';
   if m.version is null then raise exception 'MEDIA_NOT_READY'; end if;
 else raise exception 'UNKNOWN_ACTION'; end if;
 return jsonb_build_object('environment',cfg.environment,'batchId',cfg.batch_id,'submissionId',gs.id,
   'version',m.version,'ready',m.state='ready','specs',m.specs,'expiresAt',m.expires_at,
   'boxKey',m.box_key,'letterKey',m.letter_key,
   'boxTempKey',m.box_temp_key,'letterTempKey',m.letter_temp_key,'finalizeToken',m.finalize_token);
end $$;

create function public.liwu_moderation_api(p_action text,p_data jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare cfg liwu_private.number_counters%rowtype; gs liwu_private.gallery_submissions%rowtype;
 c liwu_private.gift_completions%rowtype; m liwu_private.gallery_media_uploads%rowtype;
 run liwu_private.moderation_runs%rowtype; inp liwu_private.moderation_inputs%rowtype;
 a liwu_private.gift_archives%rowtype; extra jsonb:='{}'::jsonb; k text; safe boolean; token uuid;
begin
 select * into cfg from liwu_private.number_counters where kind='gift' for update;
 if p_action='health' then return jsonb_build_object('environment',cfg.environment,'batchId',cfg.batch_id,'policyVersion','cropped-v2'); end if;
 if p_data->>'batchId' is distinct from cfg.batch_id::text then raise exception 'STALE_BATCH'; end if;
 select * into gs from liwu_private.gallery_submissions where id=(p_data->>'submissionId')::uuid and environment=cfg.environment and batch_id=cfg.batch_id for update;
 if gs.id is null then raise exception 'SUBMISSION_NOT_FOUND'; end if;
 if p_action<>'admin-detail' and p_data->>'administrator' is distinct from 'true' then
  select * into c from liwu_private.gift_completions where environment=cfg.environment and batch_id=cfg.batch_id and gift_id=gs.gift_id;
  if p_data->>'giftId' is distinct from gs.gift_id or p_data->>'capabilityHash' is distinct from c.capability_hash then raise exception 'INVALID_CAPABILITY'; end if;
 end if;
 select * into m from liwu_private.gallery_media_uploads where version=gs.active_media_version and submission_id=gs.id and state='ready';
 if p_action='start' then
  if m.version is null then raise exception 'MEDIA_NOT_READY'; end if;
  if gs.render_fingerprint is null or gs.render_fingerprint is distinct from p_data->>'fingerprint' then raise exception 'MEDIA_SNAPSHOT_MISMATCH'; end if;
  -- Never reprocess or auto-publish existing manually reviewed/approved works.
  if gs.status<>'pending' or gs.manual_override then
   return jsonb_build_object('environment',cfg.environment,'batchId',cfg.batch_id,'skip',true,'decision','needs_review');
  end if;
  insert into liwu_private.moderation_runs(submission_id,environment,batch_id,media_version,fingerprint,review_revision,policy_version)
   values(gs.id,cfg.environment,cfg.batch_id,m.version,gs.render_fingerprint,gs.review_revision,'cropped-v2') on conflict do nothing;
 end if;
 select * into run from liwu_private.moderation_runs where submission_id=gs.id and media_version=gs.active_media_version
  and policy_version='cropped-v2' order by created_at desc limit 1 for update;
 if run.id is null then raise exception 'MODERATION_NOT_FOUND'; end if;
 if p_action='start' then
  foreach k in array array['text','image_1','image_2','image_3'] loop
   insert into liwu_private.moderation_inputs(run_id,environment,batch_id,kind) values(run.id,cfg.environment,cfg.batch_id,k) on conflict do nothing;
  end loop;
 elsif p_action='claim' then
  if run.state='expired' or clock_timestamp()>run.expires_at or gs.manual_override or gs.review_revision<>run.review_revision or gs.status<>'pending' then raise exception 'MODERATION_STALE'; end if;
  select * into inp from liwu_private.moderation_inputs where run_id=run.id and kind=p_data->>'kind' for update;
  if inp.kind is null then raise exception 'INVALID_MEDIA'; end if;
  if coalesce(p_data->>'inputHash','') !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_MEDIA'; end if;
  if inp.input_hash is not null and inp.input_hash<>p_data->>'inputHash' then raise exception 'MEDIA_SNAPSHOT_MISMATCH'; end if;
  if inp.state='completed' then
   extra:=jsonb_build_object('skip',true);
  else
   if inp.lease_until>clock_timestamp() then raise exception 'MODERATION_BUSY'; end if;
   if inp.attempts>=3 then raise exception 'MODERATION_RETRY_LIMIT'; end if;
   if inp.state='running' then update liwu_private.moderation_runs set has_anomaly=true where id=run.id; end if;
   token:=gen_random_uuid();
   update liwu_private.moderation_inputs set state='running',input_hash=p_data->>'inputHash',attempts=attempts+1,
    lease_token=token,lease_until=clock_timestamp()+interval '60 seconds' where run_id=run.id and kind=inp.kind;
   extra:=jsonb_build_object('leaseToken',token);
  end if;
 elsif p_action='record' then
  select * into inp from liwu_private.moderation_inputs where run_id=run.id and kind=p_data->>'kind' for update;
  if inp.state is distinct from 'running' or inp.lease_token::text is distinct from p_data->>'leaseToken' or inp.lease_until<clock_timestamp() or run.state='expired' then raise exception 'MODERATION_STALE'; end if;
  if p_data ? 'result' then
   -- Validate the minimum publication contract again inside the DB boundary.
   if jsonb_typeof(p_data->'result'->'flagged') is distinct from 'boolean' then raise exception 'INVALID_MODERATION'; end if;
   update liwu_private.moderation_inputs set state='completed',result=p_data->'result',error_code=null,
    completed_at=clock_timestamp(),lease_until=null where run_id=run.id and kind=inp.kind;
  else
   update liwu_private.moderation_inputs set state='failed',error_code=p_data->>'errorCode',lease_until=null where run_id=run.id and kind=inp.kind;
   update liwu_private.moderation_runs set has_anomaly=true where id=run.id;
  end if;
 elsif p_action='seal' then
  update liwu_private.moderation_runs set uploads_closed=true where id=run.id returning * into run;
 elsif p_action='finalize' then
  -- Accepted/in-flight is not missing or failed. Publish only after the owner
  -- has closed input receipt, and every background classification is terminal.
  if not run.uploads_closed then
   return jsonb_build_object('environment',cfg.environment,'batchId',cfg.batch_id,'policyVersion','cropped-v2','state',run.state,'decision',run.decision);
  end if;
  if run.expires_at>clock_timestamp() and not run.has_anomaly
   and not exists(select 1 from liwu_private.moderation_inputs where run_id=run.id and (state in ('queued','failed') or (state='running' and lease_until<clock_timestamp())))
   and exists(select 1 from liwu_private.moderation_inputs where run_id=run.id and state='running') then
   return jsonb_build_object('environment',cfg.environment,'batchId',cfg.batch_id,'policyVersion','cropped-v2','state','running','decision','needs_review');
  end if;
  if exists(select 1 from liwu_private.moderation_inputs where run_id=run.id and state<>'completed') then
   update liwu_private.moderation_runs set has_anomaly=true where id=run.id returning * into run;
  end if;
  safe:=not run.has_anomaly and run.expires_at>clock_timestamp() and m.version=run.media_version and m.fingerprint=run.fingerprint
   and (select count(*)=4 and bool_and(state='completed' and result->>'flagged'='false') from liwu_private.moderation_inputs where run_id=run.id);
  update liwu_private.moderation_runs set decision=case when coalesce(safe,false) then 'auto_pass' else 'needs_review' end,
   state=case when clock_timestamp()>expires_at then 'expired' else 'completed' end where id=run.id returning * into run;
  if safe and p_data->>'autoPublish'='true' and not gs.manual_override and gs.review_revision=run.review_revision and gs.status='pending' then
   perform public.liwu_media_core_api('review',jsonb_build_object('batchId',cfg.batch_id,'submissionId',gs.id,'status','approved'));
   update liwu_private.gallery_review_events set review_source='auto',moderation_run_id=run.id where id=(
    select id from liwu_private.gallery_review_events where submission_id=gs.id order by reviewed_at desc,id desc limit 1);
   update liwu_private.moderation_runs set published=true where id=run.id returning * into run;
  end if;
 elsif p_action not in ('start','context','status','admin-detail') then raise exception 'UNKNOWN_ACTION'; end if;
 -- Context is service-only. Never return raw text or object paths to the owner.
 if p_action='context' then
  select * into a from liwu_private.gift_archives where environment=cfg.environment and batch_id=cfg.batch_id and gift_number=gs.gift_number;
  extra:=jsonb_build_object('text',jsonb_build_object('giftBoxName',a.gift_box_name,'from',a.from_text,'giftNames',a.gift_names,'letterText',a.letter_text,'language',a.language),
   'boxKey',m.box_key,'letterKey',m.letter_key);
 elsif p_action='admin-detail' then
  select coalesce(jsonb_agg(jsonb_build_object('kind',kind,'state',state,'attempts',attempts,'inputHash',input_hash,'result',result,'errorCode',error_code,'completedAt',completed_at) order by kind),'[]'::jsonb) into extra
   from liwu_private.moderation_inputs where run_id=run.id;
  extra:=jsonb_build_object('inputs',extra,'model',run.model,'policyVersion',run.policy_version,'hasAnomaly',run.has_anomaly,'manualOverride',gs.manual_override);
 end if;
 return jsonb_build_object('environment',cfg.environment,'batchId',cfg.batch_id,'policyVersion','cropped-v2','runId',run.id,'decision',run.decision,'state',run.state,'published',run.published)||extra;
end $$;

create function public.liwu_expire_moderation() returns void language sql security definer set search_path='' as $$
 update liwu_private.moderation_runs set state='expired',decision='needs_review',has_anomaly=true
 where state='running' and expires_at<clock_timestamp();
$$;
alter table liwu_private.number_counters enable row level security;
alter table liwu_private.gift_completions enable row level security;
alter table liwu_private.gift_archives enable row level security;
alter table liwu_private.gallery_submissions enable row level security;
alter table liwu_private.gallery_review_events enable row level security;
alter table liwu_private.gallery_media_uploads enable row level security;
alter table liwu_private.moderation_runs enable row level security;
alter table liwu_private.moderation_inputs enable row level security;
revoke all on all tables in schema liwu_private from public,anon,authenticated;
revoke all on function public.liwu_core_api(text,jsonb) from public,anon,authenticated;
grant execute on function public.liwu_core_api(text,jsonb) to service_role;
revoke all on function public.liwu_media_core_api(text,jsonb) from public,anon,authenticated;
grant execute on function public.liwu_media_core_api(text,jsonb) to service_role;
revoke all on function public.liwu_api(text,jsonb) from public,anon,authenticated;
grant execute on function public.liwu_api(text,jsonb) to service_role;
revoke all on function public.liwu_media_api(text,jsonb) from public,anon,authenticated;
grant execute on function public.liwu_media_api(text,jsonb) to service_role;
revoke all on function public.liwu_moderation_api(text,jsonb) from public,anon,authenticated;
grant execute on function public.liwu_moderation_api(text,jsonb) to service_role;
revoke all on function public.liwu_expire_moderation() from public,anon,authenticated;
grant execute on function public.liwu_expire_moderation() to service_role;
commit;
