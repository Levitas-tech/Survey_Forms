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
  const [currentPage, setCurrentPage] = useState(0);
  const questionsPerPage = 1;

  // Add responsive styles
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @media (max-width: 768px) {
        .survey-container {
          padding: 0.5rem !important;
        }
        .survey-card {
          margin: 0.5rem !important;
          border-radius: 12px !important;
        }
        .monthly-returns-grid {
          grid-template-columns: repeat(3, 1fr) !important;
          gap: 0.25rem !important;
        }
        .monthly-returns-item {
          padding: 0.25rem 0.125rem !important;
          font-size: 0.6rem !important;
        }
        .trader-stats-grid {
          grid-template-columns: repeat(2, 1fr) !important;
          gap: 0.5rem !important;
        }
        .trader-stats-item {
          padding: 0.5rem !important;
          font-size: 0.75rem !important;
        }
        .question-title {
          font-size: 1rem !important;
          line-height: 1.3 !important;
        }
        .rating-input {
          width: 100% !important;
          padding: 0.75rem !important;
          font-size: 1rem !important;
        }
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);


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

  // Pagination logic
  const totalPages = form?.questions?.length || 0;
  const currentQuestion = form?.questions?.sort((a: any, b: any) => a.order - b.order)[currentPage];
  const isFirstPage = currentPage === 0;
  const isLastPage = currentPage === totalPages - 1;

  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const goToPage = (page: number) => {
    if (page >= 0 && page < totalPages) {
      setCurrentPage(page);
    }
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
    const requiredQuestions = form.questions.filter((q: any) => q.required);
    const missingRequired = requiredQuestions.filter((q: any) => !answers[q.id] || 
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
          <div style={{ gap: '0.75rem', display: 'flex', flexDirection: 'column' }}>
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
          <div style={{ gap: '0.75rem', display: 'flex', flexDirection: 'column' }}>
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
              {form.description && (
                <p style={{
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  margin: 0,
                  lineHeight: '1.3'
                }}>
                  {form.description}
                </p>
              )}
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Only show Save Draft button on last page */}
            {isLastPage && (
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
            )}
          </div>
        </div>
      </header>

      <div className="survey-container" style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '1rem'
      }}>
        <motion.div
          className="survey-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            overflow: 'hidden',
            maxHeight: 'calc(100vh - 2rem)',
            display: 'flex',
            flexDirection: 'column'
          }}
        >

          {/* Questions */}
          <div style={{ 
            padding: '0.5rem', 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column',
            overflow: 'auto'
          }}>
            {form.questions?.length > 0 ? (
              <div style={{ 
                gap: '1rem', 
                display: 'flex', 
                flexDirection: 'column',
                flex: 1
              }}>
                {/* Current Question */}
                {currentQuestion && (
                    <motion.div
                      key={currentQuestion.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      style={{
                        background: 'rgba(248, 250, 252, 0.5)',
                        border: '1px solid rgba(226, 232, 240, 0.8)',
                        borderRadius: '12px',
                        padding: '1rem',
                        marginBottom: '0.5rem'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.75rem',
                        marginBottom: '0.75rem'
                      }}>
                        <div style={{
                          background: '#667eea',
                          color: 'white',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          padding: '0.4rem 0.6rem',
                          borderRadius: '6px',
                          minWidth: '32px',
                          textAlign: 'center'
                        }}>
                          {currentPage + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          <h3 style={{
                            fontSize: '1rem',
                            fontWeight: '600',
                            color: '#1f2937',
                            marginBottom: '0.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            lineHeight: '1.3'
                          }}>
                            {currentQuestion.text}
                            {currentQuestion.required && (
                              <span style={{
                                color: '#ef4444',
                                fontSize: '0.9rem'
                              }}>
                                *
                              </span>
                            )}
                          </h3>
                          <p style={{
                            fontSize: '0.75rem',
                            color: '#6b7280',
                            margin: 0,
                            textTransform: 'capitalize'
                          }}>
                            {currentQuestion.type.replace('_', ' ')} question
                          </p>
                        </div>
                      </div>
                      
                      {/* Trader Performance Data */}
                      {currentQuestion.config?.traderPerformance && (
                        <div style={{
                          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          padding: '1rem',
                          marginBottom: '1rem',
                          boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.1)'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            marginBottom: '1rem'
                          }}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              background: 'linear-gradient(135deg, #667eea, #764ba2)',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 2px 4px rgba(102, 126, 234, 0.3)'
                            }}>
                              <span style={{ color: 'white', fontSize: '0.8rem' }}>📊</span>
                            </div>
                            <h4 className="question-title" style={{
                              fontSize: '0.9rem',
                              fontWeight: '700',
                              color: '#1e293b',
                              margin: 0
                            }}>
                              Monthly Returns (12 months)
                            </h4>
                          </div>
                          <div className="monthly-returns-grid" style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(6, 1fr)', 
                            gap: '0.3rem', 
                            fontSize: '0.65rem',
                            marginBottom: '0.75rem'
                          }}>
                            {currentQuestion.config.traderPerformance.monthlyReturns.map((returnValue: number, monthIndex: number) => (
                              <div key={monthIndex} className="monthly-returns-item" style={{
                                textAlign: 'center',
                                padding: '0.4rem 0.2rem',
                                background: 'white',
                                color: '#374151',
                                borderRadius: '4px',
                                fontWeight: '500',
                                border: '1px solid #e5e7eb',
                                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                                transition: 'all 0.2s ease',
                                cursor: 'default'
                              }}>
                                <div style={{ fontSize: '0.55rem', color: '#64748b', marginBottom: '0.15rem', fontWeight: '600' }}>
                                  M{monthIndex + 1}
                                </div>
                                <div style={{ 
                                  fontSize: '0.7rem',
                                  fontWeight: '700',
                                  color: '#1e293b',
                                  marginBottom: '0.1rem'
                                }}>
                                  {returnValue > 0 ? '+' : ''}{returnValue.toFixed(1)}%
                                </div>
                                <div style={{ 
                                  fontSize: '0.55rem',
                                  fontWeight: '600',
                                  color: '#6b7280'
                                }}>
                                  ₹{(returnValue * 5).toFixed(1)} L
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {/* Trader Stats */}
                          <div className="trader-stats-grid" style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '0.5rem',
                            marginBottom: '0.5rem'
                          }}>
                            <div className="trader-stats-item" style={{
                              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                              border: '1px solid #bae6fd',
                              borderRadius: '6px',
                              padding: '0.5rem',
                              textAlign: 'center',
                              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                            }}>
                              <div style={{ fontSize: '0.6rem', color: '#0369a1', fontWeight: '600', marginBottom: '0.1rem' }}>
                                Trader Name
                              </div>
                              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#0c4a6e' }}>
                                {currentQuestion.config.traderPerformance.traderName}
                              </div>
                            </div>
                            <div style={{
                              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                              border: '1px solid #bbf7d0',
                              borderRadius: '6px',
                              padding: '0.5rem',
                              textAlign: 'center',
                              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                            }}>
                              <div style={{ fontSize: '0.6rem', color: '#166534', fontWeight: '600', marginBottom: '0.1rem' }}>
                                Capital
                              </div>
                              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#14532d' }}>
                                ₹{currentQuestion.config.traderPerformance.capital} Cr
                              </div>
                            </div>
                            <div style={{
                              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                              border: '1px solid #fbbf24',
                              borderRadius: '6px',
                              padding: '0.5rem',
                              textAlign: 'center',
                              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                            }}>
                              <div style={{ fontSize: '0.6rem', color: '#d97706', fontWeight: '600', marginBottom: '0.1rem' }}>
                                Annual Return
                              </div>
                              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#92400e' }}>
                                {currentQuestion.config.traderPerformance.mean >= 0 ? '+' : ''}{currentQuestion.config.traderPerformance.mean}%
                              </div>
                            </div>
                            <div style={{
                              background: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)',
                              border: '1px solid #c4b5fd',
                              borderRadius: '6px',
                              padding: '0.5rem',
                              textAlign: 'center',
                              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                            }}>
                              <div style={{ fontSize: '0.6rem', color: '#7c3aed', fontWeight: '600', marginBottom: '0.1rem' }}>
                                Std Deviation
                              </div>
                              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#5b21b6' }}>
                                {currentQuestion.config.traderPerformance.stdDev}%
                              </div>
                            </div>
                          </div>
                          
                          {/* Max Drawdown Card */}
                          <div style={{
                            display: 'flex',
                            justifyContent: 'center'
                          }}>
                            <div style={{
                              background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                              border: '1px solid #fca5a5',
                              borderRadius: '6px',
                              padding: '0.5rem',
                              textAlign: 'center',
                              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                              width: '100%',
                              maxWidth: '200px'
                            }}>
                              <div style={{ fontSize: '0.6rem', color: '#dc2626', fontWeight: '600', marginBottom: '0.1rem' }}>
                                Max Drawdown
                              </div>
                              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#991b1b' }}>
                                {currentQuestion.config.traderPerformance.maxDrawdown || '0.00'}%
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Question Input - Special handling for trader performance */}
                      {currentQuestion.config?.traderPerformance ? (
                        <div style={{
                          background: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '0.75rem',
                          marginTop: '0.75rem'
                        }}>
                          <label style={{
                            display: 'block',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            color: '#374151',
                            marginBottom: '0.4rem'
                          }}>
                            Rate this trader's performance (1-10):
                          </label>
                          <input
                            className="rating-input"
                            type="number"
                            min="1"
                            max="10"
                            value={answers[currentQuestion.id] || ''}
                            onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                            placeholder="Enter rating from 1 to 10..."
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontSize: '0.9rem',
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
                          <p style={{
                            fontSize: '0.7rem',
                            color: '#6b7280',
                            margin: '0.4rem 0 0 0'
                          }}>
                            Rate from 1 (poor performance) to 10 (excellent performance)
                          </p>
                        </div>
                      ) : (
                        renderQuestion(currentQuestion)
                      )}
                    </motion.div>
                )}

                {/* Pagination Controls */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  padding: '1rem',
                  background: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: '12px',
                  marginTop: '0.5rem',
                  position: 'sticky',
                  bottom: '0',
                  zIndex: 10
                }}>
                  {/* Page Indicators */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    alignItems: 'center'
                  }}>
                    {Array.from({ length: totalPages }, (_, index) => (
                      <button
                        key={index}
                        onClick={() => goToPage(index)}
                        style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          border: 'none',
                          background: index === currentPage ? '#667eea' : '#d1d5db',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      />
                    ))}
                  </div>

                  {/* Navigation Buttons */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}>
                    <button
                      onClick={goToPreviousPage}
                      disabled={isFirstPage}
                      style={{
                        background: isFirstPage ? '#f3f4f6' : 'linear-gradient(135deg, #667eea, #764ba2)',
                        color: isFirstPage ? '#9ca3af' : 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0.6rem 1rem',
                        cursor: isFirstPage ? 'not-allowed' : 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        transition: 'all 0.2s ease',
                        flex: 1
                      }}
                    >
                      ← Previous
                    </button>

                    <button
                      onClick={isLastPage ? handleSubmit : goToNextPage}
                      disabled={isLastPage ? (isSubmitting || submitResponseMutation.isPending) : false}
                      style={{
                        background: isLastPage 
                          ? (isSubmitting || submitResponseMutation.isPending)
                            ? '#9ca3af'
                            : 'linear-gradient(135deg, #667eea, #764ba2)'
                          : 'linear-gradient(135deg, #667eea, #764ba2)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0.6rem 1rem',
                        cursor: (isLastPage && (isSubmitting || submitResponseMutation.isPending)) ? 'not-allowed' : 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        transition: 'all 0.2s ease',
                        flex: 1,
                        opacity: (isLastPage && (isSubmitting || submitResponseMutation.isPending)) ? 0.7 : 1
                      }}
                    >
                      {(isLastPage && (isSubmitting || submitResponseMutation.isPending)) && (
                        <div style={{
                          width: '12px',
                          height: '12px',
                          border: '2px solid transparent',
                          borderTop: '2px solid white',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }} />
                      )}
                      {isLastPage ? (
                        isSubmitting || submitResponseMutation.isPending ? 'Submitting...' : 'Submit Survey'
                      ) : (
                        'Next →'
                      )}
                    </button>
                  </div>
                </div>
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
