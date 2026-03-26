import { Component } from 'react';
import { Home, AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * ErrorBoundary — Catches render errors and shows a friendly fallback UI
 * instead of a white screen. Preserves IndexedDB data.
 */
export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    }

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '60vh',
                    padding: '2rem',
                    textAlign: 'center',
                    gap: '1rem',
                }}>
                    <AlertTriangle size={48} color="#e53e3e" />
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1a202c', margin: 0 }}>
                        Terjadi Kesalahan
                    </h2>
                    <p style={{ fontSize: '0.9rem', color: '#718096', maxWidth: 400 }}>
                        Aplikasi mengalami error yang tidak terduga. Data Anda tetap tersimpan di perangkat.
                    </p>
                    <code style={{
                        fontSize: '0.75rem',
                        color: '#e53e3e',
                        background: '#fff5f5',
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        maxWidth: '90vw',
                        overflow: 'auto',
                    }}>
                        {this.state.error?.message || 'Unknown error'}
                    </code>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                        <button
                            onClick={this.handleReload}
                            style={{
                                padding: '0.6rem 1.5rem',
                                background: '#3182ce',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: 600,
                            }}
                        >
                            <RefreshCw size={14} /> Muat Ulang
                        </button>
                        <button
                            onClick={this.handleGoHome}
                            style={{
                                padding: '0.6rem 1.5rem',
                                background: '#edf2f7',
                                color: '#2d3748',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                            }}
                        >
                            <Home size={14} /> Ke Beranda
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
