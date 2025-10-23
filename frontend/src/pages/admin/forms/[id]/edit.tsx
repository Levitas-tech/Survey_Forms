import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Edit3,
  Eye,
  GripVertical,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../../services/api';
import toast from 'react-hot-toast';
import { LoadingSpinner } from '../../../../components/ui/LoadingSpinner';

interface Question {
  id: string;
  type: string;
  text: string;
  description?: string;
  required: boolean;
  orderIndex: number;
  options?: Option[];
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
}

interface Option {
  id?: string;
  text: string;
  value: string;
  imageUrl?: string;
  orderIndex?: number;
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

const AdminFormEditorPage: React.FC = () => {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const { id } = router.query;
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [showAddQuestion, setShowAddQuestion] = useState(false);

  const [newQuestion, setNewQuestion] = useState<Partial<Question>>({
    type: 'single_choice',
    text: '',
    description: '',
    required: true,
    options: []
  });

  useEffect(() => {
    // Only redirect if user data has been loaded and user is not authenticated
    if (!authLoading && user === null) {
      router.push('/login');
    } else if (user && user.role !== 'admin' && user.role !== 'super_admin') {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  const { data: form, isLoading, error } = useQuery({
    queryKey: ['admin-form', id],
    queryFn: async () => {
      const response = await api.get(`/forms/${id}`);
      return response.data;
    },
    enabled: !!id && !!user,
  });

  const updateFormMutation = useMutation({
    mutationFn: async (formData: Partial<Form>) => {
      const response = await api.patch(`/forms/${id}`, formData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-form', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-forms'] });
      toast.success('Form updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update form');
    }
  });

  const updateQuestionMutation = useMutation({
    mutationFn: async ({ questionId, questionData }: { questionId: string; questionData: Partial<Question> }) => {
      // Only send the fields that the backend UpdateQuestionDto expects
      const cleanQuestionData = {
        type: questionData.type,
        text: questionData.text,
        required: questionData.required,
        options: questionData.options?.map(option => ({
          text: option.text,
          value: option.value,
          imageUrl: option.imageUrl
        })),
        config: questionData.config
      };
      const response = await api.patch(`/forms/${id}/questions/${questionId}`, cleanQuestionData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-form', id] });
      toast.success('Question updated successfully!');
      setEditingQuestion(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update question');
    }
  });

  const addQuestionMutation = useMutation({
    mutationFn: async (questionData: Partial<Question>) => {
      // Only send the fields that the backend DTO expects
      const cleanQuestionData = {
        type: questionData.type,
        text: questionData.text,
        description: questionData.description,
        required: questionData.required,
        order: questionData.orderIndex,
        options: questionData.options?.map(option => ({
          text: option.text,
          value: option.value,
          imageUrl: option.imageUrl
        })),
        config: questionData.config
      };
      const response = await api.post(`/forms/${id}/questions`, cleanQuestionData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-form', id] });
      toast.success('Question added successfully!');
      setShowAddQuestion(false);
      setNewQuestion({
        type: 'single_choice',
        text: '',
        description: '',
        required: true,
        options: []
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to add question');
    }
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async (questionId: string) => {
      const response = await api.delete(`/forms/${id}/questions/${questionId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-form', id] });
      toast.success('Question deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete question');
    }
  });

  const handleSaveForm = () => {
    if (!form) return;
    updateFormMutation.mutate({
      title: form.title,
      description: form.description,
      status: form.status
    });
  };

  const handleEditQuestion = (questionId: string) => {
    setEditingQuestion(questionId);
  };

  const handleSaveQuestion = (questionId: string, questionData: Partial<Question>) => {
    updateQuestionMutation.mutate({ questionId, questionData });
  };

  const handleAddQuestion = () => {
    if (!newQuestion.text?.trim()) {
      toast.error('Please enter question text');
      return;
    }
    addQuestionMutation.mutate(newQuestion);
  };

  const handleDeleteQuestion = (questionId: string) => {
    if (confirm('Are you sure you want to delete this question?')) {
      deleteQuestionMutation.mutate(questionId);
    }
  };

  const handleAddOption = (questionId: string) => {
    const question = form?.questions.find((q: any) => q.id === questionId);
    if (question) {
      const newOption = {
        text: '',
        value: '',
        orderIndex: (question.options?.length || 0) + 1
      };
      const updatedOptions = [...(question.options || []), newOption];
      handleSaveQuestion(questionId, { options: updatedOptions });
    }
  };

  const handleUpdateOption = (questionId: string, optionIndex: number, field: keyof Option, value: string) => {
    const question = form?.questions.find((q: any) => q.id === questionId);
    if (question && question.options) {
      const updatedOptions = [...question.options];
      updatedOptions[optionIndex] = { ...updatedOptions[optionIndex], [field]: value };
      handleSaveQuestion(questionId, { options: updatedOptions });
    }
  };

  const handleRemoveOption = (questionId: string, optionIndex: number) => {
    const question = form?.questions.find((q: any) => q.id === questionId);
    if (question && question.options) {
      const updatedOptions = question.options.filter((_: any, index: number) => index !== optionIndex);
      handleSaveQuestion(questionId, { options: updatedOptions });
    }
  };

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !form) {
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
          <AlertCircle size={48} color="#ef4444" style={{ marginBottom: '1rem' }} />
          <h2 style={{ marginBottom: '1rem', color: '#1f2937' }}>Form Not Found</h2>
          <p style={{ color: '#6b7280', marginBottom: '2rem' }}>The form you're looking for doesn't exist or you don't have permission to view it.</p>
          <button
            onClick={() => router.push('/admin/forms')}
            style={{
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '0.75rem 1.5rem',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Back to Forms
          </button>
        </div>
      </div>
    );
  }

  // Show loading while authentication is being checked
  if (authLoading) {
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

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '2rem'
    }}>
      {/* Header */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: '24px',
        padding: '2rem',
        marginBottom: '2rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => router.push('/admin/forms')}
              style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s ease'
              }}
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 style={{
                fontSize: '2rem',
                fontWeight: '700',
                color: '#1f2937',
                margin: 0
              }}>
                Edit Form
              </h1>
              <p style={{
                color: '#6b7280',
                margin: '0.25rem 0 0 0'
              }}>
                {form.title}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{
              background: form.status === 'published' ? '#10b981' : '#6b7280',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '20px',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}>
              {form.status}
            </span>
            <button
              onClick={handleSaveForm}
              disabled={updateFormMutation.isPending}
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
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
                opacity: updateFormMutation.isPending ? 0.7 : 1
              }}
            >
              <Save size={20} />
              Save Form
            </button>
          </div>
        </div>

        {/* Form Details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Form Title
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => {
                // Update form title in local state
                const updatedForm = { ...form, title: e.target.value };
                queryClient.setQueryData(['admin-form', id], updatedForm);
              }}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem',
                background: 'white'
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
              Status
            </label>
            <select
              value={form.status}
              onChange={(e) => {
                const updatedForm = { ...form, status: e.target.value };
                queryClient.setQueryData(['admin-form', id], updatedForm);
              }}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem',
                background: 'white'
              }}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
        <div style={{ marginTop: '1rem' }}>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '0.5rem'
          }}>
            Description
          </label>
          <textarea
            value={form.description}
            onChange={(e) => {
              const updatedForm = { ...form, description: e.target.value };
              queryClient.setQueryData(['admin-form', id], updatedForm);
            }}
            rows={3}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '1rem',
              background: 'white',
              resize: 'vertical'
            }}
          />
        </div>
      </div>

      {/* Questions Section */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: '24px',
        padding: '2rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '2rem'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#1f2937',
            margin: 0
          }}>
            Questions ({form.questions?.length || 0})
          </h2>
          <button
            onClick={() => setShowAddQuestion(true)}
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
              transition: 'all 0.2s ease'
            }}
          >
            <Plus size={20} />
            Add Question
          </button>
        </div>

        {/* Questions List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {form.questions?.map((question: any, index: number) => (
            <QuestionEditor
              key={question.id}
              question={question}
              index={index}
              isEditing={editingQuestion === question.id}
              onEdit={() => handleEditQuestion(question.id)}
              onSave={(questionData) => handleSaveQuestion(question.id, questionData)}
              onDelete={() => handleDeleteQuestion(question.id)}
              onAddOption={() => handleAddOption(question.id)}
              onUpdateOption={(optionIndex, field, value) => handleUpdateOption(question.id, optionIndex, field, value)}
              onRemoveOption={(optionIndex) => handleRemoveOption(question.id, optionIndex)}
            />
          ))}
        </div>

        {/* Add Question Modal */}
        {showAddQuestion && (
          <AddQuestionModal
            question={newQuestion}
            onChange={setNewQuestion}
            onSave={handleAddQuestion}
            onCancel={() => setShowAddQuestion(false)}
          />
        )}
      </div>
    </div>
  );
};

// Question Editor Component
const QuestionEditor: React.FC<{
  question: Question;
  index: number;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (questionData: Partial<Question>) => void;
  onDelete: () => void;
  onAddOption: () => void;
  onUpdateOption: (optionIndex: number, field: keyof Option, value: string) => void;
  onRemoveOption: (optionIndex: number) => void;
}> = ({ question, index, isEditing, onEdit, onSave, onDelete, onAddOption, onUpdateOption, onRemoveOption }) => {
  const [editData, setEditData] = useState<Partial<Question>>(question);

  useEffect(() => {
    setEditData(question);
  }, [question]);

  const handleSave = () => {
    onSave(editData);
  };

  const handleCancel = () => {
    setEditData(question);
    onEdit();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        borderRadius: '20px',
        padding: '2rem',
        border: '1px solid #e2e8f0',
        boxShadow: '0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Decorative gradient overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: 'linear-gradient(90deg, #667eea, #764ba2, #f093fb)',
        borderRadius: '20px 20px 0 0'
      }} />
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            color: 'white',
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1rem',
            fontWeight: '700',
            boxShadow: '0 4px 8px rgba(102, 126, 234, 0.3)',
            border: '2px solid rgba(255, 255, 255, 0.2)'
          }}>
            {index + 1}
          </div>
          <div>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              color: '#1e293b',
              margin: 0,
              background: 'linear-gradient(135deg, #1e293b, #475569)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              {question.text}
            </h3>
            {question.description && (
              <p style={{
                color: '#6b7280',
                margin: '0.25rem 0 0 0',
                fontSize: '0.875rem'
              }}>
                {question.description}
              </p>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                style={{
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.5rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <CheckCircle size={16} />
              </button>
              <button
                onClick={handleCancel}
                style={{
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.5rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <AlertCircle size={16} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onEdit}
                style={{
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.5rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <Edit3 size={16} />
              </button>
              <button
                onClick={onDelete}
                style={{
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.5rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Question Text
            </label>
            <input
              type="text"
              value={editData.text || ''}
              onChange={(e) => setEditData({ ...editData, text: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem'
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
              Description
            </label>
            <textarea
              value={editData.description || ''}
              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              rows={2}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem',
                resize: 'vertical'
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={editData.required || false}
                onChange={(e) => setEditData({ ...editData, required: e.target.checked })}
              />
              <span style={{ fontSize: '0.875rem', color: '#374151' }}>Required</span>
            </label>
          </div>

          {/* Trader Performance Data Display */}
          {editData.config?.traderPerformance && !isEditing && (
            <div style={{
              marginTop: '2rem',
              padding: '1.5rem',
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
            }}>
              <h4 style={{
                fontSize: '1.1rem',
                fontWeight: '600',
                color: '#1e293b',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                📊 Trader Performance Data
              </h4>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)', 
                gap: '1rem', 
                marginBottom: '1rem' 
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                  border: '1px solid #bae6fd',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: '600', marginBottom: '0.25rem' }}>
                    Trader Name
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0c4a6e' }}>
                    {editData.config.traderPerformance.traderName}
                  </div>
                </div>
                <div style={{
                  background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                  border: '1px solid #bbf7d0',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.7rem', color: '#166534', fontWeight: '600', marginBottom: '0.25rem' }}>
                    Capital
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#14532d' }}>
                    ₹{editData.config.traderPerformance.capital} Cr
                  </div>
                </div>
                <div style={{
                  background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                  border: '1px solid #fbbf24',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.7rem', color: '#d97706', fontWeight: '600', marginBottom: '0.25rem' }}>
                    Annual Return
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#92400e' }}>
                    {editData.config.traderPerformance.mean >= 0 ? '+' : ''}{editData.config.traderPerformance.mean}%
                  </div>
                </div>
                <div style={{
                  background: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)',
                  border: '1px solid #c4b5fd',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.7rem', color: '#7c3aed', fontWeight: '600', marginBottom: '0.25rem' }}>
                    Std Deviation
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#5b21b6' }}>
                    {editData.config.traderPerformance.stdDev}%
                  </div>
                </div>
                <div style={{
                  background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                  border: '1px solid #fca5a5',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: '600', marginBottom: '0.25rem' }}>
                    Max Drawdown
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#991b1b' }}>
                    {editData.config.traderPerformance.maxDrawdown || '0.00'}%
                  </div>
                </div>
              </div>
              
              {/* Monthly Returns Display */}
              <div style={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1rem',
                marginTop: '1rem'
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
                    justifyContent: 'center',
                    boxShadow: '0 2px 4px rgba(102, 126, 234, 0.3)'
                  }}>
                    <span style={{ color: 'white', fontSize: '0.8rem' }}>📊</span>
                  </div>
                  <h5 style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#1e293b',
                    margin: 0
                  }}>
                    Monthly Returns (12 months)
                  </h5>
                </div>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(6, 1fr)', 
                  gap: '0.5rem', 
                  fontSize: '0.75rem'
                }}>
                  {editData.config.traderPerformance.monthlyReturns.map((returnValue, monthIndex) => (
                    <div key={monthIndex} style={{
                      textAlign: 'center',
                      padding: '0.75rem 0.5rem',
                      background: 'white',
                      color: '#374151',
                      borderRadius: '8px',
                      fontWeight: '500',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                      transition: 'all 0.2s ease'
                    }}>
                      <div style={{ 
                        fontSize: '0.65rem', 
                        color: '#64748b',
                        marginBottom: '0.25rem',
                        fontWeight: '600'
                      }}>
                        M{monthIndex + 1}
                      </div>
                      <div style={{ 
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        color: '#1e293b',
                        marginBottom: '0.25rem'
                      }}>
                        {returnValue > 0 ? '+' : ''}{returnValue.toFixed(2)}%
                      </div>
                      <div style={{ 
                        fontSize: '0.65rem',
                        fontWeight: '600',
                        color: '#6b7280'
                      }}>
                        ₹{((returnValue / 100) * (editData.config?.traderPerformance?.capital || 0)).toFixed(2)} Cr
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Trader Performance Data Editing */}
          {editData.config?.traderPerformance && isEditing && (
            <div style={{
              marginTop: '2rem',
              padding: '1.5rem',
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
            }}>
              <h4 style={{
                fontSize: '1.1rem',
                fontWeight: '600',
                color: '#1e293b',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                📊 Trader Performance Data
              </h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Trader Name
                  </label>
                  <input
                    type="text"
                    value={editData.config.traderPerformance.traderName || ''}
                    onChange={(e) => setEditData({
                      ...editData,
                      config: {
                        ...editData.config,
                        traderPerformance: {
                          traderName: e.target.value,
                          monthlyReturns: editData.config?.traderPerformance?.monthlyReturns || [],
                          capital: editData.config?.traderPerformance?.capital || 0,
                          mean: editData.config?.traderPerformance?.mean || 0,
                          stdDev: editData.config?.traderPerformance?.stdDev || 0
                        }
                      }
                    })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '1rem'
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
                    Capital (₹ Crores)
                  </label>
                  <input
                    type="number"
                    value={editData.config.traderPerformance.capital || ''}
                    onChange={(e) => setEditData({
                      ...editData,
                      config: {
                        ...editData.config,
                        traderPerformance: {
                          traderName: editData.config?.traderPerformance?.traderName || '',
                          monthlyReturns: editData.config?.traderPerformance?.monthlyReturns || [],
                          capital: parseFloat(e.target.value) || 0,
                          mean: editData.config?.traderPerformance?.mean || 0,
                          stdDev: editData.config?.traderPerformance?.stdDev || 0
                        }
                      }
                    })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '1rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Annual Return (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editData.config.traderPerformance.mean || ''}
                    onChange={(e) => setEditData({
                      ...editData,
                      config: {
                        ...editData.config,
                        traderPerformance: {
                          traderName: editData.config?.traderPerformance?.traderName || '',
                          monthlyReturns: editData.config?.traderPerformance?.monthlyReturns || [],
                          capital: editData.config?.traderPerformance?.capital || 0,
                          mean: parseFloat(e.target.value) || 0,
                          stdDev: editData.config?.traderPerformance?.stdDev || 0,
                          maxDrawdown: editData.config?.traderPerformance?.maxDrawdown || 0
                        }
                      }
                    })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '1rem'
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
                    Standard Deviation (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editData.config.traderPerformance.stdDev || ''}
                    onChange={(e) => setEditData({
                      ...editData,
                      config: {
                        ...editData.config,
                        traderPerformance: {
                          traderName: editData.config?.traderPerformance?.traderName || '',
                          monthlyReturns: editData.config?.traderPerformance?.monthlyReturns || [],
                          capital: editData.config?.traderPerformance?.capital || 0,
                          mean: editData.config?.traderPerformance?.mean || 0,
                          stdDev: parseFloat(e.target.value) || 0,
                          maxDrawdown: editData.config?.traderPerformance?.maxDrawdown || 0
                        }
                      }
                    })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '1rem'
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
                    Max Drawdown (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editData.config.traderPerformance.maxDrawdown || ''}
                    onChange={(e) => setEditData({
                      ...editData,
                      config: {
                        ...editData.config,
                        traderPerformance: {
                          traderName: editData.config?.traderPerformance?.traderName || '',
                          monthlyReturns: editData.config?.traderPerformance?.monthlyReturns || [],
                          capital: editData.config?.traderPerformance?.capital || 0,
                          mean: editData.config?.traderPerformance?.mean || 0,
                          stdDev: editData.config?.traderPerformance?.stdDev || 0,
                          maxDrawdown: parseFloat(e.target.value) || 0
                        }
                      }
                    })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '1rem'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.75rem'
                }}>
                  Monthly Returns (12 months)
                </label>
                
                {/* Monthly Returns Table */}
                <div style={{
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(6, 1fr)',
                    gap: '1px',
                    background: '#f3f4f6'
                  }}>
                    {Array.from({ length: 12 }, (_, index) => {
                      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                      const currentValue = editData.config?.traderPerformance?.monthlyReturns?.[index] || 0;
                      
                      return (
                        <div key={index} style={{
                          background: 'white',
                          padding: '0.75rem 0.5rem',
                          textAlign: 'center',
                          border: '1px solid #e5e7eb'
                        }}>
                          <div style={{
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            color: '#6b7280',
                            marginBottom: '0.5rem'
                          }}>
                            {monthNames[index]}
                          </div>
                          <input
                            type="number"
                            step="0.01"
                            value={currentValue}
                            onChange={(e) => {
                              const newValue = parseFloat(e.target.value) || 0;
                              const newMonthlyReturns = [...(editData.config?.traderPerformance?.monthlyReturns || [])];
                              newMonthlyReturns[index] = newValue;
                              
                              setEditData({
                                ...editData,
                                config: {
                                  ...editData.config,
                                  traderPerformance: {
                                    traderName: editData.config?.traderPerformance?.traderName || '',
                                    monthlyReturns: newMonthlyReturns,
                                    capital: editData.config?.traderPerformance?.capital || 0,
                                    mean: editData.config?.traderPerformance?.mean || 0,
                                    stdDev: editData.config?.traderPerformance?.stdDev || 0,
                                    maxDrawdown: editData.config?.traderPerformance?.maxDrawdown || 0
                                  }
                                }
                              });
                            }}
                            style={{
                              width: '100%',
                              padding: '0.375rem 0.5rem',
                              border: '1px solid #d1d5db',
                              borderRadius: '4px',
                              fontSize: '0.875rem',
                              textAlign: 'center',
                              background: 'white'
                            }}
                            placeholder="0.0"
                          />
                          <div style={{
                            fontSize: '0.625rem',
                            color: '#6b7280',
                            marginTop: '0.25rem',
                            fontWeight: '500'
                          }}>
                            {currentValue >= 0 ? '+' : ''}{currentValue.toFixed(1)}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <p style={{
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  marginTop: '0.5rem'
                }}>
                  Enter monthly return percentages for each month. Values will be automatically calculated if you update mean and std dev.
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1rem'
          }}>
            <span style={{
              background: question.required ? '#10b981' : '#6b7280',
              color: 'white',
              padding: '0.25rem 0.75rem',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: '500'
            }}>
              {question.required ? 'Required' : 'Optional'}
            </span>
            <span style={{
              background: '#e5e7eb',
              color: '#374151',
              padding: '0.25rem 0.75rem',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: '500'
            }}>
              {question.type.replace('_', ' ').toUpperCase()}
            </span>
          </div>
          
          {/* Show trader performance data if available */}
          {question.config?.traderPerformance && (
            <div style={{
              background: '#f3f4f6',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1rem'
            }}>
              <h4 style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151',
                margin: '0 0 0.5rem 0'
              }}>
                Trader Performance Data
              </h4>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)', 
                gap: '1rem', 
                marginBottom: '1rem' 
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                  border: '1px solid #bae6fd',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: '600', marginBottom: '0.25rem' }}>
                    Trader Name
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0c4a6e' }}>
                    {question.config.traderPerformance.traderName}
                  </div>
                </div>
                <div style={{
                  background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                  border: '1px solid #bbf7d0',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.7rem', color: '#166534', fontWeight: '600', marginBottom: '0.25rem' }}>
                    Capital
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#14532d' }}>
                    ₹{question.config.traderPerformance.capital} Cr
                  </div>
                </div>
                <div style={{
                  background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                  border: '1px solid #fbbf24',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.7rem', color: '#d97706', fontWeight: '600', marginBottom: '0.25rem' }}>
                    Annual Return
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#92400e' }}>
                    {question.config.traderPerformance.mean >= 0 ? '+' : ''}{question.config.traderPerformance.mean}%
                  </div>
                </div>
                <div style={{
                  background: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)',
                  border: '1px solid #c4b5fd',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.7rem', color: '#7c3aed', fontWeight: '600', marginBottom: '0.25rem' }}>
                    Std Deviation
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#5b21b6' }}>
                    {question.config.traderPerformance.stdDev}%
                  </div>
                </div>
                <div style={{
                  background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                  border: '1px solid #fca5a5',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: '600', marginBottom: '0.25rem' }}>
                    Max Drawdown
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#991b1b' }}>
                    {question.config.traderPerformance.maxDrawdown || '0.00'}%
                  </div>
                </div>
              </div>
              
              {/* Monthly Returns */}
              <div style={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1rem',
                marginTop: '1rem'
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
                    <span style={{ color: 'white', fontSize: '0.75rem', fontWeight: '600' }}>📊</span>
                  </div>
                  <h5 style={{
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    color: '#1e293b',
                    margin: 0
                  }}>
                    Monthly Returns (12 months)
                  </h5>
                </div>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(6, 1fr)', 
                  gap: '0.5rem', 
                  fontSize: '0.75rem'
                }}>
                  {question.config.traderPerformance.monthlyReturns.map((returnValue, monthIndex) => (
                    <div key={monthIndex} style={{
                      textAlign: 'center',
                      padding: '0.75rem 0.5rem',
                      background: 'white',
                      color: '#374151',
                      borderRadius: '8px',
                      fontWeight: '500',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                      transition: 'all 0.2s ease'
                    }}>
                      <div style={{ 
                        fontSize: '0.65rem', 
                        color: '#64748b',
                        marginBottom: '0.25rem',
                        fontWeight: '600'
                      }}>
                        M{monthIndex + 1}
                      </div>
                      <div style={{ 
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        color: '#1e293b',
                        marginBottom: '0.25rem'
                      }}>
                        {returnValue > 0 ? '+' : ''}{returnValue.toFixed(2)}%
                      </div>
                      <div style={{ 
                        fontSize: '0.65rem',
                        fontWeight: '600',
                        color: '#6b7280'
                      }}>
                        ₹{(returnValue * 5).toFixed(1)} L
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Show options if available */}
          {question.options && question.options.length > 0 && (
            <div>
              <h4 style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151',
                margin: '0 0 0.5rem 0'
              }}>
                Options ({question.options.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {question.options.map((option, optionIndex) => (
                  <div key={optionIndex} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem',
                    background: 'white',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <span style={{
                      background: '#667eea',
                      color: 'white',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: '600'
                    }}>
                      {optionIndex + 1}
                    </span>
                    <span style={{ flex: 1, fontSize: '0.875rem' }}>{option.text}</span>
                    <span style={{
                      background: '#f3f4f6',
                      color: '#6b7280',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem'
                    }}>
                      {option.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

// Add Question Modal Component
const AddQuestionModal: React.FC<{
  question: Partial<Question>;
  onChange: (question: Partial<Question>) => void;
  onSave: () => void;
  onCancel: () => void;
}> = ({ question, onChange, onSave, onCancel }) => {
  return (
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
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '2rem',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <h3 style={{
          fontSize: '1.25rem',
          fontWeight: '600',
          color: '#1f2937',
          margin: '0 0 1.5rem 0'
        }}>
          Add New Question
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Question Text
            </label>
            <input
              type="text"
              value={question.text || ''}
              onChange={(e) => onChange({ ...question, text: e.target.value })}
              placeholder="Enter your question..."
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem'
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
              Description (Optional)
            </label>
            <textarea
              value={question.description || ''}
              onChange={(e) => onChange({ ...question, description: e.target.value })}
              placeholder="Add a description..."
              rows={2}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem',
                resize: 'vertical'
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
              Question Type
            </label>
            <select
              value={question.type || 'single_choice'}
              onChange={(e) => onChange({ ...question, type: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            >
              <option value="single_choice">Single Choice</option>
              <option value="multiple_choice">Multiple Choice</option>
              <option value="text_short">Short Text</option>
              <option value="text_long">Long Text</option>
              <option value="likert_scale">Likert Scale</option>
              <option value="numeric_scale">Numeric Scale</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={question.required || false}
                onChange={(e) => onChange({ ...question, required: e.target.checked })}
              />
              <span style={{ fontSize: '0.875rem', color: '#374151' }}>Required</span>
            </label>
          </div>
        </div>
        
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '1rem',
          marginTop: '2rem'
        }}>
          <button
            onClick={onCancel}
            style={{
              background: 'white',
              color: '#6b7280',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              padding: '0.75rem 1.5rem',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            style={{
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '0.75rem 1.5rem',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Add Question
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminFormEditorPage;
