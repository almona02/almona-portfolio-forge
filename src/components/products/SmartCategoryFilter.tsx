import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Filter, Search } from 'lucide-react';
import { Button } from '@/shared/ui/ui/button';
import { Badge } from '@/shared/ui/ui/badge';
import { Input } from '@/shared/ui/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/ui/select';
import { 
  smartCategories,
  getCategoryMachineCounts,
  intelligentSearch,
  type Machine
} from '@/constants/smartCategories';

interface SmartCategoryFilterProps {
  machines: Machine[];
  selectedCategory: string;
  onCategoryChange: (categoryId: string) => void;
  onSearchResults?: (machines: Machine[]) => void;
  className?: string;
  compact?: boolean;
  showSearch?: boolean;
  showAllOption?: boolean;
}

const SmartCategoryFilter: React.FC<SmartCategoryFilterProps> = ({
  machines,
  selectedCategory,
  onCategoryChange,
  onSearchResults,
  className = '',
  compact = false,
  showSearch = true,
  showAllOption = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Machine[]>([]);

  const categoryCounts = getCategoryMachineCounts(machines);

  const getSelectedCategoryName = useCallback(() => {
    const category = smartCategories.find(c => c.id === selectedCategory);
    return category?.name || 'Select Category';
  }, [selectedCategory]);

  const getSelectedCategoryCount = useCallback(() => {
    return categoryCounts[selectedCategory] || 0;
  }, [selectedCategory, categoryCounts]);

  const handleCategorySelect = useCallback((categoryId: string) => {
    onCategoryChange(categoryId);
    setIsOpen(false);
  }, [onCategoryChange]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    const results = intelligentSearch(query, machines);
    setSearchResults(results);
    onSearchResults?.(results);
  }, [machines, onSearchResults]);

  const clearFilter = useCallback(() => {
    onCategoryChange('all');
    setSearchQuery('');
    setSearchResults([]);
  }, [onCategoryChange]);

  if (compact) {
    return (
      <div className={`relative ${className}`}>
        {showSearch && (
          <div className="mb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Smart search..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 bg-black/90 md:bg-black/70 border-gray-600 focus:border-orange-500 focus:ring-0 hover:bg-black/95 md:hover:bg-black/80 transition-colors text-sm"
              />
            </div>
          </div>
        )}
        
        <Select value={selectedCategory} onValueChange={onCategoryChange}>
          <SelectTrigger className="w-full bg-black/90 md:bg-black/70 border-gray-600 focus:border-orange-500 focus:ring-0 hover:bg-black/95 md:hover:bg-black/80 transition-colors">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent className="bg-[linear-gradient(160deg,rgba(0,0,0,0.95)_0%,rgba(28,28,28,0.95)_60%,rgba(46,46,46,0.9)_100%)] border border-gray-700">
            {showAllOption && (
              <SelectItem value="all" className="text-white hover:bg-gray-700">
                <div className="flex items-center gap-2">
                  <span>🏭</span>
                  All Machines
                </div>
              </SelectItem>
            )}
            {smartCategories.filter(c => c.id !== 'all').map(category => (
              <SelectItem 
                key={category.id} 
                value={category.id} 
                className="text-white hover:bg-gray-700"
              >
                <div className="flex items-center gap-2">
                  <span>{category.icon}</span>
                  <span>{category.name}</span>
                  <Badge variant="secondary" className="text-xs bg-gray-600/50 text-gray-300 ml-auto">
                    {categoryCounts[category.id] || 0}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between bg-black/90 md:bg-black/70 border-gray-600 hover:bg-black/95 md:hover:bg-black/80 hover:border-orange-500/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <span>{getSelectedCategoryName()}</span>
          {getSelectedCategoryCount() > 0 && (
            <Badge variant="secondary" className="text-xs bg-orange-500/20 text-orange-400">
              {getSelectedCategoryCount()}
            </Badge>
          )}
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-4 w-4" />
        </motion.div>
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 bg-[linear-gradient(160deg,rgba(0,0,0,0.98)_0%,rgba(28,28,28,0.98)_60%,rgba(46,46,46,0.95)_100%)] md:bg-[linear-gradient(160deg,rgba(0,0,0,0.95)_0%,rgba(28,28,28,0.95)_60%,rgba(46,46,46,0.9)_100%)] border border-gray-700 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto backdrop-blur-sm"
          >
            <div className="p-2">
              {/* Smart Search */}
              {showSearch && (
                <div className="mb-4 p-2 border-b border-gray-700">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search machines... (e.g., 'aluminum cutting')"
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="pl-10 bg-gray-800/95 md:bg-gray-800 border-gray-600 focus:border-orange-500 focus:ring-0 text-sm"
                    />
                  </div>
                  
                  {/* Search Results */}
                  {searchQuery && searchResults.length > 0 && (
                    <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                      <p className="text-xs text-gray-400">Found {searchResults.length} machines</p>
                      {searchResults.slice(0, 3).map(machine => (
                        <div
                          key={machine.id}
                          className="p-2 bg-gray-700/50 rounded text-xs cursor-pointer hover:bg-gray-700/70 transition-colors"
                          onClick={() => {
                            onCategoryChange('all');
                            setIsOpen(false);
                          }}
                        >
                          <div className="font-medium text-white truncate">{machine.name}</div>
                          <div className="text-gray-400 truncate">{machine.description}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Smart Categories */}
              <div className="space-y-1">
                {smartCategories.map(category => {
                  const isSelected = selectedCategory === category.id;
                  const count = categoryCounts[category.id] || 0;
                  
                  return (
                    <motion.button
                      key={category.id}
                      onClick={() => handleCategorySelect(category.id)}
                      className={`
                        w-full text-left p-3 rounded-lg transition-colors
                        ${isSelected 
                          ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' 
                          : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
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
                    </motion.button>
                  );
                })}
              </div>

              {/* Clear Filter */}
              <div className="mt-3 pt-2 border-t border-gray-700">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilter}
                  className="w-full text-gray-400 hover:text-white"
                >
                  Clear All Filters
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay to close dropdown */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default SmartCategoryFilter;
