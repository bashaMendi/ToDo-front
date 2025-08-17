// API Constants
export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  SIGNUP: '/auth/signup',
  LOGOUT: '/auth/logout',
  ME: '/auth/me',
  GOOGLE_OAUTH: '/auth/google',
  GOOGLE_CALLBACK: '/auth/google/callback',
  FORGOT_PASSWORD: '/auth/forgot',
  RESET_PASSWORD: '/auth/reset',

  // Tasks
  TASKS: '/tasks',
  TASK_BY_ID: (id: string) => `/tasks/${id}`,
  DUPLICATE_TASK: (id: string) => `/tasks/${id}/duplicate`,
  ASSIGN_SELF: (id: string) => `/tasks/${id}/assign/me`,

  // Stars
  ADD_STAR: (id: string) => `/tasks/${id}/star`,
  REMOVE_STAR: (id: string) => `/tasks/${id}/star`,

  // Personal
  MY_TASKS: '/me/tasks',
  STARRED_TASKS: '/me/starred',
  EXPORT_TASKS: '/me/tasks/export',

  // Utility
  HEALTH: '/health',
  SYNC: '/sync',
} as const;

// Validation Constants
export const VALIDATION_RULES = {
  // User
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
  EMAIL_MAX_LENGTH: 255,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,

  // Task
  TITLE_MIN_LENGTH: 1,
  TITLE_MAX_LENGTH: 120,
  DESCRIPTION_MAX_LENGTH: 5000,
  MAX_ASSIGNEES: 20,

  // Search
  SEARCH_MIN_LENGTH: 1,
  SEARCH_MAX_LENGTH: 100,
  MAX_SEARCH_RESULTS: 100,

  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MIN_PAGE: 1,
} as const;

// UI Constants
export const UI_CONSTANTS = {
  // Breakpoints
  BREAKPOINTS: {
    SM: 640,
    MD: 768,
    LG: 1024,
    XL: 1280,
    '2XL': 1536,
  },

  // Z-index layers
  Z_INDEX: {
    DROPDOWN: 1000,
    STICKY: 1020,
    FIXED: 1030,
    MODAL_BACKDROP: 1040,
    MODAL: 1050,
    POPOVER: 1060,
    TOOLTIP: 1070,
  },

  // Animation durations
  ANIMATION: {
    FAST: 150,
    NORMAL: 300,
    SLOW: 500,
  },

  // Spacing
  SPACING: {
    XS: '0.25rem',
    SM: '0.5rem',
    MD: '1rem',
    LG: '1.5rem',
    XL: '2rem',
    '2XL': '3rem',
  },

  // Border radius
  BORDER_RADIUS: {
    SM: '0.25rem',
    MD: '0.375rem',
    LG: '0.5rem',
    XL: '0.75rem',
    '2XL': '1rem',
    FULL: '9999px',
  },
} as const;

// Navigation Constants
export const NAVIGATION = {
  ITEMS: [
    { id: 'home', label: 'דף הבית', href: '/' },
    { id: 'mine', label: 'המשימות שלי', href: '/mine' },
    { id: 'starred', label: 'סומנו בכוכב', href: '/starred' },
  ],
} as const;

// Sort Options
export const SORT_OPTIONS = [
  { value: 'updatedAt:desc', label: 'עודכן לאחרונה' },
  { value: 'createdAt:desc', label: 'נוצר לאחרונה' },
  { value: 'title:asc', label: 'כותרת (א-ת)' },
] as const;

// Export Formats
export const EXPORT_FORMATS = [
  { value: 'csv', label: 'CSV', extension: '.csv' },
  { value: 'json', label: 'JSON', extension: '.json' },
] as const;

// Error Messages
export const ERROR_MESSAGES = {
  // Auth
  INVALID_CREDENTIALS: 'אימייל או סיסמה שגויים',
  EMAIL_ALREADY_EXISTS: 'כתובת האימייל כבר קיימת במערכת',
  WEAK_PASSWORD: 'הסיסמה חייבת להכיל לפחות 8 תווים, אות גדולה, אות קטנה ומספר',
  PASSWORDS_DONT_MATCH: 'הסיסמאות לא תואמות',
  INVALID_EMAIL: 'כתובת אימייל לא תקינה',

  // Tasks
  TASK_NOT_FOUND: 'המשימה לא נמצאה',
  TASK_ALREADY_EXISTS: 'משימה עם כותרת זו כבר קיימת',
  INVALID_TASK_DATA: 'נתוני המשימה לא תקינים',
  TASK_UPDATE_FAILED: 'שגיאה בעדכון המשימה',
  TASK_DELETE_FAILED: 'שגיאה במחיקת המשימה',

  // Network
  NETWORK_ERROR: 'שגיאת רשת. בדוק את החיבור לאינטרנט',
  SERVER_ERROR: 'שגיאת שרת. נסה שוב מאוחר יותר',
  TIMEOUT_ERROR: 'פג זמן החיבור. נסה שוב',

  // General
  UNKNOWN_ERROR: 'שגיאה לא ידועה',
  VALIDATION_ERROR: 'נתונים לא תקינים',
  PERMISSION_DENIED: 'אין לך הרשאה לבצע פעולה זו',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  // Auth
  LOGIN_SUCCESS: 'התחברת בהצלחה',
  SIGNUP_SUCCESS: 'נרשמת בהצלחה',
  LOGOUT_SUCCESS: 'התנתקת בהצלחה',
  PASSWORD_RESET_SENT: 'קישור לאיפוס סיסמה נשלח לאימייל שלך',
  PASSWORD_RESET_SUCCESS: 'הסיסמה שונתה בהצלחה',

  // Tasks
  TASK_CREATED: 'המשימה נוצרה בהצלחה',
  TASK_UPDATED: 'המשימה עודכנה בהצלחה',
  TASK_DELETED: 'המשימה נמחקה בהצלחה',
  TASK_DUPLICATED: 'המשימה שוכפלה בהצלחה',
  STAR_ADDED: 'המשימה נוספה למועדפים',
  STAR_REMOVED: 'המשימה הוסרה מהמועדפים',

  // Export
  EXPORT_SUCCESS: 'הקובץ יוצא בהצלחה',
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_PREFERENCES: 'user_preferences',
  SEARCH_HISTORY: 'search_history',
  UI_STATE: 'ui_state',
  TASK_FILTERS: 'task_filters',
} as const;

// WebSocket Events
export const WS_EVENTS = {
  // Task events
  TASK_CREATED: 'task.created',
  TASK_UPDATED: 'task.updated',
  TASK_DELETED: 'task.deleted',
  TASK_DUPLICATED: 'task.duplicated',
  TASK_ASSIGNED: 'task.assigned',

  // Star events
  STAR_ADDED: 'star.added',
  STAR_REMOVED: 'star.removed',

  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',

  // Room events
  JOIN: 'join',
  LEAVE: 'leave',
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Date Formats
export const DATE_FORMATS = {
  SHORT: 'DD/MM/YYYY',
  LONG: 'DD/MM/YYYY HH:mm',
  ISO: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
  RELATIVE: 'relative',
} as const;

// File Types
export const FILE_TYPES = {
  CSV: 'text/csv',
  JSON: 'application/json',
  PDF: 'application/pdf',
  IMAGE: 'image/*',
} as const;

// Regex Patterns
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
  OBJECT_ID: /^[0-9a-fA-F]{24}$/,
  URL: /^https?:\/\/.+/,
  PHONE: /^[\+]?[1-9][\d]{0,15}$/,
} as const;
