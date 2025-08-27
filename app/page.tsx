'use client';

import React from 'react';
import { Header } from '@/components/layout/Header';
import { TaskList } from '@/components/tasks/TaskList';
import { TaskModal } from '@/components/tasks/TaskModal';
import { withAuth } from '@/components/auth/ProtectedRoute';
import { usePagePerformance } from '@/hooks/usePerformance';
import { useUIStore } from '@/store';
import { useQueryClient } from '@tanstack/react-query';
import { Task } from '@/types';
import { apiClient } from '@/lib/api';

function HomePage() {
  // Performance monitoring
  usePagePerformance('HomePage');
  
  const { modal, openModal, closeModal } = useUIStore((state: any) => state) as any;
  const queryClient = useQueryClient();

  const handleCreateTask = () => {
    openModal('create');
  };

  const handleEditTask = (task: Task) => {
    openModal('edit', task.id);
  };

  const handleDeleteTask = (taskId: string) => {
    openModal('delete', taskId);
  };

  const handleDuplicateTask = async (taskId: string) => {
    try {
      // Call the duplicate API
      const response = await apiClient.duplicateTask(taskId);
      
      if (response.data) {
        // Invalidate all tasks queries to update all pages
        await queryClient.invalidateQueries({ queryKey: ['tasks'] });
      }
    } catch {
      // Silent fail for duplicate task
    }
  };

  // Search is handled globally by useSearch hook



  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        onCreateTask={handleCreateTask}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">לוח משימות משותף</h1>
          <p className="text-lg text-gray-600">ניהול משימות משותף עם עדכונים בזמן אמת</p>
        </div>
        <TaskList 
          filters={React.useMemo(() => ({ 
            context: 'all'
          }), [])}
          onEditTask={handleEditTask}
          onDeleteTask={handleDeleteTask}
          onDuplicateTask={handleDuplicateTask}
        />
      </main>
      <TaskModal 
        isOpen={modal.isOpen && (modal.type === 'create' || modal.type === 'edit' || modal.type === 'delete')}
        onClose={closeModal}
        taskId={modal.taskId}
        mode={modal.type === 'create' ? 'create' : modal.type === 'delete' ? 'delete' : 'edit'}
      />
    </div>
  );
}

export default withAuth(HomePage);
