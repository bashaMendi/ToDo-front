'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className='min-h-screen bg-gray-50 flex items-center justify-center px-4'>
          <div className='max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center'>
            <div className='mb-6'>
              <div className='mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4'>
                <AlertTriangle className='h-8 w-8 text-red-600' />
              </div>
              <h2 className='text-2xl font-bold text-gray-900 mb-2'>
                משהו השתבש
              </h2>
              <p className='text-gray-600 mb-6'>
                אירעה שגיאה לא צפויה. אנא נסה שוב או פנה לתמיכה.
              </p>
            </div>

            <div className='space-y-3'>
              <Button
                onClick={this.handleRetry}
                icon={<RefreshCw className='h-4 w-4' />}
                className='w-full'
              >
                נסה שוב
              </Button>

              <Button
                onClick={() => window.location.reload()}
                variant='outline'
                className='w-full'
              >
                רענן דף
              </Button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className='mt-6 text-left'>
                <summary className='cursor-pointer text-sm text-gray-500 hover:text-gray-700'>
                  פרטי השגיאה (פיתוח)
                </summary>
                <pre className='mt-2 p-3 bg-gray-100 rounded text-xs text-gray-800 overflow-auto'>
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
