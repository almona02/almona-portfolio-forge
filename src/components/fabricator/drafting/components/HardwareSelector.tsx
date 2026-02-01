// src/components/fabricator/drafting/components/HardwareSelector.tsx

/**
 * Hardware Selector Component
 * 
 * Gold-tier hardware selection UI for drafting tools.
 * Features:
 * - Searchable hardware library
 * - Filter by category, manufacturer, standards
 * - Visual preview
 * - Specification display
 * - One-click selection
 * 
 * Part of Priority 2.1: Hardware/Material Library Expansion
 */

import { EGYPTIAN_HARDWARE_DB, type EgyptianHardware, type HardwareCategory } from '@/data/egyptian-hardware-database';
import { Badge } from '@/shared/ui/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Input } from '@/shared/ui/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/ui/ui/select';
import { CheckCircle2, CircleDot, Filter, GripVertical, Lock, Package, Search, Wrench } from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';
import { debounce } from '../utils/performanceUtils';

export interface HardwareSelectorProps {
  /** Selected hardware ID */
  selectedHardwareId?: string;
  /** Callback when hardware is selected */
  onHardwareSelect: (hardware: EgyptianHardware) => void;
  /** Optional category filter (pre-select category) */
  categoryFilter?: HardwareCategory;
  /** Optional system pack ID for compatibility filtering */
  compatibleSystemPackId?: string;
  /** Optional profile thickness for compatibility filtering */
  profileThickness?: number;
  /** Optional: hide the component */
  hidden?: boolean;
}

export const HardwareSelector: React.FC<HardwareSelectorProps> = ({
  selectedHardwareId,
  onHardwareSelect,
  categoryFilter,
  compatibleSystemPackId,
  profileThickness,
  hidden = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<HardwareCategory | 'all'>(categoryFilter || 'all');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  const [selectedOrigin, setSelectedOrigin] = useState<string>('all');

  // Debounce search input for performance (<100ms library search requirement)
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    const debounced = debounce((v: string) => {
      setDebouncedSearchQuery(v);
    }, 150);
    debounced(value);
  }, []);

  // Get unique categories, suppliers, and origins for filters
  const filterOptions = useMemo(() => {
    const categories = new Set<HardwareCategory>();
    const suppliers = new Set<string>();
    const origins = new Set<string>();

    EGYPTIAN_HARDWARE_DB.forEach(hw => {
      categories.add(hw.category);
      suppliers.add(hw.supplier);
      origins.add(hw.origin);
    });

    return {
      categories: Array.from(categories).sort(),
      suppliers: Array.from(suppliers).sort(),
      origins: Array.from(origins).sort()
    };
  }, []);

  // Filter hardware based on search, category, supplier, origin, and compatibility
  const filteredHardware = useMemo(() => {
    let filtered = EGYPTIAN_HARDWARE_DB;

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(hw => hw.category === selectedCategory);
    }

    // Supplier filter
    if (selectedSupplier !== 'all') {
      filtered = filtered.filter(hw => hw.supplier === selectedSupplier);
    }

    // Origin filter
    if (selectedOrigin !== 'all') {
      filtered = filtered.filter(hw => hw.origin === selectedOrigin);
    }

    // Search filter (debounced)
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(hw =>
        hw.name.toLowerCase().includes(query) ||
        hw.supplierCode.toLowerCase().includes(query) ||
        hw.supplier.toLowerCase().includes(query) ||
        hw.origin.toLowerCase().includes(query) ||
        (hw.subCategory && hw.subCategory.toLowerCase().includes(query))
      );
    }

    // Compatibility filter (system pack)
    if (compatibleSystemPackId) {
      filtered = filtered.filter(hw =>
        !hw.compatibleSystems || hw.compatibleSystems.length === 0 || hw.compatibleSystems.includes(compatibleSystemPackId)
      );
    }

    // Compatibility filter (profile thickness)
    if (profileThickness) {
      filtered = filtered.filter(hw =>
        !hw.compatibleProfileThickness || hw.compatibleProfileThickness.length === 0 || hw.compatibleProfileThickness.includes(profileThickness)
      );
    }

    return filtered;
  }, [selectedCategory, selectedSupplier, selectedOrigin, debouncedSearchQuery, compatibleSystemPackId, profileThickness]);

  // Get category icon
  const getCategoryIcon = (category: HardwareCategory) => {
    switch (category) {
      case 'lock':
        return Lock;
      case 'handle':
        return GripVertical;
      case 'hinge':
        return Wrench;
      case 'roller':
        return CircleDot;
      default:
        return Package;
    }
  };

  // Handle hardware selection
  const handleSelect = useCallback((hardware: EgyptianHardware) => {
    onHardwareSelect(hardware);
  }, [onHardwareSelect]);

  if (hidden) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Package className="w-5 h-5 text-amber-500" />
        <h3 className="text-sm font-semibold text-slate-200">Hardware Library</h3>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search hardware..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10 bg-slate-800/50 border-slate-700/50 text-slate-200 placeholder:text-slate-500 focus:border-amber-600/50 focus:ring-amber-600/20"
          />
        </div>

        {/* Filters */}
        <div className="grid grid-cols-3 gap-2">
          {/* Category Filter */}
          <Select value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as HardwareCategory | 'all')}>
            <SelectTrigger className="h-8 text-xs bg-slate-800/50 border-slate-700/50 focus:border-amber-600/50">
              <Filter className="w-3 h-3 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-amber-600/30">
              <SelectItem value="all" className="text-slate-200 focus:bg-amber-500/20">All Categories</SelectItem>
              {filterOptions.categories.map(cat => (
                <SelectItem key={cat} value={cat} className="text-slate-200 focus:bg-amber-500/20">
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Supplier Filter */}
          <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
            <SelectTrigger className="h-8 text-xs bg-slate-800/50 border-slate-700/50 focus:border-amber-600/50">
              <SelectValue placeholder="Supplier" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-amber-600/30">
              <SelectItem value="all" className="text-slate-200 focus:bg-amber-500/20">All Suppliers</SelectItem>
              {filterOptions.suppliers.map(supplier => (
                <SelectItem key={supplier} value={supplier} className="text-slate-200 focus:bg-amber-500/20">
                  {supplier}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Origin Filter */}
          <Select value={selectedOrigin} onValueChange={setSelectedOrigin}>
            <SelectTrigger className="h-8 text-xs bg-slate-800/50 border-slate-700/50 focus:border-amber-600/50">
              <SelectValue placeholder="Origin" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-amber-600/30">
              <SelectItem value="all" className="text-slate-200 focus:bg-amber-500/20">All Origins</SelectItem>
              {filterOptions.origins.map(origin => (
                <SelectItem key={origin} value={origin} className="text-slate-200 focus:bg-amber-500/20">
                  {origin}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Hardware List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredHardware.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No hardware found matching your filters.</p>
          </div>
        ) : (
          filteredHardware.map(hardware => {
            const CategoryIcon = getCategoryIcon(hardware.category);
            const isSelected = selectedHardwareId === hardware.id;

            return (
              <Card
                key={hardware.id}
                className={`cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-amber-500/20 border-amber-500/50 ring-2 ring-amber-500/30'
                    : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800/70 hover:border-amber-600/30'
                }`}
                onClick={() => handleSelect(hardware)}
              >
                <CardHeader className="p-3 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <CategoryIcon className="w-4 h-4 mt-0.5 text-amber-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-xs font-semibold text-slate-200 truncate">
                          {hardware.name}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-xs py-0 px-1.5 border-slate-600 text-slate-400">
                            {hardware.supplierCode}
                          </Badge>
                          <Badge variant="outline" className="text-xs py-0 px-1.5 border-slate-600 text-slate-400">
                            {hardware.supplier}
                          </Badge>
                          {hardware.subCategory && (
                            <Badge variant="outline" className="text-xs py-0 px-1.5 border-slate-600 text-slate-400">
                              {hardware.subCategory}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  {/* Specifications */}
                  <div className="space-y-1.5 text-xs">
                    {/* Dimensions */}
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Dimensions:</span>
                      <span className="text-slate-300">
                        {hardware.dimensions.width}×{hardware.dimensions.height}×{hardware.dimensions.depth}mm
                      </span>
                    </div>

                    {/* Load Capacity */}
                    {hardware.maxLoadKg && (
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Max Load:</span>
                        <span className="text-slate-300">{hardware.maxLoadKg}kg</span>
                      </div>
                    )}

                    {/* Security Level */}
                    {hardware.securityLevel && (
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Security:</span>
                        <span className="text-slate-300">Level {hardware.securityLevel}</span>
                      </div>
                    )}

                    {/* Cost and Lead Time */}
                    <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-700/50">
                      <div className="flex items-center gap-2">
                        {hardware.costEGP && (
                          <span className="text-amber-400 font-medium">{hardware.costEGP} EGP</span>
                        )}
                        <span className="text-slate-500">•</span>
                        <span>{hardware.leadTimeDays}d lead time</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-500">
                        <Package className="w-3 h-3" />
                        <span>{hardware.origin}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Results count */}
      {filteredHardware.length > 0 && (
        <div className="text-xs text-slate-500 text-center pt-2 border-t border-slate-700/50">
          Showing {filteredHardware.length} hardware item{filteredHardware.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};
