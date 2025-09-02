import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileJson } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useExportMyTasks } from '@/hooks/useQueries';

interface ExportButtonProps {
  className?: string;
  hasTasks?: boolean;
}

export const ExportButton: React.FC<ExportButtonProps> = ({ className, hasTasks = true }) => {
  const [isOpen, setIsOpen] = useState(false);
  const exportMutation = useExportMyTasks();

  // Debug logging
  console.log('ExportButton Debug:', { hasTasks, isOpen, isPending: exportMutation.isPending });

  const exportFormats: Array<{
    format: 'json' | 'csv' | 'excel';
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
  }> = [
    {
      format: 'json',
      label: 'JSON',
      icon: FileJson,
      description: 'קובץ JSON עם כל הפרטים',
    },
    {
      format: 'csv',
      label: 'CSV',
      icon: FileSpreadsheet,
      description: 'קובץ Excel/CSV',
    },
    {
      format: 'excel',
      label: 'Excel',
      icon: FileSpreadsheet,
      description: 'קובץ Excel מתקדם',
    },
  ];

  const handleExport = async (format: 'json' | 'csv' | 'excel') => {
    try {
      const result = await exportMutation.mutateAsync(format);

      if (result.data) {
        // Create download link
        const blob = new Blob([result.data], {
          type:
            format === 'json'
              ? 'application/json'
              : format === 'csv'
                ? 'text/csv'
                : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `my-tasks.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        // Show success feedback
        console.log(`Export successful: ${format} file downloaded`);
      } else if (result.error) {
        // Show error feedback
        console.error('Export failed:', result.error.message);
        // You can add a toast notification here if you have one
      }
    } catch (error) {
      // Handle unexpected errors
      console.error('Export error:', error);
      // You can add a toast notification here if you have one
    }

    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant='outline'
        size='sm'
        icon={<Download className='h-4 w-4' />}
        loading={exportMutation.isPending}
        disabled={!hasTasks}
      >
        ייצא משימות
      </Button>

      {isOpen && (
        <div className='absolute left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50'>
          <div className='px-4 py-2 border-b border-gray-100'>
            <h3 className='text-sm font-medium text-gray-900'>
              בחר פורמט ייצוא
            </h3>
          </div>

          <div className='py-1'>
            {exportFormats.map(({ format, label, icon: Icon, description }) => (
              <button
                key={format}
                onClick={() => handleExport(format)}
                disabled={exportMutation.isPending}
                className='w-full text-right px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3 space-x-reverse transition-colors'
              >
                <Icon className='h-4 w-4 text-gray-400' />
                <div className='flex-1'>
                  <div className='font-medium'>{label}</div>
                  <div className='text-xs text-gray-500'>{description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div className='fixed inset-0 z-40' onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
};
