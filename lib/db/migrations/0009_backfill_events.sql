-- 从现有 subscriptions 表回填 subscription_events
-- 避免重复回填（WHERE NOT EXISTS）

-- 1. 回填 created / cancelled / expired 事件
INSERT INTO subscription_events (user_id, event_type, plan, paypal_subscription_id, created_at)
SELECT
  user_id,
  CASE
    WHEN status = 'active' AND created_at = updated_at THEN 'created'
    WHEN status = 'cancelled' THEN 'cancelled'
    WHEN status = 'expired' THEN 'expired'
    ELSE 'created'
  END as event_type,
  variant_name as plan,
  paypal_subscription_id,
  created_at
FROM subscriptions
WHERE NOT EXISTS (
  SELECT 1 FROM subscription_events se
  WHERE se.paypal_subscription_id = subscriptions.paypal_subscription_id
);

-- 2. 从 analytics_events 的 payment_completed 回填 amount 信息
UPDATE subscription_events se
SET amount = (
  SELECT (payload->>'amount')::numeric
  FROM analytics_events ae
  WHERE ae.event_type = 'payment_completed'
    AND ae.payload->>'subscriptionId' = se.paypal_subscription_id
  LIMIT 1
)
WHERE se.amount IS NULL AND se.event_type IN ('created', 'renewed');
