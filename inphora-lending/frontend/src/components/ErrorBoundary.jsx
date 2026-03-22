import React from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { logger } from '../utils/logger';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

const ErrorFallback = ({ error, resetErrorBoundary }) => {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 p-4 font-sans text-gray-900">
      <div className="flex max-w-md flex-col items-center text-center">
        <div className="mb-6 rounded-full bg-red-100 p-4 text-red-600">
          <AlertTriangle className="h-10 w-10" />
        </div>
        
        <h2 className="mb-2 text-2xl font-bold tracking-tight">Something went wrong</h2>
        <p className="mb-6 text-gray-600">
          We encountered an unexpected error. Our team has been notified.
        </p>

        {import.meta.env.DEV && (
            <div className="mb-6 w-full overflow-hidden rounded-lg bg-red-50 p-4 text-left">
                <p className="font-mono text-xs text-red-800 break-words">{error.message}</p>
            </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center justify-center rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-100 hover:text-blue-700 border border-gray-200 focus:z-10 focus:ring-4 focus:ring-gray-200"
          >
            Reload Page
          </button>
          
          <button
            onClick={resetErrorBoundary}
            className="flex items-center justify-center rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300"
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
};

export const GlobalErrorBoundary = ({ children }) => {
  const handleError = (error, info) => {
    logger.error('Uncaught Exception:', { error, componentStack: info?.componentStack });
  };

  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={handleError}
      onReset={() => {
        // Optional: Reset state or navigation
        window.location.href = '/';
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
};
