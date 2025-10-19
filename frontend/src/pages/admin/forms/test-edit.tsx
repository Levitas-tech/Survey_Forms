import React from 'react';
import { useRouter } from 'next/router';

export default function TestEditPage() {
  const router = useRouter();

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>Test Edit Page</h1>
      <p>If you can see this page, the routing is working!</p>
      <button 
        onClick={() => router.back()}
        style={{
          background: '#667eea',
          color: 'white',
          border: 'none',
          padding: '0.5rem 1rem',
          borderRadius: '8px',
          cursor: 'pointer'
        }}
      >
        Go Back
      </button>
    </div>
  );
}
