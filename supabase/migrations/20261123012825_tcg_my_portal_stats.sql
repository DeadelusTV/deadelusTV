-- The two source triggers and their backfills must become visible together.
begin;

-- Card models are writable only by the existing tcg_cards_admin_all policy.
alter table public.tcg_cards add column is_special boolean not null default false;
comment on column public.tcg_cards.is_special is 'Special series card eligible for a booster hit independently of rarity (e.g. future Crew-like series).';

create table tcg_private.portal_booster_openings (
  booster_id uuid primary key,
  owner_id uuid not null references public.tcg_accounts(user_id) on delete cascade,
  opened_at timestamptz not null,
  is_hit boolean not null
);
create index portal_booster_openings_owner_idx on tcg_private.portal_booster_openings(owner_id, opened_at);

create table tcg_private.portal_alkahest_credits (
  owner_id uuid primary key references public.tcg_accounts(user_id) on delete cascade,
  positive_credits numeric not null check (positive_credits >= 0)
);
alter table tcg_private.portal_booster_openings enable row level security;
alter table tcg_private.portal_alkahest_credits enable row level security;
revoke all on tcg_private.portal_booster_openings, tcg_private.portal_alkahest_credits from public, anon, authenticated;

-- Use intrinsic card/collection attributes. The common-collection rule uses the
-- rarity at draw time so later fusions cannot retroactively create a hit.
-- Le Crew is the game's named special series. Event and custom categories
-- also contain ordinary viewer cards and do not qualify on that basis alone.
create function tcg_private.portal_card_is_hit(
  card public.tcg_cards, collection public.tcg_collections, drawn_rarity integer
) returns boolean language sql immutable set search_path = '' as $$
  select case when collection.is_common then drawn_rarity >= 5
    else card.is_special or drawn_rarity = 6 or card.rarity_level = 6 or card.event_category = 'exclusive'
      or lower(regexp_replace(trim(collection.name), '[[:space:]]+', ' ', 'g')) = 'le crew' end;
$$;

create function tcg_private.portal_record_opening()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- open_booster_contents writes all cards and Empreintes before stamping opened_at.
  insert into tcg_private.portal_booster_openings(booster_id, owner_id, opened_at, is_hit)
  values (new.id, new.owner_id, new.opened_at,
    coalesce(new.draw_pool->>'inaugural' = 'true', false)
    or exists (select 1 from tcg_private.booster_skin_rewards s where s.booster_id = new.id)
    or exists (
      select 1 from public.tcg_inventory_copies i
      join public.tcg_editions e on e.id = i.edition_id
      join public.tcg_cards c on c.id = e.card_id
      join public.tcg_collections col on col.id = c.collection_id
      where i.booster_id = new.id and tcg_private.portal_card_is_hit(c, col, i.highest_rarity_level)
    ))
  on conflict (booster_id) do nothing;
  return null;
end;
$$;
create trigger portal_record_opening after insert or update of opened_at on tcg_private.boosters
  for each row when (new.opened_at is not null) execute function tcg_private.portal_record_opening();

create function tcg_private.portal_record_wallet_credit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  gain numeric := new.balance;
begin
  if tg_op = 'UPDATE' then gain := gain - old.balance; end if;
  if gain > 0 then
    insert into tcg_private.portal_alkahest_credits as credits(owner_id, positive_credits)
    values (new.owner_id, gain)
    on conflict (owner_id) do update set positive_credits = credits.positive_credits + excluded.positive_credits;
  end if;
  return null;
end;
$$;
create trigger portal_record_wallet_credit after insert or update of balance on tcg_private.dust_accounts
  for each row execute function tcg_private.portal_record_wallet_credit();

-- Recover opening receipts even when an old booster or card has gone away.
-- A candidate pool only proves an Exclusive when an eligible slot had 100% odds.
with records as (
  select id as booster_id, owner_id, opened_at,
    coalesce(draw_pool->>'inaugural' = 'true', false)
    or (exclusive_bps = 10000 and draw_pool->'exclusive'->0 is not null
      and (card_count > 1 or draw_pool->>'personal_guarantee' is null)) as guaranteed_hit
  from tcg_private.boosters where opened_at is not null
  union all select booster_id, owner_id, opened_at, false from tcg_private.xp_openings
  union all select booster_id, owner_id, opened_at, inaugural from tcg_private.opening_night_activity
), openings as (
  select booster_id, owner_id, min(opened_at) as opened_at, bool_or(guaranteed_hit) as guaranteed_hit
  from records group by booster_id, owner_id
), snapshots as (
  select input_snapshot as copies from tcg_private.fusion_events
  union all select input_snapshot from tcg_private.dissolution_events
  union all select input_snapshot from tcg_private.ultimate_creations
  union all select input_snapshot from tcg_private.diamond_creations
  union all select input_snapshot from tcg_private.finish_attempts
  union all select snapshot from tcg_private.trade_items
  union all select snapshot from tcg_private.auctions
), copies as (
  select id, booster_id, edition_id, highest_rarity_level from public.tcg_inventory_copies where booster_id is not null
  union all
  select (s->>'id')::uuid, (s->>'booster_id')::uuid, (s->>'edition_id')::uuid, (s->>'highest_rarity_level')::integer
  from snapshots cross join lateral jsonb_array_elements(
    case when jsonb_typeof(copies) = 'array' then copies else jsonb_build_array(copies) end
  ) s where s->>'booster_id' is not null
), first_rarity as (
  select base_copy_id, min(from_rarity) as original from tcg_private.fusion_events group by base_copy_id
), hit_boosters as (
  select booster_id from tcg_private.booster_skin_rewards
  union
  select i.booster_id from copies i
  left join public.tcg_editions e on e.id = i.edition_id
  left join public.tcg_cards c on c.id = e.card_id
  left join public.tcg_collections col on col.id = c.collection_id
  left join first_rarity f on f.base_copy_id = i.id
  where least(f.original, i.highest_rarity_level) = 6
    or tcg_private.portal_card_is_hit(c, col, least(f.original, i.highest_rarity_level))
)
insert into tcg_private.portal_booster_openings(booster_id, owner_id, opened_at, is_hit)
select o.booster_id, o.owner_id, o.opened_at, coalesce(o.guaranteed_hit, false) or h.booster_id is not null
from openings o left join hit_boosters h using (booster_id);

-- Current balance + all historical debits = all historical positive credits.
-- Auction holds are debits. Refunds restore existing funds and are removed in
-- the account projection, both for these historical credits and subsequent ones.
with amounts as (
  select owner_id, balance as amount from tcg_private.dust_accounts
  union all select owner_id, price from tcg_private.dust_purchases
  union all select owner_id, cost from tcg_private.finish_attempts
  union all select owner_id, cost from tcg_private.ultimate_creations
  union all select owner_id, cost from tcg_private.diamond_creations
  union all select owner_id, -delta from tcg_private.auction_ledger where reason = 'hold'
)
insert into tcg_private.portal_alkahest_credits(owner_id, positive_credits)
select owner_id, sum(amount) from amounts group by owner_id;

create function tcg_private.my_portal_stats()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  actor uuid := (select auth.uid());
  result jsonb;
begin
  if actor is null then raise exception 'Connexion requise' using errcode = '42501'; end if;
  -- Count distinct, evidenced days of play across all channels in the same
  -- time zone as the Connexion Pass. Passive wallet credits are not visits.
  with activity as (
    select created_at as at_time from public.tcg_accounts where user_id = actor
    union all select opened_at from tcg_private.portal_booster_openings where owner_id = actor
    union all select created_at from tcg_private.boosters where owner_id = actor and family in ('live', 'live_drop')
    union all select created_at from tcg_private.dust_purchases where owner_id = actor
    union all select created_at from tcg_private.fusion_events where owner_id = actor
    union all select created_at from tcg_private.dissolution_events where owner_id = actor
    union all select created_at from tcg_private.finish_attempts where owner_id = actor
    union all select created_at from tcg_private.ultimate_creations where owner_id = actor
    union all select created_at from tcg_private.diamond_creations where owner_id = actor
    union all select created_at from tcg_private.trade_events where actor_id = actor
    union all select created_at from tcg_private.auction_events where actor_id = actor
    union all select created_at from tcg_private.skin_applications where actor_id = actor
    union all select claimed_at from tcg_private.xp_claims where owner_id = actor
  ), days as (
    select (at_time at time zone 'Europe/Paris')::date from activity where at_time is not null
    union select pass_date from tcg_private.daily_pass_visits where owner_id = actor
  ), purchases as (
    select booster_id from tcg_private.dust_purchases where owner_id = actor
    union select id from tcg_private.boosters where owner_id = actor and family = 'purchase'
  )
  select jsonb_build_object(
    'boosters_opened', count(*),
    'booster_hits', count(*) filter (where o.is_hit),
    'alkahests_earned', greatest(0,
      coalesce((select positive_credits from tcg_private.portal_alkahest_credits where owner_id = actor), 0)
      - coalesce((select sum(delta) from tcg_private.auction_ledger where owner_id = actor and reason = 'refund'), 0)),
    'activity_days', greatest(1, (select count(*) from days)),
    'boosters_purchased', (select count(*) from purchases),
    'legendary_cards', (
      select count(*) from public.tcg_inventory_copies i
      join public.tcg_editions e on e.id = i.edition_id
      join public.tcg_cards c on c.id = e.card_id
      join public.tcg_collections col on col.id = c.collection_id
      where i.owner_id = actor and i.consumed_at is null
        and (i.highest_rarity_level >= 5 or c.rarity_level = 6 or c.event_category = 'exclusive'
          or lower(regexp_replace(trim(col.name), '[[:space:]]+', ' ', 'g')) = 'le crew')
    )
  ) into result from tcg_private.portal_booster_openings o where o.owner_id = actor;
  return result;
end;
$$;

create function public.tcg_my_portal_stats()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select tcg_private.my_portal_stats();
$$;

revoke all on function tcg_private.portal_card_is_hit(public.tcg_cards, public.tcg_collections, integer),
  tcg_private.portal_record_opening(), tcg_private.portal_record_wallet_credit(),
  tcg_private.my_portal_stats(), public.tcg_my_portal_stats() from public, anon, authenticated, service_role;
grant execute on function tcg_private.my_portal_stats(), public.tcg_my_portal_stats() to authenticated;

commit;
