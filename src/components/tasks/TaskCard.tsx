import React, { memo, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Star, Edit, Trash2, Copy, History, User } from 'lucide-react';
import { Task } from '@/types';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onDuplicate: (taskId: string) => void;
  onToggleStar: (taskId: string) => void;
  onViewHistory: (taskId: string) => void;
  className?: string;
}

export const TaskCard = memo<TaskCardProps>(({
  task,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleStar,
  onViewHistory,
  className,
}) => {
  // Memoize formatted dates
  const formattedDates = useMemo(() => ({
    createdAt: format(new Date(task.createdAt), 'dd/MM/yyyy HH:mm', { locale: he }),
    updatedAt: task.updatedAt ? format(new Date(task.updatedAt), 'dd/MM/yyyy HH:mm', { locale: he }) : null,
  }), [task.createdAt, task.updatedAt]);

  // Memoize assignees list
  const assigneesList = useMemo(() => 
    task.assignees.map(assignee => assignee.name).join(', '), 
    [task.assignees]
  );

  // Memoize action handlers
  const handleEdit = useCallback(() => onEdit(task), [onEdit, task]);
  const handleDelete = useCallback(() => onDelete(task.id), [onDelete, task.id]);
  const handleDuplicate = useCallback(() => onDuplicate(task.id), [onDuplicate, task.id]);
  const handleToggleStar = useCallback(() => onToggleStar(task.id), [onToggleStar, task.id]);
  const handleViewHistory = useCallback(() => onViewHistory(task.id), [onViewHistory, task.id]);

  return (
    <div className={cn(
      'bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200',
      className
    )}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{task.title}</h3>
          {task.description && (
            <p className="text-gray-600 text-sm mb-3 line-clamp-2">{task.description}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggleStar}
          className={cn(
            'text-gray-400 hover:text-yellow-500 transition-colors',
            task.isStarred && 'text-yellow-500'
          )}
        >
          <Star className={cn('h-5 w-5', task.isStarred && 'fill-current')} />
        </Button>
      </div>

      <div className="space-y-2 text-sm text-gray-500 mb-4">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4" />
          <span>נוצר על ידי: {task.createdBy.name}</span>
        </div>
        <div>נוצר: {formattedDates.createdAt}</div>
        {task.updatedBy && formattedDates.updatedAt && (
          <div>עודכן: {formattedDates.updatedAt} על ידי {task.updatedBy.name}</div>
        )}
        {task.assignees.length > 0 && (
          <div className="flex items-center gap-2">
            <span>מוקצים:</span>
            <span className="text-gray-700">{assigneesList}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEdit}
            className="text-blue-600 hover:text-blue-700"
          >
            <Edit className="h-4 w-4 mr-1" />
            ערוך
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleViewHistory}
            className="text-gray-600 hover:text-gray-700"
          >
            <History className="h-4 w-4 mr-1" />
            היסטוריה
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDuplicate}
            className="text-green-600 hover:text-green-700"
          >
            <Copy className="h-4 w-4 mr-1" />
            שכפל
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            מחק
          </Button>
        </div>
      </div>
    </div>
  );
});

TaskCard.displayName = 'TaskCard';
