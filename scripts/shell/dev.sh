#!/bin/bash
set -e
echo "=== Starting Lunara Dev Server ==="
cd "$(dirname "$0")/.."

# 检查 .env.local
if [ ! -f .env.local ]; then
  cp .env.local.example .env.local
  echo "Created .env.local from template — please fill in your keys."
  exit 1
fi

# 检查 PostgreSQL 连接
source .env.local 2>/dev/null || true
if [ -n "$DATABASE_URL" ]; then
  echo "Checking PostgreSQL connection..."
  npx drizzle-kit check 2>/dev/null || echo "WARNING: Could not connect to PostgreSQL. Please check DATABASE_URL."
else
  echo "WARNING: DATABASE_URL not set. Database features won't work."
fi

# 运行数据库迁移
echo "Running database migrations..."
npx drizzle-kit migrate

# 启动开发服务器
npx next dev
