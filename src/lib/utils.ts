import { clsx, type ClassValue } from 'clsx';

// CSS class utilities
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// Date formatting utilities
export function formatDate(
  date: string | Date,
  format: 'short' | 'long' | 'relative' = 'short'
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  // const timezone = process.env.NEXT_PUBLIC_TIMEZONE || 'Asia/Jerusalem';

  try {
    if (format === 'relative') {
      const diffInSeconds = Math.floor(
        (now.getTime() - dateObj.getTime()) / 1000
      );

      if (diffInSeconds < 60) {
        return 'עכשיו';
      } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `לפני ${minutes} דקות`;
      } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `לפני ${hours} שעות`;
      } else if (diffInSeconds < 2592000) {
        const days = Math.floor(diffInSeconds / 86400);
        return `לפני ${days} ימים`;
      } else {
        return formatDate(dateObj, 'short');
      }
    }

    // Format: DD/MM/YYYY HH:mm
    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const year = dateObj.getFullYear();
    const hours = dateObj.getHours().toString().padStart(2, '0');
    const minutes = dateObj.getMinutes().toString().padStart(2, '0');

    if (format === 'long') {
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } else {
      return `${day}/${month}/${year}`;
    }
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'תאריך לא תקין';
  }
}

// Text utilities
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Search utilities
export function highlightSearchTerm(text: string, searchTerm: string): string {
  if (!searchTerm) return text;

  const regex = new RegExp(`(${searchTerm})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

// Validation utilities
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPassword(password: string): boolean {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
}

// Array utilities
export function groupBy<T extends Record<string, unknown>>(
  array: T[],
  key: keyof T
): Record<string, T[]> {
  return array.reduce(
    (groups, item) => {
      const group = String(item[key]);
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    },
    {} as Record<string, T[]>
  );
}

export function uniqueBy<T extends Record<string, unknown>>(
  array: T[],
  key: keyof T
): T[] {
  const seen = new Set();
  return array.filter(item => {
    const value = item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
}

// Object utilities
export function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  keys.forEach(key => delete result[key]);
  return result;
}

export function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}

// Storage utilities
export function getLocalStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;

  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return defaultValue;
  }
}

export function setLocalStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error writing to localStorage:', error);
  }
}

export function removeLocalStorage(key: string): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing from localStorage:', error);
  }
}

// URL utilities
export function buildQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });

  return searchParams.toString();
}

export function parseQueryString(queryString: string): Record<string, string> {
  const params = new URLSearchParams(queryString);
  const result: Record<string, string> = {};

  params.forEach((value, key) => {
    result[key] = value;
  });

  return result;
}

// Debounce utility
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle utility
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Error handling utilities
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }

  return 'שגיאה לא ידועה';
}

// File utilities
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getFileExtension(filename: string): string {
  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2);
}

// Color utilities
export function generateRandomColor(): string {
  const colors = [
    '#3B82F6',
    '#EF4444',
    '#10B981',
    '#F59E0B',
    '#8B5CF6',
    '#06B6D4',
    '#84CC16',
    '#F97316',
    '#EC4899',
    '#6366F1',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Accessibility utilities
export function generateId(prefix: string = 'id'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

export function isKeyboardEvent(event: React.KeyboardEvent): boolean {
  return event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar';
}
