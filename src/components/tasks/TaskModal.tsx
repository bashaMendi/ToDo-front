import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { taskSchema, TaskFormData } from '@/lib/validations';
import { useCreateTask, useUpdateTask, useDeleteTask, useTask } from '@/hooks/useQueries';
import { useUIStore } from '@/store';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId?: string;
  mode: 'create' | 'edit' | 'delete';
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  taskId,
  mode,
}) => {
  const { closeModal } = useUIStore((state: any) => state) as any;
  // const queryClient = useQueryClient();
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();

  // Fetch task data if editing
  const { data: taskResponse } = useTask(taskId || '');
  
  // Don't fetch task data if we're in delete mode and the task is being deleted
  // const shouldFetchTask = taskId && mode !== 'delete' && !deleteTaskMutation.isPending;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
  });

  // Set form values when task data is loaded
  React.useEffect(() => {
    if (taskResponse?.data && mode === 'edit') {
      setValue('title', taskResponse.data.title);
      setValue('description', taskResponse.data.description || '');
    }
  }, [taskResponse, mode, setValue]);

  const onSubmit = async (data: TaskFormData) => {
    try {
      if (mode === 'create') {
        await createTaskMutation.mutateAsync(data);
      } else if (mode === 'edit' && taskId) {
        await updateTaskMutation.mutateAsync({
          id: taskId,
          data,
          version: taskResponse?.data?.version,
        });
      }

      handleClose();
    } catch {
      // Silent fail for task operations
    }
  };

  const handleDelete = async () => {
    if (!taskId || deleteTaskMutation.isPending) {
      return;
    }
    
    try {
      await deleteTaskMutation.mutateAsync(taskId);
      handleClose();
    } catch {
      // Silent fail for delete operation
    }
  };

  const handleClose = () => {
    reset();
    closeModal();
    onClose();
  };

  const isLoading =
    createTaskMutation.isPending || updateTaskMutation.isPending || deleteTaskMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        mode === 'create' 
          ? 'יצירת משימה חדשה' 
          : mode === 'edit' 
          ? 'עריכת משימה'
          : 'מחיקת משימה'
      }
      size='lg'
    >
      {mode === 'delete' ? (
        // Delete confirmation
        <div className='space-y-6'>
          <div className='text-center'>
            <p className='text-lg text-gray-700 mb-4'>
              האם אתה בטוח שברצונך למחוק משימה זו?
            </p>
            {taskResponse?.data && (
              <div className='bg-gray-50 p-4 rounded-lg'>
                <h3 className='font-semibold text-gray-900 mb-2'>
                  {taskResponse.data.title}
                </h3>
                {taskResponse.data.description && (
                  <p className='text-gray-600 text-sm'>
                    {taskResponse.data.description}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className='flex items-center justify-end gap-4 pt-6 border-t border-gray-200'>
            <Button
              type='button'
              variant='outline'
              onClick={handleClose}
              disabled={isLoading}
            >
              ביטול
            </Button>

            <Button 
              type='button'
              variant='destructive'
              onClick={handleDelete}
              loading={isLoading}
              disabled={isLoading}
              onMouseDown={(e) => {
                if (isLoading) {
                  e.preventDefault();
                }
              }}
              onKeyDown={(e) => {
                if (isLoading && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                }
              }}
            >
              {isLoading ? 'מוחק...' : 'מחק משימה'}
            </Button>
          </div>
        </div>
      ) : (
        // Create/Edit form
        <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
          {/* Title Field */}
          <Input
            label='כותרת'
            placeholder='הכנס כותרת למשימה'
            error={errors.title?.message}
            required
            {...register('title')}
          />

          {/* Description Field */}
          <Textarea
            label='תיאור'
            placeholder='הכנס תיאור למשימה'
            error={errors.description?.message}
            required
            {...register('description')}
          />

          {/* Actions */}
          <div className='flex items-center justify-end gap-4 pt-6 border-t border-gray-200'>
            <Button
              type='button'
              variant='outline'
              onClick={handleClose}
              disabled={isLoading}
            >
              ביטול
            </Button>

            <Button type='submit' loading={isLoading} disabled={isLoading}>
              {mode === 'create' ? 'צור משימה' : 'שמור שינויים'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
