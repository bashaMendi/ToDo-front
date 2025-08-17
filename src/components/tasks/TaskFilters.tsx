import React from 'react';
import { Filter, SortAsc, SortDesc, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TaskFilters as TaskFiltersType } from '@/types';

interface TaskFiltersProps {
  filters: TaskFiltersType;
  onFiltersChange: (filters: TaskFiltersType) => void;
  onSearch: (query: string) => void;
}

export const TaskFilters: React.FC<TaskFiltersProps> = ({
  filters,
  onFiltersChange,
  onSearch,
}) => {
  const handleSortChange = (sortBy: 'createdAt' | 'updatedAt' | 'title' | 'createdBy') => {
    const currentSort = filters.sortBy;
    const currentOrder = filters.sortOrder;

    let newOrder = 'asc';
    if (currentSort === sortBy && currentOrder === 'asc') {
      newOrder = 'desc';
    }

    onFiltersChange({
      ...filters,
      sortBy,
      sortOrder: newOrder as 'asc' | 'desc',
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    onSearch(query);
    onFiltersChange({
      ...filters,
      search: query,
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
      assignedToMe: false,
      starred: false,
    });
  };

  const sortOptions: Array<{ value: 'createdAt' | 'updatedAt' | 'title' | 'createdBy'; label: string }> = [
    { value: 'createdAt', label: 'תאריך יצירה' },
    { value: 'updatedAt', label: 'תאריך עדכון' },
    { value: 'title', label: 'כותרת' },
    { value: 'createdBy', label: 'יוצר' },
  ];

  return (
    <div className='bg-white rounded-lg border border-gray-200 p-4 mb-6'>
      <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4 lg:space-x-reverse'>
        {/* Search */}
        <div className='flex-1 max-w-md'>
          <Input
            placeholder='חיפוש משימות...'
            value={filters.search || ''}
            onChange={handleSearchChange}
            leftIcon={<Search className='h-4 w-4' />}
          />
        </div>

        {/* Sort Options */}
        <div className='flex items-center space-x-2 space-x-reverse'>
          <span className='text-sm text-gray-600'>מיון לפי:</span>
          <div className='flex items-center space-x-1 space-x-reverse'>
            {sortOptions.map(option => (
              <Button
                key={option.value}
                variant={
                  filters.sortBy === option.value ? 'primary' : 'outline'
                }
                size='sm'
                onClick={() => handleSortChange(option.value)}
                icon={
                  filters.sortBy === option.value ? (
                    filters.sortOrder === 'asc' ? (
                      <SortAsc className='h-3 w-3' />
                    ) : (
                      <SortDesc className='h-3 w-3' />
                    )
                  ) : undefined
                }
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Clear Filters */}
        {(filters.search ||
          filters.sortBy !== 'createdAt' ||
          filters.sortOrder !== 'desc') && (
          <Button
            variant='ghost'
            size='sm'
            onClick={clearFilters}
            icon={<Filter className='h-4 w-4' />}
          >
            נקה סינון
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {(filters.search ||
        filters.sortBy !== 'createdAt' ||
        filters.sortOrder !== 'desc') && (
        <div className='mt-4 pt-4 border-t border-gray-100'>
          <div className='flex items-center space-x-2 space-x-reverse'>
            <span className='text-sm text-gray-600'>סינונים פעילים:</span>
            <div className='flex flex-wrap gap-2'>
              {filters.search && (
                <span className='inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800'>
                  חיפוש: {filters.search}
                </span>
              )}
              {filters.sortBy !== 'createdAt' && (
                <span className='inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800'>
                  מיון:{' '}
                  {sortOptions.find(opt => opt.value === filters.sortBy)?.label}{' '}
                  {filters.sortOrder === 'asc' ? 'עולה' : 'יורד'}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
