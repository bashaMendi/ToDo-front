import type { Metadata } from 'next';
import './globals.css';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { ToastProvider } from '@/components/ui/Toast';
import { PerformanceDashboard } from '@/components/debug/PerformanceDashboard';

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
        <ErrorBoundary>
          <QueryProvider>
            <ToastProvider>
              {children}
              <PerformanceDashboard />
            </ToastProvider>
          </QueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
