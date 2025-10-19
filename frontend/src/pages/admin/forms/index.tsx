import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  BarChart,
  FileText,
  Calendar,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  MoreVertical,
  Play,
  Pause,
  Settings
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../services/api';
import toast from 'react-hot-toast';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';

interface Form {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  questions?: any[];
  _count?: {
    responses: number;
  };
}

const AdminFormsPage: React.FC = () => {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [showActionsMenu, setShowActionsMenu] = useState<string | null>(null);

  useEffect(() => {
    console.log('=== ADMIN FORMS PAGE LOADED ===');
    console.log('User:', user);
    console.log('Router:', router);
    
    // Only redirect if user data has been loaded and user is not authenticated
    if (!authLoading && user === null) {
      router.push('/login');
    } else if (user && user.role !== 'admin' && user.role !== 'super_admin') {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  const { data: forms, isLoading } = useQuery({
    queryKey: ['admin-forms'],
    queryFn: async () => {
      const response = await api.get('/forms');
      console.log('Forms data received:', response.data);
      console.log('Forms array:', response.data);
      if (response.data && response.data.length > 0) {
        console.log('First form details:', response.data[0]);
        console.log('First form ID:', response.data[0].id);
      }
      return response.data;
    },
    enabled: !!user && (user.role === 'admin' || user.role === 'super_admin'),
  });

  const publishMutation = useMutation({
    mutationFn: async (formId: string) => {
      const response = await api.post(`/forms/${formId}/publish`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-forms'] });
      toast.success('Form published successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to publish form');
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: async (formId: string) => {
      const response = await api.post(`/forms/${formId}/unpublish`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-forms'] });
      toast.success('Form unpublished successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to unpublish form');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (formId: string) => {
      await api.delete(`/forms/${formId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-forms'] });
      toast.success('Form deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete form');
    },
  });

  const handlePublish = (formId: string) => {
    publishMutation.mutate(formId);
    setShowActionsMenu(null);
  };

  const handleUnpublish = (formId: string) => {
    unpublishMutation.mutate(formId);
    setShowActionsMenu(null);
  };

  const handleDelete = (formId: string) => {
    if (window.confirm('Are you sure you want to delete this form? This action cannot be undone.')) {
      deleteMutation.mutate(formId);
      setShowActionsMenu(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published':
        return <CheckCircle size={16} color="#10b981" />;
      case 'draft':
        return <Clock size={16} color="#f59e0b" />;
      default:
        return <AlertCircle size={16} color="#6b7280" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return '#10b981';
      case 'draft':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!user || isLoading) {
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

  // Show loading while authentication is being checked
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
              <FileText size={24} color="white" />
            </div>
            <div>
              <h1 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#1f2937',
                margin: 0
              }}>
                Manage Forms
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
              onClick={() => router.push('/admin/results')}
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
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}
            >
              <BarChart size={20} />
              View Results
            </button>
            <button
              onClick={() => router.push('/admin/forms/new')}
              style={{
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '0.75rem 1.5rem',
                cursor: 'pointer',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 8px rgba(102, 126, 234, 0.3)'
              }}
            >
              <Plus size={20} />
              Create Form
            </button>
          </div>
        </div>
      </header>

      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem 1.5rem'
      }}>
        {/* Stats Overview */}
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
                Published
              </h3>
              <CheckCircle size={20} color="#10b981" />
            </div>
            <p style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#1f2937',
              margin: 0
            }}>
              {forms?.filter((f: Form) => f.status === 'published').length || 0}
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
                Drafts
              </h3>
              <Clock size={20} color="#f59e0b" />
            </div>
            <p style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#1f2937',
              margin: 0
            }}>
              {forms?.filter((f: Form) => f.status === 'draft').length || 0}
            </p>
          </div>
        </motion.div>

        {/* Forms List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
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
              All Forms ({forms?.length || 0})
            </h3>
          </div>

          {forms?.length > 0 ? (
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
                      Form
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
                      Questions
                    </th>
                    <th style={{
                      padding: '1rem',
                      textAlign: 'left',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151'
                    }}>
                      Created
                    </th>
                    <th style={{
                      padding: '1rem',
                      textAlign: 'right',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      width: '200px'
                    }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {forms.map((form: Form, index: number) => (
                    <motion.tr
                      key={form.id}
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
                            fontSize: '1rem',
                            fontWeight: '600',
                            color: '#1f2937',
                            margin: '0 0 0.25rem 0'
                          }}>
                            {form.title}
                          </h4>
                          <p style={{
                            fontSize: '0.875rem',
                            color: '#6b7280',
                            margin: 0,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}>
                            {form.description || 'No description'}
                          </p>
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          {getStatusIcon(form.status)}
                          <span style={{
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            color: getStatusColor(form.status),
                            textTransform: 'capitalize'
                          }}>
                            {form.status}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          fontSize: '0.875rem',
                          color: '#374151',
                          fontWeight: '500'
                        }}>
                          {form.questions?.length || 0} questions
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <Calendar size={16} color="#6b7280" />
                          <span style={{
                            fontSize: '0.875rem',
                            color: '#374151'
                          }}>
                            {formatDate(form.createdAt)}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: '0.75rem'
                        }}>
                          <button
                            onClick={() => router.push(`/admin/forms/${form.id}/edit`)}
                            style={{
                              background: 'linear-gradient(135deg, #667eea, #764ba2)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '0.5rem 1rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              transition: 'all 0.2s ease',
                              fontSize: '0.875rem',
                              fontWeight: '500',
                              boxShadow: '0 2px 4px rgba(102, 126, 234, 0.3)'
                            }}
                            title="Edit form"
                          >
                            <Edit size={16} />
                            Edit
                          </button>
                          
                          <button
                            onClick={() => router.push(`/surveys/${form.id}`)}
                            style={{
                              background: 'white',
                              color: '#10b981',
                              border: '1px solid #10b981',
                              borderRadius: '8px',
                              padding: '0.5rem 1rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              transition: 'all 0.2s ease',
                              fontSize: '0.875rem',
                              fontWeight: '500'
                            }}
                            title="Preview form"
                          >
                            <Eye size={16} />
                            Preview
                          </button>

                          <div style={{ position: 'relative' }}>
                            <button
                              onClick={() => setShowActionsMenu(showActionsMenu === form.id ? null : form.id)}
                              style={{
                                background: 'white',
                                color: '#6b7280',
                                border: '1px solid #d1d5db',
                                borderRadius: '8px',
                                padding: '0.5rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s ease',
                                minWidth: '36px',
                                minHeight: '36px'
                              }}
                              title="More actions"
                            >
                              <MoreVertical size={16} />
                            </button>

                            {showActionsMenu === form.id && (
                              <div style={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                background: 'white',
                                border: '1px solid #d1d5db',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                zIndex: 10,
                                minWidth: '150px',
                                marginTop: '0.25rem'
                              }}>
                                {form.status === 'draft' ? (
                                  <button
                                    onClick={() => handlePublish(form.id)}
                                    disabled={publishMutation.isPending}
                                    style={{
                                      width: '100%',
                                      padding: '0.75rem 1rem',
                                      background: 'none',
                                      border: 'none',
                                      textAlign: 'left',
                                      cursor: publishMutation.isPending ? 'not-allowed' : 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.5rem',
                                      fontSize: '0.875rem',
                                      color: '#10b981',
                                      opacity: publishMutation.isPending ? 0.7 : 1
                                    }}
                                  >
                                    <Play size={16} />
                                    Publish
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleUnpublish(form.id)}
                                    disabled={unpublishMutation.isPending}
                                    style={{
                                      width: '100%',
                                      padding: '0.75rem 1rem',
                                      background: 'none',
                                      border: 'none',
                                      textAlign: 'left',
                                      cursor: unpublishMutation.isPending ? 'not-allowed' : 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.5rem',
                                      fontSize: '0.875rem',
                                      color: '#f59e0b',
                                      opacity: unpublishMutation.isPending ? 0.7 : 1
                                    }}
                                  >
                                    <Pause size={16} />
                                    Unpublish
                                  </button>
                                )}
                                
                                <button
                                  onClick={() => router.push(`/admin/results?form=${form.id}`)}
                                  style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem',
                                    background: 'none',
                                    border: 'none',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    fontSize: '0.875rem',
                                    color: '#667eea',
                                    borderTop: '1px solid #f3f4f6'
                                  }}
                                >
                                  <BarChart size={16} />
                                  View Results
                                </button>
                                
                                <button
                                  onClick={() => handleDelete(form.id)}
                                  disabled={deleteMutation.isPending}
                                  style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem',
                                    background: 'none',
                                    border: 'none',
                                    textAlign: 'left',
                                    cursor: deleteMutation.isPending ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    fontSize: '0.875rem',
                                    color: '#ef4444',
                                    borderTop: '1px solid #f3f4f6',
                                    opacity: deleteMutation.isPending ? 0.7 : 1
                                  }}
                                >
                                  <Trash2 size={16} />
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </motion.tr>
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
                No forms created yet
              </h3>
              <p style={{ marginBottom: '1.5rem' }}>
                Create your first form to get started
              </p>
              <button
                onClick={() => router.push('/admin/forms/new')}
                style={{
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '0.75rem 1.5rem',
                  cursor: 'pointer',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  margin: '0 auto',
                  transition: 'all 0.2s ease'
                }}
              >
                <Plus size={20} />
                Create First Form
              </button>
            </div>
          )}
        </motion.div>
      </div>

      {/* Click outside to close menu */}
      {showActionsMenu && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 5
          }}
          onClick={() => setShowActionsMenu(null)}
        />
      )}
    </div>
  );
};

export default AdminFormsPage;