#!/bin/bash

# NestJS Starter - Docker Volume Restore Script
# Usage: ./docker-infra/restore.sh [backup-date]
# Example: ./docker-infra/restore.sh 20251019-145930

set -e

BACKUP_DIR="./docker/backups"
PROJECT_NAME="nestjs-starter"

if [ -z "$1" ]; then
  echo "❌ Error: Backup date required"
  echo ""
  echo "Usage: ./docker/restore.sh [backup-date]"
  echo ""
  echo "Available backups:"
  ls -1 "$BACKUP_DIR"/postgresql-*.tar.gz 2>/dev/null | sed 's/.*postgresql-\(.*\)\.tar\.gz/  \1/' || echo "  No backups found"
  exit 1
fi

BACKUP_DATE=$1
POSTGRESQL_BACKUP="$BACKUP_DIR/postgresql-${BACKUP_DATE}.tar.gz"
REDIS_BACKUP="$BACKUP_DIR/redis-${BACKUP_DATE}.tar.gz"

# Check if backup files exist
if [ ! -f "$POSTGRESQL_BACKUP" ]; then
  echo "❌ Error: PostgreSQL backup not found: $POSTGRESQL_BACKUP"
  exit 1
fi

if [ ! -f "$REDIS_BACKUP" ]; then
  echo "❌ Error: Redis backup not found: $REDIS_BACKUP"
  exit 1
fi

echo "⚠️  WARNING: This will replace existing data!"
echo ""
echo "Backup files:"
echo "  - $POSTGRESQL_BACKUP"
echo "  - $REDIS_BACKUP"
echo ""
read -p "Continue? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
  echo "❌ Restore cancelled"
  exit 1
fi

echo ""
echo "🔄 Starting restore process..."

# Stop containers
echo "🛑 Stopping containers..."
docker compose -f docker/docker-compose.yml down

# Create volumes if they don't exist
echo "📦 Creating volumes..."
docker volume create ${PROJECT_NAME}_postgresql_data 2>/dev/null || true
docker volume create ${PROJECT_NAME}_redis_data 2>/dev/null || true

# Restore PostgreSQL
echo "📥 Restoring PostgreSQL..."
docker run --rm \
  -v ${PROJECT_NAME}_postgresql_data:/data \
  -v "$(pwd)/$BACKUP_DIR":/backup \
  alpine sh -c "rm -rf /data/* && cd /data && tar xzf /backup/postgresql-${BACKUP_DATE}.tar.gz"

# Restore Redis
echo "📥 Restoring Redis..."
docker run --rm \
  -v ${PROJECT_NAME}_redis_data:/data \
  -v "$(pwd)/$BACKUP_DIR":/backup \
  alpine sh -c "rm -rf /data/* && cd /data && tar xzf /backup/redis-${BACKUP_DATE}.tar.gz"

echo "✅ Restore completed successfully!"
echo ""
echo "🚀 Starting containers..."
docker compose -f docker/docker-compose.yml up -d

echo ""
echo "✅ All done! Containers are running."
