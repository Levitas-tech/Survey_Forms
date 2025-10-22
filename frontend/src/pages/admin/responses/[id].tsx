import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Download, 
  User,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  BarChart,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../services/api';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { formatDate } from '../../../lib/utils';

interface Answer {
  id: string;
  questionId: string;
  value: any;
  score?: number;
  files?: string[];
  question: {
    id: string;
    text: string;
    type: string;
    required: boolean;
    options?: Array<{
      id: string;
      text: string;
      value: string;
    }>;
    config?: {
      traderPerformance?: {
        traderName: string;
        monthlyReturns: number[];
        capital: number;
        mean: number;
        stdDev: number;
        maxDrawdown?: number;
      };
    };
  };
}

interface Response {
  id: string;
  formId: string;
  userId: string;
  status: string;
  startedAt: string;
  submittedAt?: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  form: {
    id: string;
    title: string;
    description: string;
  };
  answers: Answer[];
}

export default function ResponseViewPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, loading: authLoading } = useAuth();
  const [isExporting, setIsExporting] = useState(false);


  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!authLoading && (!user || (user.role !== 'admin' && user.role !== 'super_admin'))) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Fetch response data
  const { data: response, isLoading, error } = useQuery({
    queryKey: ['response', id],
    queryFn: async () => {
      try {
        const response = await api.get(`/responses/${id}`);
        console.log('Fetched response data:', response.data);
        return response.data || null;
      } catch (error) {
        console.error('Error fetching response:', error);
        throw error;
      }
    },
    enabled: !!id && !!user,
  });

  const handleExport = async () => {
    if (!response) return;
    
    setIsExporting(true);
    try {
      // Create a simple text export
      const exportData = {
        form: response.form.title,
        user: response.user.name,
        email: response.user.email,
        status: response.status,
        startedAt: response.startedAt,
        submittedAt: response.submittedAt,
        answers: response.answers.map((answer: any) => ({
          question: answer.question.text,
          type: answer.question.type,
          value: answer.value,
          score: answer.score
        }))
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `response-${response.id}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const renderAnswerValue = (answer: Answer) => {
    const { value, question } = answer;
    
    console.log('Rendering answer:', {
      questionId: answer.questionId,
      questionText: question.text,
      questionType: question.type,
      value: value,
      options: question.options
    });
    
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    
    if (question.type === 'single_choice' || question.type === 'radio') {
      const option = question.options?.find(opt => opt.value === value);
      return option ? option.text : value;
    }
    
    if (question.type === 'multiple_choice' || question.type === 'checkbox') {
      if (Array.isArray(value)) {
        return value.map(v => {
          const option = question.options?.find(opt => opt.value === v);
          return option ? option.text : v;
        }).join(', ');
      }
    }
    
    return value || 'No answer provided';
  };

  if (authLoading || isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !response) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '12px',
          textAlign: 'center',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
        }}>
          <AlertCircle size={48} color="#ef4444" style={{ marginBottom: '1rem' }} />
          <h2 style={{ color: '#1f2937', marginBottom: '0.5rem' }}>Response Not Found</h2>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
            The response you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <button
            onClick={() => router.push('/admin/results')}
            style={{
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '0.75rem 1.5rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            Back to Results
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            padding: '2rem',
            marginBottom: '2rem',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                onClick={() => router.push('/admin/results')}
                style={{
                  background: 'linear-gradient(135deg, #f3f4f6, #e5e7eb)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                <ArrowLeft size={20} color="#374151" />
              </button>
              <div>
                <h1 style={{
                  fontSize: '1.875rem',
                  fontWeight: '700',
                  color: '#1f2937',
                  margin: 0,
                  background: 'linear-gradient(135deg, #1f2937, #374151)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  Response Details
                </h1>
                <p style={{
                  fontSize: '1rem',
                  color: '#6b7280',
                  margin: '0.25rem 0 0 0'
                }}>
                  {response.form.title}
                </p>
              </div>
            </div>
            <button
              onClick={handleExport}
              disabled={isExporting}
              style={{
                background: isExporting 
                  ? '#9ca3af' 
                  : 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '0.75rem 1.5rem',
                cursor: isExporting ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s ease'
              }}
            >
              <Download size={16} />
              {isExporting ? 'Exporting...' : 'Export'}
            </button>
          </div>

          {/* Response Info Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
              border: '1px solid #bae6fd',
              borderRadius: '12px',
              padding: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <User size={24} color="white" />
              </div>
              <div>
                <h3 style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  color: '#0c4a6e',
                  margin: '0 0 0.25rem 0'
                }}>
                  {response.user.name}
                </h3>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#0369a1',
                  margin: 0
                }}>
                  {response.user.email}
                </p>
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
              border: '1px solid #bbf7d0',
              borderRadius: '12px',
              padding: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {response.status === 'submitted' ? (
                  <CheckCircle size={24} color="white" />
                ) : (
                  <Clock size={24} color="white" />
                )}
              </div>
              <div>
                <h3 style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  color: '#14532d',
                  margin: '0 0 0.25rem 0'
                }}>
                  {response.status === 'submitted' ? 'Submitted' : 'In Progress'}
                </h3>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#166534',
                  margin: 0
                }}>
                  {response.submittedAt ? formatDate(response.submittedAt) : 'Not submitted'}
                </p>
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              border: '1px solid #fbbf24',
              borderRadius: '12px',
              padding: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Calendar size={24} color="white" />
              </div>
              <div>
                <h3 style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  color: '#92400e',
                  margin: '0 0 0.25rem 0'
                }}>
                  Started
                </h3>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#d97706',
                  margin: 0
                }}>
                  {formatDate(response.startedAt)}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Answers Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            padding: '2rem',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '2rem'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FileText size={20} color="white" />
            </div>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#1f2937',
              margin: 0
            }}>
              Responses ({response.answers.length})
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {response.answers.map((answer: any, index: number) => (
              <motion.div
                key={answer.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Question Number Badge */}
                <div style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  color: 'white',
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.875rem',
                  fontWeight: '700',
                  boxShadow: '0 2px 4px rgba(102, 126, 234, 0.3)'
                }}>
                  {index + 1}
                </div>

                {/* Question Text */}
                <h3 style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  color: '#1e293b',
                  margin: '0 0 1rem 0',
                  paddingRight: '3rem'
                }}>
                  {answer.question.text}
                </h3>

                {/* Trader Performance Data */}
                {answer.question.config?.traderPerformance && (
                  <div style={{
                    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '1rem',
                    marginBottom: '1rem'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
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
                        justifyContent: 'center'
                      }}>
                        <BarChart size={16} color="white" />
                      </div>
                      <h4 style={{
                        fontSize: '1rem',
                        fontWeight: '600',
                        color: '#1e293b',
                        margin: 0
                      }}>
                        Trader Performance Data
                      </h4>
                    </div>
                    
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                      gap: '0.75rem',
                      marginBottom: '1rem'
                    }}>
                      <div style={{
                        background: 'white',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        textAlign: 'center',
                        border: '1px solid #e5e7eb'
                      }}>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>
                          Trader
                        </div>
                        <div style={{ fontSize: '0.875rem', fontWeight: '700', color: '#1f293b' }}>
                          {answer.question.config.traderPerformance.traderName}
                        </div>
                      </div>
                      <div style={{
                        background: 'white',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        textAlign: 'center',
                        border: '1px solid #e5e7eb'
                      }}>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>
                          Capital
                        </div>
                        <div style={{ fontSize: '0.875rem', fontWeight: '700', color: '#1f293b' }}>
                          ₹{answer.question.config.traderPerformance.capital} Cr
                        </div>
                      </div>
                      <div style={{
                        background: 'white',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        textAlign: 'center',
                        border: '1px solid #e5e7eb'
                      }}>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>
                          Mean
                        </div>
                        <div style={{ fontSize: '0.875rem', fontWeight: '700', color: '#1f293b' }}>
                          {answer.question.config.traderPerformance.mean >= 0 ? '+' : ''}{answer.question.config.traderPerformance.mean}%
                        </div>
                      </div>
                      <div style={{
                        background: 'white',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        textAlign: 'center',
                        border: '1px solid #e5e7eb'
                      }}>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>
                          Std Dev
                        </div>
                        <div style={{ fontSize: '0.875rem', fontWeight: '700', color: '#1f293b' }}>
                          {answer.question.config.traderPerformance.stdDev}%
                        </div>
                      </div>
                      <div style={{
                        background: 'white',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        textAlign: 'center',
                        border: '1px solid #e5e7eb'
                      }}>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>
                          Max Drawdown
                        </div>
                        <div style={{ fontSize: '0.875rem', fontWeight: '700', color: '#1f293b' }}>
                          {answer.question.config.traderPerformance.maxDrawdown || '0.00'}%
                        </div>
                      </div>
                    </div>

                    {/* Monthly Returns */}
                    <div>
                      <div style={{
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '0.5rem'
                      }}>
                        Monthly Returns (12 months)
                      </div>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(6, 1fr)',
                        gap: '0.5rem',
                        fontSize: '0.75rem'
                      }}>
                        {answer.question.config.traderPerformance.monthlyReturns.map((returnValue: number, monthIndex: number) => (
                          <div key={monthIndex} style={{
                            textAlign: 'center',
                            padding: '0.5rem 0.25rem',
                            background: 'white',
                            color: '#374151',
                            borderRadius: '6px',
                            fontWeight: '500',
                            border: '1px solid #e5e7eb'
                          }}>
                            <div style={{ fontSize: '0.65rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                              M{monthIndex + 1}
                            </div>
                            <div style={{ fontSize: '0.75rem', fontWeight: '700' }}>
                              {returnValue > 0 ? '+' : ''}{returnValue.toFixed(2)}%
                            </div>
                            <div style={{ fontSize: '0.65rem', color: '#6b7280' }}>
                              ₹{(returnValue * 5).toFixed(1)} L
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Answer Value */}
                <div style={{
                  background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                  border: '1px solid #bae6fd',
                  borderRadius: '12px',
                  padding: '1rem',
                  marginTop: '1rem'
                }}>
                  <div style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#0369a1',
                    marginBottom: '0.5rem'
                  }}>
                    Answer
                  </div>
                  <div style={{
                    fontSize: '1rem',
                    fontWeight: '500',
                    color: '#0c4a6e'
                  }}>
                    {renderAnswerValue(answer)}
                  </div>
                  {answer.score && (
                    <div style={{
                      fontSize: '0.875rem',
                      color: '#0284c7',
                      marginTop: '0.5rem'
                    }}>
                      Score: {answer.score}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
