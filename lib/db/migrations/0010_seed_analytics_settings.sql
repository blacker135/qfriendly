-- 统计设置默认种子数据
INSERT INTO analytics_settings (key, value, description) VALUES
  ('heartbeat_interval', '10', '心跳间隔（分钟），范围 3-30'),
  ('segment_high_active', '20', '高活用户最低活跃天数（过去30天）'),
  ('segment_medium_active_min', '7', '中活用户最低活跃天数'),
  ('segment_medium_active_max', '19', '中活用户最高活跃天数'),
  ('segment_low_active_min', '1', '低活用户最低活跃天数'),
  ('segment_low_active_max', '6', '低活用户最高活跃天数'),
  ('segment_at_risk_days', '30', '流失风险判断天数（未活跃天数）'),
  ('segment_lost_days', '30', '已流失判断天数（未活跃天数）'),
  ('data_retention_sessions', '90', 'sessions 表保留天数'),
  ('data_retention_events', '365', 'analytics_events 表保留天数'),
  ('data_retention_sub_events', '0', 'subscription_events 保留天数（0=永久）')
ON CONFLICT (key) DO NOTHING;
