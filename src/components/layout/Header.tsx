import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Plus,
  Menu,
  User,
  LogOut,
  Star,
  Home,
  FileText,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/store';
import { useCurrentUser, useLogout } from '@/hooks/useQueries';

interface HeaderProps {
  onSearch?: (query: string) => void;
  onCreateTask?: () => void;
  onMenuToggle?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onSearch,
  onCreateTask,
  onMenuToggle,
}) => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);

  const { user } = useAuthStore();
  const { data: currentUser } = useCurrentUser();
  const logoutMutation = useLogout();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
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
          {/* Logo and Mobile Menu */}
          <div className='flex items-center'>
            <button
              onClick={onMenuToggle}
              className='lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100'
            >
              <Menu className='h-6 w-6' />
            </button>

            <div className='flex-shrink-0'>
              <h1 className='text-xl font-bold text-gray-900'>
                משימות משותפות
              </h1>
            </div>
          </div>

          {/* Search Bar */}
          <div className='flex-1 max-w-lg mx-4'>
            <form onSubmit={handleSearch} className='relative'>
              <Input
                type='text'
                placeholder='חיפוש משימות...'
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                leftIcon={<Search className='h-4 w-4' />}
                className='w-full'
              />
            </form>
          </div>

          {/* Navigation - Desktop */}
          <nav className='hidden lg:flex items-center space-x-8 space-x-reverse'>
            {navigationItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => router.push(item.href)}
                  className='flex items-center space-x-2 space-x-reverse text-gray-600 hover:text-gray-900 transition-colors'
                >
                  <Icon className='h-4 w-4' />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Actions */}
          <div className='flex items-center space-x-4 space-x-reverse'>
            {/* Create Task Button */}
            <Button
              onClick={onCreateTask}
              icon={<Plus className='h-4 w-4' />}
              size='sm'
            >
              משימה חדשה
            </Button>

            {/* User Menu */}
            <div className='relative'>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className='flex items-center space-x-2 space-x-reverse text-gray-700 hover:text-gray-900 transition-colors'
              >
                <div className='w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center'>
                  <User className='h-4 w-4 text-white' />
                </div>
                <span className='hidden sm:block text-sm font-medium'>
                  {currentUser?.data?.name || user?.name || 'משתמש'}
                </span>
                <ChevronDown className='h-4 w-4' />
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className='absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50'>
                  <div className='px-4 py-2 text-sm text-gray-700 border-b border-gray-100'>
                    <div className='font-medium'>
                      {currentUser?.data?.name || user?.name}
                    </div>
                    <div className='text-gray-500'>
                      {currentUser?.data?.email || user?.email}
                    </div>
                  </div>

                  <button
                    onClick={handleLogout}
                    className='w-full text-right px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2 space-x-reverse'
                  >
                    <LogOut className='h-4 w-4' />
                    <span>התנתק</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className='lg:hidden border-t border-gray-200'>
        <nav className='flex justify-around py-2'>
          {navigationItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => router.push(item.href)}
                className='flex flex-col items-center space-y-1 text-gray-600 hover:text-gray-900 transition-colors'
              >
                <Icon className='h-5 w-5' />
                <span className='text-xs'>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
