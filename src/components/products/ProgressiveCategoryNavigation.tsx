import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Scissors, Cpu, Zap, Factory, Wrench } from 'lucide-react';
import { Badge } from '@/shared/ui/ui/badge';
import { 
  CategoryNode, 
  getMainCategories
} from '@/constants/categoryHierarchy';

interface ProgressiveCategoryNavigationProps {
  selectedCategory: string;
  onCategorySelect: (categoryId: string) => void;
  className?: string;
  showMachineCounts?: boolean;
  compact?: boolean;
}

// Icon mapping for categories
const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'cutting-machines': Scissors,
  'processing-centers': Cpu,
  'welding-machines': Zap,
  'fabrication-equipment': Factory,
  'accessories': Wrench,
};

const ProgressiveCategoryNavigation: React.FC<ProgressiveCategoryNavigationProps> = ({
  selectedCategory,
  onCategorySelect,
  className = '',
  showMachineCounts = true,
  compact = false
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  const mainCategories = getMainCategories();

  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  }, []);

  const handleCategoryClick = useCallback((categoryId: string, hasChildren: boolean) => {
    if (hasChildren) {
      toggleCategory(categoryId);
    } else {
      onCategorySelect(categoryId);
    }
  }, [onCategorySelect, toggleCategory]);

  const isExpanded = useCallback((categoryId: string) => {
    return expandedCategories.has(categoryId);
  }, [expandedCategories]);

  const isSelected = useCallback((categoryId: string) => {
    return selectedCategory === categoryId;
  }, [selectedCategory]);

  const getCategoryIcon = useCallback((categoryId: string) => {
    const IconComponent = categoryIcons[categoryId];
    return IconComponent ? <IconComponent className="h-4 w-4" /> : null;
  }, []);

  const renderCategoryItem = useCallback((category: CategoryNode, level: number = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const expanded = isExpanded(category.id);
    const selected = isSelected(category.id);
    const hovered = hoveredCategory === category.id;

    return (
      <div key={category.id} className="select-none">
        <motion.div
          className={`
            flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200
            ${level === 0 ? 'font-medium' : 'font-normal'}
            ${selected 
              ? 'bg-orange-500/20 border border-orange-500/30 text-orange-400' 
              : hovered 
                ? 'bg-gray-700/50 border border-gray-600/30 text-gray-200' 
                : 'text-gray-300 hover:text-gray-100'
            }
            ${compact ? 'py-2 px-3' : 'py-3 px-4'}
          `}
          style={{ marginLeft: level * 16 }}
          onClick={() => handleCategoryClick(category.id, hasChildren)}
          onMouseEnter={() => setHoveredCategory(category.id)}
          onMouseLeave={() => setHoveredCategory(null)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {level === 0 && getCategoryIcon(category.id)}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate">{category.name}</span>
                {showMachineCounts && category.machineCount && (
                  <Badge 
                    variant="secondary" 
                    className="text-xs bg-gray-600/50 text-gray-300"
                  >
                    {category.machineCount}
                  </Badge>
                )}
              </div>
              {!compact && category.description && (
                <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                  {category.description}
                </p>
              )}
            </div>
          </div>

          {hasChildren && (
            <motion.div
              animate={{ rotate: expanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </motion.div>
          )}
        </motion.div>

        <AnimatePresence>
          {hasChildren && expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="mt-1 space-y-1">
                {category.children?.map(child => renderCategoryItem(child, level + 1))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }, [
    isExpanded, 
    isSelected, 
    hoveredCategory, 
    handleCategoryClick, 
    getCategoryIcon, 
    showMachineCounts, 
    compact
  ]);

  return (
    <div className={`bg-gray-800/50 rounded-lg border border-gray-700/50 ${className}`}>
      <div className="p-4 border-b border-gray-700/50">
        <h3 className="text-lg font-semibold text-white">Product Categories</h3>
        <p className="text-sm text-gray-400 mt-1">
          Browse by category to find the right equipment
        </p>
      </div>
      
      <div className="p-2">
        <div className="space-y-1">
          {mainCategories.map(category => renderCategoryItem(category))}
        </div>
      </div>
    </div>
  );
};

export default ProgressiveCategoryNavigation;

