import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useDebounce } from './useDebounce';
import { useSearchStore } from '@/store';

export const useSearch = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { searchQuery, setSearchQuery, clearSearch } = useSearchStore();
  
  // Local state for input
  const [inputValue, setInputValue] = useState(searchQuery);
  
  // Debounced search function
  const debouncedSearch = useDebounce((query: string) => {
    setSearchQuery(query);
    
    // Update URL
    const params = new URLSearchParams(searchParams.toString());
    if (query.trim()) {
      params.set('search', query.trim());
    } else {
      params.delete('search');
    }
    
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    router.replace(newUrl, { scroll: false });
  }, 500);

  // Handle input change
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setInputValue(query);
    debouncedSearch(query);
  }, [debouncedSearch]);

  // Handle clear search
  const handleClearSearch = useCallback(() => {
    setInputValue('');
    clearSearch();
    
    // Clear URL
    const params = new URLSearchParams(searchParams.toString());
    params.delete('search');
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    router.replace(newUrl, { scroll: false });
  }, [clearSearch, searchParams, router]);

  // Sync with URL on mount
  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    if (urlSearch !== searchQuery) {
      setSearchQuery(urlSearch);
      setInputValue(urlSearch);
    }
  }, [searchParams, searchQuery, setSearchQuery]);

  return {
    inputValue,
    searchQuery,
    handleSearchChange,
    handleClearSearch,
  };
};
