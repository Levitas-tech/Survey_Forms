import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { 
  Plus, 
  FileText, 
  Users, 
  BarChart3, 
  Settings, 
  LogOut,
  Bell,
  TrendingUp,
  Eye
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

const DashboardPage: React.FC = () => {
  const router = useRouter();
  const { user, logout } = useAuth();

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  // Fetch published surveys (available for users to take)
  const { data: surveys, isLoading: surveysLoading } = useQuery({
    queryKey: ['published-surveys'],
    queryFn: () => api.get('/forms?status=published').then(res => res.data),
    enabled: !!user,
  });

  // Fetch user's responses
  const { data: responses, isLoading: responsesLoading } = useQuery({
    queryKey: ['user-responses', user?.id],
    queryFn: async () => {
      console.log('Fetching user responses from /responses/my-responses');
      const response = await api.get('/responses/my-responses');
      console.log('User responses data:', response.data);
      return response.data;
    },
    enabled: !!user,
  });

  if (!user) {
    return null;
  }

  const stats = [
    {
      title: 'Surveys Taken',
      value: responses?.length || 0,
      icon: FileText,
      color: '#667eea',
      change: '+8% from last month'
    },
    {
      title: 'My Responses',
      value: responses?.length || 0,
      icon: BarChart3,
      color: '#10b981',
      change: '+8% from last month'
    },
    {
      title: 'Available Surveys',
      value: surveys?.length || 0,
      icon: Eye,
      color: '#f59e0b',
      change: '+5% from last month'
    },
    {
      title: 'Completion Rate',
      value: '87%',
      icon: TrendingUp,
      color: '#8b5cf6',
      change: '+3% from last month'
    }
  ];

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
          padding: '0 1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '3.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FileText size={20} color="white" />
            </div>
            <div>
              <h1 style={{
                fontSize: '1.125rem',
                fontWeight: '700',
                color: '#1f2937',
                margin: 0
              }}>
                SurveyFlow
              </h1>
              <p style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                margin: 0,
                display: 'none'
              }}>
                Survey Management Platform
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.4rem 0.75rem',
              background: 'rgba(102, 126, 234, 0.1)',
              borderRadius: '8px',
              color: '#667eea',
              fontSize: '0.75rem',
              fontWeight: '500'
            }}>
              <div style={{
                width: '6px',
                height: '6px',
                background: '#667eea',
                borderRadius: '50%'
              }} />
              <span style={{ display: 'none' }}>{user.name}</span>
              <span style={{ fontSize: '0.7rem' }}>{user.name?.split(' ')[0]}</span>
            </div>
            <button
              onClick={logout}
              style={{
                background: 'white',
                color: '#ef4444',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                padding: '0.5rem',
                cursor: 'pointer',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                transition: 'all 0.2s ease',
                minWidth: 'auto'
              }}
            >
              <LogOut size={16} />
              <span style={{ display: 'none' }}>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '1rem'
      }}>
        {/* Welcome Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: '1.5rem' }}
        >
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#1f2937',
            marginBottom: '0.25rem'
          }}>
            Welcome back, {user.name?.split(' ')[0]}! 👋
          </h2>
          <p style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            margin: 0
          }}>
            Here's what's happening with your surveys today.
          </p>
        </motion.div>

        {/* Stats Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '0.75rem',
            marginBottom: '1.5rem'
          }}
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              style={{
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                borderRadius: '12px',
                padding: '1rem',
                boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.1)',
                border: '1px solid rgba(226, 232, 240, 0.8)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: `linear-gradient(90deg, ${stat.color}, ${stat.color}88)`,
                borderRadius: '16px 16px 0 0'
              }} />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '0.75rem'
              }}>
                <div>
                  <h3 style={{
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    color: '#6b7280',
                    margin: '0 0 0.25rem 0'
                  }}>
                    {stat.title}
                  </h3>
                  <p style={{
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    color: '#1f2937',
                    margin: 0
                  }}>
                    {stat.value}
                  </p>
                </div>
                <div style={{
                  width: '32px',
                  height: '32px',
                  background: `linear-gradient(135deg, ${stat.color}, ${stat.color}88)`,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <stat.icon size={16} color="white" />
                </div>
              </div>
              <p style={{
                fontSize: '0.65rem',
                color: '#10b981',
                margin: 0,
                fontWeight: '500'
              }}>
                {stat.change}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            display: 'flex',
            justifyContent: 'center'
          }}
        >
          {/* Quick Actions */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '12px',
            boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            overflow: 'hidden',
            maxWidth: '400px',
            width: '100%'
          }}>
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
                Quick Actions
              </h3>
            </div>
            <div style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button
                  onClick={() => router.push('/surveys')}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.6rem 0.75rem',
                    cursor: 'pointer',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s ease',
                    fontSize: '0.875rem'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <FileText size={20} />
                  Browse Surveys
                </button>
                <button
                  onClick={() => router.push('/responses')}
                  style={{
                    width: '100%',
                    background: 'white',
                    color: '#667eea',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    padding: '0.6rem 0.75rem',
                    cursor: 'pointer',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s ease',
                    fontSize: '0.875rem'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#667eea';
                    e.currentTarget.style.backgroundColor = 'rgba(102, 126, 234, 0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#d1d5db';
                    e.currentTarget.style.backgroundColor = 'white';
                  }}
                >
                  <BarChart3 size={20} />
                  My Responses
                </button>
              </div>
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

export default DashboardPage;