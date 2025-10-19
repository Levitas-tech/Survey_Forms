#!/bin/bash

# SurveyFlow Database Backup Script
# This script creates automated backups of the PostgreSQL database

set -e

# Configuration
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="surveyflow"
DB_USER="surveyflow"
DB_HOST="postgres"
RETENTION_DAYS=7

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "Starting backup at $(date)"

# Create database backup
echo "Creating database backup..."
pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_DIR/database_$DATE.sql"

# Compress the backup
echo "Compressing backup..."
gzip "$BACKUP_DIR/database_$DATE.sql"

# Create uploads backup (if uploads directory exists)
if [ -d "/var/www/uploads" ]; then
    echo "Creating uploads backup..."
    tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" -C /var/www uploads
fi

# Remove old backups (older than retention period)
echo "Cleaning up old backups..."
find "$BACKUP_DIR" -name "database_*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "uploads_*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed successfully at $(date)"
echo "Backup files:"
ls -la "$BACKUP_DIR"/*_$DATE.*
