'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
  position?:
    | 'top-right'
    | 'top-left'
    | 'bottom-right'
    | 'bottom-left'
    | 'top-center'
    | 'bottom-center';
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Toast context and provider
interface ToastContextType {
  showToast: (props: Omit<ToastProps, 'id' | 'onClose'>) => void;
  hideToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

// Toast provider component
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const showToast = (props: Omit<ToastProps, 'id' | 'onClose'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: ToastProps = {
      ...props,
      id,
      onClose: hideToast,
    };
    setToasts(prev => [...prev, newToast]);
  };

  const hideToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <ToastContainer toasts={toasts} onClose={hideToast} />
    </ToastContext.Provider>
  );
};

// Hook to use toast
export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Convenience toast function
export const toast = (props: Omit<ToastProps, 'id' | 'onClose'>) => {
  // This will be used by the error handler
  // In a real implementation, you'd access the toast context
  console.log('Toast:', props);
};

const Toast: React.FC<ToastProps> = ({
  id,
  type,
  title,
  message,
  duration = 5000,
  onClose,
  position = 'top-right',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Show toast with animation
    const showTimer = setTimeout(() => setIsVisible(true), 100);

    // Auto-hide toast
    const hideTimer = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(() => onClose(id), 300);
    }, duration);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [id, duration, onClose]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => onClose(id), 300);
  };

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
    warning: AlertTriangle,
  };

  const colors = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  };

  const iconColors = {
    success: 'text-green-400',
    error: 'text-red-400',
    info: 'text-blue-400',
    warning: 'text-yellow-400',
  };

  const positions = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2',
  };

  const Icon = icons[type];

  const toastContent = (
    <div
      className={cn(
        'fixed z-50 max-w-sm w-full',
        positions[position],
        'transition-all duration-300 ease-in-out',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
        isLeaving ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
      )}
    >
      <div
        className={cn(
          'border rounded-lg shadow-lg p-4 flex items-start space-x-3 space-x-reverse',
          colors[type]
        )}
      >
        <Icon
          className={cn('w-5 h-5 mt-0.5 flex-shrink-0', iconColors[type])}
        />

        <div className='flex-1 min-w-0'>
          <h4 className='text-sm font-medium'>{title}</h4>
          {message && <p className='text-sm mt-1 opacity-90'>{message}</p>}
        </div>

        <button
          onClick={handleClose}
          className='flex-shrink-0 p-1 rounded hover:bg-black hover:bg-opacity-10 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent'
          aria-label='סגור'
        >
          <X className='w-4 h-4' />
        </button>
      </div>
    </div>
  );

  return createPortal(toastContent, document.body);
};

// Toast Container
export interface ToastContainerProps {
  toasts: ToastProps[];
  onClose: (id: string) => void;
  position?: ToastProps['position'];
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onClose,
  position = 'top-right',
}) => {
  return (
    <>
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          {...toast}
          position={position}
          onClose={onClose}
        />
      ))}
    </>
  );
};

export { Toast };
