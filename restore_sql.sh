#!/bin/bash
echo "PostgreSQL SQL Restore Script for EC2"
echo "===================================="
echo

# Check if SQL file exists
if [ ! -f "/home/ubuntu/surveyflow.sql" ]; then
    echo "ERROR: surveyflow.sql file not found!"
    exit 1
fi

echo "Step 1: Moving SQL file to accessible location..."
sudo mv /home/ubuntu/surveyflow.sql /tmp/surveyflow.sql
sudo chown postgres:postgres /tmp/surveyflow.sql

echo "Step 2: Dropping existing tables (if any)..."
sudo -u postgres psql -d surveyflow -c "
DROP TABLE IF EXISTS answers CASCADE;
DROP TABLE IF EXISTS responses CASCADE;
DROP TABLE IF EXISTS options CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS forms CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
DROP TABLE IF EXISTS user_groups CASCADE;
DROP TABLE IF EXISTS users CASCADE;
"

echo "Step 3: Restoring database from SQL file..."
sudo -u postgres psql -d surveyflow < /tmp/surveyflow.sql
if [ $? -eq 0 ]; then
    echo "Database restored successfully!"
else
    echo "ERROR: Failed to restore database"
    exit 1
fi

echo "Step 4: Verifying data..."
echo "Users count:"
sudo -u postgres psql -d surveyflow -c "SELECT COUNT(*) FROM users;"
echo "Forms count:"
sudo -u postgres psql -d surveyflow -c "SELECT COUNT(*) FROM forms;"
echo "Questions count:"
sudo -u postgres psql -d surveyflow -c "SELECT COUNT(*) FROM questions;"
echo "Responses count:"
sudo -u postgres psql -d surveyflow -c "SELECT COUNT(*) FROM responses;"
echo "Answers count:"
sudo -u postgres psql -d surveyflow -c "SELECT COUNT(*) FROM answers;"

echo "Restore process completed!"