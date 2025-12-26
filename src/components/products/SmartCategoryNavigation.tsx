import React, { useState, useCallback, useEffect, useRef } from 'react';
import { LazyAnimatePresence, LazyMotionDiv, LazyMotionButton } from '@/utils/lazyMotion';
import { Search, TrendingUp, Lightbulb, Filter, ChevronDown, Sparkles, Brain } from 'lucide-react';
import { Button } from '@/shared/ui/ui/button';
import { Badge } from '@/shared/ui/ui/badge';
import { Input } from '@/shared/ui/ui/input';
import { ShareFilteredResults } from './ShareFilteredResults';
import { 
  smartCategories,
  getCategoryMachineCounts,
  getSmartRecommendations,
  trackCategoryUsage,
  getPopularCategories,
  intelligentSearch,
  detectMaterialType,
  type Machine
} from '@/constants/smartCategories';

interface SmartCategoryNavigationProps {
  machines: Machine[];
  selectedCategory: string;
  onCategorySelect: (categoryId: string) => void;
  onSearchResults?: (machines: Machine[]) => void;
  onSearchChange?: (searchTerm: string) => void;
  className?: string;
  showSearch?: boolean;
  showRecommendations?: boolean;
  showPopular?: boolean;
  compact?: boolean;
  desktopMode?: 'full' | 'compact' | 'dropdown';
  sortOption?: string;
}

const SmartCategoryNavigation: React.FC<SmartCategoryNavigationProps> = ({
  machines,
  selectedCategory,
  onCategorySelect,
  onSearchResults,
  onSearchChange,
  className = '',
  showSearch = true,
  showRecommendations = true,
  showPopular = true,
  compact = false,
  desktopMode = 'full',
  sortOption
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Machine[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [popularCategories, setPopularCategories] = useState<string[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const categoryCounts = getCategoryMachineCounts(machines);

  // Load popular categories on mount
  useEffect(() => {
    if (showPopular) {
      setPopularCategories(getPopularCategories());
    }
  }, [showPopular]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Enhanced AI-powered search suggestions with machine-specific terms
  const generateAiSuggestions = useCallback((query: string) => {
    if (!query.trim()) {
      setAiSuggestions([]);
      return;
    }

    setIsAiThinking(true);
    
    // Enhanced AI suggestions with machine-specific terms
    setTimeout(() => {
      const queryLower = query.toLowerCase();
      const suggestions = [];
      
      // Machine model suggestions
      if (queryLower.includes('dc') || queryLower.includes('cutting')) {
        suggestions.push('DC 421 PBS', 'DC 421 PSD', 'CDC 600');
      }
      if (queryLower.includes('km') || queryLower.includes('milling')) {
        suggestions.push('KM 212', 'KM 215 S', 'KM 211 S');
      }
      if (queryLower.includes('fr') || queryLower.includes('router')) {
        suggestions.push('FR 221 S', 'FR 226 S', 'FR 223 S');
      }
      if (queryLower.includes('dk') || queryLower.includes('welding')) {
        suggestions.push('DK 502', 'DK 540', 'DK 305');
      }
      if (queryLower.includes('cnc') || queryLower.includes('machining')) {
        suggestions.push('CNC 608', 'NCR 300', 'PIM 6509');
      }
      
      // Material-specific suggestions
      if (queryLower.includes('aluminum') || queryLower.includes('aluminium')) {
        suggestions.push('aluminum cutting machines', 'aluminum processing', 'aluminum profiles');
      }
      if (queryLower.includes('pvc') || queryLower.includes('upvc')) {
        suggestions.push('PVC welding machines', 'UPVC processing', 'PVC cutting');
      }
      
      // Function-specific suggestions
      if (queryLower.includes('cut') || queryLower.includes('saw')) {
        suggestions.push('cutting machines', 'mitre saw', 'double head cutting');
      }
      if (queryLower.includes('weld') || queryLower.includes('join')) {
        suggestions.push('welding machines', 'corner welding', 'PVC welding');
      }
      if (queryLower.includes('mill') || queryLower.includes('drill')) {
        suggestions.push('milling machines', 'end milling', 'copy router');
      }
      if (queryLower.includes('clean') || queryLower.includes('finish')) {
        suggestions.push('corner cleaning', 'finishing machines', 'cooling units');
      }
      
      // Power and specification suggestions
      if (queryLower.includes('2.2') || queryLower.includes('kw')) {
        suggestions.push('2.2 kW machines', 'low power consumption');
      }
      if (queryLower.includes('400v') || queryLower.includes('voltage')) {
        suggestions.push('400V machines', 'three phase');
      }
      if (queryLower.includes('6500') || queryLower.includes('mm')) {
        suggestions.push('6500mm cutting length', 'large capacity');
      }
      
      // General suggestions
      suggestions.push(
        `${query} machines`,
        `${query} equipment`,
        `${query} solutions`,
        `aluminum ${query}`,
        `UPVC ${query}`,
        `${query} for windows`,
        `${query} for doors`,
        `precision ${query}`,
        `automatic ${query}`,
        `CNC ${query}`
      );
      
      // Filter and limit suggestions
      const filteredSuggestions = suggestions
        .filter(s => s.toLowerCase().includes(queryLower))
        .slice(0, 6);
      
      setAiSuggestions(filteredSuggestions);
      setIsAiThinking(false);
    }, 300);
  }, []);

  // Handle intelligent search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setIsSearching(true);
    generateAiSuggestions(query);
    
    // Notify parent component of search change
    onSearchChange?.(query);
    
    // Debounce search
    const timeoutId = setTimeout(() => {
      const results = intelligentSearch(query, machines);
      setSearchResults(results);
      setIsSearching(false);
      onSearchResults?.(results);
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [machines, onSearchResults, onSearchChange, generateAiSuggestions]);

  // Handle category selection with usage tracking
  const handleCategorySelect = useCallback((categoryId: string) => {
    trackCategoryUsage(categoryId);
    onCategorySelect(categoryId);
  }, [onCategorySelect]);

  // Get smart recommendations for selected machine
  const recommendations = selectedMachine ? getSmartRecommendations(selectedMachine, machines) : [];

  // Get material type for a machine
  const getMaterialBadge = (machine: Machine) => {
    const materialType = detectMaterialType(machine);
    const colors = {
      aluminum: 'border-blue-500/50 text-blue-400',
      upvc: 'border-green-500/50 text-green-400',
      both: 'border-purple-500/50 text-purple-400',
      unknown: 'border-gray-500/50 text-gray-400'
    };
    
    return (
      <Badge variant="outline" className={`text-xs ${colors[materialType]}`}>
        {materialType.toUpperCase()}
      </Badge>
    );
  };

  // Get selected category info
  const selectedCategoryInfo = smartCategories.find(c => c.id === selectedCategory);

  // Compact dropdown mode for desktop
  if (desktopMode === 'dropdown') {
    return (
      <div className={`relative ${className}`} ref={dropdownRef}>
        {/* Compact Dropdown Trigger */}
        <LazyMotionButton
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          aria-label="Toggle AI Smart Categories"
          className="relative w-full flex items-center justify-between p-4 rounded-xl border border-gray-700/60 bg-gradient-to-r from-gray-900/90 via-gray-900/70 to-gray-800/70 hover:border-orange-500/60 shadow-[0_10px_40px_rgba(0,0,0,0.35)] overflow-hidden transition-all duration-200 group"
          whileHover={{ scale: 1.01, y: -1 }}
          whileTap={{ scale: 0.99 }}
        >
          <span className="absolute inset-0 bg-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="h-10 w-10 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-300 shadow-inner">
              <Brain className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-[0.08em] text-orange-200">AI Smart Categories</span>
              <span className="text-sm font-semibold text-white">
                {selectedCategoryInfo ? `${selectedCategoryInfo.icon} ${selectedCategoryInfo.name}` : 'All Machines'}
              </span>
              <span className="text-[11px] text-gray-400">Industry 4.0 tuned filters</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 relative z-10">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs bg-orange-500/15 text-orange-200 border border-orange-400/30">
                {selectedCategoryInfo ? (categoryCounts[selectedCategory] || 0) : Object.values(categoryCounts).reduce((a, b) => a + b, 0)}
              </Badge>
              <LazyMotionDiv
                animate={{ rotate: isDropdownOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="rounded-full bg-gray-800/60 border border-gray-700 p-1 text-gray-300"
              >
                <ChevronDown className="h-4 w-4" />
              </LazyMotionDiv>
            </div>
            <span className="text-[11px] text-gray-400">Tap to personalize</span>
          </div>
        </LazyMotionButton>

        {/* AI-Powered Dropdown */}
        <LazyAnimatePresence>
          {isDropdownOpen && (
            <LazyMotionDiv
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute top-full left-0 right-0 mt-2 bg-[linear-gradient(160deg,rgba(0,0,0,0.98)_0%,rgba(28,28,28,0.98)_60%,rgba(46,46,46,0.95)_100%)] md:bg-[linear-gradient(160deg,rgba(0,0,0,0.95)_0%,rgba(28,28,28,0.95)_60%,rgba(46,46,46,0.9)_100%)] border border-gray-700 rounded-lg shadow-2xl z-50 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 hover:scrollbar-thumb-gray-500 backdrop-blur-xl"
              style={{ scrollBehavior: 'smooth' }}
            >
              <div className="p-4">
                {/* AI Search Section */}
                {showSearch && (
                  <div className="mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="AI-powered search... (e.g., 'aluminum cutting')"
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="pl-10 bg-black/90 md:bg-black/70 border-gray-600 focus:border-orange-500 focus:ring-0 hover:bg-black/95 md:hover:bg-black/80 transition-colors"
                      />
                      {isSearching && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <LazyMotionDiv
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full"
                          />
                        </div>
                      )}
                    </div>
                    
                    {/* AI Suggestions */}
                    {aiSuggestions.length > 0 && (
                      <LazyMotionDiv
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-2 space-y-1"
                      >
                        <div className="flex items-center gap-2 text-xs text-orange-400">
                          <Sparkles className="h-3 w-3" />
                          <span>AI Suggestions</span>
                        </div>
                        {aiSuggestions.map((suggestion, index) => (
                          <LazyMotionButton
                            key={suggestion}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            onClick={() => {
                              setSearchQuery(suggestion);
                              handleSearch(suggestion);
                            }}
                            className="w-full text-left p-2 text-xs bg-gray-700/80 md:bg-gray-700/50 rounded hover:bg-gray-700/90 md:hover:bg-gray-700/70 transition-colors text-gray-300 hover:text-white"
                          >
                            {suggestion}
                          </LazyMotionButton>
                        ))}
                      </LazyMotionDiv>
                    )}

                    {/* Search Results in Dropdown */}
                    {searchQuery && searchResults.length > 0 && (
                      <LazyMotionDiv
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 space-y-2"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs text-gray-400">Found {searchResults.length} machines:</p>
                          <ShareFilteredResults
                            searchQuery={searchQuery}
                            resultCount={searchResults.length}
                            category={selectedCategory}
                            sortOption={sortOption}
                            className="text-xs"
                          />
                        </div>
                        <div className="max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 space-y-1">
                          {searchResults.slice(0, 5).map(machine => (
                            <div
                              key={machine.id}
                              className="flex items-center justify-between p-2 bg-gray-700/60 md:bg-gray-700/30 rounded cursor-pointer hover:bg-gray-700/80 md:hover:bg-gray-700/50 transition-colors"
                              onClick={() => {
                                setSelectedMachine(machine);
                                handleCategorySelect('all');
                                setIsDropdownOpen(false);
                              }}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{machine.name}</p>
                                <p className="text-xs text-gray-400 truncate">{machine.description}</p>
                              </div>
                              {getMaterialBadge(machine)}
                            </div>
                          ))}
                        </div>
                      </LazyMotionDiv>
                    )}
                  </div>
                )}

                {/* Smart Categories */}
                <div className="space-y-1">
                  {smartCategories.map((category) => {
                    const isSelected = selectedCategory === category.id;
                    const count = categoryCounts[category.id] || 0;
                    
                    return (
                      <LazyMotionButton
                        key={category.id}
                        onClick={() => {
                          handleCategorySelect(category.id);
                          setIsDropdownOpen(false);
                        }}
                        className={`
                          w-full text-left p-3 rounded-lg transition-all duration-200
                          ${isSelected 
                            ? 'bg-orange-500/30 md:bg-orange-500/20 border border-orange-500/40 md:border-orange-500/30 text-orange-400' 
                            : 'text-gray-300 hover:bg-gray-700/70 md:hover:bg-gray-700/50 hover:text-white border border-transparent'
                          }
                        `}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{category.icon}</span>
                            <div>
                              <div className="font-medium">{category.name}</div>
                              <div className="text-xs text-gray-400">{category.description}</div>
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-xs bg-gray-600/50 text-gray-300">
                            {count}
                          </Badge>
                        </div>
                      </LazyMotionButton>
                    );
                  })}
                </div>

                {/* Smart Recommendations */}
                {showRecommendations && selectedMachine && recommendations.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-700/50">
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="h-4 w-4 text-yellow-400" />
                      <h3 className="text-sm font-medium text-white">AI Recommendations</h3>
                    </div>
                    <div className="space-y-2 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 hover:scrollbar-thumb-gray-500" style={{ scrollBehavior: 'smooth' }}>
                      {recommendations.map(machine => (
                        <div
                          key={machine.id}
                          className="flex items-center justify-between p-2 bg-gray-700/60 md:bg-gray-700/30 rounded cursor-pointer hover:bg-gray-700/80 md:hover:bg-gray-700/50 transition-colors"
                          onClick={() => {
                            setSelectedMachine(machine);
                            setIsDropdownOpen(false);
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{machine.name}</p>
                            <p className="text-xs text-gray-400 truncate">{machine.description}</p>
                          </div>
                          {getMaterialBadge(machine)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </LazyMotionDiv>
          )}
        </LazyAnimatePresence>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800/90 md:bg-gray-800/50 rounded-lg border border-gray-700/50 max-h-[calc(100vh-8rem)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 hover:scrollbar-thumb-gray-500 ${className}`} style={{ scrollBehavior: 'smooth' }}>
      {/* Search Section */}
      {showSearch && (
        <div className="p-4 border-b border-gray-700/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search machines... (e.g., 'aluminum cutting', 'UPVC welding')"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 bg-black/90 md:bg-black/70 border-gray-600 focus:border-orange-500 focus:ring-0 hover:bg-black/95 md:hover:bg-black/80 transition-colors"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
              </div>
            )}
          </div>
          
          {/* Search Results */}
          {searchQuery && searchResults.length > 0 && (
            <LazyMotionDiv
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 space-y-2"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-400">Found {searchResults.length} machines:</p>
                <ShareFilteredResults
                  searchQuery={searchQuery}
                  resultCount={searchResults.length}
                  category={selectedCategory}
                  sortOption={sortOption}
                  className="text-xs"
                />
              </div>
              <div className="max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 hover:scrollbar-thumb-gray-500 space-y-2"
                style={{ scrollBehavior: 'smooth' }}
              >
                {searchResults.slice(0, 5).map(machine => (
                  <div
                    key={machine.id}
                    className="flex items-center justify-between p-2 bg-gray-700/80 md:bg-gray-700/50 rounded cursor-pointer hover:bg-gray-700/90 md:hover:bg-gray-700/70 transition-colors"
                    onClick={() => {
                      setSelectedMachine(machine);
                      handleCategorySelect('all');
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{machine.name}</p>
                      <p className="text-xs text-gray-400 truncate">{machine.description}</p>
                    </div>
                    {getMaterialBadge(machine)}
                  </div>
                ))}
              </div>
            </LazyMotionDiv>
          )}
        </div>
      )}

      {/* Popular Categories */}
      {showPopular && popularCategories.length > 0 && (
        <div className="p-4 border-b border-gray-700/50">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-orange-400" />
            <h3 className="text-sm font-medium text-white">Popular</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {popularCategories.map(categoryId => {
              const category = smartCategories.find(c => c.id === categoryId);
              if (!category) return null;
              
              return (
                <Button
                  key={categoryId}
                  variant="outline"
                  size="sm"
                  onClick={() => handleCategorySelect(categoryId)}
                  className="text-xs border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
                >
                  {category.icon} {category.name}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* Smart Categories */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-orange-400" />
          <h3 className="text-lg font-semibold text-white">Smart Categories</h3>
        </div>
        
        <div className="space-y-2">
          {smartCategories.map(category => {
            const isSelected = selectedCategory === category.id;
            const count = categoryCounts[category.id] || 0;
            
            return (
              <LazyMotionButton
                key={category.id}
                onClick={() => handleCategorySelect(category.id)}
                className={`
                  w-full text-left p-3 rounded-lg transition-all duration-200
                  ${isSelected 
                    ? 'bg-orange-500/30 md:bg-orange-500/20 border border-orange-500/40 md:border-orange-500/30 text-orange-400' 
                    : 'text-gray-300 hover:bg-gray-700/70 md:hover:bg-gray-700/50 hover:text-white border border-transparent'
                  }
                `}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{category.icon}</span>
                    <div>
                      <div className="font-medium">{category.name}</div>
                      {!compact && (
                        <div className="text-xs text-gray-400 mt-1">
                          {category.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs bg-gray-600/50 text-gray-300">
                    {count}
                  </Badge>
                </div>
              </LazyMotionButton>
            );
          })}
        </div>
      </div>

      {/* Smart Recommendations */}
      {showRecommendations && selectedMachine && recommendations.length > 0 && (
        <div className="p-4 border-t border-gray-700/50">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-4 w-4 text-yellow-400" />
            <h3 className="text-sm font-medium text-white">Recommended</h3>
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 hover:scrollbar-thumb-gray-500" style={{ scrollBehavior: 'smooth' }}>
            {recommendations.map(machine => (
              <div
                key={machine.id}
                className="flex items-center justify-between p-2 bg-gray-700/60 md:bg-gray-700/30 rounded cursor-pointer hover:bg-gray-700/80 md:hover:bg-gray-700/50 transition-colors"
                onClick={() => setSelectedMachine(machine)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{machine.name}</p>
                  <p className="text-xs text-gray-400 truncate">{machine.description}</p>
                </div>
                {getMaterialBadge(machine)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartCategoryNavigation;
