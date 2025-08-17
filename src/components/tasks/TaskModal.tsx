import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { taskSchema, TaskFormData } from '@/lib/validations';
import { useCreateTask, useUpdateTask, useTask } from '@/hooks/useQueries';
import { useUIStore } from '@/store';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId?: string;
  mode: 'create' | 'edit';
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  taskId,
  mode,
}) => {
  const { closeModal } = useUIStore();
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();

  // Fetch task data if editing
  const { data: taskResponse } = useTask(taskId || '');

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
      } else if (taskId) {
        await updateTaskMutation.mutateAsync({
          id: taskId,
          data,
          version: taskResponse?.data?.version,
        });
      }

      handleClose();
    } catch (error) {
      console.error('Task operation failed:', error);
    }
  };

  const handleClose = () => {
    reset();
    closeModal();
    onClose();
  };

  const isLoading =
    createTaskMutation.isPending || updateTaskMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={mode === 'create' ? 'יצירת משימה חדשה' : 'עריכת משימה'}
      size='lg'
    >
      <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
        {/* Title Field */}
        <Input
          label='כותרת'
          placeholder='הכנס כותרת למשימה'
          error={errors.title?.message}
          {...register('title')}
        />

        {/* Description Field */}
        <Textarea
          label='תיאור'
          placeholder='הכנס תיאור למשימה (אופציונלי)'
          error={errors.description?.message}
          {...register('description')}
        />

        {/* Actions */}
        <div className='flex items-center justify-end space-x-3 space-x-reverse pt-6 border-t border-gray-200'>
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
    </Modal>
  );
};
