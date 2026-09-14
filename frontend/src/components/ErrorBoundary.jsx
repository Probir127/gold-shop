import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight: '60vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '40px',
                    textAlign: 'center'
                }}>
                    <h2 style={{
                        color: 'var(--color-gold-primary)',
                        fontSize: '2rem',
                        marginBottom: '20px'
                    }}>
                        Something went wrong
                    </h2>
                    <p style={{ color: '#888', marginBottom: '15px' }}>
                        We're sorry, an unexpected error occurred.
                    </p>
                    {this.state.error && (
                        <pre style={{ color: '#f87171', background: '#18181b', padding: '12px 16px', borderRadius: '8px', maxWidth: '800px', overflowX: 'auto', textAlign: 'left', fontSize: '0.85rem', marginBottom: '20px' }}>
                            {this.state.error.toString()}
                            {this.state.error.stack && `\n\n${this.state.error.stack}`}
                        </pre>
                    )}
                    <button
                        className="btn btn-primary"
                        onClick={() => window.location.reload()}
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
