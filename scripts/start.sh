#!/bin/bash
set -e
echo "=== Starting Lunara Production ==="
cd "$(dirname "$0")/.."

if [ ! -f .env.local ]; then
  echo "Creating .env.local from template..."
  cp .env.local.example .env.local
  echo "WARNING: Please edit .env.local with your keys before proceeding."
  exit 1
fi

echo "Installing dependencies..."
npm install --silent

echo "Running database migrations..."
npx drizzle-kit migrate

echo "Building application..."
npm run build

echo "Starting production server on port 3000..."
npx next start -p 3000 &
echo $! > /tmp/lunara.pid
echo "Lunara started (PID: $(cat /tmp/lunara.pid))"
