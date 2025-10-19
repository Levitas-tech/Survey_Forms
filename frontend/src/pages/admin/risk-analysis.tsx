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
  riskAversionCoefficient: number;
  riskClassification: 'Very Conservative' | 'Conservative' | 'Moderate' | 'Aggressive' | 'Very Aggressive';
  rSquared: number;
  meanResponse: number;
  stdDevResponse: number;
}

interface AnalysisSummary {
  totalUsers: number;
  averageRiskCoefficient: number;
  classificationDistribution: {
    'Very Conservative': number;
    'Conservative': number;
    'Moderate': number;
    'Aggressive': number;
    'Very Aggressive': number;
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
      const response = await api.post('/admin/risk-analysis');
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

  const handleAnalyzeRisk = async () => {
    if (!responses || responses.length === 0) {
      toast.error('No responses available for analysis');
      return;
    }

    setIsAnalyzing(true);
    try {
      // Perform client-side analysis
      const results = await performRiskAnalysis(responses);
      setAnalysisResults(results);
      
      // Calculate summary
      const summary = calculateAnalysisSummary(results);
      setAnalysisSummary(summary);
      
      toast.success(`Risk analysis completed for ${results.length} users!`);
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Failed to perform risk analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const performRiskAnalysis = async (responses: any[]): Promise<RiskAnalysisResult[]> => {
    // Group responses by user
    const userResponses = new Map<string, any[]>();
    
    responses.forEach(response => {
      if (!userResponses.has(response.userId)) {
        userResponses.set(response.userId, []);
      }
      userResponses.get(response.userId)!.push(response);
    });

    const results: RiskAnalysisResult[] = [];

    for (const [userId, userResponseList] of userResponses) {
      // Get user info
      const userInfo = userResponseList[0].user;
      
      // Extract trader performance responses (ratings 1-10)
      const traderResponses: number[] = [];
      
      userResponseList.forEach(response => {
        response.answers?.forEach((answer: any) => {
          if (answer.question?.config?.traderPerformance && answer.value) {
            const rating = parseInt(answer.value);
            if (!isNaN(rating) && rating >= 1 && rating <= 10) {
              traderResponses.push(rating);
            }
          }
        });
      });

      if (traderResponses.length === 0) continue;

      // Calculate statistics
      const mean = traderResponses.reduce((sum, val) => sum + val, 0) / traderResponses.length;
      const variance = traderResponses.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / traderResponses.length;
      const stdDev = Math.sqrt(variance);

      // Z-score normalization
      const normalizedResponses = traderResponses.map(val => (val - mean) / stdDev);

      // OLS Regression: rating = a + b * (expected_return - risk)
      // For simplicity, we'll use the trader performance data to create features
      const features: number[] = [];
      const targets: number[] = [];

      userResponseList.forEach(response => {
        response.answers?.forEach((answer: any) => {
          if (answer.question?.config?.traderPerformance && answer.value) {
            const rating = parseInt(answer.value);
            const traderData = answer.question.config.traderPerformance;
            
            // Create feature: expected return - risk (using mean and std dev)
            const expectedReturn = traderData.mean;
            const risk = traderData.stdDev;
            const feature = expectedReturn - risk; // Risk-adjusted return
            
            features.push(feature);
            targets.push(rating);
          }
        });
      });

      if (features.length < 2) continue;

      // Simple OLS regression
      const { coefficient, rSquared } = performOLSRegression(features, targets);
      
      // Risk classification based on coefficient
      const riskClassification = classifyRiskAversion(coefficient);

      results.push({
        userId,
        userName: userInfo.name,
        userEmail: userInfo.email,
        responses: traderResponses,
        normalizedResponses,
        riskAversionCoefficient: coefficient,
        riskClassification,
        rSquared,
        meanResponse: mean,
        stdDevResponse: stdDev
      });
    }

    return results.sort((a, b) => b.riskAversionCoefficient - a.riskAversionCoefficient);
  };

  const performOLSRegression = (x: number[], y: number[]): { coefficient: number; rSquared: number } => {
    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    const sumYY = y.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const yMean = sumY / n;
    const ssRes = y.reduce((sum, val, i) => sum + Math.pow(val - (intercept + slope * x[i]), 2), 0);
    const ssTot = y.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
    const rSquared = 1 - (ssRes / ssTot);

    return { coefficient: slope, rSquared: Math.max(0, rSquared) };
  };

  const classifyRiskAversion = (coefficient: number): RiskAnalysisResult['riskClassification'] => {
    if (coefficient <= -0.5) return 'Very Conservative';
    if (coefficient <= -0.2) return 'Conservative';
    if (coefficient <= 0.2) return 'Moderate';
    if (coefficient <= 0.5) return 'Aggressive';
    return 'Very Aggressive';
  };

  const calculateAnalysisSummary = (results: RiskAnalysisResult[]): AnalysisSummary => {
    const totalUsers = results.length;
    const averageRiskCoefficient = results.reduce((sum, r) => sum + r.riskAversionCoefficient, 0) / totalUsers;
    const averageRSquared = results.reduce((sum, r) => sum + r.rSquared, 0) / totalUsers;

    const classificationDistribution = {
      'Very Conservative': 0,
      'Conservative': 0,
      'Moderate': 0,
      'Aggressive': 0,
      'Very Aggressive': 0
    };

    results.forEach(result => {
      classificationDistribution[result.riskClassification]++;
    });

    return {
      totalUsers,
      averageRiskCoefficient,
      classificationDistribution,
      averageRSquared
    };
  };

  const getRiskColor = (classification: RiskAnalysisResult['riskClassification']): string => {
    switch (classification) {
      case 'Very Conservative': return '#dc2626'; // Red
      case 'Conservative': return '#f59e0b'; // Amber
      case 'Moderate': return '#6366f1'; // Indigo
      case 'Aggressive': return '#10b981'; // Emerald
      case 'Very Aggressive': return '#8b5cf6'; // Violet
      default: return '#6b7280';
    }
  };

  const exportAnalysis = () => {
    const exportData = {
      summary: analysisSummary,
      results: analysisResults,
      generatedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `risk-analysis-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (authLoading || responsesLoading) {
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

  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return null;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
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
                onClick={() => router.push('/admin/dashboard')}
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
                  Risk Aversion Analysis
                </h1>
                <p style={{
                  fontSize: '1rem',
                  color: '#6b7280',
                  margin: '0.25rem 0 0 0'
                }}>
                  Z-score normalization and OLS regression analysis
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={handleAnalyzeRisk}
                disabled={isAnalyzing || !responses || responses.length === 0}
                style={{
                  background: isAnalyzing 
                    ? '#9ca3af' 
                    : 'linear-gradient(135deg, #667eea, #764ba2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '0.75rem 1.5rem',
                  cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s ease'
                }}
              >
                {isAnalyzing ? <RefreshCw size={16} className="animate-spin" /> : <Brain size={16} />}
                {isAnalyzing ? 'Analyzing...' : 'Analyze Risk'}
              </button>
              {analysisResults.length > 0 && (
                <button
                  onClick={exportAnalysis}
                  style={{
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '0.75rem 1.5rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Download size={16} />
                  Export
                </button>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
                <Users size={24} color="white" />
              </div>
              <div>
                <h3 style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  color: '#0c4a6e',
                  margin: '0 0 0.25rem 0'
                }}>
                  {responses?.length || 0}
                </h3>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#0369a1',
                  margin: 0
                }}>
                  Total Responses
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
                <BarChart3 size={24} color="white" />
              </div>
              <div>
                <h3 style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  color: '#14532d',
                  margin: '0 0 0.25rem 0'
                }}>
                  {analysisResults.length}
                </h3>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#166534',
                  margin: 0
                }}>
                  Analyzed Users
                </p>
              </div>
            </div>

            {analysisSummary && (
              <>
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
                    <TrendingUp size={24} color="white" />
                  </div>
                  <div>
                    <h3 style={{
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      color: '#92400e',
                      margin: '0 0 0.25rem 0'
                    }}>
                      {analysisSummary.averageRiskCoefficient.toFixed(3)}
                    </h3>
                    <p style={{
                      fontSize: '0.875rem',
                      color: '#d97706',
                      margin: 0
                    }}>
                      Avg Risk Coefficient
                    </p>
                  </div>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)',
                  border: '1px solid #c4b5fd',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem'
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Target size={24} color="white" />
                  </div>
                  <div>
                    <h3 style={{
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      color: '#581c87',
                      margin: '0 0 0.25rem 0'
                    }}>
                      {(analysisSummary.averageRSquared * 100).toFixed(1)}%
                    </h3>
                    <p style={{
                      fontSize: '0.875rem',
                      color: '#7c3aed',
                      margin: 0
                    }}>
                      Avg R² Score
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>

        {/* Analysis Results */}
        {analysisResults.length > 0 && (
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
              justifyContent: 'space-between',
              marginBottom: '2rem'
            }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#1f2937',
                margin: 0
              }}>
                Risk Aversion Scatter Plot
              </h2>
              <button
                onClick={() => setShowDetails(!showDetails)}
                style={{
                  background: 'linear-gradient(135deg, #f3f4f6, #e5e7eb)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.5rem 1rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151'
                }}
              >
                {showDetails ? 'Hide Details' : 'Show Details'}
              </button>
            </div>

            {/* Scatter Plot */}
            <div style={{
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '2rem',
              marginBottom: '2rem',
              minHeight: '500px',
              position: 'relative'
            }}>
              <div style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#374151',
                textAlign: 'center',
                marginBottom: '1.5rem'
              }}>
                Risk Aversion Scatter Plot
              </div>
              
              {/* Scatter Plot Container */}
              <div style={{
                position: 'relative',
                width: '100%',
                height: '400px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                overflow: 'hidden'
              }}>
                {/* Y-axis labels */}
                <div style={{
                  position: 'absolute',
                  left: '0',
                  top: '0',
                  height: '100%',
                  width: '40px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '1rem 0.5rem',
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  fontWeight: '500'
                }}>
                  <div>1.0</div>
                  <div>0.5</div>
                  <div>0.0</div>
                  <div>-0.5</div>
                  <div>-1.0</div>
                </div>

                {/* X-axis labels */}
                <div style={{
                  position: 'absolute',
                  bottom: '0',
                  left: '40px',
                  right: '0',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  fontWeight: '500'
                }}>
                  Users (ordered by risk coefficient)
                </div>

                {/* X-axis tick marks for users */}
                {analysisResults.length > 1 && (
                  <div style={{
                    position: 'absolute',
                    bottom: '30px',
                    left: '50px',
                    right: '20px',
                    height: '10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start'
                  }}>
                    {analysisResults.map((_, index) => (
                      <div
                        key={index}
                        style={{
                          width: '1px',
                          height: '6px',
                          background: '#d1d5db',
                          position: 'relative'
                        }}
                      >
                        <div style={{
                          position: 'absolute',
                          top: '8px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          fontSize: '0.65rem',
                          color: '#9ca3af',
                          whiteSpace: 'nowrap'
                        }}>
                          {index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Y-axis line */}
                <div style={{
                  position: 'absolute',
                  left: '40px',
                  top: '0',
                  bottom: '30px',
                  width: '1px',
                  background: '#d1d5db'
                }} />

                {/* X-axis line */}
                <div style={{
                  position: 'absolute',
                  left: '40px',
                  right: '0',
                  bottom: '30px',
                  height: '1px',
                  background: '#d1d5db'
                }} />

                {/* Zero line */}
                <div style={{
                  position: 'absolute',
                  left: '40px',
                  right: '0',
                  top: '50%',
                  height: '1px',
                  background: '#9ca3af',
                  opacity: 0.5
                }} />

                {/* Scatter plot points */}
                <div style={{
                  position: 'absolute',
                  left: '50px',
                  right: '20px',
                  top: '20px',
                  bottom: '50px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  alignItems: 'flex-start',
                  justifyContent: 'flex-start'
                }}>
                  {analysisResults.map((result, index) => {
                    // Calculate position based on risk coefficient
                    // Map coefficient from [-1, 1] to [0, 1] for positioning
                    const normalizedCoeff = (result.riskAversionCoefficient + 1) / 2;
                    const yPosition = (1 - normalizedCoeff) * 100; // Invert for proper Y-axis
                    
                    // Better spacing for X-axis - ensure minimum spacing between points
                    const totalWidth = 100;
                    const minSpacing = Math.max(5, totalWidth / Math.max(1, analysisResults.length - 1));
                    const xPosition = analysisResults.length === 1 ? 50 : (index * minSpacing);
                    
                    return (
                      <div
                        key={result.userId}
                        style={{
                          position: 'absolute',
                          left: `${xPosition}%`,
                          top: `${yPosition}%`,
                          transform: 'translate(-50%, -50%)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '0.25rem',
                          zIndex: 10
                        }}
                      >
                        {/* User name label */}
                        <div style={{
                          background: 'rgba(0, 0, 0, 0.85)',
                          color: 'white',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: '600',
                          whiteSpace: 'nowrap',
                          opacity: 1,
                          pointerEvents: 'none',
                          transform: 'translateY(-12px)',
                          zIndex: 15,
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                          border: '1px solid rgba(255, 255, 255, 0.2)'
                        }}
                        className="user-label"
                        >
                          {result.userName}
                        </div>
                        
                        {/* Dot */}
                        <div
                          style={{
                            width: '12px',
                            height: '12px',
                            background: getRiskColor(result.riskClassification),
                            borderRadius: '50%',
                            cursor: 'pointer',
                            border: '2px solid white',
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.3)';
                            e.currentTarget.style.zIndex = '20';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.zIndex = '10';
                          }}
                          title={`${result.userName}: ${result.riskAversionCoefficient.toFixed(3)} (${result.riskClassification})`}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Risk category zones */}
                <div style={{
                  position: 'absolute',
                  left: '40px',
                  right: '0',
                  top: '20px',
                  bottom: '50px',
                  pointerEvents: 'none'
                }}>
                  {/* Very Conservative zone */}
                  <div style={{
                    position: 'absolute',
                    top: '0%',
                    left: '0',
                    right: '0',
                    height: '20%',
                    background: 'rgba(220, 38, 38, 0.05)',
                    border: '1px dashed rgba(220, 38, 38, 0.3)',
                    borderRadius: '4px'
                  }} />
                  
                  {/* Conservative zone */}
                  <div style={{
                    position: 'absolute',
                    top: '20%',
                    left: '0',
                    right: '0',
                    height: '20%',
                    background: 'rgba(245, 158, 11, 0.05)',
                    border: '1px dashed rgba(245, 158, 11, 0.3)',
                    borderRadius: '4px'
                  }} />
                  
                  {/* Moderate zone */}
                  <div style={{
                    position: 'absolute',
                    top: '40%',
                    left: '0',
                    right: '0',
                    height: '20%',
                    background: 'rgba(99, 102, 241, 0.05)',
                    border: '1px dashed rgba(99, 102, 241, 0.3)',
                    borderRadius: '4px'
                  }} />
                  
                  {/* Aggressive zone */}
                  <div style={{
                    position: 'absolute',
                    top: '60%',
                    left: '0',
                    right: '0',
                    height: '20%',
                    background: 'rgba(16, 185, 129, 0.05)',
                    border: '1px dashed rgba(16, 185, 129, 0.3)',
                    borderRadius: '4px'
                  }} />
                  
                  {/* Very Aggressive zone */}
                  <div style={{
                    position: 'absolute',
                    top: '80%',
                    left: '0',
                    right: '0',
                    height: '20%',
                    background: 'rgba(139, 92, 246, 0.05)',
                    border: '1px dashed rgba(139, 92, 246, 0.3)',
                    borderRadius: '4px'
                  }} />
                </div>
              </div>

              {/* Legend and axis labels */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '1rem',
                fontSize: '0.875rem',
                color: '#6b7280'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    background: '#9ca3af',
                    borderRadius: '50%'
                  }} />
                  <span>Each dot represents a user (names always visible)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    background: '#d1d5db',
                    borderRadius: '2px'
                  }} />
                  <span>Risk zones (dashed borders)</span>
                </div>
              </div>
            </div>

            {/* Classification Legend */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem'
            }}>
              {Object.entries(analysisSummary?.classificationDistribution || {}).map(([classification, count]) => (
                <div
                  key={classification}
                  style={{
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    border: `2px solid ${getRiskColor(classification as RiskAnalysisResult['riskClassification'])}`,
                    borderRadius: '12px',
                    padding: '1rem',
                    textAlign: 'center'
                  }}
                >
                  <div style={{
                    width: '20px',
                    height: '20px',
                    background: getRiskColor(classification as RiskAnalysisResult['riskClassification']),
                    borderRadius: '50%',
                    margin: '0 auto 0.5rem auto'
                  }} />
                  <div style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#1f2937',
                    marginBottom: '0.25rem'
                  }}>
                    {classification}
                  </div>
                  <div style={{
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    color: getRiskColor(classification as RiskAnalysisResult['riskClassification'])
                  }}>
                    {count}
                  </div>
                </div>
              ))}
            </div>

            {/* Detailed Results Table */}
            {showDetails && (
              <div style={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                borderRadius: '12px',
                padding: '1.5rem',
                border: '1px solid #e2e8f0'
              }}>
                <h3 style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  color: '#1f2937',
                  marginBottom: '1rem'
                }}>
                  Detailed Analysis Results
                </h3>
                <div style={{
                  overflowX: 'auto',
                  background: 'white',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb' }}>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>User</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Risk Coefficient</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Classification</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>R² Score</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Responses</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysisResults.map((result, index) => (
                        <tr key={result.userId} style={{ borderTop: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                            <div>
                              <div style={{ fontWeight: '500', color: '#1f2937' }}>{result.userName}</div>
                              <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>{result.userEmail}</div>
                            </div>
                          </td>
                          <td style={{ padding: '0.75rem', fontSize: '0.875rem', fontWeight: '600', color: '#1f2937' }}>
                            {result.riskAversionCoefficient.toFixed(3)}
                          </td>
                          <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                            <span style={{
                              background: `${getRiskColor(result.riskClassification)}20`,
                              color: getRiskColor(result.riskClassification),
                              padding: '0.25rem 0.5rem',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: '600'
                            }}>
                              {result.riskClassification}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#1f2937' }}>
                            {(result.rSquared * 100).toFixed(1)}%
                          </td>
                          <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#6b7280' }}>
                            {result.responses.length}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* No Data State */}
        {!isAnalyzing && analysisResults.length === 0 && responses && responses.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              borderRadius: '20px',
              padding: '3rem',
              textAlign: 'center',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
          >
            <BarChart3 size={64} color="#9ca3af" style={{ marginBottom: '1rem' }} />
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Ready for Risk Analysis
            </h3>
            <p style={{
              fontSize: '1rem',
              color: '#6b7280',
              marginBottom: '1.5rem'
            }}>
              Click "Analyze Risk" to perform z-score normalization and OLS regression analysis on user responses.
            </p>
          </motion.div>
        )}

        {/* No Responses State */}
        {responses && responses.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              borderRadius: '20px',
              padding: '3rem',
              textAlign: 'center',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
          >
            <AlertCircle size={64} color="#9ca3af" style={{ marginBottom: '1rem' }} />
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              No Responses Available
            </h3>
            <p style={{
              fontSize: '1rem',
              color: '#6b7280',
              marginBottom: '1.5rem'
            }}>
              There are no user responses available for risk analysis. Users need to complete surveys first.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
