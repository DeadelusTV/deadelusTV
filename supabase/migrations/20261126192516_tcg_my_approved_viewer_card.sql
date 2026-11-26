begin;

create function tcg_private.my_approved_viewer_card()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.tcg_accounts a
    join public.tcg_cards c on c.viewer_id = a.viewer_id
    join tcg_private.viewer_reviews r on r.card_id = c.id
    where a.user_id = (select auth.uid()) and c.kind = 'viewer'
      and not c.is_archived and r.status = 'approved'
  );
$$;

create function public.tcg_my_approved_viewer_card()
returns boolean language sql stable security invoker set search_path = '' as $$
  select tcg_private.my_approved_viewer_card();
$$;

revoke all on function tcg_private.my_approved_viewer_card(), public.tcg_my_approved_viewer_card() from public, anon, authenticated, service_role;
grant execute on function tcg_private.my_approved_viewer_card(), public.tcg_my_approved_viewer_card() to authenticated;
commit;
