import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  className?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeOnBackdrop = true,
  closeOnEscape = true,
  showCloseButton = true,
  className,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element
      previousActiveElement.current = document.activeElement as HTMLElement;

      // Prevent body scroll
      document.body.style.overflow = 'hidden';

      // Focus the modal
      if (modalRef.current) {
        modalRef.current.focus();
      }
    } else {
      // Restore body scroll
      document.body.style.overflow = 'unset';

      // Restore focus to the previous element
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && closeOnEscape) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, closeOnEscape, onClose]);

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget && closeOnBackdrop) {
      onClose();
    }
  };

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full mx-4',
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center p-4'
      role='dialog'
      aria-modal='true'
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      {/* Backdrop */}
      <div
        className='fixed inset-0 bg-black bg-opacity-50 transition-opacity'
        onClick={handleBackdropClick}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className={cn(
          'relative bg-white rounded-lg shadow-xl w-full max-h-[90vh] overflow-hidden',
          sizes[size],
          className
        )}
        tabIndex={-1}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className='flex items-center justify-between p-4 border-b border-gray-200'>
            {title && (
              <h2
                id='modal-title'
                className='text-lg font-semibold text-gray-900'
              >
                {title}
              </h2>
            )}

            {showCloseButton && (
              <button
                onClick={onClose}
                className='p-1 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded'
                aria-label='סגור'
              >
                <X className='w-5 h-5' />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className='p-4 overflow-y-auto max-h-[calc(90vh-120px)]'>
          {children}
        </div>
      </div>
    </div>
  );

  // Use portal to render modal at the end of body
  return createPortal(modalContent, document.body);
};

export { Modal };
