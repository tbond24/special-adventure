-- Disposable SQL QA only: existing hidden optional groups must stay hidden.
insert into public.listing_display_options(slot,label,enabled)
select slot,slot,false from unnest(array['listing-wifi','listing-parking','listing-furnished','listing-ensuite','listing-bills','listing-security','listing-custom','listing-electricity']) slot;
update public.listing_display_options set enabled=false where slot='listing-water';
