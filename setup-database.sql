-- SurveyFlow Database Setup
-- Run this in your PostgreSQL client (psql, pgAdmin, etc.)

-- Create database
CREATE DATABASE surveyflow;

-- Connect to the database
\c surveyflow;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR NOT NULL UNIQUE,
    "passwordHash" VARCHAR NOT NULL,
    name VARCHAR NOT NULL,
    role VARCHAR NOT NULL DEFAULT 'user' CHECK (role IN ('super_admin', 'admin', 'user', 'reviewer')),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "refreshToken" VARCHAR,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

-- Create groups table
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR NOT NULL,
    description VARCHAR,
    "createdById" UUID NOT NULL REFERENCES users(id),
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

-- Create user_groups junction table
CREATE TABLE user_groups (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, group_id)
);

-- Create forms table
CREATE TABLE forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR NOT NULL,
    description VARCHAR,
    status VARCHAR NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    "createdById" UUID NOT NULL REFERENCES users(id),
    "publishAt" TIMESTAMP,
    "expireAt" TIMESTAMP,
    settings JSONB,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

-- Create questions table
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "formId" UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    type VARCHAR NOT NULL CHECK (type IN ('single_choice', 'multiple_choice', 'text_short', 'text_long', 'likert_scale', 'numeric_scale', 'file_upload', 'instruction')),
    text VARCHAR NOT NULL,
    config JSONB,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    required BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

-- Create options table
CREATE TABLE options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "questionId" UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    text VARCHAR NOT NULL,
    value VARCHAR NOT NULL,
    "imageUrl" VARCHAR,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

-- Create responses table
CREATE TABLE responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "formId" UUID NOT NULL REFERENCES forms(id),
    "userId" UUID NOT NULL REFERENCES users(id),
    "startedAt" TIMESTAMP NOT NULL,
    "submittedAt" TIMESTAMP,
    status VARCHAR NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted')),
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

-- Create answers table
CREATE TABLE answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "responseId" UUID NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
    "questionId" UUID NOT NULL REFERENCES questions(id),
    value JSONB,
    score DOUBLE PRECISION,
    files JSONB,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_forms_created_by ON forms("createdById");
CREATE INDEX idx_questions_form_id ON questions("formId");
CREATE INDEX idx_options_question_id ON options("questionId");
CREATE INDEX idx_responses_form_id ON responses("formId");
CREATE INDEX idx_responses_user_id ON responses("userId");
CREATE INDEX idx_answers_response_id ON answers("responseId");
CREATE INDEX idx_answers_question_id ON answers("questionId");
CREATE INDEX idx_user_groups_user_id ON user_groups(user_id);
CREATE INDEX idx_user_groups_group_id ON user_groups(group_id);

-- Insert a default admin user (password: admin123)
INSERT INTO users (email, "passwordHash", name, role) VALUES 
('admin@surveyflow.com', '$2b$10$rQZ8K9vL8vL8vL8vL8vL8u', 'Admin User', 'admin');

-- Show success message
SELECT 'Database setup completed successfully!' as message;
