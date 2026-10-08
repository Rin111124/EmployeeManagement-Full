import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import * as Sentry from '@sentry/react';
import { queryClient } from './lib/queryClient';
import { AuthProvider } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import App from './App';
import './index.css';
import './lib/i18n';

// Initialize Sentry before rendering so it instruments React lifecycle.
// Graceful no-op when VITE_SENTRY_DSN is not set (e.g. local development).
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,

    integrations: [
      // Automatic instrumentation for page navigation and XHR/fetch calls
      Sentry.browserTracingIntegration(),
      // Session Replay — records screen when errors occur (1% of normal sessions, 100% on error)
      Sentry.replayIntegration({
        maskAllText: true,   // Mask PII text in replays
        blockAllMedia: true, // Block images/video in replays
      }),
    ],

    // Capture 10% of transactions in production, 100% in dev for easier debugging
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,

    // Capture 1% of sessions normally, 100% when an error occurs
    replaysSessionSampleRate: 0.01,
    replaysOnErrorSampleRate: 1.0,
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
);
