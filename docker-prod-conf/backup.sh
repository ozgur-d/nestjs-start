#!/bin/bash

# NestJS Starter - Docker Volume Backup Script
# Usage: ./docker-prod-conf/backup.sh

set -e

BACKUP_DIR="./docker/backups"
BACKUP_DATE=$(date +%Y%m%d-%H%M%S)
PROJECT_NAME="nestjs-starter"

echo "🔄 Starting backup process..."

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup PostgreSQL
echo "📦 Backing up PostgreSQL..."
docker run --rm \
  -v ${PROJECT_NAME}_postgresql_data:/data \
  -v "$(pwd)/$BACKUP_DIR":/backup \
  alpine tar czf /backup/postgresql-${BACKUP_DATE}.tar.gz -C /data .

# Backup Redis
echo "📦 Backing up Redis..."
docker run --rm \
  -v ${PROJECT_NAME}_redis_data:/data \
  -v "$(pwd)/$BACKUP_DIR":/backup \
  alpine tar czf /backup/redis-${BACKUP_DATE}.tar.gz -C /data .

echo "✅ Backup completed successfully!"
echo ""
echo "📁 Backup files:"
echo "   - $BACKUP_DIR/postgresql-${BACKUP_DATE}.tar.gz"
echo "   - $BACKUP_DIR/redis-${BACKUP_DATE}.tar.gz"
echo ""
echo "💾 Total size:"
du -sh "$BACKUP_DIR"/*${BACKUP_DATE}*.tar.gz
