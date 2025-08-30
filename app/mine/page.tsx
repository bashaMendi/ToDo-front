'use client';

import React from 'react';
import { Header } from '@/components/layout/Header';
import { TaskList } from '@/components/tasks/TaskList';
import { TaskModal } from '@/components/tasks/TaskModal';
import { ExportButton } from '@/components/tasks/ExportButton';
import { withAuth } from '@/components/auth/ProtectedRoute';
import { useUI } from '@/contexts/UIContext';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { Task } from '@/types';
import { apiClient } from '@/lib/api';
import { queryKeys } from '@/lib/query-client';

function MyTasksPage() {
  const { modal, openModal, closeModal } = useUI();
  const queryClient = useQueryClient();

  // Get my tasks with filters that match TaskList
  const { data: myTasksResponse, isLoading } = useQuery({
    queryKey: queryKeys.tasks.mine({ context: 'mine' }),
    queryFn: () => apiClient.getMyTasks(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Check if there are any tasks for export button
  const hasMyTasks = (myTasksResponse?.data?.items?.length || 0) > 0;

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
          <div className='flex items-center justify-between'>
            <div>
              <h1 className='text-3xl font-bold text-gray-900 mb-2'>
                המשימות שלי
              </h1>
              <p className='text-lg text-gray-600'>המשימות שמוקצות אליך</p>
            </div>
            {/* Always show export button, but disable when no tasks */}
            <ExportButton hasTasks={hasMyTasks} />
          </div>
        </div>

        <TaskList 
          filters={React.useMemo(() => ({ 
            context: 'mine'
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

export default withAuth(MyTasksPage);
