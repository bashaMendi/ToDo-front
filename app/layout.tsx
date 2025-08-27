import type { Metadata } from 'next';
import './globals.css';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { GlobalErrorBoundary } from '@/components/ui/GlobalErrorBoundary';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { ToastProvider } from '@/components/ui/Toast';
import { PerformanceDashboard } from '@/components/debug/PerformanceDashboard';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { SessionManager } from '@/components/auth/SessionManager';

export const metadata: Metadata = {
  title: 'מערכת ניהול משימות משותפת',
  description: 'מערכת ניהול משימות משותפת עם עדכונים בזמן אמת',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <body className="font-sans">
        <GlobalErrorBoundary>
          <ErrorBoundary>
            <QueryProvider>
              <AuthProvider>
                <SessionManager>
                  <ToastProvider>
                    {children}
                    <PerformanceDashboard />
                  </ToastProvider>
                </SessionManager>
              </AuthProvider>
            </QueryProvider>
          </ErrorBoundary>
        </GlobalErrorBoundary>
      </body>
    </html>
  );
}
