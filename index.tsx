import React, { ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Fix: Make children optional to resolve strict JSX children checking error
interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Error Boundary to catch crashes and show them on the phone screen
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Use constructor to ensure this.props is correctly initialized and typed
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("App Crash:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px 20px', color: '#ef4444', backgroundColor: '#0f172a', height: '100vh', fontFamily: 'sans-serif' }}>
          <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>App Crashed</h1>
          <p style={{ color: '#cbd5e1', marginBottom: '20px' }}>
            Please verify your environment variables and build configuration.
          </p>
          <div style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '8px', overflow: 'auto', fontSize: '12px', fontFamily: 'monospace', color: '#f8fafc' }}>
            {this.state.error?.toString()}
            <br />
            {this.state.error?.stack}
          </div>
          <button 
            onClick={() => window.location.reload()}
            style={{ marginTop: '20px', padding: '12px 24px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px' }}
          >
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);