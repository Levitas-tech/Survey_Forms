# SurveyFlow Deployment Guide

This guide covers deploying SurveyFlow on Amazon EC2 with all services running on a single instance.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    EC2 Instance                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Nginx     │  │  Frontend   │  │   Backend   │    │
│  │  (Port 80)  │  │ (Port 3000) │  │ (Port 3001) │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ PostgreSQL  │  │    Redis    │  │   Uploads   │    │
│  │ (Port 5432) │  │ (Port 6379) │  │   Storage   │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
└─────────────────────────────────────────────────────────┘
```

## Prerequisites

### EC2 Instance Requirements
- **Instance Type**: t3.medium or larger (2 vCPU, 4GB RAM minimum)
- **Storage**: 20GB+ EBS volume
- **OS**: Ubuntu 20.04 LTS or later
- **Security Group**: Allow ports 22, 80, 443, 3000, 3001

### Required Software
- Docker & Docker Compose
- Node.js 18+ (for development)
- Git
- PostgreSQL client tools

## Quick Deployment

### 1. Launch EC2 Instance

1. Launch Ubuntu 20.04 LTS instance
2. Configure security group:
   ```
   SSH (22)     - Your IP
   HTTP (80)    - 0.0.0.0/0
   HTTPS (443)  - 0.0.0.0/0
   Custom (3000) - 0.0.0.0/0
   Custom (3001) - 0.0.0.0/0
   ```

### 2. Initial Setup

Connect to your EC2 instance:

```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

Run the automated setup:

```bash
# Download and run setup script
curl -fsSL https://raw.githubusercontent.com/your-repo/surveyflow/main/deploy/ec2-setup.sh | bash

# Or run locally
chmod +x deploy/ec2-setup.sh
./deploy/ec2-setup.sh
```

### 3. Deploy Application

From your local machine:

```bash
# Set environment variables
export EC2_HOST=your-ec2-instance.amazonaws.com
export EC2_KEY=/path/to/your-key.pem
export EC2_USER=ubuntu

# Deploy
chmod +x deploy/deploy-to-ec2.sh
./deploy/deploy-to-ec2.sh
```

### 4. Configure Environment

```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# Edit environment file
cd /opt/surveyflow
nano .env
```

Update these critical variables:
```bash
# Database
DB_PASSWORD=your_secure_database_password

# JWT Secrets (generate strong secrets)
JWT_SECRET=your_jwt_secret_key_here
JWT_REFRESH_SECRET=your_refresh_secret_key_here

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@yourdomain.com

# Application URLs
FRONTEND_URL=http://your-ec2-public-ip
```

### 5. Start Services

```bash
cd /opt/surveyflow
docker-compose -f docker-compose.prod.yml up -d
```

### 6. Verify Deployment

```bash
# Check service status
docker-compose ps

# Check logs
docker-compose logs -f

# Test endpoints
curl http://your-ec2-ip/health
curl http://your-ec2-ip/api/v1/health
```

## Manual Setup (Step by Step)

### 1. Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL client
sudo apt install -y postgresql-client
```

### 2. Setup Application

```bash
# Create application directory
sudo mkdir -p /opt/surveyflow
sudo chown $USER:$USER /opt/surveyflow
cd /opt/surveyflow

# Clone repository
git clone https://github.com/your-username/surveyflow.git .

# Create data directories
mkdir -p data/{postgres,redis,uploads}
mkdir -p logs/{nginx,backend}
mkdir -p backups
```

### 3. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Generate secure passwords
DB_PASSWORD=$(openssl rand -hex 16)
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)

# Update .env file
sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" .env
sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
sed -i "s/JWT_REFRESH_SECRET=.*/JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET/" .env
```

### 4. Start Services

```bash
# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose ps
```

## Configuration Details

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_PASSWORD` | PostgreSQL password | `secure_password_123` |
| `JWT_SECRET` | JWT signing secret | `your_jwt_secret_key` |
| `JWT_REFRESH_SECRET` | Refresh token secret | `your_refresh_secret_key` |
| `SMTP_HOST` | Email server host | `smtp.gmail.com` |
| `SMTP_USER` | Email username | `your-email@gmail.com` |
| `SMTP_PASS` | Email password | `your-app-password` |
| `FRONTEND_URL` | Public URL | `http://your-domain.com` |

### Database Configuration

The application uses PostgreSQL with the following default settings:
- Database: `surveyflow`
- User: `surveyflow`
- Port: `5432`
- Data directory: `/opt/surveyflow/data/postgres`

### File Storage

File uploads are stored locally in `/opt/surveyflow/data/uploads` by default. For production, consider:
- AWS S3 integration
- Regular backups
- CDN for static assets

## Management Commands

### Service Management

```bash
# Start services
docker-compose -f docker-compose.prod.yml up -d

# Stop services
docker-compose -f docker-compose.prod.yml down

# Restart services
docker-compose -f docker-compose.prod.yml restart

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
```

### Database Management

```bash
# Connect to database
docker-compose -f docker-compose.prod.yml exec postgres psql -U surveyflow -d surveyflow

# Create database backup
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U surveyflow surveyflow > backup.sql

# Restore from backup
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U surveyflow -d surveyflow < backup.sql
```

### Monitoring

```bash
# Check service status
cd /opt/surveyflow
./monitor.sh

# Check system resources
htop
df -h
free -h

# Check Docker resources
docker system df
docker stats
```

### Backup

```bash
# Manual backup
cd /opt/surveyflow
./backup.sh

# Automated backup (runs daily)
# Check cron jobs
crontab -l
```

## SSL/HTTPS Setup (Production)

### Using Let's Encrypt

1. Install Certbot:
```bash
sudo apt install certbot python3-certbot-nginx
```

2. Get SSL certificate:
```bash
sudo certbot --nginx -d your-domain.com
```

3. Update Nginx configuration for HTTPS redirect

### Using Custom SSL Certificate

1. Place certificates in `/opt/surveyflow/nginx/ssl/`:
   - `cert.pem` - Certificate file
   - `key.pem` - Private key file

2. Update `nginx/nginx.conf` to enable HTTPS server block

## Troubleshooting

### Common Issues

1. **Services not starting**:
   ```bash
   # Check logs
   docker-compose logs
   
   # Check Docker status
   docker system df
   docker system prune -a
   ```

2. **Database connection issues**:
   ```bash
   # Check database logs
   docker-compose logs postgres
   
   # Test connection
   docker-compose exec postgres psql -U surveyflow -d surveyflow
   ```

3. **Permission issues**:
   ```bash
   # Fix ownership
   sudo chown -R $USER:$USER /opt/surveyflow
   
   # Fix Docker permissions
   sudo usermod -aG docker $USER
   newgrp docker
   ```

4. **Port conflicts**:
   ```bash
   # Check port usage
   sudo netstat -tulpn | grep :80
   sudo netstat -tulpn | grep :3000
   sudo netstat -tulpn | grep :3001
   ```

5. **Memory issues**:
   ```bash
   # Check memory usage
   free -h
   
   # Increase swap space
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

### Log Locations

- Application logs: `docker-compose logs`
- Nginx logs: `/opt/surveyflow/logs/nginx/`
- System logs: `/var/log/syslog`
- Docker logs: `/var/lib/docker/containers/`

### Performance Optimization

1. **Docker optimization**:
   ```bash
   # Clean up unused resources
   docker system prune -a
   
   # Set log rotation
   sudo nano /etc/docker/daemon.json
   ```

2. **Database optimization**:
   ```bash
   # Connect to database and run
   docker-compose exec postgres psql -U surveyflow -d surveyflow
   ```

3. **Nginx optimization**:
   - Enable gzip compression
   - Set appropriate cache headers
   - Configure rate limiting

## Security Considerations

1. **Firewall Configuration**:
   ```bash
   # Install UFW
   sudo apt install ufw
   
   # Configure firewall
   sudo ufw allow ssh
   sudo ufw allow 80
   sudo ufw allow 443
   sudo ufw enable
   ```

2. **SSL/TLS**:
   - Use Let's Encrypt for free SSL certificates
   - Configure HTTPS redirect
   - Set security headers

3. **Database Security**:
   - Use strong passwords
   - Limit database access to localhost only
   - Regular backups

4. **Application Security**:
   - Keep dependencies updated
   - Use environment variables for secrets
   - Implement rate limiting
   - Regular security audits

## Scaling Considerations

For high-traffic deployments:

1. **Load Balancer**: Use AWS Application Load Balancer
2. **Database**: Migrate to AWS RDS
3. **Caching**: Use AWS ElastiCache for Redis
4. **Storage**: Use AWS S3 for file uploads
5. **CDN**: Use CloudFront for static assets
6. **Monitoring**: Use CloudWatch for monitoring

## Support

For issues and questions:
- Check logs: `docker-compose logs`
- Monitor resources: `./monitor.sh`
- Review configuration: `.env` file
- Check service status: `docker-compose ps`
