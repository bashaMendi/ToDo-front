import React from 'react';
import dynamic from 'next/dynamic';

// Lazy load heavy components
export const TaskModal = dynamic(
  () => import('../tasks/TaskModal').then((mod) => ({ default: mod.TaskModal })),
  {
    loading: () => React.createElement('div', { className: 'flex items-center justify-center p-8' }, 'טוען...'),
    ssr: false,
  }
);

export const TaskList = dynamic(
  () => import('../tasks/TaskList').then((mod) => ({ default: mod.TaskList })),
  {
    loading: () => React.createElement('div', { className: 'flex items-center justify-center p-8' }, 'טוען רשימת משימות...'),
  }
);

export const ExportButton = dynamic(
  () => import('../tasks/ExportButton').then((mod) => ({ default: mod.ExportButton })),
  {
    loading: () => React.createElement('div', { className: 'w-32 h-10 bg-gray-200 rounded animate-pulse' }),
    ssr: false,
  }
);

// Lazy load auth forms
export const LoginForm = dynamic(
  () => import('../auth/LoginForm').then((mod) => ({ default: mod.LoginForm })),
  {
    loading: () => React.createElement('div', { className: 'flex items-center justify-center p-8' }, 'טוען טופס התחברות...'),
  }
);

export const SignupForm = dynamic(
  () => import('../auth/SignupForm').then((mod) => ({ default: mod.SignupForm })),
  {
    loading: () => React.createElement('div', { className: 'flex items-center justify-center p-8' }, 'טוען טופס הרשמה...'),
  }
);
