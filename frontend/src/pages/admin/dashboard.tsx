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
  UserCheck,
  Brain
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';

const AdminDashboard: React.FC = () => {
  const router = useRouter();
  const { user, logout } = useAuth();

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!user) {
      router.push('/login');
    } else if (user.role !== 'admin' && user.role !== 'super_admin') {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Fetch admin data
  const { data: forms, isLoading: formsLoading } = useQuery({
    queryKey: ['admin-forms'],
    queryFn: () => api.get('/forms').then(res => {
      console.log('Dashboard forms data:', res.data);
      return res.data;
    }),
    enabled: !!user
  });

  const { data: responses, isLoading: responsesLoading } = useQuery({
    queryKey: ['admin-responses'],
    queryFn: () => api.get('/responses').then(res => res.data),
    enabled: !!user
  });

  const { data: userStats, isLoading: userStatsLoading } = useQuery({
    queryKey: ['admin-user-stats'],
    queryFn: () => api.get('/auth/stats').then(res => res.data),
    enabled: !!user
  });

  if (!user) {
    return null;
  }

  const stats = [
    {
      title: 'Total Forms',
      value: forms?.length || 0,
      icon: FileText,
      color: '#667eea',
      change: '+12%'
    },
    {
      title: 'Total Responses',
      value: responses?.length || 0,
      icon: BarChart3,
      color: '#10b981',
      change: '+8%'
    },
    {
      title: 'Active Users',
      value: userStats?.activeUsers || 0,
      icon: Users,
      color: '#f59e0b',
      change: '+5%'
    },
    {
      title: 'Total Users',
      value: userStats?.totalUsers || 0,
      icon: UserCheck,
      color: '#8b5cf6',
      change: '+3%'
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
          padding: '0 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '4rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Settings size={24} color="white" />
            </div>
            <div>
              <h1 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#1f2937',
                margin: 0
              }}>
                Admin Dashboard
              </h1>
              <p style={{
                fontSize: '0.875rem',
                color: '#6b7280',
                margin: 0
              }}>
                Welcome back, {user.name}
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={logout}
              style={{
                background: 'white',
                color: '#ef4444',
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
              <LogOut size={20} />
              Logout
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
          {stats.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              style={{
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                borderRadius: '16px',
                padding: '1.5rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
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
                marginBottom: '1rem'
              }}>
                <div>
                  <h3 style={{
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#6b7280',
                    margin: '0 0 0.5rem 0'
                  }}>
                    {stat.title}
                  </h3>
                  <p style={{
                    fontSize: '2rem',
                    fontWeight: '700',
                    color: '#1f2937',
                    margin: 0
                  }}>
                    {stat.value}
                  </p>
                </div>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: `linear-gradient(135deg, ${stat.color}, ${stat.color}88)`,
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <stat.icon size={24} color="white" />
                </div>
              </div>
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
            borderRadius: '16px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            overflow: 'hidden',
            maxWidth: '400px',
            width: '100%'
          }}>
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
                Quick Actions
              </h3>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button
                  onClick={() => router.push('/admin/forms/new')}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '0.75rem 1rem',
                    cursor: 'pointer',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s ease'
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
                  <Plus size={20} />
                  Create New Form
                </button>
                <button
                  onClick={() => router.push('/admin/forms')}
                  style={{
                    width: '100%',
                    background: 'white',
                    color: '#667eea',
                    border: '1px solid #d1d5db',
                    borderRadius: '12px',
                    padding: '0.75rem 1rem',
                    cursor: 'pointer',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s ease'
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
                  <FileText size={20} />
                  My Forms
                </button>
                <button
                  onClick={() => router.push('/admin/results')}
                  style={{
                    width: '100%',
                    background: 'white',
                    color: '#667eea',
                    border: '1px solid #d1d5db',
                    borderRadius: '12px',
                    padding: '0.75rem 1rem',
                    cursor: 'pointer',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s ease'
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
                  View Results
                </button>
                <button
                  onClick={() => router.push('/admin/risk-analysis')}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '0.75rem 1rem',
                    cursor: 'pointer',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <Brain size={20} />
                  Risk Analysis
                </button>
                <button
                  onClick={() => router.push('/admin/users')}
                  style={{
                    width: '100%',
                    background: 'white',
                    color: '#667eea',
                    border: '1px solid #d1d5db',
                    borderRadius: '12px',
                    padding: '0.75rem 1rem',
                    cursor: 'pointer',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s ease'
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
                  <Users size={20} />
                  Manage Users
                </button>
                <button
                  onClick={() => router.push('/admin/groups')}
                  style={{
                    width: '100%',
                    background: 'white',
                    color: '#667eea',
                    border: '1px solid #d1d5db',
                    borderRadius: '12px',
                    padding: '0.75rem 1rem',
                    cursor: 'pointer',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s ease'
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
                  <UserCheck size={20} />
                  Manage Groups
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

export default AdminDashboard;