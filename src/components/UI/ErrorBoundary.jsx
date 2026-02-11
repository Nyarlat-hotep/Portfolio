import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width: '100vw',
          height: '100vh',
          background: 'var(--space-dark)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontFamily: 'monospace',
          padding: '20px',
          boxSizing: 'border-box'
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '20px',
            color: '#a855f7'
          }}>
            ⚠
          </div>
          <h1 style={{
            fontSize: '24px',
            marginBottom: '16px',
            color: '#00d4ff'
          }}>
            Something went wrong
          </h1>
          <p style={{
            fontSize: '14px',
            color: 'rgba(255, 255, 255, 0.7)',
            marginBottom: '24px',
            textAlign: 'center',
            maxWidth: '400px'
          }}>
            There was an error loading the 3D experience. This might be due to WebGL compatibility issues with your browser.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              background: 'transparent',
              border: '1px solid #00d4ff',
              color: '#00d4ff',
              fontFamily: 'monospace',
              fontSize: '14px',
              cursor: 'pointer',
              borderRadius: '4px',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.background = 'rgba(0, 212, 255, 0.1)';
            }}
            onMouseOut={(e) => {
              e.target.style.background = 'transparent';
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
