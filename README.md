# SurveyFlow

A comprehensive full-stack survey platform that allows admins to create multimedia survey forms, assign them to users, and view aggregated results.

## Features

- **Role-based Authentication**: Super Admin, Admin, User, and Reviewer roles
- **Form Builder**: Drag-and-drop interface for creating surveys with multiple question types
- **Multimedia Support**: Text, image, audio, and video questions
- **Analytics Dashboard**: Comprehensive reporting and data export
- **Responsive Design**: Mobile-friendly interface
- **Secure File Storage**: S3-compatible file upload system
- **Real-time Notifications**: Email and in-app notifications

## Tech Stack

### Frontend
- React 18 with Next.js 14
- TypeScript
- Material-UI (MUI)
- React Hook Form
- Chart.js for analytics

### Backend
- Node.js with NestJS
- TypeScript
- PostgreSQL
- Redis for caching
- JWT authentication
- AWS S3 for file storage

## Quick Start

1. **Install dependencies**:
   ```bash
   npm run install:all
   ```

2. **Set up environment variables**:
   - Copy `.env.example` to `.env` in both `frontend` and `backend` directories
   - Configure your database, Redis, and AWS S3 credentials

3. **Set up the database**:
   ```bash
   cd backend
   npm run migration:run
   ```

4. **Start development servers**:
   ```bash
   npm run dev
   ```

This will start:
- Frontend on http://localhost:3000
- Backend API on http://localhost:3001

## Project Structure

```
surveyflow/
├── frontend/          # Next.js React application
├── backend/           # NestJS API server
├── docker/            # Docker configuration
└── docs/              # Documentation
```

## API Documentation

The API documentation is available at http://localhost:3001/api/docs when the backend is running.

## License

All rights reserved. This project is proprietary software.
