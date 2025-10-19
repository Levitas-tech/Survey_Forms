export interface Form {
  id: string;
  title: string;
  description?: string;
  status: 'draft' | 'published' | 'archived';
  createdById: string;
  publishAt?: string;
  expireAt?: string;
  settings?: Record<string, any>;
  questions: Question[];
  createdAt: string;
  updatedAt: string;
}

export interface Question {
  id: string;
  formId: string;
  type: 'single_choice' | 'multiple_choice' | 'text_short' | 'text_long' | 'likert_scale' | 'numeric_scale' | 'file_upload' | 'instruction';
  text: string;
  config?: Record<string, any>;
  orderIndex: number;
  required: boolean;
  options?: Option[];
  createdAt: string;
  updatedAt: string;
}

export interface Option {
  id: string;
  questionId: string;
  text: string;
  value: string;
  imageUrl?: string;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface Response {
  id: string;
  formId: string;
  userId: string;
  startedAt: string;
  submittedAt?: string;
  status: 'in_progress' | 'submitted';
  answers: Answer[];
  createdAt: string;
  updatedAt: string;
}

export interface Answer {
  id: string;
  responseId: string;
  questionId: string;
  value: any;
  score?: number;
  files?: string[];
  createdAt: string;
  updatedAt: string;
}
