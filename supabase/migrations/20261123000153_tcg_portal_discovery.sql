-- The router sets this address when the streamer's deck is ready to visit.
alter table tcg_private.creator_channels
  add column portal_deck_url text
  check (length(portal_deck_url) <= 2048 and portal_deck_url ~ '^https://[^/@?#[:space:]]+([/?#][^[:space:]]*)?$');

update tcg_private.creator_channels
set portal_deck_url = 'https://tcg.yekelle-boulet.workers.dev/#/boosters'
where broadcaster_id = '99977368';

-- Only this projection of published decks is readable by the portal.
create view tcg_private.portal_listed_decks with (security_barrier = true) as
select c.broadcaster_id,
       v.twitch_display_name as display_name,
       v.twitch_avatar_url as avatar_url,
       c.portal_deck_url as deck_url
from tcg_private.creator_channels as c
join public.tcg_collections as collection on collection.id = c.collection_id
join public.tcg_viewers as v on v.twitch_user_id = c.broadcaster_id
where collection.is_published and not collection.is_archived
  and c.portal_deck_url is not null
  and nullif(btrim(v.twitch_display_name), '') is not null
  and v.twitch_avatar_url ~ '^https://[^/@?#[:space:]]+([/?#][^[:space:]]*)?$';

revoke all on tcg_private.portal_listed_decks from public, anon, authenticated;
grant select on tcg_private.portal_listed_decks to anon, authenticated;

create function public.tcg_portal_discovery()
returns table (broadcaster_id text, display_name text, avatar_url text, deck_url text)
language sql volatile security invoker
set search_path = ''
as $$
  with others as (
    select d.*, random() as pick_order
    from tcg_private.portal_listed_decks as d
    where d.broadcaster_id <> '99977368'
    order by pick_order
    limit 19
  ), lineup as (
    select o.broadcaster_id, o.display_name, o.avatar_url, o.deck_url, false as featured, o.pick_order
    from others as o
    union all
    select d.broadcaster_id, d.display_name, d.avatar_url, d.deck_url, true, 0
    from tcg_private.portal_listed_decks as d
    where d.broadcaster_id = '99977368'
  )
  select l.broadcaster_id, l.display_name, l.avatar_url, l.deck_url
  from lineup as l
  order by l.featured, l.pick_order;
$$;

revoke all on function public.tcg_portal_discovery() from public, anon, authenticated;
grant execute on function public.tcg_portal_discovery() to anon, authenticated;
