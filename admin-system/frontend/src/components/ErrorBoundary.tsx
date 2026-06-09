import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * ErrorBoundary bắt lỗi từ component tree con và hiện UI fallback
 * thay vì để toàn trang crash.
 *
 * Sử dụng: bọc bất kỳ component nào có nguy cơ throw error.
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 */
export default class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        // Log để debug — có thể tích hợp Sentry ở đây sau này
        console.error('[ErrorBoundary] Caught error:', error, info.componentStack);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div className="min-h-screen flex items-center justify-center bg-surface p-8">
                    <div className="max-w-md w-full bg-white rounded-2xl border border-outline-variant/30 shadow-lg p-8 text-center space-y-4">
                        <div className="w-16 h-16 bg-error/10 rounded-2xl flex items-center justify-center mx-auto">
                            <svg
                                width="32" height="32" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor"
                                strokeWidth="2" className="text-error"
                            >
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                        </div>
                        <h2 className="text-lg font-black text-primary-container">Something went wrong</h2>
                        <p className="text-sm text-outline">
                            {this.state.error?.message || 'An unexpected error occurred.'}
                        </p>
                        <div className="flex gap-3 justify-center pt-2">
                            <button
                                onClick={this.handleReset}
                                className="px-4 py-2 bg-secondary text-white rounded-lg text-sm font-bold hover:opacity-90 transition-opacity"
                            >
                                Try Again
                            </button>
                            <button
                                onClick={() => window.location.href = '/dashboard'}
                                className="px-4 py-2 border border-outline-variant/30 text-outline hover:bg-surface rounded-lg text-sm font-bold transition-colors"
                            >
                                Go to Dashboard
                            </button>
                        </div>
                        {import.meta.env.DEV && this.state.error?.stack && (
                            <details className="mt-4 text-left">
                                <summary className="text-xs font-bold text-outline cursor-pointer">Stack trace (dev only)</summary>
                                <pre className="mt-2 text-[10px] text-outline-variant bg-surface p-3 rounded-lg overflow-auto max-h-48 whitespace-pre-wrap">
                                    {this.state.error.stack}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
