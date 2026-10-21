-- Conditions for every tracked account (the "surf report"), with FSD's alert rule in exactly one place.
-- Tracked = an alert rule (cpa / roas) or a ROAS floor. alerts_on() now just filters this to flagged rows.

create function public.conditions_on(on_day date)
returns table (
  account_id uuid, client_id uuid, platform text, alert text, roas_floor numeric,
  y_spend numeric, y_conv numeric, base_conv numeric, y_metric numeric, base_metric numeric, change numeric, flagged boolean
)
language sql stable set search_path = '' as $$
  with agg as (
    select a.id as account_id, a.client_id, a.platform, a.alert, a.roas_floor,
      coalesce(a.alert, 'roas') as metric,
      sum(d.spend) filter (where d.date = on_day) as y_spend,
      sum(d.conversions) filter (where d.date = on_day) as y_conv,
      sum(d.conv_value) filter (where d.date = on_day) as y_value,
      sum(d.spend) filter (where d.date < on_day) as b_spend,
      sum(d.conversions) filter (where d.date < on_day) as b_conv,
      sum(d.conv_value) filter (where d.date < on_day) as b_value
    from public.accounts a
    join public.ad_daily d on d.account_id = a.id and d.date between on_day - 60 and on_day
    where a.alert is not null or a.roas_floor is not null
    group by a.id, a.client_id, a.platform, a.alert, a.roas_floor
  ), m as (
    select agg.*,
      case when metric = 'cpa' then y_spend / nullif(y_conv, 0) else y_value / nullif(y_spend, 0) end as y_metric,
      case when metric = 'cpa' then b_spend / nullif(b_conv, 0) else b_value / nullif(b_spend, 0) end as base_metric
    from agg
  )
  select account_id, client_id, platform, alert, roas_floor, y_spend, y_conv, b_conv, y_metric, base_metric,
    y_metric / nullif(base_metric, 0) - 1,
    coalesce(y_conv >= 3 and base_metric > 0 and y_metric is not null
      and ((alert = 'cpa' and y_metric > 1.3 * base_metric) or (alert = 'roas' and y_metric < 0.7 * base_metric)), false)
  from m;
$$;
grant execute on function public.conditions_on(date) to authenticated;

create or replace function public.alerts_on(on_day date)
returns table (
  account_id uuid, client_id uuid, platform text, alert text,
  y_spend numeric, y_conv numeric, base_conv numeric, y_metric numeric, base_metric numeric, change numeric
)
language sql stable set search_path = '' as $$
  select account_id, client_id, platform, alert, y_spend, y_conv, base_conv, y_metric, base_metric, change
  from public.conditions_on(on_day) where flagged;
$$;

create view public.conditions with (security_invoker = true) as
  select * from public.conditions_on((now() at time zone 'Australia/Sydney')::date - 1);
