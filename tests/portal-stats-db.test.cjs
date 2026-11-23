// Avec @electric-sql/pglite@0.3.14 disponible dans les dépendances de test ou via NODE_PATH :
// node --test tests/portal-stats-db.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');

const migration = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations',
  '20261123012825_tcg_my_portal_stats.sql'), 'utf8');

// Subset of the existing source tables and roles consumed by the migration. Test IDs
// are generated from descriptive labels; PostgreSQL still checks the real UUID types.
const sourceSchema = `
  create role anon;
  create role authenticated;
  create role service_role;
  create schema auth;
  create schema tcg_private;
  grant usage on schema auth, tcg_private to anon, authenticated;
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  create function pg_temp.fixture_id(label text) returns uuid language sql immutable as $$
    select md5(label)::uuid
  $$;
  create table public.tcg_accounts(user_id uuid primary key, created_at timestamptz not null);
  create table public.tcg_collections(id uuid primary key, name text, is_common boolean, collection_kind text);
  create table public.tcg_cards(id uuid primary key, collection_id uuid references public.tcg_collections,
    kind text, rarity_level integer, event_category text);
  create table public.tcg_editions(id uuid primary key, card_id uuid references public.tcg_cards, finish text);
  create table public.tcg_inventory_copies(id uuid primary key, booster_id uuid,
    edition_id uuid references public.tcg_editions, owner_id uuid references public.tcg_accounts,
    highest_rarity_level integer, consumed_at timestamptz);
  create table tcg_private.boosters(id uuid primary key, owner_id uuid references public.tcg_accounts,
    broadcaster_id text, family text, opened_at timestamptz, draw_pool jsonb, exclusive_bps integer,
    card_count integer, created_at timestamptz);
  create table tcg_private.booster_skin_rewards(booster_id uuid, booster_slot integer, unique(booster_id,booster_slot));
  create table tcg_private.xp_openings(booster_id uuid primary key, owner_id uuid, opened_at timestamptz);
  create table tcg_private.opening_night_activity(like tcg_private.xp_openings, inaugural boolean);
  create table tcg_private.dust_accounts(owner_id uuid references public.tcg_accounts, broadcaster_id text,
    balance bigint not null, primary key(owner_id, broadcaster_id));
  create table tcg_private.dust_purchases(booster_id uuid primary key, owner_id uuid, created_at timestamptz, price integer);
  create table tcg_private.auction_ledger(owner_id uuid, delta bigint, reason text, created_at timestamptz);
  create table tcg_private.trade_items(snapshot jsonb);
  create table tcg_private.auctions(snapshot jsonb);
  create table tcg_private.dissolution_events(owner_id uuid, created_at timestamptz, input_snapshot jsonb);
  create table tcg_private.fusion_events(like tcg_private.dissolution_events, base_copy_id uuid, from_rarity integer);
  create table tcg_private.finish_attempts(like tcg_private.dissolution_events, cost integer);
  create table tcg_private.ultimate_creations(like tcg_private.finish_attempts);
  create table tcg_private.diamond_creations(like tcg_private.finish_attempts);
  create table tcg_private.trade_events(actor_id uuid, created_at timestamptz);
  create table tcg_private.auction_events(like tcg_private.trade_events);
  create table tcg_private.skin_applications(like tcg_private.trade_events);
  create table tcg_private.xp_claims(owner_id uuid, claimed_at timestamptz);
  create table tcg_private.daily_pass_visits(owner_id uuid, pass_date date);
`;

// Default to local day 22. An opening at 23:10 UTC on the 22nd belongs to day 23
// in Paris; a pass visit on day 24 and an unopened live drop on day 25 add two days.
const historicalData = `
  insert into public.tcg_accounts select pg_temp.fixture_id(player), '2026-11-21 23:10Z'
    from (values ('alice'), ('bob'), ('new-player')) names(player);
  insert into public.tcg_collections
    select pg_temp.fixture_id(name), name, shared, kind from (values
      ('Viewer', false, 'permanent'), (' Le   Crew ', false, 'permanent'),
      ('Common', true, 'permanent'), ('Festival', false, 'event')
    ) c(name,shared,kind);
  insert into public.tcg_cards
    select pg_temp.fixture_id(name), pg_temp.fixture_id(collection), kind, rarity, category from (values
      ('exclusive','Viewer','streamer',6,'exclusive'), ('viewer','Viewer','viewer',1,null),
      ('crew',' Le   Crew ','other',2,null), ('common-legend','Common','other',5,null),
      ('common-epic','Common','other',4,null), ('ordinary-event','Festival','other',2,null)
    ) c(name,collection,kind,rarity,category);
  insert into public.tcg_editions select id,id,'normal' from public.tcg_cards;
  insert into public.tcg_editions values (pg_temp.fixture_id('crew-shiny'), pg_temp.fixture_id('crew'), 'stellar');

  insert into tcg_private.boosters
    select pg_temp.fixture_id(name), pg_temp.fixture_id(player), channel, family, opened::timestamptz,
      '{}'::jsonb, 50, 5, '2026-11-22 06:00Z' from (values
      ('exclusive','alice','one','purchase','2026-11-22 06:00Z'), ('viewer','alice','two','gift','2026-11-22 23:10Z'),
      ('crew','alice','one','gift','2026-11-22 06:00Z'), ('event','alice','one','gift','2026-11-22 06:00Z'),
      ('common-legend','alice','two','gift','2026-11-22 06:00Z'), ('fused','alice','two','gift','2026-11-22 06:00Z'),
      ('skin','alice','one','gift','2026-11-22 06:00Z'), ('dissolved','alice','one','gift','2026-11-22 06:00Z'),
      ('traded','alice','two','gift','2026-11-22 06:00Z'), ('auctioned','alice','two','gift','2026-11-22 06:00Z'),
      ('guaranteed','alice','one','gift','2026-11-22 06:00Z'), ('personal','alice','one','gift','2026-11-22 06:00Z'),
      ('possible','alice','one','gift','2026-11-22 06:00Z'), ('shop-unopened','alice','one','purchase',null),
      ('unopened-live','alice','two','live_drop',null), ('bob-pack','bob','two','gift','2026-11-22 06:00Z')
    ) b(name,player,channel,family,opened);
  update tcg_private.boosters set created_at='2026-11-25 11:00Z' where id=pg_temp.fixture_id('unopened-live');
  update tcg_private.boosters set draw_pool='{"exclusive":[{}]}'
    where id in (pg_temp.fixture_id('guaranteed'), pg_temp.fixture_id('possible'));
  update tcg_private.boosters set exclusive_bps=10000 where id=pg_temp.fixture_id('guaranteed');
  update tcg_private.boosters set exclusive_bps=10000, card_count=1,
    draw_pool='{"exclusive":[{}],"personal_guarantee":"viewer"}' where id=pg_temp.fixture_id('personal');

  insert into public.tcg_inventory_copies
    select pg_temp.fixture_id('copy-' || name), pg_temp.fixture_id(name), pg_temp.fixture_id(edition),
      pg_temp.fixture_id(player), rarity, consumed::timestamptz from (values
      ('exclusive','exclusive','bob',6,null), ('viewer','viewer','alice',5,null),
      ('crew','crew-shiny','alice',2,null), ('event','ordinary-event','alice',2,null),
      ('common-legend','common-legend','alice',5,null), ('fused','common-epic','alice',5,null),
      ('destroyed','exclusive','alice',6,'2026-11-22 06:00Z')
    ) i(name,edition,player,rarity,consumed);
  insert into tcg_private.fusion_events values (pg_temp.fixture_id('alice'), '2026-11-22 06:00Z',
    '[]', pg_temp.fixture_id('copy-fused'), 4);
  insert into tcg_private.booster_skin_rewards values (pg_temp.fixture_id('skin'),1), (pg_temp.fixture_id('skin'),2);
  insert into tcg_private.xp_openings values (pg_temp.fixture_id('exclusive'),pg_temp.fixture_id('alice'),'2026-11-22 06:00Z'),
    (pg_temp.fixture_id('xp-only'),pg_temp.fixture_id('alice'),'2026-11-22 06:00Z');
  insert into tcg_private.opening_night_activity values (pg_temp.fixture_id('inaugural'), pg_temp.fixture_id('alice'),
    '2026-11-22 06:00Z', true);
  insert into tcg_private.dissolution_events values (pg_temp.fixture_id('alice'), '2026-11-22 06:00Z',
    jsonb_build_array(jsonb_build_object('id',pg_temp.fixture_id('copy-gone'), 'booster_id',pg_temp.fixture_id('dissolved'),
      'edition_id',pg_temp.fixture_id('edition-gone'), 'highest_rarity_level',6)));
  insert into tcg_private.finish_attempts values (pg_temp.fixture_id('alice'), '2026-11-22 06:00Z',
    jsonb_build_object('id',pg_temp.fixture_id('copy-exclusive'), 'booster_id',pg_temp.fixture_id('exclusive'),
      'edition_id',pg_temp.fixture_id('exclusive'), 'highest_rarity_level',6), 100);
  insert into tcg_private.trade_items values (jsonb_build_object('id',pg_temp.fixture_id('copy-traded'),
    'booster_id',pg_temp.fixture_id('traded'), 'edition_id',pg_temp.fixture_id('exclusive'), 'highest_rarity_level',6));
  insert into tcg_private.auctions values (jsonb_build_object('id',pg_temp.fixture_id('copy-auctioned'),
    'booster_id',pg_temp.fixture_id('auctioned'), 'edition_id',pg_temp.fixture_id('common-legend'), 'highest_rarity_level',5));
  insert into tcg_private.dust_purchases values (pg_temp.fixture_id('exclusive'),pg_temp.fixture_id('alice'),'2026-11-22 06:00Z',100),
    (pg_temp.fixture_id('old-shop'),pg_temp.fixture_id('alice'),'2026-11-22 06:00Z',100);
  insert into tcg_private.dust_accounts values (pg_temp.fixture_id('alice'),'one',75),
    (pg_temp.fixture_id('alice'),'two',40), (pg_temp.fixture_id('bob'),'one',700);
  insert into tcg_private.auction_ledger values (pg_temp.fixture_id('alice'),-25,'hold','2026-11-22 06:00Z'),
    (pg_temp.fixture_id('alice'),25,'refund','2026-11-22 06:00Z');
  insert into tcg_private.daily_pass_visits values (pg_temp.fixture_id('alice'),'2026-11-24'), (pg_temp.fixture_id('alice'),'2026-11-22');
`;

const emptyStats = {boosters_opened:0, booster_hits:0, boosters_purchased:0, alkahests_earned:0, activity_days:1, legendary_cards:0};
const historyStats = {boosters_opened:15, booster_hits:9, boosters_purchased:3, alkahests_earned:415, activity_days:4, legendary_cards:4};

async function usePlayer(db, player, role='authenticated') {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub', coalesce(md5($1)::uuid::text,''),false)", [player]);
  await db.exec(role === 'anon' ? 'set role anon' : 'set role authenticated');
}

async function myStats(db) {
  return (await db.query('select public.tcg_my_portal_stats() as stats')).rows[0].stats;
}

test('the account statistics migration on PostgreSQL', async t => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(sourceSchema);
  await db.exec(historicalData);
  await db.exec(migration);

  await t.test('backfills cross-channel gains, unique purchases and Paris activity days', async () => {
    await usePlayer(db, 'alice');
    assert.deepEqual(await myStats(db), historyStats);
  });

  await t.test('identifies the exact historical hits once, independently of the current copies', async () => {
    await db.exec('reset role');
    const labels = ['exclusive','viewer','crew','event','common-legend','fused','skin','dissolved',
      'guaranteed','possible','personal','xp-only','inaugural','traded','auctioned'];
    const {rows} = await db.query(`
      select label from unnest($1::text[]) labels(label) join tcg_private.portal_booster_openings o
        on o.booster_id=pg_temp.fixture_id(label) where o.is_hit order by label`, [labels]);
    assert.deepEqual(rows.map(row => row.label),
      ['auctioned','common-legend','crew','dissolved','exclusive','guaranteed','inaugural','skin','traded']);
  });

  await t.test('only authenticated players can read their own statistics', async () => {
    await usePlayer(db, 'bob');
    assert.deepEqual(await myStats(db), {...emptyStats, boosters_opened:1, alkahests_earned:700, legendary_cards:1});
    for (const player of ['new-player', 'not-registered']) {
      await usePlayer(db, player);
      assert.deepEqual(await myStats(db), emptyStats);
    }
    for (const table of ['portal_booster_openings','portal_alkahest_credits']) {
      await assert.rejects(db.query('select * from tcg_private.' + table), {code:'42501'});
    }
    for (const role of ['anon', 'authenticated']) {
      await usePlayer(db, null, role);
      await assert.rejects(myStats(db), {code:'42501'});
    }
  });

  await t.test('new hits survive trades or removal; a refunded auction hold adds no gains', async t => {
    await db.exec('begin');
    t.after(() => db.exec('rollback'));
    await db.exec(`reset role;
      insert into tcg_private.boosters(id, owner_id, family) values (pg_temp.fixture_id('new-pack'),pg_temp.fixture_id('alice'),'gift');
      insert into public.tcg_inventory_copies
        select pg_temp.fixture_id(label), pg_temp.fixture_id('new-pack'), pg_temp.fixture_id('exclusive'),
          pg_temp.fixture_id('alice'), 6, null::timestamptz from (values ('hit-a'),('hit-b')) i(label);
      update tcg_private.boosters set opened_at='2026-11-22 06:00Z' where id=pg_temp.fixture_id('new-pack');
      update tcg_private.boosters set opened_at=opened_at where id=pg_temp.fixture_id('new-pack');
      update public.tcg_inventory_copies set owner_id=pg_temp.fixture_id('bob') where id=pg_temp.fixture_id('hit-a');
      delete from public.tcg_inventory_copies where id=pg_temp.fixture_id('hit-b');

      update tcg_private.dust_accounts set balance=balance+50 where owner_id=pg_temp.fixture_id('alice') and broadcaster_id='one';
      update tcg_private.dust_accounts set balance=balance-25 where owner_id=pg_temp.fixture_id('alice') and broadcaster_id='one';
      insert into tcg_private.auction_ledger values (pg_temp.fixture_id('alice'),-25,'hold','2026-11-22 06:00Z');
      update tcg_private.dust_accounts set balance=balance+25 where owner_id=pg_temp.fixture_id('alice') and broadcaster_id='one';
      insert into tcg_private.auction_ledger values (pg_temp.fixture_id('alice'),25,'refund','2026-11-22 06:00Z');
      insert into tcg_private.dust_accounts values (pg_temp.fixture_id('alice'),'third',15);
    `);
    await usePlayer(db, 'alice');
    assert.deepEqual(await myStats(db), {...historyStats, boosters_opened:16, booster_hits:10, alkahests_earned:480});
  });

  await t.test('future special series count as hits without turning ordinary card copies into legendary cards', async t => {
    await db.exec('begin');
    t.after(() => db.exec('rollback'));
    await db.exec(`reset role;
      insert into tcg_private.boosters(id,owner_id,family)
        select pg_temp.fixture_id(label),pg_temp.fixture_id('alice'),'gift' from (values ('event-before'),('event-after')) p(label);
      insert into public.tcg_inventory_copies
        select pg_temp.fixture_id('copy-' || label),pg_temp.fixture_id(label),pg_temp.fixture_id('ordinary-event'),
          pg_temp.fixture_id('alice'),2,null::timestamptz from (values ('event-before'),('event-after')) c(label);
      update tcg_private.boosters set opened_at='2026-11-22 06:00Z' where id=pg_temp.fixture_id('event-before');
      update public.tcg_cards set is_special=true where id=pg_temp.fixture_id('ordinary-event');
      update tcg_private.boosters set opened_at='2026-11-22 06:00Z' where id=pg_temp.fixture_id('event-after');
    `);
    await usePlayer(db, 'alice');
    assert.deepEqual(await myStats(db), {...historyStats, boosters_opened:17, booster_hits:10});
  });
});
