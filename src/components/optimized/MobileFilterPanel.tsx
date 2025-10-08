import React, { memo, useState } from 'react';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Sheet, SheetContent, SheetTrigger } from '@/shared/ui/ui/sheet';
import { Filter, X, Search, SortAsc } from 'lucide-react';

interface MobileFilterPanelProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  categoryFilter: string;
  onCategoryChange: (value: string) => void;
  sortOption: string;
  onSortChange: (value: string) => void;
  resultCount: number;
  className?: string;
}

export const MobileFilterPanel = memo<MobileFilterPanelProps>(({
  searchTerm,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  sortOption,
  onSortChange,
  resultCount,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'cutting-machines', label: 'Cutting Machines' },
    { value: 'welding-machines', label: 'Welding Machines' },
    { value: 'processing-centers', label: 'Processing Centers' },
    { value: 'milling-machines', label: 'Milling Machines' },
    { value: 'cnc-machines', label: 'CNC Machines' },
    { value: 'production-lines', label: 'Production Lines' },
    { value: 'cleaning-machines', label: 'Cleaning Machines' },
    { value: 'routing-machines', label: 'Routing Machines' },
    { value: 'accessories', label: 'Accessories' },
  ];

  const sortOptions = [
    { value: 'featured', label: 'Featured' },
    { value: 'name-asc', label: 'Name (A-Z)' },
    { value: 'name-desc', label: 'Name (Z-A)' },
    { value: 'newest', label: 'Newest' },
  ];

  const hasActiveFilters = searchTerm || categoryFilter !== 'all' || sortOption !== 'featured';

  const clearFilters = () => {
    onSearchChange('');
    onCategoryChange('all');
    onSortChange('featured');
  };

  return (
    <div className={`lg:hidden ${className}`}>
      {/* Mobile Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search machines..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-black/90 md:bg-black/70 border-gray-600 focus:border-orange-500 placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Mobile Filter Button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2 bg-black/90 md:bg-black/70 border-gray-600 hover:bg-black/95 md:hover:bg-black/80"
              >
                <Filter className="h-4 w-4" />
                Filters
                {hasActiveFilters && (
                  <span className="w-2 h-2 bg-orange-500 rounded-full" />
                )}
              </Button>
            </SheetTrigger>
            
            <SheetContent side="bottom" className="h-[80vh] bg-gray-900/95 md:bg-gray-900 border-gray-800 backdrop-blur-sm">
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                  <h3 className="text-lg font-semibold text-white">Filters</h3>
                  <div className="flex items-center gap-2">
                    {hasActiveFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="text-orange-400 hover:text-orange-300"
                      >
                        Clear All
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsOpen(false)}
                      className="p-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Filter Content */}
                <div className="flex-1 p-4 space-y-6 overflow-y-auto">
                  {/* Category Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Category
                    </label>
                    <Select value={categoryFilter} onValueChange={onCategoryChange}>
                      <SelectTrigger className="bg-black/90 md:bg-black/70 border-gray-600 focus:border-orange-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800/95 md:bg-gray-800 border-gray-700 backdrop-blur-sm">
                        {categories.map((category) => (
                          <SelectItem
                            key={category.value}
                            value={category.value}
                            className="text-white hover:bg-gray-700"
                          >
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sort Options */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Sort By
                    </label>
                    <Select value={sortOption} onValueChange={onSortChange}>
                      <SelectTrigger className="bg-black/90 md:bg-black/70 border-gray-600 focus:border-orange-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800/95 md:bg-gray-800 border-gray-700 backdrop-blur-sm">
                        {sortOptions.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={option.value}
                            className="text-white hover:bg-gray-700"
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-800">
                  <Button
                    onClick={() => setIsOpen(false)}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                  >
                    Apply Filters
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Results Count */}
        <div className="text-sm text-gray-400">
          {resultCount} {resultCount === 1 ? 'machine' : 'machines'}
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mb-4">
          {searchTerm && (
            <div className="flex items-center gap-1 px-2 py-1 bg-orange-500/30 md:bg-orange-500/20 text-orange-400 rounded-md text-xs">
              <span>Search: "{searchTerm}"</span>
              <button
                onClick={() => onSearchChange('')}
                className="hover:text-orange-300"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          {categoryFilter !== 'all' && (
            <div className="flex items-center gap-1 px-2 py-1 bg-orange-500/30 md:bg-orange-500/20 text-orange-400 rounded-md text-xs">
              <span>Category: {categories.find(c => c.value === categoryFilter)?.label}</span>
              <button
                onClick={() => onCategoryChange('all')}
                className="hover:text-orange-300"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          {sortOption !== 'featured' && (
            <div className="flex items-center gap-1 px-2 py-1 bg-orange-500/30 md:bg-orange-500/20 text-orange-400 rounded-md text-xs">
              <span>Sort: {sortOptions.find(s => s.value === sortOption)?.label}</span>
              <button
                onClick={() => onSortChange('featured')}
                className="hover:text-orange-300"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

MobileFilterPanel.displayName = 'MobileFilterPanel';
