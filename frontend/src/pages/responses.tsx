import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Trash2, 
  Eye,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  BarChart,
  Search,
  Filter
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { formatDate } from '../lib/utils';
import toast from 'react-hot-toast';

interface Response {
  id: string;
  formId: string;
  userId: string;
  status: string;
  startedAt: string;
  submittedAt?: string;
  form: {
    id: string;
    title: string;
    description: string;
  };
  answers: Array<{
    id: string;
    questionId: string;
    value: any;
    question: {
      id: string;
      text: string;
      type: string;
    };
  }>;
}

export default function UserResponsesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Fetch user responses
  const { data: responses, isLoading, error } = useQuery({
    queryKey: ['user-responses', user?.id],
    queryFn: async () => {
      try {
        const response = await api.get('/responses/my-responses');
        return response.data || [];
      } catch (error) {
        console.error('Error fetching user responses:', error);
        throw error;
      }
    },
    enabled: !!user,
  });

  // Delete response mutation
  const deleteResponseMutation = useMutation({
    mutationFn: async (responseId: string) => {
      const response = await api.delete(`/responses/${responseId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-responses', user?.id] });
      toast.success('Response deleted successfully!');
    },
    onError: (error: any) => {
      console.error('Delete response error:', error);
      toast.error(error.response?.data?.message || 'Failed to delete response');
    },
  });

  const handleDeleteResponse = (responseId: string, formTitle: string) => {
    if (confirm(`Are you sure you want to delete your response to "${formTitle}"? This action cannot be undone.`)) {
      deleteResponseMutation.mutate(responseId);
    }
  };

  const handleViewResponse = (responseId: string) => {
    router.push(`/responses/${responseId}`);
  };

  // Filter responses based on search term and status
  const filteredResponses = responses?.filter((response: Response) => {
    const matchesSearch = response.form.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         response.form.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || response.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

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

  if (error) {
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
          <h2 style={{ color: '#1f2937', marginBottom: '0.5rem' }}>Error Loading Responses</h2>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
            There was an error loading your responses. Please try again.
          </p>
          <button
            onClick={() => window.location.reload()}
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
            Retry
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
                onClick={() => router.push('/dashboard')}
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
                  My Responses
                </h1>
                <p style={{
                  fontSize: '1rem',
                  color: '#6b7280',
                  margin: '0.25rem 0 0 0'
                }}>
                  View and manage your survey responses
                </p>
              </div>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
              padding: '0.5rem',
              borderRadius: '12px',
              border: '1px solid #bae6fd'
            }}>
              <BarChart size={20} color="#0369a1" />
              <span style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#0369a1'
              }}>
                {responses?.length || 0} Responses
              </span>
            </div>
          </div>

          {/* Search and Filter */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: '1rem',
            alignItems: 'center'
          }}>
            <div style={{ position: 'relative' }}>
              <Search 
                size={20} 
                color="#6b7280" 
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)'
                }}
              />
              <input
                type="text"
                placeholder="Search responses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '12px',
                  fontSize: '0.875rem',
                  background: 'white',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '12px',
                fontSize: '0.875rem',
                background: 'white',
                cursor: 'pointer',
                minWidth: '150px'
              }}
            >
              <option value="all">All Status</option>
              <option value="in_progress">In Progress</option>
              <option value="submitted">Submitted</option>
            </select>
          </div>
        </motion.div>

        {/* Responses List */}
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
          {filteredResponses.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem 1rem'
            }}>
              <FileText size={64} color="#9ca3af" style={{ marginBottom: '1rem' }} />
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                {searchTerm || statusFilter !== 'all' ? 'No matching responses found' : 'No responses yet'}
              </h3>
              <p style={{
                fontSize: '1rem',
                color: '#6b7280',
                marginBottom: '1.5rem'
              }}>
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Start by taking some surveys to see your responses here.'
                }
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <button
                  onClick={() => router.push('/surveys')}
                  style={{
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
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
                    margin: '0 auto'
                  }}
                >
                  <BarChart size={16} />
                  Browse Surveys
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredResponses.map((response: Response, index: number) => (
                <motion.div
                  key={response.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  style={{
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    borderRadius: '16px',
                    padding: '1.5rem',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: '1rem'
                  }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{
                        fontSize: '1.125rem',
                        fontWeight: '600',
                        color: '#1f2937',
                        margin: '0 0 0.5rem 0'
                      }}>
                        {response.form.title}
                      </h3>
                      <p style={{
                        fontSize: '0.875rem',
                        color: '#6b7280',
                        margin: '0 0 1rem 0',
                        lineHeight: '1.5'
                      }}>
                        {response.form.description}
                      </p>
                      
                      {/* Response Info */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        flexWrap: 'wrap'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          background: response.status === 'submitted' 
                            ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
                            : 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '8px',
                          border: `1px solid ${response.status === 'submitted' ? '#bbf7d0' : '#fbbf24'}`
                        }}>
                          {response.status === 'submitted' ? (
                            <CheckCircle size={16} color="#16a34a" />
                          ) : (
                            <Clock size={16} color="#d97706" />
                          )}
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            color: response.status === 'submitted' ? '#166534' : '#92400e'
                          }}>
                            {response.status === 'submitted' ? 'Submitted' : 'In Progress'}
                          </span>
                        </div>
                        
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          color: '#6b7280',
                          fontSize: '0.75rem'
                        }}>
                          <Calendar size={14} />
                          <span>Started: {formatDate(response.startedAt)}</span>
                        </div>
                        
                        {response.submittedAt && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            color: '#6b7280',
                            fontSize: '0.75rem'
                          }}>
                            <CheckCircle size={14} />
                            <span>Submitted: {formatDate(response.submittedAt)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginLeft: '1rem'
                    }}>
                      <button
                        onClick={() => handleViewResponse(response.id)}
                        style={{
                          background: 'linear-gradient(135deg, #667eea, #764ba2)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '0.5rem 1rem',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <Eye size={14} />
                        View
                      </button>
                      <button
                        onClick={() => handleDeleteResponse(response.id, response.form.title)}
                        disabled={deleteResponseMutation.isPending}
                        style={{
                          background: deleteResponseMutation.isPending 
                            ? '#9ca3af' 
                            : 'linear-gradient(135deg, #ef4444, #dc2626)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '0.5rem 1rem',
                          cursor: deleteResponseMutation.isPending ? 'not-allowed' : 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <Trash2 size={14} />
                        {deleteResponseMutation.isPending ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
