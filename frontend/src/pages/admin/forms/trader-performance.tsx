import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Save, 
  Eye, 
  Plus, 
  Trash2, 
  FileText,
  Settings,
  BarChart,
  TrendingUp,
  DollarSign,
  Calculator,
  Edit3,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../../services/api';
import toast from 'react-hot-toast';
import { sampleTraderData, TraderPerformance, calculateMoneyReturns, formatMoney } from '../../../data/traderPerformanceData';

const TraderPerformanceSurveyPage: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: 'Trader Performance Evaluation Survey',
    description: 'Rate the performance of 10 different traders based on their 12-month returns, mean, and standard deviation. Each trader has a capital of Rs 5 crores.',
    questions: sampleTraderData.map((trader, index) => ({
      id: trader.id,
      traderName: trader.name,
      monthlyReturns: trader.monthlyReturns,
      capital: trader.capital,
      mean: trader.mean,
      stdDev: trader.stdDev,
      maxDrawdown: trader.maxDrawdown || 0,
      description: trader.description,
      order: index + 1
    }))
  });

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a form title');
      return;
    }

    setLoading(true);
    try {
      // Convert trader data to questions format
      const questions = formData.questions.map((trader, index) => ({
        type: 'single_choice',
        text: `Rate the performance of ${trader.traderName}`,
        description: trader.description,
        required: true,
        order: index + 1,
        options: [
          { text: '1', value: '1' },
          { text: '2', value: '2' },
          { text: '3', value: '3' },
          { text: '4', value: '4' },
          { text: '5', value: '5' },
          { text: '6', value: '6' },
          { text: '7', value: '7' },
          { text: '8', value: '8' },
          { text: '9', value: '9' },
          { text: '10', value: '10' }
        ],
        config: {
          traderPerformance: {
            traderName: trader.traderName,
            monthlyReturns: trader.monthlyReturns,
            capital: trader.capital,
            mean: trader.mean,
            stdDev: trader.stdDev
          }
        }
      }));

      const formPayload = {
        title: formData.title,
        description: formData.description,
        status: 'draft',
        questions: questions
      };

      console.log('Sending form payload:', formPayload);
      const response = await api.post('/forms', formPayload);
      console.log('Form created successfully:', response.data);
      
      // Invalidate and refetch forms queries
      await queryClient.invalidateQueries({ queryKey: ['admin-forms'] });
      await queryClient.invalidateQueries({ queryKey: ['forms'] });
      
      toast.success('Trader Performance Survey created successfully!');
      router.push('/admin/forms');
    } catch (error: any) {
      console.error('Form creation error:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to save survey');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = () => {
    // TODO: Implement form preview
    toast('Preview functionality coming soon!');
  };

  const handleUpdateTrader = (traderId: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map(q => 
        q.id === traderId 
          ? { ...q, [field]: value }
          : q
      )
    }));
  };

  const handleUpdateMonthlyReturn = (traderId: string, monthIndex: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map(q => {
        if (q.id === traderId) {
          const newReturns = [...q.monthlyReturns];
          newReturns[monthIndex] = numValue;
          
          // Recalculate mean and std dev
          const mean = newReturns.reduce((sum, ret) => sum + ret, 0) / newReturns.length;
          const variance = newReturns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / newReturns.length;
          const stdDev = Math.sqrt(variance);
          
          return { ...q, monthlyReturns: newReturns, mean, stdDev };
        }
        return q;
      })
    }));
  };

  const handleUpdateCapital = (traderId: string, value: string) => {
    const numValue = parseFloat(value) || 5;
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map(q => 
        q.id === traderId 
          ? { ...q, capital: numValue }
          : q
      )
    }));
  };

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

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
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>You need to be logged in to create surveys.</p>
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

  if (user.role !== 'admin' && user.role !== 'super_admin') {
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
          <h2 style={{ color: '#1f2937', marginBottom: '1rem' }}>Access Denied</h2>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>You don't have permission to create surveys.</p>
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
              <BarChart size={24} color="white" />
            </div>
            <div>
              <h1 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#1f2937',
                margin: 0
              }}>
                Trader Performance Survey
              </h1>
              <p style={{
                fontSize: '0.875rem',
                color: '#6b7280',
                margin: 0
              }}>
                Create performance evaluation survey
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={handlePreview}
              style={{
                background: 'white',
                color: '#667eea',
                border: '1px solid #d1d5db',
                borderRadius: '12px',
                padding: '0.75rem 1.5rem',
                cursor: 'pointer',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s ease'
              }}
            >
              <Eye size={20} />
              Preview
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              style={{
                background: loading 
                  ? '#9ca3af' 
                  : 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '0.75rem 1.5rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s ease',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading && (
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid transparent',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
              )}
              <Save size={20} />
              {loading ? 'Saving...' : 'Create Survey'}
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
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Survey Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '12px',
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  background: 'white',
                  transition: 'all 0.2s ease',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
            </div>
            
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Survey Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '12px',
                  fontSize: '0.875rem',
                  background: 'white',
                  transition: 'all 0.2s ease',
                  outline: 'none',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>

          {/* Trader Performance Questions */}
          <div style={{ padding: '2rem' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '2rem'
            }}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#1f2937',
                margin: 0
              }}>
                Trader Performance Questions ({formData.questions.length})
              </h3>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: '#f0f9ff',
                color: '#0369a1',
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}>
                <CheckCircle size={16} />
                Rating Scale: 1-10
              </div>
            </div>

            <div style={{ gap: '2rem', display: 'flex', flexDirection: 'column' }}>
              {formData.questions.map((trader, index) => {
                const moneyReturns = calculateMoneyReturns(trader.monthlyReturns, trader.capital);
                
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
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '1.5rem'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
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
                            Q{index + 1}
                          </div>
                          <div style={{ flex: 1 }}>
                            <h4 style={{
                              fontSize: '1.125rem',
                              fontWeight: '600',
                              color: '#1f2937',
                              margin: '0 0 0.25rem 0'
                            }}>
                              Rate the performance of {trader.traderName}
                            </h4>
                            <p style={{
                              fontSize: '0.875rem',
                              color: '#6b7280',
                              margin: 0
                            }}>
                              {trader.description}
                            </p>
                          </div>
                        </div>

                        {/* Editable Fields */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                          gap: '1rem',
                          marginBottom: '1rem'
                        }}>
                          <div>
                            <label style={{
                              display: 'block',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              color: '#374151',
                              marginBottom: '0.25rem'
                            }}>
                              Trader Name
                            </label>
                            <input
                              type="text"
                              value={trader.traderName}
                              onChange={(e) => handleUpdateTrader(trader.id, 'traderName', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                border: '1px solid #d1d5db',
                                borderRadius: '8px',
                                fontSize: '0.875rem',
                                background: 'white'
                              }}
                            />
                          </div>
                          <div>
                            <label style={{
                              display: 'block',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              color: '#374151',
                              marginBottom: '0.25rem'
                            }}>
                              Capital (Crores)
                            </label>
                            <input
                              type="number"
                              value={trader.capital}
                              onChange={(e) => handleUpdateCapital(trader.id, e.target.value)}
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                border: '1px solid #d1d5db',
                                borderRadius: '8px',
                                fontSize: '0.875rem',
                                background: 'white'
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Performance Data Display */}
                    <div style={{
                      background: 'white',
                      borderRadius: '12px',
                      padding: '1.5rem',
                      border: '1px solid rgba(226, 232, 240, 0.8)',
                      marginBottom: '1rem'
                    }}>
                      {/* Monthly Returns Table */}
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
                              <input
                                type="number"
                                step="0.1"
                                value={trader.monthlyReturns[monthIndex]}
                                onChange={(e) => handleUpdateMonthlyReturn(trader.id, monthIndex, e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '4px 6px',
                                  border: '1px solid #d1d5db',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  textAlign: 'center',
                                  background: 'white'
                                }}
                              />
                              <div style={{
                                fontSize: '0.625rem',
                                color: '#6b7280',
                                marginTop: '0.25rem'
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
                            Annual Return
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
                        <div style={{
                          background: '#fef2f2',
                          padding: '1rem',
                          borderRadius: '8px',
                          textAlign: 'center'
                        }}>
                          <div style={{
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            color: '#dc2626',
                            marginBottom: '0.25rem'
                          }}>
                            Max Drawdown
                          </div>
                          <div style={{
                            fontSize: '1.25rem',
                            fontWeight: '700',
                            color: '#1f2937'
                          }}>
                            {trader.maxDrawdown || '0.00'}%
                          </div>
                        </div>
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
                        marginBottom: '0.5rem'
                      }}>
                        Rate this trader's performance on a scale of 1-10
                      </div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        marginTop: '0.5rem'
                      }}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                          <div
                            key={rating}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: 'white',
                              border: '2px solid #d1d5db',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.875rem',
                              fontWeight: '500',
                              color: '#6b7280',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = '#667eea';
                              e.currentTarget.style.color = '#667eea';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = '#d1d5db';
                              e.currentTarget.style.color = '#6b7280';
                            }}
                          >
                            {rating}
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
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
