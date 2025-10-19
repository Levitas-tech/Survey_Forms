#!/bin/bash

# SurveyFlow EC2 Deployment Script
# This script deploys the SurveyFlow application to an EC2 instance

set -e

# Configuration
EC2_HOST=${EC2_HOST:-""}
EC2_USER=${EC2_USER:-"ubuntu"}
EC2_KEY=${EC2_KEY:-""}
APP_DIR="/opt/surveyflow"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required variables are set
if [ -z "$EC2_HOST" ] || [ -z "$EC2_KEY" ]; then
    print_error "Please set EC2_HOST and EC2_KEY environment variables"
    print_status "Example:"
    print_status "export EC2_HOST=your-ec2-instance.amazonaws.com"
    print_status "export EC2_KEY=/path/to/your-key.pem"
    print_status "export EC2_USER=ubuntu"
    exit 1
fi

# Check if key file exists
if [ ! -f "$EC2_KEY" ]; then
    print_error "Key file not found: $EC2_KEY"
    exit 1
fi

print_status "🚀 Starting deployment to EC2 instance: $EC2_HOST"

# Create deployment package
print_status "📦 Creating deployment package..."
TEMP_DIR=$(mktemp -d)
cp -r . "$TEMP_DIR/surveyflow"
cd "$TEMP_DIR/surveyflow"

# Remove unnecessary files
rm -rf .git
rm -rf node_modules
rm -rf frontend/node_modules
rm -rf backend/node_modules
rm -rf .next
rm -rf backend/dist
rm -rf frontend/.next
rm -rf frontend/out
rm -rf deploy/ec2-setup.sh  # Don't include the setup script in deployment

# Create deployment archive
tar -czf surveyflow.tar.gz -C .. surveyflow
print_status "✅ Deployment package created: surveyflow.tar.gz"

# Upload to EC2
print_status "📤 Uploading to EC2 instance..."
scp -i "$EC2_KEY" -o StrictHostKeyChecking=no surveyflow.tar.gz "$EC2_USER@$EC2_HOST:/tmp/"

# Deploy on EC2
print_status "🔧 Deploying on EC2 instance..."
ssh -i "$EC2_KEY" -o StrictHostKeyChecking=no "$EC2_USER@$EC2_HOST" << 'EOF'
    set -e
    
    echo "📁 Extracting deployment package..."
    cd /opt/surveyflow
    sudo rm -rf backend frontend docker-compose.yml package.json README.md
    sudo tar -xzf /tmp/surveyflow.tar.gz --strip-components=1
    sudo chown -R $USER:$USER /opt/surveyflow
    
    echo "🐳 Stopping existing services..."
    docker-compose down || true
    
    echo "🔧 Building and starting services..."
    docker-compose build --no-cache
    docker-compose up -d
    
    echo "⏳ Waiting for services to start..."
    sleep 30
    
    echo "📊 Checking service status..."
    docker-compose ps
    
    echo "🧹 Cleaning up..."
    rm -f /tmp/surveyflow.tar.gz
    
    echo "✅ Deployment completed!"
EOF

# Clean up local temp directory
rm -rf "$TEMP_DIR"

print_status "🎉 Deployment completed successfully!"
print_status "🌐 Your application should be available at: http://$EC2_HOST"
print_status "📊 To check status, run: ssh -i $EC2_KEY $EC2_USER@$EC2_HOST 'cd $APP_DIR && ./monitor.sh'"
