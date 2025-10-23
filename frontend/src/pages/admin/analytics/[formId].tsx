import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Download, 
  BarChart,
  TrendingUp,
  Users,
  PieChart,
  BarChart3,
  AlertCircle,
  RefreshCw,
  Filter,
  Eye
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface RiskAversionAnalysis {
  userId: string;
  userName: string;
  userEmail: string;
  normalizedRatings: number[];
  riskAversionCoefficient: number;
  riskCategory: 'Conservative' | 'Moderate' | 'Aggressive' | 'Very Aggressive';
  rSquared: number;
  meanRating: number;
  stdDevRating: number;
  traderPerformance: {
    traderId: string;
    traderName: string;
    mean: number;
    stdDev: number;
    rating: number;
    normalizedRating: number;
  }[];
}

interface RiskAversionSummary {
  totalUsers: number;
  riskDistribution: {
    Conservative: number;
    Moderate: number;
    Aggressive: number;
    'Very Aggressive': number;
  };
  averageRiskAversion: number;
  riskAversionRange: {
    min: number;
    max: number;
  };
  analysis: RiskAversionAnalysis[];
}

interface ChartData {
  scatterData: Array<{
    x: number;
    y: number;
    userName: string;
    riskCategory: string;
    userId: string;
  }>;
  riskCategories: Array<{
    category: string;
    count: number;
    color: string;
  }>;
}

const RiskAversionAnalyticsPage: React.FC = () => {
  const router = useRouter();
  const { formId } = router.query;
  const { user } = useAuth();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const { data: analysis, isLoading: analysisLoading, refetch: refetchAnalysis } = useQuery({
    queryKey: ['risk-aversion-analysis', formId],
    queryFn: async () => {
      const response = await api.get(`/analytics/risk-aversion/${formId}`);
      return response.data as RiskAversionSummary;
    },
    enabled: !!formId && !!user && (user.role === 'admin' || user.role === 'super_admin'),
  });

  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ['risk-aversion-chart', formId],
    queryFn: async () => {
      const response = await api.get(`/analytics/risk-aversion/${formId}/chart`);
      return response.data as ChartData;
    },
    enabled: !!formId && !!user && (user.role === 'admin' || user.role === 'super_admin'),
  });

  const getRiskCategoryColor = (category: string) => {
    switch (category) {
      case 'Conservative': return '#ef4444';
      case 'Moderate': return '#f59e0b';
      case 'Aggressive': return '#10b981';
      case 'Very Aggressive': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getRiskCategoryDescription = (category: string) => {
    switch (category) {
      case 'Conservative': return 'Prefers low-risk, stable returns';
      case 'Moderate': return 'Balanced approach to risk and return';
      case 'Aggressive': return 'Willing to take higher risks for higher returns';
      case 'Very Aggressive': return 'Seeks maximum returns regardless of risk';
      default: return 'Unknown risk profile';
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
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>You need to be logged in to view analytics.</p>
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
          <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ color: '#1f2937', marginBottom: '1rem' }}>Access Denied</h2>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>You don't have permission to view analytics.</p>
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

  if (analysisLoading || chartLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <LoadingSpinner />
      </div>
    );
  }

  if (!analysis || analysis.totalUsers === 0) {
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
          <BarChart size={48} color="#d1d5db" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ color: '#1f2937', marginBottom: '1rem' }}>No Data Available</h2>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
            No responses found for risk aversion analysis.
          </p>
          <button
            onClick={() => router.push('/admin/results')}
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
            View Results
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
                Risk Aversion Analysis
              </h1>
              <p style={{
                fontSize: '0.875rem',
                color: '#6b7280',
                margin: 0
              }}>
                Trader Performance Survey Analytics
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => refetchAnalysis()}
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
              <RefreshCw size={20} />
              Refresh
            </button>
            <button
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
              <Download size={20} />
              Export Data
            </button>
          </div>
        </div>
      </header>

      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '2rem 1.5rem'
      }}>
        {/* Summary Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem'
          }}
        >
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            padding: '1.5rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(226, 232, 240, 0.8)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem'
            }}>
              <h3 style={{
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#6b7280',
                margin: 0
              }}>
                Total Users Analyzed
              </h3>
              <Users size={20} color="#667eea" />
            </div>
            <p style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#1f2937',
              margin: 0
            }}>
              {analysis.totalUsers}
            </p>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            padding: '1.5rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(226, 232, 240, 0.8)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem'
            }}>
              <h3 style={{
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#6b7280',
                margin: 0
              }}>
                Average Risk Aversion
              </h3>
              <TrendingUp size={20} color="#10b981" />
            </div>
            <p style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#1f2937',
              margin: 0
            }}>
              {analysis.averageRiskAversion.toFixed(3)}
            </p>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            padding: '1.5rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(226, 232, 240, 0.8)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem'
            }}>
              <h3 style={{
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#6b7280',
                margin: 0
              }}>
                Risk Range
              </h3>
              <BarChart3 size={20} color="#f59e0b" />
            </div>
            <p style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              color: '#1f2937',
              margin: 0
            }}>
              {analysis.riskAversionRange.min.toFixed(3)} to {analysis.riskAversionRange.max.toFixed(3)}
            </p>
          </div>
        </motion.div>

        {/* Risk Distribution Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            padding: '2rem',
            marginBottom: '2rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(226, 232, 240, 0.8)'
          }}
        >
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <PieChart size={24} />
            Risk Category Distribution
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            {chartData?.riskCategories.map((category, index) => (
              <motion.div
                key={category.category}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                style={{
                  background: `${category.color}15`,
                  border: `2px solid ${category.color}`,
                  borderRadius: '12px',
                  padding: '1.5rem',
                  textAlign: 'center',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: '0.5rem',
                  right: '0.5rem',
                  background: category.color,
                  color: 'white',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '12px'
                }}>
                  {Math.round((category.count / analysis.totalUsers) * 100)}%
                </div>
                
                <div style={{
                  fontSize: '2rem',
                  fontWeight: '700',
                  color: category.color,
                  marginBottom: '0.5rem'
                }}>
                  {category.count}
                </div>
                
                <div style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#1f2937',
                  marginBottom: '0.25rem'
                }}>
                  {category.category}
                </div>
                
                <div style={{
                  fontSize: '0.875rem',
                  color: '#6b7280'
                }}>
                  {getRiskCategoryDescription(category.category)}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Scatter Plot Visualization */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            padding: '2rem',
            marginBottom: '2rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(226, 232, 240, 0.8)'
          }}
        >
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <BarChart3 size={24} />
            Risk Aversion Scatter Plot
          </h3>
          
          <div style={{
            background: '#f8fafc',
            borderRadius: '12px',
            padding: '2rem',
            minHeight: '400px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}>
            {/* Simple scatter plot visualization */}
            <div style={{
              position: 'relative',
              width: '100%',
              height: '350px',
              background: 'white',
              borderRadius: '8px',
              border: '1px solid #e5e7eb'
            }}>
              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((value, index) => (
                <div key={`h-grid-${index}`} style={{
                  position: 'absolute',
                  left: '20px',
                  right: '20px',
                  top: `${20 + value * 80}%`,
                  height: '1px',
                  background: '#e5e7eb',
                  opacity: 0.5
                }} />
              ))}
              {[0, 0.25, 0.5, 0.75, 1].map((value, index) => (
                <div key={`v-grid-${index}`} style={{
                  position: 'absolute',
                  top: '20px',
                  bottom: '20px',
                  left: `${20 + value * 80}%`,
                  width: '1px',
                  background: '#e5e7eb',
                  opacity: 0.5
                }} />
              ))}

              {/* Axes */}
              <div style={{
                position: 'absolute',
                bottom: '20px',
                left: '20px',
                right: '20px',
                height: '2px',
                background: '#374151'
              }} />
              <div style={{
                position: 'absolute',
                left: '20px',
                top: '20px',
                bottom: '20px',
                width: '2px',
                background: '#374151'
              }} />
              
              {/* Data points */}
              {chartData?.scatterData.map((point, index) => {
                // Calculate position based on risk coefficient (x) and normalized rating (y)
                // Map risk coefficient from [-1, 1] to [0, 100] for X positioning
                const xPosition = Math.max(5, Math.min(95, ((point.x + 1) / 2) * 100));
                
                // Map normalized rating from [-2, 2] to [0, 100] for Y positioning
                const yPosition = Math.max(5, Math.min(95, ((point.y + 2) / 4) * 100));
                
                return (
                  <motion.div
                    key={point.userId}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    style={{
                      position: 'absolute',
                      left: `${xPosition}%`,
                      bottom: `${yPosition}%`,
                      width: '12px',
                      height: '12px',
                      background: getRiskCategoryColor(point.riskCategory),
                      borderRadius: '50%',
                      cursor: 'pointer',
                      border: '2px solid white',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                      transition: 'all 0.2s ease',
                      transform: 'translate(-50%, 50%)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translate(-50%, 50%) scale(1.5)';
                      e.currentTarget.style.zIndex = '10';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translate(-50%, 50%) scale(1)';
                      e.currentTarget.style.zIndex = '1';
                    }}
                    onClick={() => setSelectedUser(point.userId)}
                    title={`${point.userName} - ${point.riskCategory}`}
                  />
                );
              })}
              
              {/* Labels */}
              <div style={{
                position: 'absolute',
                bottom: '5px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '0.875rem',
                color: '#6b7280',
                fontWeight: '500'
              }}>
                Risk Aversion Coefficient
              </div>
              <div style={{
                position: 'absolute',
                left: '5px',
                top: '50%',
                transform: 'translateY(-50%) rotate(-90deg)',
                fontSize: '0.875rem',
                color: '#6b7280',
                fontWeight: '500'
              }}>
                Normalized Rating
              </div>
            </div>
          </div>
        </motion.div>

        {/* Detailed User Analysis */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            overflow: 'hidden'
          }}
        >
          <div style={{
            padding: '1.5rem',
            borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
            background: 'rgba(248, 250, 252, 0.5)'
          }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#1f2937',
              margin: 0
            }}>
              Individual User Analysis ({analysis.analysis.length})
            </h3>
          </div>

          <div style={{ overflow: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse'
            }}>
              <thead>
                <tr style={{
                  background: 'rgba(248, 250, 252, 0.5)',
                  borderBottom: '1px solid rgba(226, 232, 240, 0.8)'
                }}>
                  <th style={{
                    padding: '1rem',
                    textAlign: 'left',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151'
                  }}>
                    User
                  </th>
                  <th style={{
                    padding: '1rem',
                    textAlign: 'left',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151'
                  }}>
                    Risk Category
                  </th>
                  <th style={{
                    padding: '1rem',
                    textAlign: 'left',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151'
                  }}>
                    Risk Aversion Coeff.
                  </th>
                  <th style={{
                    padding: '1rem',
                    textAlign: 'left',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151'
                  }}>
                    R²
                  </th>
                  <th style={{
                    padding: '1rem',
                    textAlign: 'left',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151'
                  }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {analysis.analysis.map((userAnalysis, index) => (
                  <motion.tr
                    key={userAnalysis.userId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    style={{
                      borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(248, 250, 252, 0.5)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <td style={{ padding: '1rem' }}>
                      <div>
                        <h4 style={{
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          color: '#1f2937',
                          margin: '0 0 0.25rem 0'
                        }}>
                          {userAnalysis.userName}
                        </h4>
                        <p style={{
                          fontSize: '0.75rem',
                          color: '#6b7280',
                          margin: 0
                        }}>
                          {userAnalysis.userEmail}
                        </p>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <div style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          background: getRiskCategoryColor(userAnalysis.riskCategory)
                        }} />
                        <span style={{
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          color: getRiskCategoryColor(userAnalysis.riskCategory)
                        }}>
                          {userAnalysis.riskCategory}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#374151'
                      }}>
                        {userAnalysis.riskAversionCoefficient.toFixed(3)}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#374151'
                      }}>
                        {userAnalysis.rSquared.toFixed(3)}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <button
                        onClick={() => setSelectedUser(selectedUser === userAnalysis.userId ? null : userAnalysis.userId)}
                        style={{
                          background: selectedUser === userAnalysis.userId ? '#667eea' : 'white',
                          color: selectedUser === userAnalysis.userId ? 'white' : '#667eea',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          padding: '0.5rem 1rem',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <Eye size={16} />
                        {selectedUser === userAnalysis.userId ? 'Hide' : 'View'} Details
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* User Detail Modal */}
        {selectedUser && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                background: 'white',
                borderRadius: '16px',
                padding: '2rem',
                width: '100%',
                maxWidth: '800px',
                maxHeight: '90vh',
                overflow: 'auto',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
              }}
            >
              {(() => {
                const userAnalysis = analysis.analysis.find(a => a.userId === selectedUser);
                if (!userAnalysis) return null;

                return (
                  <>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '1.5rem'
                    }}>
                      <h3 style={{
                        fontSize: '1.25rem',
                        fontWeight: '600',
                        color: '#1f2937',
                        margin: 0
                      }}>
                        {userAnalysis.userName} - Risk Analysis
                      </h3>
                      <button
                        onClick={() => setSelectedUser(null)}
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
                        ✕
                      </button>
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '1rem',
                      marginBottom: '2rem'
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
                          Risk Category
                        </div>
                        <div style={{
                          fontSize: '1.25rem',
                          fontWeight: '700',
                          color: '#1f2937'
                        }}>
                          {userAnalysis.riskCategory}
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
                          Risk Aversion Coeff.
                        </div>
                        <div style={{
                          fontSize: '1.25rem',
                          fontWeight: '700',
                          color: '#1f2937'
                        }}>
                          {userAnalysis.riskAversionCoefficient.toFixed(3)}
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
                          R² (Model Fit)
                        </div>
                        <div style={{
                          fontSize: '1.25rem',
                          fontWeight: '700',
                          color: '#1f2937'
                        }}>
                          {userAnalysis.rSquared.toFixed(3)}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 style={{
                        fontSize: '1rem',
                        fontWeight: '600',
                        color: '#1f2937',
                        marginBottom: '1rem'
                      }}>
                        Trader Ratings & Performance
                      </h4>
                      <div style={{ overflow: 'auto' }}>
                        <table style={{
                          width: '100%',
                          borderCollapse: 'collapse'
                        }}>
                          <thead>
                            <tr style={{
                              background: '#f8fafc',
                              borderBottom: '1px solid #e5e7eb'
                            }}>
                              <th style={{
                                padding: '0.75rem',
                                textAlign: 'left',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: '#374151'
                              }}>
                                Trader
                              </th>
                              <th style={{
                                padding: '0.75rem',
                                textAlign: 'left',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: '#374151'
                              }}>
                                Annual Return
                              </th>
                              <th style={{
                                padding: '0.75rem',
                                textAlign: 'left',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: '#374151'
                              }}>
                                Std Dev
                              </th>
                              <th style={{
                                padding: '0.75rem',
                                textAlign: 'left',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: '#374151'
                              }}>
                                Rating
                              </th>
                              <th style={{
                                padding: '0.75rem',
                                textAlign: 'left',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: '#374151'
                              }}>
                                Normalized
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {userAnalysis.traderPerformance.map((trader, index) => (
                              <tr key={trader.traderId} style={{
                                borderBottom: '1px solid #e5e7eb'
                              }}>
                                <td style={{ padding: '0.75rem' }}>
                                  <div style={{
                                    fontSize: '0.875rem',
                                    fontWeight: '500',
                                    color: '#1f2937'
                                  }}>
                                    {trader.traderName}
                                  </div>
                                </td>
                                <td style={{ padding: '0.75rem' }}>
                                  <div style={{
                                    fontSize: '0.875rem',
                                    color: '#374151'
                                  }}>
                                    {trader.mean >= 0 ? '+' : ''}{trader.mean.toFixed(2)}%
                                  </div>
                                </td>
                                <td style={{ padding: '0.75rem' }}>
                                  <div style={{
                                    fontSize: '0.875rem',
                                    color: '#374151'
                                  }}>
                                    {trader.stdDev.toFixed(2)}%
                                  </div>
                                </td>
                                <td style={{ padding: '0.75rem' }}>
                                  <div style={{
                                    fontSize: '0.875rem',
                                    fontWeight: '500',
                                    color: '#667eea'
                                  }}>
                                    {trader.rating}/10
                                  </div>
                                </td>
                                <td style={{ padding: '0.75rem' }}>
                                  <div style={{
                                    fontSize: '0.875rem',
                                    color: '#374151'
                                  }}>
                                    {trader.normalizedRating.toFixed(3)}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RiskAversionAnalyticsPage;
