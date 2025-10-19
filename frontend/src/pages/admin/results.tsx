import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Download, 
  Filter,
  Search,
  BarChart,
  Users,
  FileText,
  Calendar,
  Eye,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

interface Form {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    responses: number;
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
  };
  answers: Array<{
    id: string;
    questionId: string;
    value: string[];
    question: {
      id: string;
      text: string;
      type: string;
    };
  }>;
}

const AdminResultsPage: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedForm, setSelectedForm] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch all forms
  const { data: forms, isLoading: formsLoading } = useQuery({
    queryKey: ['admin-forms'],
    queryFn: async () => {
      const response = await api.get('/forms');
      return response.data;
    },
    enabled: !!user && (user.role === 'admin' || user.role === 'super_admin'),
  });

  // Fetch responses for selected form
  const { data: responses, isLoading: responsesLoading } = useQuery({
    queryKey: ['responses', selectedForm],
    queryFn: async () => {
      if (!selectedForm) return [];
      const response = await api.get(`/responses/forms/${selectedForm}`);
      return response.data;
    },
    enabled: !!selectedForm && !!user && (user.role === 'admin' || user.role === 'super_admin'),
  });

  // Fetch all responses (for overview)
  const { data: allResponses, isLoading: allResponsesLoading } = useQuery({
    queryKey: ['all-responses'],
    queryFn: async () => {
      const response = await api.get('/responses/my-responses');
      return response.data;
    },
    enabled: !!user && (user.role === 'admin' || user.role === 'super_admin'),
  });

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
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>You need to be logged in to view results.</p>
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
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>You don't have permission to view results.</p>
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

  const filteredResponses = responses?.filter((response: Response) => {
    const matchesSearch = !searchTerm || 
      response.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      response.user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || response.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted':
        return <CheckCircle size={16} color="#10b981" />;
      case 'in_progress':
        return <Clock size={16} color="#f59e0b" />;
      default:
        return <AlertCircle size={16} color="#6b7280" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return '#10b981';
      case 'in_progress':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (formsLoading || allResponsesLoading) {
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
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#1f2937',
                margin: 0
              }}>
                Survey Results
              </h1>
              <p style={{
                fontSize: '0.875rem',
                color: '#6b7280',
                margin: 0
              }}>
                Admin Panel
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => router.push(`/admin/analytics/${selectedForm}`)}
              disabled={!selectedForm}
              style={{
                background: 'white',
                color: '#f59e0b',
                border: '1px solid #d1d5db',
                borderRadius: '12px',
                padding: '0.75rem 1.5rem',
                cursor: selectedForm ? 'pointer' : 'not-allowed',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s ease',
                opacity: selectedForm ? 1 : 0.5
              }}
            >
              <BarChart size={20} />
              Risk Analysis
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
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem 1.5rem'
      }}>
        {/* Overview Stats */}
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
                Total Forms
              </h3>
              <FileText size={20} color="#667eea" />
            </div>
            <p style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#1f2937',
              margin: 0
            }}>
              {forms?.length || 0}
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
                Total Responses
              </h3>
              <Users size={20} color="#10b981" />
            </div>
            <p style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#1f2937',
              margin: 0
            }}>
              {allResponses?.length || 0}
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
                Completed Responses
              </h3>
              <CheckCircle size={20} color="#10b981" />
            </div>
            <p style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#1f2937',
              margin: 0
            }}>
              {allResponses?.filter((r: Response) => r.status === 'submitted').length || 0}
            </p>
          </div>
        </motion.div>

        {/* Form Selection and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            padding: '1.5rem',
            marginBottom: '2rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(226, 232, 240, 0.8)'
          }}
        >
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Select Form
              </label>
              <select
                value={selectedForm}
                onChange={(e) => setSelectedForm(e.target.value)}
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
                <option value="">Choose a form...</option>
                {forms?.map((form: Form) => (
                  <option key={form.id} value={form.id}>
                    {form.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Search Users
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or email..."
                  style={{
                    width: '100%',
                    padding: '12px 16px 12px 40px',
                    border: '1px solid #d1d5db',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    background: 'white',
                    outline: 'none'
                  }}
                />
                <Search size={20} color="#6b7280" style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)'
                }} />
              </div>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Filter by Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
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
                <option value="all">All Status</option>
                <option value="submitted">Completed</option>
                <option value="in_progress">In Progress</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Results Table */}
        {selectedForm && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
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
                Responses ({filteredResponses.length})
              </h3>
            </div>

            {responsesLoading ? (
              <div style={{
                padding: '3rem',
                textAlign: 'center'
              }}>
                <LoadingSpinner />
              </div>
            ) : filteredResponses.length > 0 ? (
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
                        Status
                      </th>
                      <th style={{
                        padding: '1rem',
                        textAlign: 'left',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#374151'
                      }}>
                        Started
                      </th>
                      <th style={{
                        padding: '1rem',
                        textAlign: 'left',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#374151'
                      }}>
                        Submitted
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
                    {filteredResponses.map((response: Response) => (
                      <tr key={response.id} style={{
                        borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
                        transition: 'all 0.2s ease'
                      }}>
                        <td style={{ padding: '1rem' }}>
                          <div>
                            <p style={{
                              fontSize: '0.875rem',
                              fontWeight: '500',
                              color: '#1f2937',
                              margin: '0 0 0.25rem 0'
                            }}>
                              {response.user.name}
                            </p>
                            <p style={{
                              fontSize: '0.75rem',
                              color: '#6b7280',
                              margin: 0
                            }}>
                              {response.user.email}
                            </p>
                          </div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}>
                            {getStatusIcon(response.status)}
                            <span style={{
                              fontSize: '0.875rem',
                              fontWeight: '500',
                              color: getStatusColor(response.status),
                              textTransform: 'capitalize'
                            }}>
                              {response.status.replace('_', ' ')}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <p style={{
                            fontSize: '0.875rem',
                            color: '#374151',
                            margin: 0
                          }}>
                            {formatDate(response.startedAt)}
                          </p>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <p style={{
                            fontSize: '0.875rem',
                            color: '#374151',
                            margin: 0
                          }}>
                            {response.submittedAt ? formatDate(response.submittedAt) : '-'}
                          </p>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <button
                            onClick={() => router.push(`/admin/responses/${response.id}`)}
                            style={{
                              background: 'linear-gradient(135deg, #667eea, #764ba2)',
                              color: 'white',
                              border: 'none',
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
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{
                padding: '3rem',
                textAlign: 'center',
                color: '#6b7280'
              }}>
                <FileText size={48} color="#d1d5db" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  No responses found
                </h3>
                <p>No responses match your current filters.</p>
              </div>
            )}
          </motion.div>
        )}

        {!selectedForm && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              padding: '3rem',
              textAlign: 'center',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(226, 232, 240, 0.8)'
            }}
          >
            <BarChart size={48} color="#d1d5db" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Select a form to view results
            </h3>
            <p style={{ color: '#6b7280' }}>
              Choose a form from the dropdown above to see detailed response data.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AdminResultsPage;
