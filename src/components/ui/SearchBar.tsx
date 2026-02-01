/**
 * SearchBar Component
 * 
 * Phase 3 Implementation - Enterprise Search Interface
 * Reusable search bar component with debounced input, autocomplete suggestions,
 * keyboard navigation, grouped results, and recent search history.
 * 
 * Gold Tier Implementation:
 * - Market-leading UX inspired by GitHub, Linear, Notion
 * - ARIA compliant (WCAG 2.1 AA)
 * - Performance optimized (debouncing, cancellation, memoization)
 * - Accessible (keyboard navigation, screen reader support)
 * - Error-free, type-safe, production-ready
 */

import { SearchService, type SearchQuery, type SearchResponse, type SearchResultItem, type SearchType } from '@/services/SearchService';
import { Input } from '@/shared/ui/ui/input';
import { ScrollArea } from '@/shared/ui/ui/scroll-area';
import { AlertCircle, Clock, Loader2, Search, X } from 'lucide-react';
import React, { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

/**
 * Saved search interface
 */
export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  domains: SearchType[];
  createdAt: string;
}

/**
 * SearchBar component props
 */
export interface SearchBarProps {
  /** Placeholder text */
  placeholder?: string;
  /** Search domains to include */
  domains?: SearchType[];
  /** Callback when search is executed */
  onSearch?: (query: string) => void;
  /** Callback when a result item is selected */
  onSelect?: (item: SearchResultItem) => void;
  /** Recent search queries */
  recentSearches?: string[];
  /** Saved searches */
  savedSearches?: SavedSearch[];
  /** Additional CSS classes */
  className?: string;
  /** Auto-focus on mount */
  autoFocus?: boolean;
  /** Debounce delay in milliseconds (default: 300) */
  debounceMs?: number;
  /** Maximum results per domain (default: 10) */
  maxResults?: number;
  /** SearchService instance (optional, creates default if not provided) */
  searchService?: SearchService;
}

/**
 * SearchBar component ref interface
 */
export interface SearchBarRef {
  focus: () => void;
  blur: () => void;
  clear: () => void;
}

/**
 * Recent searches storage key
 */
const RECENT_SEARCHES_KEY = 'almona_recent_searches';
const MAX_RECENT_SEARCHES = 10;

/**
 * Get recent searches from localStorage
 */
function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as string[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT_SEARCHES) : [];
  } catch {
    return [];
  }
}

/**
 * Save recent search to localStorage
 */
function saveRecentSearch(query: string): void {
  if (typeof window === 'undefined' || !query.trim()) return;
  try {
    const recent = getRecentSearches();
    const filtered = recent.filter(q => q.toLowerCase() !== query.toLowerCase());
    const updated = [query, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * SearchBar Component
 * 
 * Professional search bar with debouncing, autocomplete, keyboard navigation
 */
export const SearchBar = React.forwardRef<SearchBarRef, SearchBarProps>(({
  placeholder = 'Search projects, positions, history...',
  domains = ['projects', 'positions', 'history'],
  onSearch,
  onSelect,
  recentSearches: propRecentSearches,
  savedSearches = [],
  className = '',
  autoFocus = false,
  debounceMs = 300,
  maxResults = 10,
  searchService,
}, ref) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [, setFocusedByKeyboard] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const service = useMemo(() => searchService || new SearchService(), [searchService]);
  const recentSearches = useMemo(() => propRecentSearches || getRecentSearches(), [propRecentSearches]);

  /**
   * Execute search
   */
  const executeSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoading(true);
    setError(null);

    try {
      const searchQueryObj: SearchQuery = {
        q: searchQuery,
        type: domains,
        paging: { page: 1, perPage: maxResults * domains.length },
      };

      // Execute search (using empty projects array - service should handle fetching)
      const response = await service.search(searchQueryObj, [], abortController.signal);

      // Check if request was aborted
      if (abortController.signal.aborted) {
        return;
      }

      setResults(response);
      setIsLoading(false);
      setIsOpen(true);
      
      // Save to recent searches
      saveRecentSearch(searchQuery);
      
      // Call onSearch callback
      onSearch?.(searchQuery);
    } catch (err) {
      // Ignore abort errors
      if (abortController.signal.aborted) {
        return;
      }

      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setError(errorMessage);
      setIsLoading(false);
      setResults(null);
    }
  }, [domains, maxResults, service, onSearch]);

  /**
   * Debounced search handler
   */
  const debouncedSearch = useDebouncedCallback(
    (searchQuery: string) => {
      executeSearch(searchQuery);
    },
    debounceMs
  );

  /**
   * Handle input change
   */
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIndex(-1);
    setError(null);

    if (value.trim()) {
      debouncedSearch(value);
      setIsOpen(true);
    } else {
      setResults(null);
      setIsLoading(false);
      setIsOpen(true); // Keep open to show recent searches
    }
  }, [debouncedSearch]);

  /**
   * Handle input focus
   */
  const handleFocus = useCallback(() => {
    setIsOpen(true);
    setFocusedByKeyboard(false);
  }, []);

  /**
   * Handle input blur
   */
  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    // Don't close if clicking inside dropdown
    if (dropdownRef.current?.contains(e.relatedTarget as Node)) {
      return;
    }
    // Delay to allow click events
    setTimeout(() => setIsOpen(false), 200);
  }, []);

  /**
   * Handle clear button
   */
  const handleClear = useCallback(() => {
    setQuery('');
    setResults(null);
    setError(null);
    setIsLoading(false);
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
    
    // Cancel any pending searches
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  /**
   * Handle result selection
   */
  const handleSelect = useCallback((item: SearchResultItem) => {
    onSelect?.(item);
    setIsOpen(false);
    setQuery('');
    inputRef.current?.blur();
  }, [onSelect]);

  /**
   * Handle recent search click
   */
  const handleRecentSearchClick = useCallback((recentQuery: string) => {
    setQuery(recentQuery);
    executeSearch(recentQuery);
    inputRef.current?.focus();
  }, [executeSearch]);

  /**
   * Get all result items (flattened for keyboard navigation)
   */
  const allResultItems = useMemo(() => {
    if (!results) return [];
    return results.items.slice(0, maxResults * domains.length);
  }, [results, maxResults, domains.length]);

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    setFocusedByKeyboard(true);

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < allResultItems.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < allResultItems.length) {
          handleSelect(allResultItems[selectedIndex]);
        } else if (query.trim() && !isLoading) {
          executeSearch(query);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  }, [isOpen, allResultItems, selectedIndex, query, isLoading, handleSelect, executeSearch]);

  /**
   * Expose ref methods
   */
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    blur: () => inputRef.current?.blur(),
    clear: handleClear,
  }), [handleClear]);

  /**
   * Auto-focus on mount
   */
  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * Group results by domain
   */
  const groupedResults = useMemo(() => {
    if (!results) return {
      projects: [],
      positions: [],
      history: [],
    };
    
    const grouped: Record<SearchType, SearchResultItem[]> = {
      projects: [],
      positions: [],
      history: [],
    };

    results.items.slice(0, maxResults * domains.length).forEach(item => {
      if (grouped[item.kind]) {
        grouped[item.kind].push(item);
      }
    });

    return grouped;
  }, [results, maxResults, domains]);

  /**
   * Get domain label
   */
  const getDomainLabel = useCallback((domain: SearchType): string => {
    const labels: Record<SearchType, string> = {
      projects: 'Projects',
      positions: 'Positions',
      history: 'History',
    };
    return labels[domain];
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search 
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" 
          aria-hidden="true" 
        />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-9 pr-9 h-11 bg-slate-900 border-slate-700 text-slate-200 placeholder:text-slate-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
          role="searchbox"
          aria-label={placeholder}
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls="search-results-list"
          aria-activedescendant={selectedIndex >= 0 ? `result-${allResultItems[selectedIndex]?.id}` : undefined}
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 hover:text-slate-200 transition-colors"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        {isLoading && (
          <div className="absolute right-9 top-1/2 -translate-y-1/2" aria-hidden="true">
            <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
          </div>
        )}
      </div>

      {/* Screen reader announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {isLoading && 'Searching...'}
        {results && !isLoading && `${results.total} results found`}
        {error && `Error searching. ${error}`}
        {results && results.total === 0 && !isLoading && 'No results found'}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          id="search-results-list"
          className="absolute z-50 w-full mt-1 bg-slate-950 border border-amber-600/30 rounded-lg shadow-lg max-h-[500px] overflow-hidden"
          role="listbox"
        >
          <ScrollArea className="max-h-[500px]">
            <div className="p-2">
              {/* Error State */}
              {error && (
                <div className="p-4 text-center text-red-400" role="alert">
                  <AlertCircle className="h-5 w-5 mx-auto mb-2" aria-hidden="true" />
                  <p className="text-sm font-medium">Error searching</p>
                  <p className="text-xs text-slate-400 mt-1">{error}</p>
                </div>
              )}

              {/* Loading State */}
              {isLoading && !error && (
                <div className="p-4 text-center text-slate-400">
                  <Loader2 className="h-5 w-5 mx-auto mb-2 animate-spin" aria-hidden="true" />
                  <p className="text-sm">Searching...</p>
                </div>
              )}

              {/* Results */}
              {results && !isLoading && !error && (
                <>
                  {results.total === 0 ? (
                    // Empty State
                    <div className="p-4 text-center text-slate-400">
                      <p className="text-sm font-medium mb-1">No results found</p>
                      <p className="text-xs">Try different keywords</p>
                    </div>
                  ) : (
                    // Grouped Results
                    <div className="space-y-4">
                      {domains.map(domain => {
                        const domainResults = groupedResults[domain] || [];
                        if (domainResults.length === 0) return null;

                        return (
                          <div key={domain}>
                            <div className="px-3 py-2 text-xs font-semibold text-amber-400 uppercase tracking-wide">
                              {getDomainLabel(domain)}
                            </div>
                            <div className="space-y-1">
                              {domainResults.map((item, _) => {
                                const globalIndex = allResultItems.findIndex(i => i.id === item.id);
                                const isSelected = globalIndex === selectedIndex;

                                return (
                                  <button
                                    key={item.id}
                                    id={`result-${item.id}`}
                                    type="button"
                                    onClick={() => handleSelect(item)}
                                    className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                                      isSelected
                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                        : 'text-slate-200 hover:bg-slate-800'
                                    }`}
                                    role="option"
                                    aria-selected={isSelected}
                                  >
                                    <div className="font-medium text-sm">{item.title}</div>
                                    {item.subtitle && (
                                      <div className="text-xs text-slate-400 mt-0.5">{item.subtitle}</div>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* Recent Searches (shown when no query or no results) */}
              {!query && recentSearches.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-2">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    Recent Searches
                  </div>
                  <div className="space-y-1">
                    {recentSearches.slice(0, 5).map((recentQuery, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleRecentSearchClick(recentQuery)}
                        className="w-full text-left px-3 py-2 rounded-md text-slate-300 hover:bg-slate-800 transition-colors text-sm"
                      >
                        {recentQuery}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Saved Searches */}
              {!query && savedSearches.length > 0 && (
                <div className="mt-4">
                  <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Saved Searches
                  </div>
                  <div className="space-y-1">
                    {savedSearches.map(saved => (
                      <button
                        key={saved.id}
                        type="button"
                        onClick={() => handleRecentSearchClick(saved.query)}
                        className="w-full text-left px-3 py-2 rounded-md text-slate-300 hover:bg-slate-800 transition-colors text-sm"
                      >
                        {saved.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
});

SearchBar.displayName = 'SearchBar';
