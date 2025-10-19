# SurveyFlow Local Development Setup

This guide will help you run SurveyFlow locally on your Windows machine for testing and development.

## Prerequisites

Before starting, make sure you have:

1. **Docker Desktop** - Download from [docker.com](https://www.docker.com/products/docker-desktop/)
2. **Node.js 18+** - Download from [nodejs.org](https://nodejs.org/)
3. **Git** - Download from [git-scm.com](https://git-scm.com/)

## Quick Start (Automated)

### Option 1: Run the Batch Script
```cmd
# Double-click run-local.bat or run in Command Prompt
run-local.bat
```

### Option 2: PowerShell Script
```powershell
# Run in PowerShell
.\run-local.ps1
```

## Manual Setup (Step by Step)

### 1. Install Dependencies

```cmd
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Create Environment Files

**Backend Environment** (`backend/.env`):
```env
# Database
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=surveyflow
DB_PASSWORD=password
DB_DATABASE=surveyflow

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=dev-jwt-secret-key-123456789
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=dev-refresh-secret-key-987654321
JWT_REFRESH_EXPIRES_IN=7d

# File Storage
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
AWS_S3_BUCKET=surveyflow-uploads

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
FROM_EMAIL=noreply@surveyflow.local

# App
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100
```

**Frontend Environment** (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_APP_NAME=SurveyFlow
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Start Services

```cmd
# Start all services with Docker
docker-compose -f docker-compose.dev.yml up -d

# Check if services are running
docker-compose -f docker-compose.dev.yml ps
```

### 4. Verify Installation

Open your browser and visit:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api/docs
- **Health Check**: http://localhost:3001/health

## Development Workflow

### Running in Development Mode

```cmd
# Start all services
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop services
docker-compose -f docker-compose.dev.yml down
```

### Backend Development

```cmd
# Run backend in development mode
cd backend
npm run start:dev
```

### Frontend Development

```cmd
# Run frontend in development mode
cd frontend
npm run dev
```

## Testing the Application

### 1. Create a Test User

Visit http://localhost:3000/register and create a new account.

### 2. Test Admin Features

1. Register a new user
2. Manually update the user role in the database:
   ```sql
   -- Connect to database
   docker-compose -f docker-compose.dev.yml exec postgres psql -U surveyflow -d surveyflow
   
   -- Update user role
   UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
   ```

### 3. Test Form Creation

1. Login as admin
2. Go to Admin Dashboard
3. Create a new form
4. Add questions
5. Publish the form

### 4. Test Form Completion

1. Login as regular user
2. Go to Dashboard
3. Complete the published form

## Troubleshooting

### Common Issues

1. **Docker not running**:
   - Start Docker Desktop
   - Wait for it to fully start
   - Try again

2. **Port conflicts**:
   ```cmd
   # Check what's using ports 3000 and 3001
   netstat -ano | findstr :3000
   netstat -ano | findstr :3001
   ```

3. **Database connection issues**:
   ```cmd
   # Check database logs
   docker-compose -f docker-compose.dev.yml logs postgres
   
   # Restart database
   docker-compose -f docker-compose.dev.yml restart postgres
   ```

4. **Services not starting**:
   ```cmd
   # Check all logs
   docker-compose -f docker-compose.dev.yml logs
   
   # Rebuild containers
   docker-compose -f docker-compose.dev.yml down
   docker-compose -f docker-compose.dev.yml build --no-cache
   docker-compose -f docker-compose.dev.yml up -d
   ```

### Reset Everything

```cmd
# Stop and remove all containers
docker-compose -f docker-compose.dev.yml down -v

# Remove all images
docker system prune -a

# Start fresh
docker-compose -f docker-compose.dev.yml up -d --build
```

## Useful Commands

```cmd
# View logs
docker-compose -f docker-compose.dev.yml logs -f

# View specific service logs
docker-compose -f docker-compose.dev.yml logs -f backend
docker-compose -f docker-compose.dev.yml logs -f frontend

# Restart a specific service
docker-compose -f docker-compose.dev.yml restart backend

# Execute commands in containers
docker-compose -f docker-compose.dev.yml exec backend bash
docker-compose -f docker-compose.dev.yml exec postgres psql -U surveyflow -d surveyflow

# Check resource usage
docker stats
```

## Next Steps

Once everything is running locally:

1. **Test all features** - Create forms, complete surveys, view analytics
2. **Check the API** - Visit http://localhost:3001/api/docs
3. **Deploy to EC2** - Use the deployment scripts when ready
4. **Customize** - Modify the code to fit your specific needs

## Support

If you encounter issues:
1. Check the logs: `docker-compose -f docker-compose.dev.yml logs`
2. Verify all services are running: `docker-compose -f docker-compose.dev.yml ps`
3. Check the troubleshooting section above
4. Make sure Docker Desktop is running and has enough resources allocated
