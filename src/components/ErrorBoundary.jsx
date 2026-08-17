import React from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught an error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          width: '100%',
          backgroundColor: '#0D0D0F',
          color: '#FFFFFF',
          padding: '24px',
          textAlign: 'center',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 77, 77, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ff4d4d',
            marginBottom: '20px'
          }}>
            <AlertTriangle size={32} />
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
            Something went wrong
          </h2>

          <p style={{ fontSize: '0.9rem', color: '#ff8080', maxWidth: '540px', margin: '0 0 12px 0', lineHeight: 1.5, fontFamily: 'monospace' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>

          {this.state.error?.stack && (
            <pre style={{
              fontSize: '0.75rem',
              color: 'rgba(255,255,255,0.6)',
              backgroundColor: '#18181b',
              padding: '12px',
              borderRadius: '8px',
              maxWidth: '600px',
              maxHeight: '150px',
              overflow: 'auto',
              textAlign: 'left',
              marginBottom: '20px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all'
            }}>
              {this.state.error.stack}
            </pre>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={this.handleReload}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                backgroundColor: '#A6FC29',
                color: '#000000',
                fontWeight: 700,
                fontSize: '0.9rem',
                border: 'none',
                borderRadius: '9999px',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={16} />
              <span>Reload Page</span>
            </button>
            <button
              onClick={this.handleReset}
              style={{
                padding: '10px 20px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: '#FFFFFF',
                fontWeight: 600,
                fontSize: '0.9rem',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '9999px',
                cursor: 'pointer'
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
