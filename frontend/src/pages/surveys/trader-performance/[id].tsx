import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Save, 
  Send, 
  CheckCircle,
  Clock,
  TrendingUp,
  DollarSign,
  BarChart,
  Star,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { calculateMoneyReturns, formatMoney } from '../../../../data/traderPerformanceData';

interface TraderQuestion {
  id: string;
  traderName: string;
  monthlyReturns: number[];
  capital: number;
  mean: number;
  stdDev: number;
  description: string;
  order: number;
}

interface Form {
  id: string;
  title: string;
  description: string;
  status: string;
  questions: TraderQuestion[];
  createdAt: string;
  updatedAt: string;
}

const TraderPerformanceSurveyPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch form data
  const { data: form, isLoading: formLoading, error: formError } = useQuery({
    queryKey: ['form', id],
    queryFn: async () => {
      const response = await api.get(`/forms/${id}`);
      return response.data;
    },
    enabled: !!id && !!user,
  });

  // Check if user already has a response
  const { data: existingResponse } = useQuery({
    queryKey: ['response', id, user?.id],
    queryFn: async () => {
      const response = await api.get(`/responses/my-responses`);
      return response.data.find((r: any) => r.formId === id);
    },
    enabled: !!id && !!user,
  });

  // Create/Update response mutation
  const createResponseMutation = useMutation({
    mutationFn: async (responseData: any) => {
      const response = await api.post(`/responses/forms/${id}`, responseData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['response', id, user?.id] });
      toast.success('Response saved successfully!');
    },
    onError: (error: any) => {
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

  const handleRatingChange = (questionId: string, rating: number) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: rating
    }));
  };

  const handleSave = async () => {
    if (!form) return;

    const responseData = {
      answers: Object.entries(answers).map(([questionId, rating]) => ({
        questionId,
        value: [rating.toString()]
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

    // Validate that all questions are answered
    const unansweredQuestions = form.questions.filter(q => !answers[q.id]);
    if (unansweredQuestions.length > 0) {
      toast.error('Please rate all traders before submitting');
      return;
    }

    setIsSubmitting(true);

    try {
      const responseData = {
        answers: Object.entries(answers).map(([questionId, rating]) => ({
          questionId,
          value: [rating.toString()]
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

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const getRatingColor = (rating: number) => {
    if (rating >= 8) return '#10b981';
    if (rating >= 6) return '#f59e0b';
    if (rating >= 4) return '#f97316';
    return '#ef4444';
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
          maxWidth: '1200px',
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
              <BarChart size={24} color="white" />
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
                Trader Performance Evaluation
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
        maxWidth: '1200px',
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

          {/* Progress Indicator */}
          <div style={{
            padding: '1rem 2rem',
            borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
            background: 'rgba(248, 250, 252, 0.3)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.5rem'
            }}>
              <span style={{
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151'
              }}>
                Progress: {Object.keys(answers).length} / {form.questions?.length || 0} completed
              </span>
              <span style={{
                fontSize: '0.875rem',
                color: '#6b7280'
              }}>
                {Math.round((Object.keys(answers).length / (form.questions?.length || 1)) * 100)}%
              </span>
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              background: '#e5e7eb',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${(Object.keys(answers).length / (form.questions?.length || 1)) * 100}%`,
                height: '100%',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>

          {/* Questions */}
          <div style={{ padding: '2rem' }}>
            {form.questions?.length > 0 ? (
              <div style={{ space: '2rem' }}>
                {form.questions
                  .sort((a, b) => a.order - b.order)
                  .map((trader, index) => {
                    const moneyReturns = calculateMoneyReturns(trader.monthlyReturns, trader.capital);
                    const currentRating = answers[trader.id];
                    
                    return (
                      <motion.div
                        key={trader.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        style={{
                          background: 'rgba(248, 250, 252, 0.5)',
                          border: '1px solid rgba(226, 232, 240, 0.8)',
                          borderRadius: '16px',
                          padding: '1.5rem',
                          marginBottom: '1.5rem',
                          position: 'relative'
                        }}
                      >
                        {/* Question Header */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '1rem',
                          marginBottom: '1.5rem'
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
                              margin: '0 0 0.25rem 0'
                            }}>
                              Rate the performance of {trader.traderName}
                            </h3>
                            <p style={{
                              fontSize: '0.875rem',
                              color: '#6b7280',
                              margin: 0
                            }}>
                              {trader.description}
                            </p>
                          </div>
                          {currentRating && (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              background: getRatingColor(currentRating),
                              color: 'white',
                              padding: '0.5rem 1rem',
                              borderRadius: '20px',
                              fontSize: '0.875rem',
                              fontWeight: '500'
                            }}>
                              <Star size={16} />
                              {currentRating}/10
                            </div>
                          )}
                        </div>

                        {/* Performance Data Display */}
                        <div style={{
                          background: 'white',
                          borderRadius: '12px',
                          padding: '1.5rem',
                          border: '1px solid rgba(226, 232, 240, 0.8)',
                          marginBottom: '1.5rem'
                        }}>
                          {/* Monthly Returns Chart */}
                          <div style={{ marginBottom: '1.5rem' }}>
                            <h5 style={{
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              color: '#374151',
                              marginBottom: '1rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem'
                            }}>
                              <TrendingUp size={16} />
                              12-Month Returns
                            </h5>
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(12, 1fr)',
                              gap: '0.5rem',
                              marginBottom: '1rem'
                            }}>
                              {months.map((month, monthIndex) => (
                                <div key={month} style={{ textAlign: 'center' }}>
                                  <div style={{
                                    fontSize: '0.75rem',
                                    fontWeight: '500',
                                    color: '#6b7280',
                                    marginBottom: '0.25rem'
                                  }}>
                                    {month}
                                  </div>
                                  <div style={{
                                    background: trader.monthlyReturns[monthIndex] >= 0 ? '#dcfce7' : '#fef2f2',
                                    color: trader.monthlyReturns[monthIndex] >= 0 ? '#166534' : '#dc2626',
                                    padding: '0.5rem 0.25rem',
                                    borderRadius: '6px',
                                    fontSize: '0.75rem',
                                    fontWeight: '500',
                                    marginBottom: '0.25rem'
                                  }}>
                                    {trader.monthlyReturns[monthIndex] >= 0 ? '+' : ''}{trader.monthlyReturns[monthIndex].toFixed(1)}%
                                  </div>
                                  <div style={{
                                    fontSize: '0.625rem',
                                    color: '#6b7280'
                                  }}>
                                    {formatMoney(moneyReturns[monthIndex])}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Statistics */}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                            gap: '1rem'
                          }}>
                            <div style={{
                              background: '#f0f9ff',
                              padding: '1rem',
                              borderRadius: '8px',
                              textAlign: 'center'
                            }}>
                              <div style={{
                                fontSize: '0.75rem',
                                fontWeight: '500',
                                color: '#0369a1',
                                marginBottom: '0.25rem'
                              }}>
                                Mean Return
                              </div>
                              <div style={{
                                fontSize: '1.25rem',
                                fontWeight: '700',
                                color: '#1f2937'
                              }}>
                                {trader.mean >= 0 ? '+' : ''}{trader.mean.toFixed(2)}%
                              </div>
                            </div>
                            <div style={{
                              background: '#fef3c7',
                              padding: '1rem',
                              borderRadius: '8px',
                              textAlign: 'center'
                            }}>
                              <div style={{
                                fontSize: '0.75rem',
                                fontWeight: '500',
                                color: '#d97706',
                                marginBottom: '0.25rem'
                              }}>
                                Std Deviation
                              </div>
                              <div style={{
                                fontSize: '1.25rem',
                                fontWeight: '700',
                                color: '#1f2937'
                              }}>
                                {trader.stdDev.toFixed(2)}%
                              </div>
                            </div>
                            <div style={{
                              background: '#f0fdf4',
                              padding: '1rem',
                              borderRadius: '8px',
                              textAlign: 'center'
                            }}>
                              <div style={{
                                fontSize: '0.75rem',
                                fontWeight: '500',
                                color: '#059669',
                                marginBottom: '0.25rem'
                              }}>
                                Total Capital
                              </div>
                              <div style={{
                                fontSize: '1.25rem',
                                fontWeight: '700',
                                color: '#1f2937'
                              }}>
                                ₹{trader.capital} Cr
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Monthly Returns */}
                        <div style={{
                          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                          border: '1px solid #e2e8f0',
                          borderRadius: '16px',
                          padding: '1.5rem',
                          marginTop: '1.5rem',
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
                            <h3 style={{
                              fontSize: '1.1rem',
                              fontWeight: '700',
                              color: '#1e293b',
                              margin: 0
                            }}>
                              Monthly Returns (12 months)
                            </h3>
                          </div>
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(6, 1fr)', 
                            gap: '0.75rem', 
                            fontSize: '0.8rem'
                          }}>
                            {trader.monthlyReturns.map((returnValue, monthIndex) => (
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
                                <div style={{ 
                                  fontSize: '0.7rem', 
                                  color: '#64748b',
                                  marginBottom: '0.5rem',
                                  fontWeight: '600'
                                }}>
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
                                  ₹{((returnValue / 100) * (trader.capital || 0)).toFixed(2)} Cr
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Rating Scale */}
                        <div style={{
                          background: 'rgba(102, 126, 234, 0.05)',
                          border: '1px solid rgba(102, 126, 234, 0.2)',
                          borderRadius: '12px',
                          padding: '1rem',
                          textAlign: 'center'
                        }}>
                          <div style={{
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            color: '#667eea',
                            marginBottom: '1rem'
                          }}>
                            Rate this trader's performance on a scale of 1-10
                          </div>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            flexWrap: 'wrap'
                          }}>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                              <button
                                key={rating}
                                onClick={() => handleRatingChange(trader.id, rating)}
                                style={{
                                  width: '40px',
                                  height: '40px',
                                  borderRadius: '50%',
                                  background: currentRating === rating ? '#667eea' : 'white',
                                  border: currentRating === rating ? '2px solid #667eea' : '2px solid #d1d5db',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.875rem',
                                  fontWeight: '500',
                                  color: currentRating === rating ? 'white' : '#6b7280',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                  if (currentRating !== rating) {
                                    e.currentTarget.style.borderColor = '#667eea';
                                    e.currentTarget.style.color = '#667eea';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (currentRating !== rating) {
                                    e.currentTarget.style.borderColor = '#d1d5db';
                                    e.currentTarget.style.color = '#6b7280';
                                  }
                                }}
                              >
                                {rating}
                              </button>
                            ))}
                          </div>
                          <div style={{
                            fontSize: '0.75rem',
                            color: '#6b7280',
                            marginTop: '0.75rem'
                          }}>
                            1 = Poor • 5 = Average • 10 = Excellent
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '3rem 1rem',
                color: '#6b7280'
              }}>
                <BarChart size={48} color="#d1d5db" style={{ margin: '0 auto 1rem' }} />
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

export default TraderPerformanceSurveyPage;
