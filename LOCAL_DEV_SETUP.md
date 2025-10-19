# SurveyFlow - Local Development Setup

This guide helps you run SurveyFlow locally without Docker, using your installed PostgreSQL.

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (installed and running)
- npm or yarn

## Quick Start

### 1. Database Setup

1. **Start PostgreSQL** on your system
2. **Run the database setup script**:
   ```sql
   -- Open psql or pgAdmin and run:
   \i setup-database.sql
   ```
   
   Or manually:
   ```sql
   CREATE DATABASE surveyflow;
   \c surveyflow;
   -- Then copy and paste the contents of setup-database.sql
   ```

3. **Update database credentials** in `backend/.env.local`:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=postgres
   DB_PASSWORD=your_postgres_password
   DB_DATABASE=surveyflow
   ```

### 2. Start the Application

**Option A: Use the automated script**
```bash
# Windows
start-local.bat

# Or PowerShell
.\start-local.ps1
```

**Option B: Manual setup**
```bash
# Terminal 1 - Backend
cd backend
npm install
npm run start:dev

# Terminal 2 - Frontend  
cd frontend
npm install
npm run dev
```

## Access Points

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api/docs

## Default Admin User

- **Email**: admin@surveyflow.com
- **Password**: admin123
- **Role**: admin

## Database Management

### Check Users
```sql
SELECT id, email, name, role, "isActive", "createdAt" FROM users ORDER BY "createdAt" DESC;
```

### Make User Admin
```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

### Create New User
```sql
INSERT INTO users (email, "passwordHash", name, role) VALUES 
('user@example.com', '$2b$10$hashed_password_here', 'User Name', 'user');
```

## Troubleshooting

### Port Conflicts
- Backend uses port 3001
- Frontend uses port 3000
- PostgreSQL uses port 5432 (default)

### Database Connection Issues
- Ensure PostgreSQL is running
- Check credentials in `backend/.env.local`
- Verify database `surveyflow` exists

### Missing Dependencies
```bash
# Backend
cd backend && npm install

# Frontend
cd frontend && npm install
```

## Development Notes

- **No Redis required** for basic development
- **File uploads** will be stored locally (no S3 needed)
- **Email notifications** are optional
- **Hot reload** enabled for both frontend and backend

## Production Deployment

For production, you'll need:
- Redis for caching
- AWS S3 for file storage
- SMTP server for emails
- Proper environment variables

See `DEPLOYMENT.md` for production setup.
