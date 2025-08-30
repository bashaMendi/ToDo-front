'use client';

import React from 'react';
import { Header } from '@/components/layout/Header';
import { TaskList } from '@/components/tasks/TaskList';
import { TaskModal } from '@/components/tasks/TaskModal';
import { withAuth } from '@/components/auth/ProtectedRoute';
import { useUIStore } from '@/store';
import { useQueryClient } from '@tanstack/react-query';
import { Task } from '@/types';
import { apiClient } from '@/lib/api';

function StarredTasksPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { modal, openModal, closeModal } = useUIStore((state: any) => state) as any;
  const queryClient = useQueryClient();

  // Search is handled globally by useSearch hook

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
      await apiClient.duplicateTask(taskId);
      // Invalidate all tasks queries to update all pages
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch {
      // Silent fail for duplicate task
    }
  };

  return (
    <div className='min-h-screen bg-gray-50'>
      <Header 
        onCreateTask={handleCreateTask}
      />

      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-gray-900 mb-2'>סומנו בכוכב</h1>
          <p className='text-lg text-gray-600'>המשימות שסימנת כמועדפות</p>
        </div>

        <TaskList 
          filters={React.useMemo(() => ({ 
            context: 'starred'
          }), [])}
          onEditTask={handleEditTask}
          onDeleteTask={handleDeleteTask}
          onDuplicateTask={handleDuplicateTask}
        />
      </main>

      {/* Task Modal */}
      <TaskModal
        isOpen={
          modal.isOpen && (modal.type === 'create' || modal.type === 'edit' || modal.type === 'delete')
        }
        onClose={closeModal}
        taskId={modal.taskId}
        mode={modal.type === 'create' ? 'create' : modal.type === 'delete' ? 'delete' : 'edit'}
      />
    </div>
  );
}

export default withAuth(StarredTasksPage);
