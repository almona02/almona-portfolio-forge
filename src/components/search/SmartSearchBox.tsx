import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/shared/ui/ui/input';
import { Button } from '@/shared/ui/ui/button';
import { Badge } from '@/shared/ui/ui/badge';
import { Search, X, Clock, TrendingUp, Zap } from 'lucide-react';
import { SearchSynonymsService } from '@/services/SearchSynonymsService';
import { NaturalLanguageProcessor } from '@/services/NaturalLanguageProcessor';
import { SearchAnalyticsTracker } from '@/services/SearchAnalyticsTracker';
import { cn } from '@/lib/utils';

interface SmartSearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: (query: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * SmartSearchBox Component
 * 
 * AI-powered search input with intelligent suggestions, natural language processing,
 * and real-time search analytics tracking.
 */
const SmartSearchBox: React.FC<SmartSearchBoxProps> = ({
  value,
  onChange,
  onSearch,
  placeholder = "Search for machines (e.g., 'cheap CNC machine in Cairo')",
  className
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularSearches, setPopularSearches] = useState<string[]>([]);
  const [_currentSearchEventId, setCurrentSearchEventId] = useState<string | null>(null);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load popular and recent searches on mount
  useEffect(() => {
    const popular = SearchAnalyticsTracker.getPopularSearchSuggestions(6);
    setPopularSearches(popular);
    
    // Load recent searches from localStorage
    const recent = localStorage.getItem('recentSearches');
    if (recent) {
      setRecentSearches(JSON.parse(recent).slice(0, 5));
    }
  }, []);

  // Generate suggestions as user types
  useEffect(() => {
    if (value.length >= 2) {
      const nlpSuggestions = NaturalLanguageProcessor.generateSearchSuggestions(value);
      const synonymSuggestions = SearchSynonymsService.getSearchSuggestions(value, 3);
      
      // Combine and deduplicate suggestions
      const allSuggestions = [...new Set([...nlpSuggestions, ...synonymSuggestions])];
      setSuggestions(allSuggestions.slice(0, 6));
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [value]);

  // Handle search execution
  const executeSearch = (query: string) => {
    if (!query.trim()) return;
    
    // Parse query with NLP
    const parsedQuery = NaturalLanguageProcessor.parseQuery(query);
    
    // Track search analytics
    const eventId = SearchAnalyticsTracker.trackSearch(query, 0, parsedQuery);
    setCurrentSearchEventId(eventId);
    
    // Save to recent searches
    const updatedRecent = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(updatedRecent);
    localStorage.setItem('recentSearches', JSON.stringify(updatedRecent));
    
    // Execute search callback
    onSearch?.(query);
    setShowSuggestions(false);
  };

  // Handle input change
  const handleInputChange = (newValue: string) => {
    onChange(newValue);
    
    if (newValue.trim() === '') {
      setShowSuggestions(false);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    executeSearch(suggestion);
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeSearch(value);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Analyze query and show smart indicators
  const queryAnalysis = value.length >= 3 ? NaturalLanguageProcessor.parseQuery(value) : null;

  return (
    <div ref={searchRef} className={cn("relative", className)}>
      {/* Main Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-almona-light/60 w-4 h-4" />
        
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyPress}
          onFocus={() => {
            if (value.length >= 2 || recentSearches.length > 0 || popularSearches.length > 0) {
              setShowSuggestions(true);
            }
          }}
          placeholder={placeholder}
          className="bg-almona-dark border-almona-light pl-10 pr-12 h-12 text-base"
        />
        
        {/* Clear button */}
        {value && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange('');
              setShowSuggestions(false);
              inputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-almona-light/10"
          >
            <X className="w-4 h-4" />
          </Button>
        )}

        {/* Smart Query Indicators */}
        {queryAnalysis && (
          <div className="absolute -bottom-8 left-0 flex gap-2">
            {queryAnalysis.intent !== 'buy' && (
              <Badge variant="outline" className="text-xs bg-blue-600/20 text-blue-400 border-blue-400/30">
                {queryAnalysis.intent} intent
              </Badge>
            )}
            {queryAnalysis.urgency === 'high' && (
              <Badge variant="outline" className="text-xs bg-red-600/20 text-red-400 border-red-400/30">
                <Zap className="w-3 h-3 mr-1" />
                urgent
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-almona-darker border border-almona-light/20 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
          
          {/* Current Query Suggestions */}
          {suggestions.length > 0 && (
            <div className="p-3">
              <div className="text-xs text-almona-light/60 mb-2 flex items-center">
                <Search className="w-3 h-3 mr-1" />
                Search Suggestions
              </div>
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left px-3 py-2 hover:bg-almona-light/10 rounded text-sm transition-colors flex items-center"
                >
                  <Search className="w-3 h-3 mr-2 text-almona-light/40" />
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {/* Recent Searches */}
          {recentSearches.length > 0 && value.length < 2 && (
            <div className="p-3 border-t border-almona-light/10">
              <div className="text-xs text-almona-light/60 mb-2 flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                Recent Searches
              </div>
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(search)}
                  className="w-full text-left px-3 py-2 hover:bg-almona-light/10 rounded text-sm transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center">
                    <Clock className="w-3 h-3 mr-2 text-almona-light/40" />
                    {search}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      const updated = recentSearches.filter((_, i) => i !== index);
                      setRecentSearches(updated);
                      localStorage.setItem('recentSearches', JSON.stringify(updated));
                    }}
                    className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </button>
              ))}
            </div>
          )}

          {/* Popular Searches */}
          {popularSearches.length > 0 && value.length < 2 && (
            <div className="p-3 border-t border-almona-light/10">
              <div className="text-xs text-almona-light/60 mb-2 flex items-center">
                <TrendingUp className="w-3 h-3 mr-1" />
                Popular Searches
              </div>
              {popularSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(search)}
                  className="w-full text-left px-3 py-2 hover:bg-almona-light/10 rounded text-sm transition-colors flex items-center"
                >
                  <TrendingUp className="w-3 h-3 mr-2 text-amber-400" />
                  {search}
                </button>
              ))}
            </div>
          )}

          {/* No suggestions message */}
          {suggestions.length === 0 && recentSearches.length === 0 && popularSearches.length === 0 && (
            <div className="p-4 text-center text-almona-light/60 text-sm">
              Start typing to see search suggestions
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SmartSearchBox;