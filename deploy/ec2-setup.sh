#!/bin/bash

# SurveyFlow EC2 Deployment Script
# This script sets up a complete SurveyFlow deployment on an EC2 instance

set -e

echo "🚀 Starting SurveyFlow EC2 deployment..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker
echo "🐳 Installing Docker..."
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Install Docker Compose
echo "🔧 Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add current user to docker group
sudo usermod -aG docker $USER

# Install Node.js (for development)
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL client tools
echo "🗄️ Installing PostgreSQL client..."
sudo apt install -y postgresql-client

# Create application directory
echo "📁 Creating application directory..."
sudo mkdir -p /opt/surveyflow
sudo chown $USER:$USER /opt/surveyflow

# Create data directories
echo "📁 Creating data directories..."
sudo mkdir -p /opt/surveyflow/data/postgres
sudo mkdir -p /opt/surveyflow/data/redis
sudo mkdir -p /opt/surveyflow/data/uploads
sudo chown -R $USER:$USER /opt/surveyflow/data

# Create environment file
echo "⚙️ Creating environment configuration..."
cat > /opt/surveyflow/.env << EOF
# Database
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=surveyflow
DB_PASSWORD=surveyflow_secure_password_$(openssl rand -hex 8)
DB_DATABASE=surveyflow

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=$(openssl rand -hex 32)
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_EXPIRES_IN=7d

# File Storage (using local storage for EC2)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
AWS_S3_BUCKET=surveyflow-uploads

# Email (configure with your SMTP settings)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@surveyflow.com

# App
PORT=3001
NODE_ENV=production
FRONTEND_URL=http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):3000

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100
EOF

# Create docker-compose file for EC2
echo "🐳 Creating Docker Compose configuration..."
cat > /opt/surveyflow/docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: surveyflow
      POSTGRES_USER: surveyflow
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U surveyflow"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - ./data/redis:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    env_file:
      - .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./data/uploads:/app/uploads
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):3001/api/v1
      - NEXT_PUBLIC_APP_NAME=SurveyFlow
      - NEXT_PUBLIC_APP_URL=http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):3000
    depends_on:
      - backend
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
    restart: unless-stopped
EOF

# Create Nginx configuration
echo "🌐 Creating Nginx configuration..."
mkdir -p /opt/surveyflow/nginx
cat > /opt/surveyflow/nginx/nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream frontend {
        server frontend:3000;
    }

    upstream backend {
        server backend:3001;
    }

    server {
        listen 80;
        server_name _;

        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Backend API
        location /api/ {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # File uploads
        location /uploads/ {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
EOF

# Create systemd service for auto-start
echo "🔧 Creating systemd service..."
sudo tee /etc/systemd/system/surveyflow.service > /dev/null << EOF
[Unit]
Description=SurveyFlow Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/surveyflow
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

# Enable the service
sudo systemctl enable surveyflow.service

# Create backup script
echo "💾 Creating backup script..."
cat > /opt/surveyflow/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/surveyflow/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
docker-compose exec -T postgres pg_dump -U surveyflow surveyflow > $BACKUP_DIR/database_$DATE.sql

# Backup uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz data/uploads/

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /opt/surveyflow/backup.sh

# Create update script
echo "🔄 Creating update script..."
cat > /opt/surveyflow/update.sh << 'EOF'
#!/bin/bash
cd /opt/surveyflow

echo "🔄 Updating SurveyFlow..."

# Pull latest code
git pull origin main

# Rebuild and restart services
docker-compose down
docker-compose build --no-cache
docker-compose up -d

echo "✅ Update completed!"
EOF

chmod +x /opt/surveyflow/update.sh

# Create monitoring script
echo "📊 Creating monitoring script..."
cat > /opt/surveyflow/monitor.sh << 'EOF'
#!/bin/bash
echo "=== SurveyFlow Status ==="
echo "Docker Compose Status:"
docker-compose ps

echo -e "\nDisk Usage:"
df -h

echo -e "\nMemory Usage:"
free -h

echo -e "\nDocker System:"
docker system df
EOF

chmod +x /opt/surveyflow/monitor.sh

# Set up log rotation
echo "📝 Setting up log rotation..."
sudo tee /etc/logrotate.d/surveyflow > /dev/null << EOF
/opt/surveyflow/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
}
EOF

echo "✅ EC2 setup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Copy your application code to /opt/surveyflow/"
echo "2. Update the .env file with your specific configuration"
echo "3. Run: cd /opt/surveyflow && docker-compose up -d"
echo "4. Access your application at: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
echo ""
echo "🔧 Useful commands:"
echo "- Check status: cd /opt/surveyflow && ./monitor.sh"
echo "- View logs: cd /opt/surveyflow && docker-compose logs -f"
echo "- Backup: cd /opt/surveyflow && ./backup.sh"
echo "- Update: cd /opt/surveyflow && ./update.sh"
