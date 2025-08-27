import { toast } from '@/components/ui/Toast';

// Error types
export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN',
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// Error context
export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  timestamp: string;
  url?: string;
  userAgent?: string;
}

// Error information
export interface ErrorInfo {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  code?: string | number;
  context: ErrorContext;
  originalError?: unknown;
  retryable: boolean;
}

// Error handler class
class ErrorHandler {
  private errorQueue: ErrorInfo[] = [];
  private isProcessing = false;

  // Handle different types of errors
  handleError(error: unknown, context: Partial<ErrorContext> = {}): ErrorInfo {
    const errorInfo = this.createErrorInfo(error, context);
    
    // Skip LOW severity errors completely
    if (errorInfo.severity === ErrorSeverity.LOW) {
      return errorInfo;
    }
    
    // Add to queue for processing
    this.errorQueue.push(errorInfo);
    
    // Process queue if not already processing
    if (!this.isProcessing) {
      this.processErrorQueue();
    }

    // Show user-friendly message
    this.showUserMessage(errorInfo);
    
    return errorInfo;
  }

  // Create error info from various error types
  private createErrorInfo(error: unknown, context: Partial<ErrorContext>): ErrorInfo {
    const baseContext: ErrorContext = {
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      ...context,
    };

    // Handle different error types
    if (error instanceof Error) {
      return this.handleJavaScriptError(error, baseContext);
    }

    if (typeof error === 'object' && error !== null && 'status' in error) {
      return this.handleApiError(error as { status: number; message?: string; data?: unknown }, baseContext);
    }

    return {
      type: ErrorType.UNKNOWN,
      severity: ErrorSeverity.MEDIUM,
      message: 'אירעה שגיאה לא צפויה',
      context: baseContext,
      originalError: error,
      retryable: false,
    };
  }

  // Handle JavaScript errors
  private handleJavaScriptError(error: Error, context: ErrorContext): ErrorInfo {
    let type = ErrorType.UNKNOWN;
    let severity = ErrorSeverity.MEDIUM;
    let retryable = false;

    // Determine error type and severity
    if (error.name === 'NetworkError' || error.message.includes('fetch') || error.message === 'Failed to fetch') {
      type = ErrorType.NETWORK;
      severity = ErrorSeverity.LOW; // Changed from HIGH to LOW to suppress user messages
      retryable = true;
    } else if (error.name === 'TypeError') {
      type = ErrorType.VALIDATION;
      severity = ErrorSeverity.LOW;
    } else if (error.name === 'ReferenceError') {
      type = ErrorType.UNKNOWN;
      severity = ErrorSeverity.CRITICAL;
    }

    return {
      type,
      severity,
      message: error.message || 'אירעה שגיאה לא צפויה',
      context,
      originalError: error,
      retryable,
    };
  }

  // Handle API errors
  private handleApiError(error: { status: number; message?: string; data?: unknown }, context: ErrorContext): ErrorInfo {
    let type = ErrorType.UNKNOWN;
    let severity = ErrorSeverity.MEDIUM;
    let retryable = false;
    let message = error.message || 'אירעה שגיאה בשרת';

    // Special handling for 401 on /auth/me - this is expected when user is not logged in
    if (error.status === 401 && context.url?.includes('/auth/me')) {
      return {
        type: ErrorType.AUTHENTICATION,
        severity: ErrorSeverity.LOW,
        message: 'משתמש לא מחובר',
        code: 401,
        context,
        originalError: error,
        retryable: false,
      };
    }

    switch (error.status) {
      case 400:
        type = ErrorType.VALIDATION;
        severity = ErrorSeverity.LOW;
        message = 'הנתונים שהוזנו אינם תקינים';
        break;
      case 401:
        type = ErrorType.AUTHENTICATION;
        severity = ErrorSeverity.LOW; // Changed from HIGH to LOW
        message = 'יש להתחבר מחדש';
        retryable = true;
        break;
      case 403:
        type = ErrorType.AUTHORIZATION;
        severity = ErrorSeverity.HIGH;
        message = 'אין לך הרשאה לבצע פעולה זו';
        break;
      case 404:
        type = ErrorType.NOT_FOUND;
        severity = ErrorSeverity.LOW;
        message = 'המשאב המבוקש לא נמצא';
        // Don't show 404 errors to user as they're often expected
        break;
      case 409:
        type = ErrorType.VALIDATION;
        severity = ErrorSeverity.MEDIUM;
        message = 'הנתונים התנגשו עם נתונים קיימים';
        retryable = true;
        break;
      case 429:
        type = ErrorType.NETWORK;
        severity = ErrorSeverity.MEDIUM;
        message = 'יותר מדי בקשות, נסה שוב מאוחר יותר';
        retryable = true;
        break;
      case 0: // Network error (server not available)
        type = ErrorType.NETWORK;
        severity = ErrorSeverity.LOW;
        message = 'השרת לא זמין כרגע';
        retryable = true;
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        type = ErrorType.SERVER;
        severity = ErrorSeverity.HIGH;
        message = 'שגיאה בשרת, נסה שוב מאוחר יותר';
        retryable = true;
        break;
      default:
        if (error.status >= 500) {
          type = ErrorType.SERVER;
          severity = ErrorSeverity.HIGH;
          retryable = true;
        }
    }

    return {
      type,
      severity,
      message,
      code: error.status,
      context,
      originalError: error,
      retryable,
    };
  }

  // Show user-friendly message
  private showUserMessage(errorInfo: ErrorInfo): void {
    const { severity, message, retryable, type } = errorInfo;

    // Don't show low severity errors to user
    if (severity === ErrorSeverity.LOW) {
      return;
    }

    // Don't show 404 errors to user as they're often expected
    if (type === ErrorType.NOT_FOUND) {
      return;
    }

    // Don't show authentication errors to user (they're handled by the app)
    if (type === ErrorType.AUTHENTICATION) {
      return;
    }

    // Show toast message
    toast({
      title: this.getErrorTitle(severity),
      message,
      type: severity === ErrorSeverity.CRITICAL ? 'error' : 'warning',
      duration: severity === ErrorSeverity.CRITICAL ? 0 : 5000, // Critical errors don't auto-dismiss
      action: retryable ? {
        label: 'נסה שוב',
        onClick: () => this.retryLastAction(),
      } : undefined,
    });
  }

  // Get error title based on severity
  private getErrorTitle(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return 'שגיאה קריטית';
      case ErrorSeverity.HIGH:
        return 'שגיאה חמורה';
      case ErrorSeverity.MEDIUM:
        return 'שגיאה';
      case ErrorSeverity.LOW:
        return 'אזהרה';
      default:
        return 'שגיאה';
    }
  }

  // Process error queue
  private async processErrorQueue(): Promise<void> {
    if (this.isProcessing || this.errorQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.errorQueue.length > 0) {
        const errorInfo = this.errorQueue.shift();
        if (errorInfo) {
          await this.logError(errorInfo);
        }
      }
    } catch {
      // Silent fail for error queue processing
    } finally {
      this.isProcessing = false;
    }
  }

  // Log error to external service (in production)
  private async logError(errorInfo: ErrorInfo): Promise<void> {
    // Don't log LOW severity errors (like 401 authentication errors)
    if (errorInfo.severity === ErrorSeverity.LOW) {
      return;
    }

    // In development, just log to console
    if (process.env.NODE_ENV === 'development') {
      // Silent logging in development
      return;
    }

    // In production, send to error tracking service
    try {
      // Example: Send to Sentry, LogRocket, etc.
      // await errorTrackingService.captureException(errorInfo);
      
      // Silent error logging in production
    } catch {
      // Silent fail for error logging
    }
  }

  // Retry last action (placeholder)
  private retryLastAction(): void {
    // This would be implemented based on the specific action that failed
    // Silent retry action
  }

  // Get error statistics
  getErrorStats(): { total: number; byType: Record<ErrorType, number>; bySeverity: Record<ErrorSeverity, number> } {
    const byType: Record<ErrorType, number> = Object.values(ErrorType).reduce((acc, type) => {
      acc[type] = 0;
      return acc;
    }, {} as Record<ErrorType, number>);

    const bySeverity: Record<ErrorSeverity, number> = Object.values(ErrorSeverity).reduce((acc, severity) => {
      acc[severity] = 0;
      return acc;
    }, {} as Record<ErrorSeverity, number>);

    this.errorQueue.forEach(error => {
      byType[error.type]++;
      bySeverity[error.severity]++;
    });

    return {
      total: this.errorQueue.length,
      byType,
      bySeverity,
    };
  }

  // Clear error queue
  clearErrorQueue(): void {
    this.errorQueue = [];
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandler();

// Export convenience functions
export const handleError = (error: unknown, context?: Partial<ErrorContext>) => 
  errorHandler.handleError(error, context);

export const getErrorStats = () => errorHandler.getErrorStats();

export const clearErrors = () => errorHandler.clearErrorQueue();
