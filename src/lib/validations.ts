import { z } from 'zod';

// Auth validation schemas
export const loginSchema = z.object({
  email: z.string().min(1, 'אימייל הוא שדה חובה').email('אימייל לא תקין'),
  password: z
    .string()
    .min(1, 'סיסמה היא שדה חובה')
    .min(8, 'סיסמה חייבת להכיל לפחות 8 תווים'),
});

export const signupSchema = z
  .object({
    name: z
      .string()
      .min(1, 'שם הוא שדה חובה')
      .min(2, 'שם חייב להכיל לפחות 2 תווים')
      .max(50, 'שם לא יכול להיות ארוך מ-50 תווים'),
    email: z.string().min(1, 'אימייל הוא שדה חובה').email('אימייל לא תקין'),
    password: z
      .string()
      .min(1, 'סיסמה היא שדה חובה')
      .min(8, 'סיסמה חייבת להכיל לפחות 8 תווים')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'סיסמה חייבת להכיל אות גדולה, אות קטנה ומספר'
      ),
    confirmPassword: z.string().min(1, 'אימות סיסמה הוא שדה חובה'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'סיסמאות לא תואמות',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'אימייל הוא שדה חובה').email('אימייל לא תקין'),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'טוקן הוא שדה חובה'),
    newPassword: z
      .string()
      .min(1, 'סיסמה חדשה היא שדה חובה')
      .min(8, 'סיסמה חייבת להכיל לפחות 8 תווים')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'סיסמה חייבת להכיל אות גדולה, אות קטנה ומספר'
      ),
    confirmPassword: z.string().min(1, 'אימות סיסמה הוא שדה חובה'),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: 'סיסמאות לא תואמות',
    path: ['confirmPassword'],
  });

// Task validation schemas
export const taskSchema = z.object({
  title: z
    .string()
    .min(1, 'כותרת היא שדה חובה')
    .max(120, 'כותרת לא יכולה להיות ארוכה מ-120 תווים')
    .trim(),
  description: z
    .string()
    .min(1, 'תיאור הוא שדה חובה')
    .max(5000, 'תיאור לא יכול להיות ארוך מ-5000 תווים')
    .trim(),
});

export const updateTaskSchema = z.object({
  title: z
    .string()
    .min(1, 'כותרת היא שדה חובה')
    .max(120, 'כותרת לא יכולה להיות ארוכה מ-120 תווים')
    .trim(),
  description: z
    .string()
    .min(1, 'תיאור הוא שדה חובה')
    .max(5000, 'תיאור לא יכול להיות ארוך מ-5000 תווים')
    .trim(),
  assignees: z
    .array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'מזהה משתמש לא תקין'))
    .max(20, 'לא ניתן להוסיף יותר מ-20 משויכים')
    .optional(),
});

// Search validation schema
export const searchSchema = z.object({
  query: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sort: z
    .enum(['updatedAt:desc', 'createdAt:desc', 'title:asc'])
    .default('updatedAt:desc'),
  context: z.enum(['all', 'mine', 'starred']).default('all'),
});

// Export validation schema
export const exportSchema = z.object({
  format: z.enum(['csv', 'json']).default('csv'),
});

// Type exports
export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type TaskFormData = z.infer<typeof taskSchema>;
export type UpdateTaskFormData = z.infer<typeof updateTaskSchema>;
export type SearchFormData = z.infer<typeof searchSchema>;
export type ExportFormData = z.infer<typeof exportSchema>;
