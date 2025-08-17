'use client';

import React, { useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { TaskList } from '@/components/tasks/TaskList';
import { TaskModal } from '@/components/tasks/TaskModal';
import { ExportButton } from '@/components/tasks/ExportButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuthStore } from '@/store';
import { useCurrentUser } from '@/hooks/useQueries';
import { useUIStore } from '@/store';
import { useRouter } from 'next/navigation';

export default function MyTasksPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { isLoading } = useCurrentUser();
  const { modal, openModal, closeModal } = useUIStore();

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSearch = (query: string) => {
    console.log('Search query:', query);
    // TODO: Implement search functionality for my tasks
  };

  const handleCreateTask = () => {
    openModal('create');
  };

  const handleMenuToggle = () => {
    console.log('Menu toggle clicked');
    // TODO: Implement mobile menu toggle
  };

  if (isLoading) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <LoadingSpinner size='lg' text='טוען...' />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      <Header
        onSearch={handleSearch}
        onCreateTask={handleCreateTask}
        onMenuToggle={handleMenuToggle}
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
            <ExportButton />
          </div>
        </div>

        <TaskList filters={{ assignedToMe: true }} />
      </main>

      {/* Task Modal */}
      <TaskModal
        isOpen={
          modal.isOpen && (modal.type === 'create' || modal.type === 'edit')
        }
        onClose={closeModal}
        taskId={modal.taskId}
        mode={modal.type === 'create' ? 'create' : 'edit'}
      />
    </div>
  );
}
