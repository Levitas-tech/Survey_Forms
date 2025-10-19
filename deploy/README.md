# SurveyFlow EC2 Deployment Guide

This guide explains how to deploy SurveyFlow on an Amazon EC2 instance.

## Prerequisites

1. **EC2 Instance**: Ubuntu 20.04 LTS or later (t3.medium or larger recommended)
2. **Security Group**: Configure to allow HTTP (80), HTTPS (443), SSH (22), and custom ports (3000, 3001)
3. **Key Pair**: EC2 key pair for SSH access
4. **Domain (Optional)**: For production deployment

## Quick Start

### 1. Launch EC2 Instance

1. Launch an Ubuntu 20.04 LTS instance
2. Configure security group to allow:
   - SSH (22) from your IP
   - HTTP (80) from anywhere
   - HTTPS (443) from anywhere
   - Custom TCP (3000) from anywhere
   - Custom TCP (3001) from anywhere

### 2. Initial Setup

Connect to your EC2 instance and run the setup script:

```bash
# Download and run the setup script
curl -fsSL https://raw.githubusercontent.com/your-repo/surveyflow/main/deploy/ec2-setup.sh | bash

# Or if you have the code locally
scp -i your-key.pem deploy/ec2-setup.sh ubuntu@your-ec2-ip:/tmp/
ssh -i your-key.pem ubuntu@your-ec2-ip "chmod +x /tmp/ec2-setup.sh && /tmp/ec2-setup.sh"
```

### 3. Deploy Application

From your local machine:

```bash
# Set environment variables
export EC2_HOST=your-ec2-instance.amazonaws.com
export EC2_KEY=/path/to/your-key.pem
export EC2_USER=ubuntu

# Run deployment script
chmod +x deploy/deploy-to-ec2.sh
./deploy/deploy-to-ec2.sh
```

### 4. Configure Environment

Edit the environment file on your EC2 instance:

```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
cd /opt/surveyflow
nano .env
```

Update the following variables:
- `DB_PASSWORD`: Strong database password
- `JWT_SECRET`: Strong JWT secret
- `JWT_REFRESH_SECRET`: Strong refresh token secret
- `SMTP_*`: Your email configuration
- `FRONTEND_URL`: Your domain or EC2 public IP

### 5. Start Services

```bash
cd /opt/surveyflow
docker-compose up -d
```

## Manual Setup (Alternative)

If you prefer to set up manually:

### 1. Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2. Clone and Setup Application

```bash
# Create application directory
sudo mkdir -p /opt/surveyflow
sudo chown $USER:$USER /opt/surveyflow
cd /opt/surveyflow

# Clone your repository
git clone https://github.com/your-username/surveyflow.git .

# Copy environment file
cp .env.example .env
# Edit .env with your configuration
nano .env
```

### 3. Start Services

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps
```

## Configuration

### Environment Variables

Key environment variables to configure:

```bash
# Database
DB_PASSWORD=your_secure_password

# JWT Secrets
JWT_SECRET=your_jwt_secret_key
JWT_REFRESH_SECRET=your_refresh_secret_key

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@yourdomain.com

# Application URLs
FRONTEND_URL=http://your-domain.com
```

### SSL/HTTPS Setup (Optional)

For production with SSL:

1. Install Certbot:
```bash
sudo apt install certbot python3-certbot-nginx
```

2. Get SSL certificate:
```bash
sudo certbot --nginx -d your-domain.com
```

3. Update Nginx configuration for HTTPS redirect

## Management Commands

### Service Management

```bash
# Start services
cd /opt/surveyflow
docker-compose up -d

# Stop services
docker-compose down

# Restart services
docker-compose restart

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
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
```

### Backup

```bash
# Create backup
cd /opt/surveyflow
./backup.sh

# Restore from backup
# (Manual process - extract backup files and restore database)
```

### Updates

```bash
# Update application
cd /opt/surveyflow
./update.sh
```

## Troubleshooting

### Common Issues

1. **Services not starting**:
   ```bash
   docker-compose logs
   docker system prune -a  # Clean up Docker
   ```

2. **Database connection issues**:
   ```bash
   docker-compose exec postgres psql -U surveyflow -d surveyflow
   ```

3. **Permission issues**:
   ```bash
   sudo chown -R $USER:$USER /opt/surveyflow
   ```

4. **Port conflicts**:
   ```bash
   sudo netstat -tulpn | grep :3000
   sudo netstat -tulpn | grep :3001
   ```

### Logs Location

- Application logs: `docker-compose logs`
- System logs: `/var/log/syslog`
- Nginx logs: `docker-compose logs nginx`

### Performance Optimization

1. **Increase swap space** (if needed):
   ```bash
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

2. **Optimize Docker**:
   ```bash
   # Clean up unused images and containers
   docker system prune -a
   
   # Set Docker log rotation
   sudo nano /etc/docker/daemon.json
   ```

## Security Considerations

1. **Firewall**: Configure UFW or iptables
2. **SSL**: Use Let's Encrypt for HTTPS
3. **Database**: Use strong passwords
4. **Updates**: Keep system and Docker updated
5. **Backups**: Regular automated backups
6. **Monitoring**: Set up monitoring and alerting

## Scaling

For high-traffic deployments:

1. **Load Balancer**: Use AWS Application Load Balancer
2. **Database**: Use AWS RDS for PostgreSQL
3. **Caching**: Use AWS ElastiCache for Redis
4. **Storage**: Use AWS S3 for file uploads
5. **CDN**: Use CloudFront for static assets

## Support

For issues and questions:
- Check logs: `docker-compose logs`
- Monitor resources: `./monitor.sh`
- Review configuration: `.env` file
- Check service status: `docker-compose ps`
