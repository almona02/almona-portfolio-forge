import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Filter, X, Building2, Layers, Factory } from 'lucide-react';
import { Button } from '@/shared/ui/ui/button';
import { Badge } from '@/shared/ui/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/ui/select';
import { 
  industrialCategoryHierarchy,
  IndustrialCategoryNode,
  getCategoriesByMaterial,
  findIndustrialCategoryById,
  industrialMachineMapping
} from '@/constants/industrialCategoryHierarchy';

interface IndustrialCategoryFilterProps {
  selectedCategory: string;
  onCategoryChange: (categoryId: string) => void;
  className?: string;
  compact?: boolean;
  showAllOption?: boolean;
  showMaterialFilter?: boolean;
}

const IndustrialCategoryFilter: React.FC<IndustrialCategoryFilterProps> = ({
  selectedCategory,
  onCategoryChange,
  className = '',
  compact = false,
  showAllOption = true,
  showMaterialFilter = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMaterialType, setSelectedMaterialType] = useState<'aluminum' | 'upvc' | 'all'>('all');

  const getSelectedCategoryName = useCallback(() => {
    if (selectedCategory === 'all') return 'All Categories';
    const category = findIndustrialCategoryById(selectedCategory);
    return category?.name || 'Select Category';
  }, [selectedCategory]);

  const getSelectedCategoryCount = useCallback(() => {
    if (selectedCategory === 'all') {
      const allCategories = getCategoriesByMaterial('all');
      return allCategories.reduce((total, cat) => {
        return total + (cat.children?.reduce((subTotal, subCat) => 
          subTotal + (subCat.machineCount || 0), 0) || 0);
      }, 0);
    }
    
    const category = findIndustrialCategoryById(selectedCategory);
    if (category?.children) {
      return category.children.reduce((total, subCat) => 
        total + (subCat.machineCount || 0), 0);
    }
    
    return category?.machineCount || 0;
  }, [selectedCategory]);

  const getSelectedCategoryMaterial = useCallback(() => {
    if (selectedCategory === 'all') return 'all';
    const category = findIndustrialCategoryById(selectedCategory);
    return category?.materialType || 'all';
  }, [selectedCategory]);

  const handleCategorySelect = useCallback((categoryId: string) => {
    onCategoryChange(categoryId);
    setIsOpen(false);
  }, [onCategoryChange]);

  const clearFilter = useCallback(() => {
    onCategoryChange('all');
  }, [onCategoryChange]);

  const handleMaterialTypeChange = useCallback((materialType: 'aluminum' | 'upvc' | 'all') => {
    setSelectedMaterialType(materialType);
    // Reset to all categories when changing material type
    if (selectedCategory !== 'all') {
      onCategoryChange('all');
    }
  }, [selectedCategory, onCategoryChange]);

  const getMaterialIcon = useCallback((materialType: string) => {
    switch (materialType) {
      case 'aluminum': return <Building2 className="h-4 w-4" />;
      case 'upvc': return <Layers className="h-4 w-4" />;
      default: return <Factory className="h-4 w-4" />;
    }
  }, []);

  const currentCategories = getCategoriesByMaterial(selectedMaterialType);

  if (compact) {
    return (
      <div className={`relative ${className}`}>
        {showMaterialFilter && (
          <div className="mb-2">
            <Select value={selectedMaterialType} onValueChange={handleMaterialTypeChange}>
              <SelectTrigger className="w-full bg-black/70 border-gray-600 focus:border-orange-500 focus:ring-0 hover:bg-black/80 transition-colors">
                <SelectValue placeholder="Select material type" />
              </SelectTrigger>
              <SelectContent className="bg-[linear-gradient(160deg,rgba(0,0,0,0.95)_0%,rgba(28,28,28,0.95)_60%,rgba(46,46,46,0.9)_100%)] border border-gray-700">
                <SelectItem value="all" className="text-white hover:bg-gray-700">
                  <div className="flex items-center gap-2">
                    <Factory className="h-4 w-4" />
                    All Machinery
                  </div>
                </SelectItem>
                <SelectItem value="aluminum" className="text-white hover:bg-gray-700">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Aluminum Processing
                  </div>
                </SelectItem>
                <SelectItem value="upvc" className="text-white hover:bg-gray-700">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    UPVC Processing
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        
        <Select value={selectedCategory} onValueChange={onCategoryChange}>
          <SelectTrigger className="w-full bg-black/70 border-gray-600 focus:border-orange-500 focus:ring-0 hover:bg-black/80 transition-colors">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent className="bg-[linear-gradient(160deg,rgba(0,0,0,0.95)_0%,rgba(28,28,28,0.95)_60%,rgba(46,46,46,0.9)_100%)] border border-gray-700">
            {showAllOption && (
              <SelectItem value="all" className="text-white hover:bg-gray-700">
                All Categories
              </SelectItem>
            )}
            {currentCategories.map(category => (
              <React.Fragment key={category.id}>
                <SelectItem 
                  value={category.id} 
                  className="text-white hover:bg-gray-700 font-medium"
                >
                  <div className="flex items-center gap-2">
                    {getMaterialIcon(category.materialType || 'all')}
                    {category.name}
                  </div>
                </SelectItem>
                {category.children?.map(subCategory => (
                  <SelectItem 
                    key={subCategory.id} 
                    value={subCategory.id} 
                    className="text-white hover:bg-gray-700 pl-6"
                  >
                    {subCategory.name}
                  </SelectItem>
                ))}
              </React.Fragment>
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
        className="w-full justify-between bg-black/70 border-gray-600 hover:bg-black/80 hover:border-orange-500/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <span>{getSelectedCategoryName()}</span>
          {getSelectedCategoryCount() > 0 && (
            <Badge variant="secondary" className="text-xs bg-orange-500/20 text-orange-400">
              {getSelectedCategoryCount()}
            </Badge>
          )}
          {getSelectedCategoryMaterial() !== 'all' && (
            <Badge 
              variant="outline" 
              className={`text-xs ${
                getSelectedCategoryMaterial() === 'aluminum' 
                  ? 'border-blue-500/50 text-blue-400' 
                  : 'border-green-500/50 text-green-400'
              }`}
            >
              {getSelectedCategoryMaterial().toUpperCase()}
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
            className="absolute top-full left-0 right-0 mt-2 bg-[linear-gradient(160deg,rgba(0,0,0,0.95)_0%,rgba(28,28,28,0.95)_60%,rgba(46,46,46,0.9)_100%)] border border-gray-700 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto"
          >
            <div className="p-2">
              {/* Material Type Filter */}
              {showMaterialFilter && (
                <div className="mb-4 p-2 border-b border-gray-700">
                  <h4 className="text-sm font-medium text-white mb-2">Material Type</h4>
                  <div className="flex gap-2">
                    {[
                      { id: 'all', name: 'All', icon: 'all' },
                      { id: 'aluminum', name: 'Aluminum', icon: 'aluminum' },
                      { id: 'upvc', name: 'UPVC', icon: 'upvc' }
                    ].map((material) => (
                      <Button
                        key={material.id}
                        variant={selectedMaterialType === material.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleMaterialTypeChange(material.id as 'aluminum' | 'upvc' | 'all')}
                        className={`
                          flex items-center gap-1 text-xs
                          ${selectedMaterialType === material.id 
                            ? 'bg-orange-500 hover:bg-orange-600' 
                            : 'border-gray-600 hover:border-orange-500/50'
                          }
                        `}
                      >
                        {getMaterialIcon(material.icon)}
                        {material.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {showAllOption && (
                <motion.button
                  onClick={() => handleCategorySelect('all')}
                  className={`
                    w-full text-left p-3 rounded-lg transition-colors
                    ${selectedCategory === 'all' 
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' 
                      : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                    }
                  `}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">All Categories</span>
                    <Badge variant="secondary" className="text-xs bg-gray-600/50 text-gray-300">
                      {getSelectedCategoryCount()}
                    </Badge>
                  </div>
                </motion.button>
              )}

              <div className="mt-2 space-y-1">
                {currentCategories.map(category => (
                  <div key={category.id}>
                    <motion.button
                      onClick={() => handleCategorySelect(category.id)}
                      className={`
                        w-full text-left p-3 rounded-lg transition-colors
                        ${selectedCategory === category.id 
                          ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' 
                          : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                        }
                      `}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getMaterialIcon(category.materialType || 'all')}
                          <span className="font-medium">{category.name}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs bg-gray-600/50 text-gray-300">
                          {category.children?.reduce((total, subCat) => 
                            total + (subCat.machineCount || 0), 0) || 0}
                        </Badge>
                      </div>
                      {category.description && (
                        <p className="text-xs text-gray-400 mt-1">{category.description}</p>
                      )}
                    </motion.button>

                    {/* Subcategories */}
                    <div className="ml-4 mt-1 space-y-1">
                      {category.children?.map(subCategory => (
                        <motion.button
                          key={subCategory.id}
                          onClick={() => handleCategorySelect(subCategory.id)}
                          className={`
                            w-full text-left p-2 rounded-lg transition-colors text-sm
                            ${selectedCategory === subCategory.id 
                              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' 
                              : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
                            }
                          `}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center justify-between">
                            <span>{subCategory.name}</span>
                            {subCategory.machineCount && (
                              <Badge variant="secondary" className="text-xs bg-gray-600/50 text-gray-300">
                                {subCategory.machineCount}
                              </Badge>
                            )}
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                ))}
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

export default IndustrialCategoryFilter;

