import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Save, 
  Send, 
  CheckCircle,
  Clock,
  User,
  Calendar,
  FileText,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import toast from 'react-hot-toast';

interface Option {
  id: string;
  text: string;
  value: string;
  orderIndex: number;
}

interface TraderPerformance {
  traderName: string;
  monthlyReturns: number[];
  capital: number;
  mean: number;
  stdDev: number;
}

interface Question {
  id: string;
  text: string;
  type: string;
  required: boolean;
  options?: Option[];
  order: number;
  config?: {
    traderPerformance?: TraderPerformance;
  };
}

interface Form {
  id: string;
  title: string;
  description: string;
  status: string;
  questions: Question[];
  createdAt: string;
  updatedAt: string;
}

interface Answer {
  questionId: string;
  value: string | string[];
}

const SurveyPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch form data
  const { data: form, isLoading: formLoading, error: formError } = useQuery({
    queryKey: ['form', id],
    queryFn: async () => {
      try {
        const response = await api.get(`/forms/${id}`);
        return response.data || null;
      } catch (error) {
        console.error('Error fetching form:', error);
        throw error;
      }
    },
    enabled: !!id && !!user,
  });

  // Check if user already has a response
  const { data: existingResponse } = useQuery({
    queryKey: ['response', id, user?.id],
    queryFn: async () => {
      try {
        const response = await api.get(`/responses/my-responses`);
        return response.data?.find((r: any) => r.formId === id) || null;
      } catch (error) {
        console.error('Error fetching existing response:', error);
        return null;
      }
    },
    enabled: !!id && !!user,
  });

  // Create/Update response mutation
  const createResponseMutation = useMutation({
    mutationFn: async (responseData: any) => {
      console.log('Sending response data:', JSON.stringify(responseData, null, 2));
      const response = await api.post(`/responses/forms/${id}`, responseData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['response', id, user?.id] });
      toast.success('Response saved successfully!');
    },
    onError: (error: any) => {
      console.error('Response creation error:', error.response?.data || error.message);
      console.error('Full error details:', error.response?.data?.message);
      if (Array.isArray(error.response?.data?.message)) {
        console.error('Validation errors:', error.response.data.message);
      }
      toast.error(error.response?.data?.message || 'Failed to save response');
    },
  });

  // Submit response mutation
  const submitResponseMutation = useMutation({
    mutationFn: async (responseId: string) => {
      const response = await api.post(`/responses/${responseId}/submit`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['response', id, user?.id] });
      toast.success('Survey submitted successfully!');
      router.push('/dashboard');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to submit survey');
    },
  });

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleSave = async () => {
    if (!form) return;

    const responseData = {
      answers: Object.entries(answers).map(([questionId, value]) => ({
        questionId,
        value: value // Keep the original value structure
      }))
    };

    if (existingResponse) {
      // Update existing response
      await api.patch(`/responses/${existingResponse.id}`, responseData);
    } else {
      // Create new response
      await createResponseMutation.mutateAsync(responseData);
    }
  };

  const handleSubmit = async () => {
    if (!form) return;

    // Validate required questions
    const requiredQuestions = form.questions.filter(q => q.required);
    const missingRequired = requiredQuestions.filter(q => !answers[q.id] || 
      (Array.isArray(answers[q.id]) && answers[q.id].length === 0));

    if (missingRequired.length > 0) {
      toast.error('Please answer all required questions');
      return;
    }

    setIsSubmitting(true);

    try {
      const responseData = {
        answers: Object.entries(answers).map(([questionId, value]) => ({
          questionId,
          value: value // Keep the original value structure
        }))
      };

      if (existingResponse) {
        // Update and submit existing response
        await api.patch(`/responses/${existingResponse.id}`, responseData);
        await submitResponseMutation.mutateAsync(existingResponse.id);
      } else {
        // Create and submit new response
        const response = await createResponseMutation.mutateAsync(responseData);
        await submitResponseMutation.mutateAsync(response.id);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderQuestion = (question: Question) => {
    const questionAnswer = answers[question.id] || '';

    switch (question.type) {
      case 'text':
        return (
          <input
            type="text"
            value={questionAnswer}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder="Enter your answer..."
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '12px',
              fontSize: '1rem',
              background: 'white',
              transition: 'all 0.2s ease',
              outline: 'none',
              fontFamily: 'inherit'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#667eea';
              e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#d1d5db';
              e.target.style.boxShadow = 'none';
            }}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={questionAnswer}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder="Enter your answer..."
            rows={4}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '12px',
              fontSize: '1rem',
              background: 'white',
              transition: 'all 0.2s ease',
              outline: 'none',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#667eea';
              e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#d1d5db';
              e.target.style.boxShadow = 'none';
            }}
          />
        );

      case 'radio':
      case 'single_choice':
        return (
          <div style={{ space: '0.75rem' }}>
            {question.options?.map((option, index) => (
              <label
                key={option.id || index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  background: questionAnswer === option.value ? '#f0f9ff' : 'white',
                  border: `1px solid ${questionAnswer === option.value ? '#667eea' : '#d1d5db'}`,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <input
                  type="radio"
                  name={question.id}
                  value={option.value}
                  checked={questionAnswer === option.value}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  style={{
                    width: '18px',
                    height: '18px',
                    accentColor: '#667eea'
                  }}
                />
                <span style={{
                  fontSize: '1rem',
                  color: '#374151',
                  fontWeight: questionAnswer === option.value ? '500' : '400'
                }}>
                  {option.text}
                </span>
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <div style={{ space: '0.75rem' }}>
            {question.options?.map((option, index) => (
              <label
                key={option.id || index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  background: (questionAnswer || []).includes(option.value) ? '#f0f9ff' : 'white',
                  border: `1px solid ${(questionAnswer || []).includes(option.value) ? '#667eea' : '#d1d5db'}`,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <input
                  type="checkbox"
                  value={option.value}
                  checked={(questionAnswer || []).includes(option.value)}
                  onChange={(e) => {
                    const currentAnswers = questionAnswer || [];
                    if (e.target.checked) {
                      handleAnswerChange(question.id, [...currentAnswers, option.value]);
                    } else {
                      handleAnswerChange(question.id, currentAnswers.filter((a: string) => a !== option.value));
                    }
                  }}
                  style={{
                    width: '18px',
                    height: '18px',
                    accentColor: '#667eea'
                  }}
                />
                <span style={{
                  fontSize: '1rem',
                  color: '#374151',
                  fontWeight: (questionAnswer || []).includes(option.value) ? '500' : '400'
                }}>
                  {option.text}
                </span>
              </label>
            ))}
          </div>
        );

      case 'select':
        return (
          <select
            value={questionAnswer}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '12px',
              fontSize: '1rem',
              background: 'white',
              cursor: 'pointer'
            }}
          >
            <option value="">Select an option...</option>
            {question.options?.map((option, index) => (
              <option key={option.id || index} value={option.value}>
                {option.text}
              </option>
            ))}
          </select>
        );

      case 'number':
        return (
          <input
            type="number"
            value={questionAnswer}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder="Enter a number..."
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '12px',
              fontSize: '1rem',
              background: 'white',
              transition: 'all 0.2s ease',
              outline: 'none',
              fontFamily: 'inherit'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#667eea';
              e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#d1d5db';
              e.target.style.boxShadow = 'none';
            }}
          />
        );

      case 'email':
        return (
          <input
            type="email"
            value={questionAnswer}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder="Enter your email..."
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '12px',
              fontSize: '1rem',
              background: 'white',
              transition: 'all 0.2s ease',
              outline: 'none',
              fontFamily: 'inherit'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#667eea';
              e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#d1d5db';
              e.target.style.boxShadow = 'none';
            }}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            value={questionAnswer}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '12px',
              fontSize: '1rem',
              background: 'white',
              cursor: 'pointer'
            }}
          />
        );

      default:
        return (
          <div style={{
            padding: '1rem',
            background: '#f3f4f6',
            borderRadius: '8px',
            color: '#6b7280',
            textAlign: 'center'
          }}>
            Unsupported question type: {question.type}
          </div>
        );
    }
  };

  if (!user) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          padding: '2rem',
          textAlign: 'center',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}>
          <h2 style={{ color: '#1f2937', marginBottom: '1rem' }}>Please log in</h2>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>You need to be logged in to take surveys.</p>
          <button
            onClick={() => router.push('/login')}
            style={{
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 24px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (formLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          padding: '2rem',
          textAlign: 'center',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f4f6',
            borderTop: '4px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }} />
          <p style={{ color: '#6b7280' }}>Loading survey...</p>
        </div>
      </div>
    );
  }

  if (formError || !form) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          padding: '2rem',
          textAlign: 'center',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}>
          <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ color: '#1f2937', marginBottom: '1rem' }}>Survey not found</h2>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
            This survey may not exist or may not be published yet.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 24px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (form.status !== 'published') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          padding: '2rem',
          textAlign: 'center',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}>
          <Clock size={48} color="#f59e0b" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ color: '#1f2937', marginBottom: '1rem' }}>Survey not available</h2>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
            This survey is not published yet.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 24px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
    }}>
      {/* Header */}
      <header style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '0 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '4rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => router.back()}
              style={{
                background: 'none',
                border: 'none',
                color: '#6b7280',
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <ArrowLeft size={20} />
            </button>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FileText size={24} color="white" />
            </div>
            <div>
              <h1 style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                color: '#1f2937',
                margin: 0
              }}>
                {form.title}
              </h1>
              <p style={{
                fontSize: '0.875rem',
                color: '#6b7280',
                margin: 0
              }}>
                Survey
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={handleSave}
              disabled={createResponseMutation.isPending}
              style={{
                background: 'white',
                color: '#667eea',
                border: '1px solid #d1d5db',
                borderRadius: '12px',
                padding: '0.75rem 1.5rem',
                cursor: createResponseMutation.isPending ? 'not-allowed' : 'pointer',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s ease',
                opacity: createResponseMutation.isPending ? 0.7 : 1
              }}
            >
              {createResponseMutation.isPending && (
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid transparent',
                  borderTop: '2px solid #667eea',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
              )}
              <Save size={20} />
              {createResponseMutation.isPending ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || submitResponseMutation.isPending}
              style={{
                background: isSubmitting || submitResponseMutation.isPending
                  ? '#9ca3af' 
                  : 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '0.75rem 1.5rem',
                cursor: isSubmitting || submitResponseMutation.isPending ? 'not-allowed' : 'pointer',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s ease',
                opacity: isSubmitting || submitResponseMutation.isPending ? 0.7 : 1
              }}
            >
              {(isSubmitting || submitResponseMutation.isPending) && (
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid transparent',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
              )}
              <Send size={20} />
              {isSubmitting || submitResponseMutation.isPending ? 'Submitting...' : 'Submit Survey'}
            </button>
          </div>
        </div>
      </header>

      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '2rem 1.5rem'
      }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            overflow: 'hidden'
          }}
        >
          {/* Form Header */}
          <div style={{
            padding: '2rem',
            borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
            background: 'rgba(248, 250, 252, 0.5)'
          }}>
            <h2 style={{
              fontSize: '1.875rem',
              fontWeight: '700',
              color: '#1f2937',
              marginBottom: '1rem'
            }}>
              {form.title}
            </h2>
            {form.description && (
              <p style={{
                fontSize: '1.125rem',
                color: '#6b7280',
                lineHeight: '1.6',
                margin: 0
              }}>
                {form.description}
              </p>
            )}
          </div>

          {/* Questions */}
          <div style={{ padding: '2rem' }}>
            {form.questions?.length > 0 ? (
              <div style={{ space: '2rem' }}>
                {form.questions
                  .sort((a, b) => a.order - b.order)
                  .map((question, index) => (
                    <motion.div
                      key={question.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      style={{
                        background: 'rgba(248, 250, 252, 0.5)',
                        border: '1px solid rgba(226, 232, 240, 0.8)',
                        borderRadius: '16px',
                        padding: '1.5rem',
                        marginBottom: '1.5rem'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '1rem',
                        marginBottom: '1rem'
                      }}>
                        <div style={{
                          background: '#667eea',
                          color: 'white',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '8px',
                          minWidth: '40px',
                          textAlign: 'center'
                        }}>
                          {index + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          <h3 style={{
                            fontSize: '1.125rem',
                            fontWeight: '600',
                            color: '#1f2937',
                            marginBottom: '0.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}>
                            {question.text}
                            {question.required && (
                              <span style={{
                                color: '#ef4444',
                                fontSize: '1rem'
                              }}>
                                *
                              </span>
                            )}
                          </h3>
                          <p style={{
                            fontSize: '0.875rem',
                            color: '#6b7280',
                            margin: 0,
                            textTransform: 'capitalize'
                          }}>
                            {question.type.replace('_', ' ')} question
                          </p>
                        </div>
                      </div>
                      
                      {/* Trader Performance Data */}
                      {question.config?.traderPerformance && (
                        <div style={{
                          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                          border: '1px solid #e2e8f0',
                          borderRadius: '16px',
                          padding: '1.5rem',
                          marginBottom: '1.5rem',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.75rem',
                            marginBottom: '1.5rem'
                          }}>
                            <div style={{
                              width: '40px',
                              height: '40px',
                              background: 'linear-gradient(135deg, #667eea, #764ba2)',
                              borderRadius: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 4px 8px rgba(102, 126, 234, 0.3)'
                            }}>
                              <span style={{ color: 'white', fontSize: '1rem' }}>📊</span>
                            </div>
                            <h4 style={{
                              fontSize: '1.1rem',
                              fontWeight: '700',
                              color: '#1e293b',
                              margin: 0
                            }}>
                              Monthly Returns (12 months)
                            </h4>
                          </div>
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', 
                            gap: '0.75rem', 
                            fontSize: '0.8rem',
                            marginBottom: '1.5rem'
                          }}>
                            {question.config.traderPerformance.monthlyReturns.map((returnValue, monthIndex) => (
                              <div key={monthIndex} style={{
                                textAlign: 'center',
                                padding: '1rem 0.75rem',
                                background: 'white',
                                color: '#374151',
                                borderRadius: '12px',
                                fontWeight: '500',
                                border: '1px solid #e5e7eb',
                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                                transition: 'all 0.2s ease',
                                cursor: 'default'
                              }}>
                                <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '600' }}>
                                  M{monthIndex + 1}
                                </div>
                                <div style={{ 
                                  fontSize: '0.9rem',
                                  fontWeight: '700',
                                  color: '#1e293b',
                                  marginBottom: '0.25rem'
                                }}>
                                  {returnValue > 0 ? '+' : ''}{returnValue.toFixed(2)}%
                                </div>
                                <div style={{ 
                                  fontSize: '0.7rem',
                                  fontWeight: '600',
                                  color: '#6b7280'
                                }}>
                                  ₹{((returnValue / 100) * (question.config.traderPerformance.capital || 0)).toFixed(2)} Cr
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {/* Trader Stats */}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                            gap: '1rem'
                          }}>
                            <div style={{
                              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                              border: '1px solid #bae6fd',
                              borderRadius: '12px',
                              padding: '1rem',
                              textAlign: 'center',
                              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                            }}>
                              <div style={{ fontSize: '0.75rem', color: '#0369a1', fontWeight: '600', marginBottom: '0.25rem' }}>
                                Trader Name
                              </div>
                              <div style={{ fontSize: '1rem', fontWeight: '700', color: '#0c4a6e' }}>
                                {question.config.traderPerformance.traderName}
                              </div>
                            </div>
                            <div style={{
                              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                              border: '1px solid #bbf7d0',
                              borderRadius: '12px',
                              padding: '1rem',
                              textAlign: 'center',
                              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                            }}>
                              <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: '600', marginBottom: '0.25rem' }}>
                                Capital
                              </div>
                              <div style={{ fontSize: '1rem', fontWeight: '700', color: '#14532d' }}>
                                ₹{question.config.traderPerformance.capital} Cr
                              </div>
                            </div>
                            <div style={{
                              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                              border: '1px solid #fbbf24',
                              borderRadius: '12px',
                              padding: '1rem',
                              textAlign: 'center',
                              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                            }}>
                              <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: '600', marginBottom: '0.25rem' }}>
                                Mean Return
                              </div>
                              <div style={{ fontSize: '1rem', fontWeight: '700', color: '#92400e' }}>
                                {question.config.traderPerformance.mean >= 0 ? '+' : ''}{question.config.traderPerformance.mean}%
                              </div>
                            </div>
                            <div style={{
                              background: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)',
                              border: '1px solid #c4b5fd',
                              borderRadius: '12px',
                              padding: '1rem',
                              textAlign: 'center',
                              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                            }}>
                              <div style={{ fontSize: '0.75rem', color: '#7c3aed', fontWeight: '600', marginBottom: '0.25rem' }}>
                                Std Deviation
                              </div>
                              <div style={{ fontSize: '1rem', fontWeight: '700', color: '#5b21b6' }}>
                                {question.config.traderPerformance.stdDev}%
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {renderQuestion(question)}
                    </motion.div>
                  ))}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '3rem 1rem',
                color: '#6b7280'
              }}>
                <FileText size={48} color="#d1d5db" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  No questions available
                </h3>
                <p>This survey doesn't have any questions yet.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default SurveyPage;
