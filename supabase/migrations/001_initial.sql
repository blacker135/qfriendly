-- ============================================================
-- 001_initial.sql — Lunara MVP 初始数据库 Schema
-- ============================================================
-- 说明：
--   - auth.users 表由 Supabase Auth 自动管理，无需手动创建
--   - 本迁移创建业务表：profiles、conversations、messages
--   - 所有表启用 RLS（行级安全），确保用户数据隔离
-- ============================================================

-- ------------------------------------------------------------
-- 1. profiles — 用户扩展 profile
--    关联 Supabase Auth 的 auth.users 表
-- ------------------------------------------------------------
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname    TEXT,                                 -- 用户昵称（可选）
  created_at  TIMESTAMPTZ DEFAULT NOW()            -- 创建时间
);

-- ------------------------------------------------------------
-- 2. conversations — 对话会话
--    每个会话绑定一个用户和一个专家角色
-- ------------------------------------------------------------
CREATE TABLE conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  expert      TEXT NOT NULL CHECK (expert IN ('evan', 'liam', 'noah', 'adrian')),
                                                   -- 专家角色枚举
  language    TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'zh')),
                                                   -- 对话语言：英文/中文
  title       TEXT DEFAULT 'New Conversation',     -- 会话标题
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 3. messages — 消息记录
--    每条消息属于一个对话，分为 user/assistant 角色
-- ------------------------------------------------------------
CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
                                                   -- 消息角色：用户/助手
  content         TEXT NOT NULL,                   -- 消息内容
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 4. 索引 — 优化常见查询路径
-- ------------------------------------------------------------
-- 按用户查询最近会话列表
CREATE INDEX idx_conversations_user ON conversations(user_id, updated_at DESC);

-- 按对话查询消息时间线
CREATE INDEX idx_messages_conv ON messages(conversation_id, created_at ASC);

-- ------------------------------------------------------------
-- 5. RLS 策略 — profiles
-- ------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 用户只能读取自己的 profile
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- 用户只能更新自己的 profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- ------------------------------------------------------------
-- 6. RLS 策略 — conversations
-- ------------------------------------------------------------
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- 用户只能读取自己的对话
CREATE POLICY "Users can read own conversations" ON conversations
  FOR SELECT USING (auth.uid() = user_id);

-- 用户只能创建自己的对话
CREATE POLICY "Users can insert own conversations" ON conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 用户只能更新自己的对话
CREATE POLICY "Users can update own conversations" ON conversations
  FOR UPDATE USING (auth.uid() = user_id);

-- 用户只能删除自己的对话
CREATE POLICY "Users can delete own conversations" ON conversations
  FOR DELETE USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 7. RLS 策略 — messages
-- ------------------------------------------------------------
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 用户只能读取属于自己对话的消息
CREATE POLICY "Users can read messages of own conversations" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE id = messages.conversation_id
        AND user_id = auth.uid()
    )
  );

-- 用户只能向自己的对话插入消息
CREATE POLICY "Users can insert messages to own conversations" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE id = messages.conversation_id
        AND user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- 8. 触发器 — 新用户注册后自动创建 profile
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 监听 auth.users 表的 INSERT 事件
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
