import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  BarChart3, 
  Users,
  TrendingUp,
  Brain,
  Target,
  AlertCircle,
  CheckCircle,
  Download,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../services/api';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

interface RiskAnalysisResult {
  userId: string;
  userName: string;
  userEmail: string;
  responses: number[];
  normalizedResponses: number[];
  alpha: number;
  beta1: number;
  beta2: number;
  riskAversionCoefficient: number;
  riskClassification: 'Very Risk Averse' | 'Mild Risk Aversion' | 'Low Risk Aversion' | 'Risk Neutral' | 'Risk seeking';
  rSquared: number;
  meanResponse: number;
  stdDevResponse: number;
}

interface AnalysisSummary {
  totalUsers: number;
  averageRiskCoefficient: number;
  averageAlpha: number;
  averageBeta1: number;
  averageBeta2: number;
  classificationDistribution: {
    'Very Risk Averse': number;
    'Mild Risk Aversion': number;
    'Low Risk Aversion': number;
    'Risk Neutral': number;
    'Risk seeking': number;
  };
  averageRSquared: number;
}

export default function RiskAnalysisPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [analysisResults, setAnalysisResults] = useState<RiskAnalysisResult[]>([]);
  const [analysisSummary, setAnalysisSummary] = useState<AnalysisSummary | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [topAlphaUsers, setTopAlphaUsers] = useState<RiskAnalysisResult[]>([]);
  const [alpha90thPercentile, setAlpha90thPercentile] = useState<number>(0);

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!authLoading && (!user || (user.role !== 'admin' && user.role !== 'super_admin'))) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Fetch all responses for analysis
  const { data: responses, isLoading: responsesLoading, refetch: refetchResponses } = useQuery({
    queryKey: ['admin-responses'],
    queryFn: () => api.get('/responses').then(res => res.data),
    enabled: !!user && (user.role === 'admin' || user.role === 'super_admin'),
  });

  // Risk analysis mutation
  const analyzeRiskMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/analytics/admin/risk-analysis');
      return response.data;
    },
    onSuccess: (data) => {
      setAnalysisResults(data.results);
      setAnalysisSummary(data.summary);
      toast.success('Risk analysis completed successfully!');
    },
    onError: (error: any) => {
      console.error('Risk analysis error:', error);
      toast.error(error.response?.data?.message || 'Failed to perform risk analysis');
    },
  });

  // Calculate 90th percentile and top alpha users
  const calculateTopAlphaUsers = (results: RiskAnalysisResult[]) => {
    if (results.length === 0) return;
    
    // Sort by alpha values in descending order
    const sortedByAlpha = [...results].sort((a, b) => b.alpha - a.alpha);
    
    // Calculate 90th percentile
    const percentile90Index = Math.ceil(results.length * 0.9) - 1;
    const percentile90Value = sortedByAlpha[percentile90Index]?.alpha || 0;
    
    // Get users >= 90th percentile
    const topUsers = sortedByAlpha.filter(user => user.alpha >= percentile90Value);
    
    setAlpha90thPercentile(percentile90Value);
    setTopAlphaUsers(topUsers);
  };

  const handleAnalyzeRisk = async () => {
    if (!responses || responses.length === 0) {
      toast.error('No responses available for analysis');
      return;
    }

    setIsAnalyzing(true);
    try {
      const data = await analyzeRiskMutation.mutateAsync();
      // Calculate top alpha users after analysis
      calculateTopAlphaUsers(data.results);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRiskColor = (classification: RiskAnalysisResult['riskClassification']) => {
    switch (classification) {
      case 'Very Risk Averse': return '#ef4444';
      case 'Mild Risk Aversion': return '#f59e0b';
      case 'Low Risk Aversion': return '#3b82f6';
      case 'Risk Neutral': return '#10b981';
      case 'Risk seeking': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const getRiskDisplayName = (classification: RiskAnalysisResult['riskClassification']): string => {
    switch (classification) {
      case 'Very Risk Averse': return 'Very Risk Averse (संतोषी)';
      case 'Mild Risk Aversion': return 'Mild Risk Aversion (जोखिमों का चुनाव करने वाला)';
      case 'Low Risk Aversion': return 'Low Risk Aversion (विकास प्रेमी संशय)';
      case 'Risk Neutral': return 'Risk Neutral (समशीतोष्ण)';
      case 'Risk seeking': return 'Risk seeking (संशय प्रेमी)';
      default: return classification;
    }
  };

  if (authLoading) {
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

  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return null;
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
          padding: '0 1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '3.5rem',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '0', flex: '1' }}>
            <button
              onClick={() => router.back()}
              style={{
                background: 'none',
                border: 'none',
                color: '#6b7280',
                cursor: 'pointer',
                padding: '0.375rem',
                borderRadius: '6px',
                transition: 'all 0.2s ease',
                flexShrink: 0
              }}
            >
              <ArrowLeft size={18} />
            </button>
            <div style={{
              width: '32px',
              height: '32px',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <BarChart3 size={18} color="white" />
            </div>
            <div style={{ minWidth: '0', flex: '1' }}>
              <h1 style={{
                fontSize: '1.125rem',
                fontWeight: '700',
                color: '#1f2937',
                margin: 0,
                lineHeight: '1.2'
              }}>
                Risk Analysis
              </h1>
              <p style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                margin: 0,
                lineHeight: '1.3',
                display: 'none'
              }}>
                Z-score normalization and multivariate OLS regression
              </p>
            </div>
          </div>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={handleAnalyzeRisk}
              disabled={isAnalyzing || !responses || responses.length === 0}
              style={{
                background: isAnalyzing ? '#9ca3af' : 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '0.5rem 0.75rem',
                cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                transition: 'all 0.2s ease',
                fontSize: '0.875rem'
              }}
            >
              {isAnalyzing ? <RefreshCw size={16} className="animate-spin" /> : <Brain size={16} />}
              <span>Analyze Risk</span>
            </button>
            <button
              style={{
                background: 'white',
                color: '#10b981',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                padding: '0.5rem',
                cursor: 'pointer',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                transition: 'all 0.2s ease',
                fontSize: '0.875rem'
              }}
            >
              <Download size={16} />
              <span>Export</span>
            </button>
          </div>
        </div>
      </header>

      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '1rem'
      }}>
        {/* Summary Stats */}
        {analysisSummary && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem'
            }}
          >
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '12px',
              padding: '1rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(226, 232, 240, 0.8)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.75rem'
              }}>
                <h3 style={{
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  color: '#6b7280',
                  margin: 0
                }}>
                  Total Responses
                </h3>
                <Users size={16} color="#3b82f6" />
              </div>
              <p style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#1f2937',
                margin: 0
              }}>
                {responses?.length || 0}
              </p>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '12px',
              padding: '1rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(226, 232, 240, 0.8)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.75rem'
              }}>
                <h3 style={{
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  color: '#6b7280',
                  margin: 0
                }}>
                  Analyzed Users
                </h3>
                <BarChart3 size={16} color="#10b981" />
              </div>
              <p style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#1f2937',
                margin: 0
              }}>
                {analysisSummary.totalUsers}
              </p>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '12px',
              padding: '1rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(226, 232, 240, 0.8)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.75rem'
              }}>
                <h3 style={{
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  color: '#6b7280',
                  margin: 0
                }}>
                  Avg Risk Coefficient
                </h3>
                <TrendingUp size={16} color="#f59e0b" />
              </div>
              <p style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#1f2937',
                margin: 0
              }}>
                {analysisSummary.averageRiskCoefficient.toFixed(3)}
              </p>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '12px',
              padding: '1rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(226, 232, 240, 0.8)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.75rem'
              }}>
                <h3 style={{
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  color: '#6b7280',
                  margin: 0
                }}>
                  Avg Alpha
                </h3>
                <AlertCircle size={16} color="#ef4444" />
              </div>
              <p style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#1f2937',
                margin: 0
              }}>
                {analysisSummary.averageAlpha.toFixed(3)}
              </p>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '12px',
              padding: '1rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(226, 232, 240, 0.8)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.75rem'
              }}>
                <h3 style={{
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  color: '#6b7280',
                  margin: 0
                }}>
                  Avg Beta1
                </h3>
                <TrendingUp size={16} color="#10b981" />
              </div>
              <p style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#1f2937',
                margin: 0
              }}>
                {analysisSummary.averageBeta1.toFixed(3)}
              </p>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '12px',
              padding: '1rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(226, 232, 240, 0.8)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.75rem'
              }}>
                <h3 style={{
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  color: '#6b7280',
                  margin: 0
                }}>
                  Avg Beta2
                </h3>
                <BarChart3 size={16} color="#3b82f6" />
              </div>
              <p style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#1f2937',
                margin: 0
              }}>
                {analysisSummary.averageBeta2.toFixed(3)}
              </p>
            </div>
          </motion.div>
        )}

        {/* Simple Scatter Plot */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1.5rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(226, 232, 240, 0.8)'
          }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}>
            <h3 style={{
              fontSize: '1rem',
              fontWeight: '600',
              color: '#1f2937',
              margin: 0
            }}>
              Risk Aversion Scatter Plot
            </h3>
            <button
              onClick={() => setShowDetails(!showDetails)}
              style={{
                background: 'white',
                color: '#667eea',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                padding: '0.5rem 0.75rem',
                cursor: 'pointer',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                fontSize: '0.875rem'
              }}
            >
              {showDetails ? 'Hide' : 'Show'} Details
            </button>
          </div>

          {/* Simple Plot Area */}
          <div style={{
            width: '100%',
            height: '300px',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            background: 'white',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {analysisResults.length === 0 ? (
              <div style={{
                textAlign: 'center',
                color: '#6b7280',
                fontSize: '1rem'
              }}>
                No data points to display. Click "Analyze Risk" to generate the scatter plot.
              </div>
            ) : (
              <div style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                background: '#f8fafc',
                borderRadius: '4px'
              }}>
                
                {/* Data points */}
                {analysisResults.map((result, index) => {
                  // Simple positioning: X based on category, Y based on risk coefficient
                  const categoryPositions = {
                    'Very Risk Averse': 0.1,
                    'Mild Risk Aversion': 0.3,
                    'Low Risk Aversion': 0.5,
                    'Risk Neutral': 0.7,
                    'Risk seeking': 0.9
                  };
                  
                  const xPos = (categoryPositions[result.riskClassification] || 0.5) * 100;
                  const yPos = Math.max(10, Math.min(90, 50 - (result.riskAversionCoefficient * 10)));
                  
                  return (
                    <div
                      key={result.userId}
                      style={{
                        position: 'absolute',
                        left: `${xPos}%`,
                        top: `${yPos}%`,
                        transform: 'translate(-50%, -50%)',
                        zIndex: 10
                      }}
                    >
                      {/* User label */}
                      <div style={{
                        background: 'rgba(0, 0, 0, 0.8)',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        marginBottom: '4px',
                        whiteSpace: 'nowrap',
                        textAlign: 'center'
                      }}>
                        {result.userName}
                        <br />
                        <span style={{ fontSize: '10px', opacity: 0.8 }}>
                          α: {result.alpha.toFixed(3)}
                        </span>
                      </div>
                      
                      {/* Data point */}
                      <div
                        style={{
                          width: '16px',
                          height: '16px',
                          background: getRiskColor(result.riskClassification),
                          borderRadius: '50%',
                          border: '2px solid white',
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                          cursor: 'pointer'
                        }}
                        title={`${result.userName}: Risk Coeff: ${result.riskAversionCoefficient.toFixed(3)}, Alpha: ${result.alpha.toFixed(3)}`}
                      />
                    </div>
                  );
                })}
                
                {/* Y-axis labels */}
                <div style={{
                  position: 'absolute',
                  left: '10px',
                  top: '0',
                  bottom: '0',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '20px 0',
                  fontSize: '12px',
                  color: '#6b7280'
                }}>
                  <div>3.0</div>
                  <div>1.5</div>
                  <div>0.0</div>
                  <div>-1.5</div>
                  <div>-3.0</div>
                </div>
                
                {/* X-axis color partitions */}
                <div style={{
                  position: 'absolute',
                  bottom: '0',
                  left: '0',
                  right: '0',
                  height: '25px',
                  display: 'flex'
                }}>
                  {/* Very Risk Averse */}
                  <div style={{
                    flex: 1,
                    background: '#ef4444',
                    opacity: 0.2,
                    borderRight: '1px solid #ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: '500',
                    color: '#ef4444',
                    textAlign: 'center',
                    lineHeight: '1.2'
                  }}>
                    Very Risk Averse
                  </div>
                  {/* Mild Risk Aversion */}
                  <div style={{
                    flex: 1,
                    background: '#f59e0b',
                    opacity: 0.2,
                    borderRight: '1px solid #f59e0b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: '500',
                    color: '#f59e0b',
                    textAlign: 'center',
                    lineHeight: '1.2'
                  }}>
                    Mild Risk Aversion
                  </div>
                  {/* Low Risk Aversion */}
                  <div style={{
                    flex: 1,
                    background: '#3b82f6',
                    opacity: 0.2,
                    borderRight: '1px solid #3b82f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: '500',
                    color: '#3b82f6',
                    textAlign: 'center',
                    lineHeight: '1.2'
                  }}>
                    Low Risk Aversion
                  </div>
                  {/* Risk Neutral */}
                  <div style={{
                    flex: 1,
                    background: '#10b981',
                    opacity: 0.2,
                    borderRight: '1px solid #10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: '500',
                    color: '#10b981',
                    textAlign: 'center',
                    lineHeight: '1.2'
                  }}>
                    Risk Neutral
                  </div>
                  {/* Risk seeking */}
                  <div style={{
                    flex: 1,
                    background: '#8b5cf6',
                    opacity: 0.2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: '500',
                    color: '#8b5cf6',
                    textAlign: 'center',
                    lineHeight: '1.2'
                  }}>
                    Risk seeking
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Axis Labels */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: '1rem'
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151'
            }}>
              Risk Category
            </div>
          </div>
        </motion.div>

        {/* Risk Classification Distribution */}
        {analysisSummary && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '1.5rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(226, 232, 240, 0.8)'
            }}
          >
            <h3 style={{
              fontSize: '1rem',
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <BarChart3 size={18} />
              Risk Classification Distribution
            </h3>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '0.75rem'
            }}>
              {Object.entries(analysisSummary.classificationDistribution).map(([category, count]) => (
                <motion.div
                  key={category}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{
                    background: `${getRiskColor(category as RiskAnalysisResult['riskClassification'])}15`,
                    border: `2px solid ${getRiskColor(category as RiskAnalysisResult['riskClassification'])}`,
                    borderRadius: '8px',
                    padding: '1rem',
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: '0.375rem',
                    right: '0.375rem',
                    background: getRiskColor(category as RiskAnalysisResult['riskClassification']),
                    color: 'white',
                    fontSize: '0.625rem',
                    fontWeight: '600',
                    padding: '0.125rem 0.375rem',
                    borderRadius: '8px'
                  }}>
                    {Math.round((count / analysisSummary.totalUsers) * 100)}%
                  </div>
                  
                  <div style={{
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    color: getRiskColor(category as RiskAnalysisResult['riskClassification']),
                    marginBottom: '0.375rem'
                  }}>
                    {count}
                  </div>
                  
                  <div style={{
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#1f2937',
                    marginBottom: '0.125rem',
                    lineHeight: '1.2'
                  }}>
                    {getRiskDisplayName(category as RiskAnalysisResult['riskClassification'])}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Top Alpha Users Section */}
        {topAlphaUsers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              padding: '2rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(226, 232, 240, 0.8)',
              marginBottom: '2rem'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.5rem'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Target size={20} color="white" />
                </div>
                <div>
                  <h3 style={{
                    fontSize: '1.25rem',
                    fontWeight: '700',
                    color: '#1f2937',
                    margin: 0
                  }}>
                    Top Alpha Users (≥90th Percentile)
                  </h3>
                  <p style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    margin: '0.25rem 0 0 0'
                  }}>
                    90th percentile threshold: {alpha90thPercentile.toFixed(3)}
                  </p>
                </div>
              </div>
              <div style={{
                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                border: '1px solid #f59e0b',
                borderRadius: '8px',
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#92400e'
              }}>
                {topAlphaUsers.length} user{topAlphaUsers.length !== 1 ? 's' : ''}
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1rem'
            }}>
              {topAlphaUsers.map((user, index) => (
                <motion.div
                  key={user.userId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  style={{
                    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                    border: '1px solid #f59e0b',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: '0.75rem',
                    right: '0.75rem',
                    background: '#f59e0b',
                    color: 'white',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '12px'
                  }}>
                    #{index + 1}
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginBottom: '1rem'
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.25rem',
                      fontWeight: '700',
                      color: 'white'
                    }}>
                      {user.userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 style={{
                        fontSize: '1rem',
                        fontWeight: '600',
                        color: '#92400e',
                        margin: '0 0 0.25rem 0'
                      }}>
                        {user.userName}
                      </h4>
                      <p style={{
                        fontSize: '0.75rem',
                        color: '#a16207',
                        margin: 0
                      }}>
                        {user.userEmail}
                      </p>
                    </div>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '0.75rem'
                  }}>
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.7)',
                      borderRadius: '8px',
                      padding: '0.75rem',
                      textAlign: 'center'
                    }}>
                      <div style={{
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: '#92400e',
                        marginBottom: '0.25rem'
                      }}>
                        Alpha (α)
                      </div>
                      <div style={{
                        fontSize: '1.25rem',
                        fontWeight: '700',
                        color: '#1f2937'
                      }}>
                        {user.alpha.toFixed(3)}
                      </div>
                    </div>
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.7)',
                      borderRadius: '8px',
                      padding: '0.75rem',
                      textAlign: 'center'
                    }}>
                      <div style={{
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: '#92400e',
                        marginBottom: '0.25rem'
                      }}>
                        Risk Classification
                      </div>
                      <div style={{
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: getRiskColor(user.riskClassification),
                        textTransform: 'capitalize'
                      }}>
                        {user.riskClassification}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Detailed Results Table */}
        {showDetails && analysisResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '12px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(226, 232, 240, 0.8)',
              overflow: 'hidden'
            }}
          >
            <div style={{
              padding: '1rem',
              borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
              background: 'rgba(248, 250, 252, 0.5)'
            }}>
              <h3 style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: '#1f2937',
                margin: 0
              }}>
                Individual User Analysis ({analysisResults.length})
              </h3>
            </div>

            <div style={{ overflow: 'auto', maxHeight: '400px' }}>
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
                      padding: '0.75rem 0.5rem',
                      textAlign: 'left',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#374151'
                    }}>
                      User
                    </th>
                    <th style={{
                      padding: '0.75rem 0.5rem',
                      textAlign: 'left',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#374151'
                    }}>
                      Classification
                    </th>
                    <th style={{
                      padding: '0.75rem 0.5rem',
                      textAlign: 'left',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#374151'
                    }}>
                      Risk Coeff.
                    </th>
                    <th style={{
                      padding: '0.75rem 0.5rem',
                      textAlign: 'left',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#374151'
                    }}>
                      Alpha
                    </th>
                    <th style={{
                      padding: '0.75rem 0.5rem',
                      textAlign: 'left',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#374151'
                    }}>
                      Beta1
                    </th>
                    <th style={{
                      padding: '0.75rem 0.5rem',
                      textAlign: 'left',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#374151'
                    }}>
                      Beta2
                    </th>
                    <th style={{
                      padding: '0.75rem 0.5rem',
                      textAlign: 'left',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#374151'
                    }}>
                      R²
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {analysisResults.map((result, index) => (
                    <motion.tr
                      key={result.userId}
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
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <div>
                          <h4 style={{
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            color: '#1f2937',
                            margin: '0 0 0.125rem 0'
                          }}>
                            {result.userName}
                          </h4>
                          <p style={{
                            fontSize: '0.625rem',
                            color: '#6b7280',
                            margin: 0
                          }}>
                            {result.userEmail}
                          </p>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.375rem'
                        }}>
                          <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: getRiskColor(result.riskClassification)
                          }} />
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            color: getRiskColor(result.riskClassification)
                          }}>
                            {getRiskDisplayName(result.riskClassification)}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          color: '#374151'
                        }}>
                          {result.riskAversionCoefficient.toFixed(3)}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          color: '#374151'
                        }}>
                          {result.alpha.toFixed(3)}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          color: '#374151'
                        }}>
                          {result.beta1.toFixed(3)}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          color: '#374151'
                        }}>
                          {result.beta2.toFixed(3)}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          color: '#374151'
                        }}>
                          {result.rSquared.toFixed(3)}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}