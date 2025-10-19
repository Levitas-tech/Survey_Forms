import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md',
  style = {}
}) => {
  const sizeMap = {
    sm: 16,
    md: 24,
    lg: 32
  };

  const spinnerSize = sizeMap[size];

  return (
    <div
      style={{
        width: spinnerSize,
        height: spinnerSize,
        border: '2px solid #e5e7eb',
        borderTop: '2px solid #667eea',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        ...style
      }}
    />
  );
};

export const LoadingPage: React.FC = () => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
    }}>
      <div style={{ textAlign: 'center' }}>
        <LoadingSpinner size="lg" style={{ margin: '0 auto 1rem' }} />
        <p style={{ color: '#6b7280', margin: 0 }}>Loading...</p>
      </div>
    </div>
  );
};
