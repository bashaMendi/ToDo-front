import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Search,
  Plus,
  LogOut,
  Star,
  Home,
  FileText,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/store';
import { useSearch } from '@/hooks/useSearch';

interface HeaderProps {
  onCreateTask?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onCreateTask,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  // Clean pathname by removing trailing slash
  const cleanPathname = pathname?.replace(/\/$/, '') || '/';

  const { logout } = useAuthStore((state: any) => state) as any;
  const { inputValue, handleSearchChange, handleClearSearch } = useSearch();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is handled by useSearch hook
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch {
      // Silent fail for logout
    }
  };

  const navigationItems = [
    { id: 'home', label: 'דף הבית', href: '/', icon: Home },
    { id: 'mine', label: 'המשימות שלי', href: '/mine', icon: FileText },
    { id: 'starred', label: 'סומנו בכוכב', href: '/starred', icon: Star },
  ];

  return (
    <header className='bg-white border-b border-gray-200 sticky top-0 z-40'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex items-center justify-between h-16'>
          {/* Logo */}
          <div className='flex items-center'>
            <div className='flex-shrink-0'>
              <h1 className='text-xl font-bold text-gray-900'>
                משימות משותפות
              </h1>
            </div>
          </div>

          {/* Search Bar - Hidden for now */}
          <div className='flex-1 max-w-lg mx-4' style={{ display: 'none' }}>
            <form onSubmit={handleSearch} className='relative'>
              <Input
                type='text'
                placeholder='חיפוש משימות...'
                value={inputValue}
                onChange={handleSearchChange}
                leftIcon={<Search className='h-4 w-4' />}
                className='w-full'
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </form>
          </div>

          {/* Navigation - Desktop */}
          <nav className='hidden lg:flex items-center space-x-8 space-x-reverse'>
            {navigationItems.map(item => {
              const Icon = item.icon;
              const isActive = cleanPathname === item.href;
      
              return (
                <button
                  key={item.id}
                  onClick={() => router.push(item.href)}
                  className={`flex items-center gap-2 space-x-2 space-x-reverse px-3 py-2 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-100 text-blue-700 font-medium shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 hover:shadow-md hover:scale-105'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-blue-600' : ''}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Actions */}
          <div className='flex items-center gap-2 space-x-6 space-x-reverse'>
            {/* Create Task Button */}
            <Button
              onClick={onCreateTask}
              icon={<Plus className='h-4 w-4' />}
              size='sm'
              className='hover:shadow-md hover:scale-105 transition-all duration-200 px-2 sm:px-3 py-1 sm:py-2 justify-center'
            >
              <span className='hidden sm:inline sm:mr-2'>משימה חדשה</span>
            </Button>

            {/* Logout Button */}
            <Button
              onClick={handleLogout}
              icon={<LogOut className='h-4 w-4' />}
              size='sm'
              variant='outline'
              className='hover:shadow-md hover:scale-105 transition-all duration-200 px-2 sm:px-3 py-1 sm:py-2 justify-center'
            >
              <span className='hidden sm:inline sm:mr-2'>התנתק</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className='lg:hidden border-t border-gray-200'>
        <nav className='flex justify-around py-2'>
          {navigationItems.map(item => {
            const Icon = item.icon;
            const isActive = cleanPathname === item.href;
    
            return (
              <button
                key={item.id}
                onClick={() => router.push(item.href)}
                className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'text-blue-700 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 hover:shadow-md hover:scale-105'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : ''}`} />
                <span className={`text-xs ${isActive ? 'font-medium' : ''}`}>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
