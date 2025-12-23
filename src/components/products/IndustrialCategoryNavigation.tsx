import React, { useState, useCallback } from 'react';
import { LazyAnimatePresence, LazyMotionDiv } from '@/utils/lazyMotion';
import { 
  ChevronRight, 
  Scissors, 
  Cpu, 
  Zap, 
  Factory, 
  Wrench, 
  Target,
  Sparkles,
  Building2,
  Layers
} from 'lucide-react';
import { Button } from '@/shared/ui/ui/button';
import { Badge } from '@/shared/ui/ui/badge';
import { 
  IndustrialCategoryNode,
  getCategoriesByMaterial
} from '@/constants/industrialCategoryHierarchy';

interface IndustrialCategoryNavigationProps {
  selectedCategory: string;
  onCategorySelect: (categoryId: string) => void;
  className?: string;
  showMachineCounts?: boolean;
  compact?: boolean;
  showMaterialTabs?: boolean;
}

// Enhanced icon mapping for industrial categories
const industrialCategoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  // Material types
  'aluminum': Building2,
  'upvc': Layers,
  'all': Factory,
  
  // Workflow stages
  'cutting': Scissors,
  'routing': Cpu,
  'welding': Zap,
  'crimping': Wrench,
  'punching': Target,
  'finishing': Sparkles,
  'assembly': Factory,
};

const IndustrialCategoryNavigation: React.FC<IndustrialCategoryNavigationProps> = ({
  selectedCategory,
  onCategorySelect,
  className = '',
  showMachineCounts = true,
  compact = false,
  showMaterialTabs = true
}) => {
  const [selectedMaterialType, setSelectedMaterialType] = useState<'aluminum' | 'upvc' | 'all'>('all');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

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

  const handleMaterialTypeChange = useCallback((materialType: 'aluminum' | 'upvc' | 'all') => {
    setSelectedMaterialType(materialType);
    // Clear expanded categories when switching material types
    setExpandedCategories(new Set());
  }, []);

  const isExpanded = useCallback((categoryId: string) => {
    return expandedCategories.has(categoryId);
  }, [expandedCategories]);

  const isSelected = useCallback((categoryId: string) => {
    return selectedCategory === categoryId;
  }, [selectedCategory]);

  const getCategoryIcon = useCallback((category: IndustrialCategoryNode) => {
    const IconComponent = industrialCategoryIcons[category.workflowStage || category.id] || Factory;
    return <IconComponent className="h-4 w-4" />;
  }, []);

  const getMaterialIcon = useCallback((materialType: string) => {
    const IconComponent = industrialCategoryIcons[materialType] || Factory;
    return <IconComponent className="h-5 w-5" />;
  }, []);

  const renderCategoryItem = useCallback((category: IndustrialCategoryNode, level: number = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const expanded = isExpanded(category.id);
    const selected = isSelected(category.id);
    const hovered = hoveredCategory === category.id;

    return (
      <div key={category.id} className="select-none">
        <LazyMotionDiv
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
            {level === 0 && getCategoryIcon(category)}
            
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
                {category.materialType && category.materialType !== 'both' && (
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      category.materialType === 'aluminum' 
                        ? 'border-blue-500/50 text-blue-400' 
                        : 'border-green-500/50 text-green-400'
                    }`}
                  >
                    {category.materialType.toUpperCase()}
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
            <LazyMotionDiv
              animate={{ rotate: expanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </LazyMotionDiv>
          )}
        </LazyMotionDiv>

        <LazyAnimatePresence>
          {hasChildren && expanded && (
            <LazyMotionDiv
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="mt-1 space-y-1">
                {category.children?.map(child => renderCategoryItem(child, level + 1))}
              </div>
            </LazyMotionDiv>
          )}
        </LazyAnimatePresence>
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

  const currentCategories = getCategoriesByMaterial(selectedMaterialType);

  return (
    <div className={`bg-gray-800/50 rounded-lg border border-gray-700/50 ${className}`}>
      {showMaterialTabs && (
        <div className="p-4 border-b border-gray-700/50">
          <h3 className="text-lg font-semibold text-white mb-3">Material Type</h3>
          <div className="flex gap-2">
            {[
              { id: 'all', name: 'All Machinery', icon: 'all' },
              { id: 'aluminum', name: 'Aluminum', icon: 'aluminum' },
              { id: 'upvc', name: 'UPVC', icon: 'upvc' }
            ].map((material) => (
              <Button
                key={material.id}
                variant={selectedMaterialType === material.id ? "default" : "outline"}
                size="sm"
                onClick={() => handleMaterialTypeChange(material.id as 'aluminum' | 'upvc' | 'all')}
                className={`
                  flex items-center gap-2
                  ${selectedMaterialType === material.id 
                    ? 'bg-orange-500 hover:bg-orange-600' 
                    : 'border-gray-600 hover:border-orange-500/50'
                  }
                `}
              >
                {getMaterialIcon(material.icon)}
                <span className="text-xs">{material.name}</span>
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            {selectedMaterialType === 'all' ? 'All Categories' : 
             selectedMaterialType === 'aluminum' ? 'Aluminum Processing' : 
             'UPVC Processing'}
          </h3>
          {selectedMaterialType !== 'all' && (
            <Badge variant="outline" className="text-xs">
              {currentCategories.reduce((total, cat) => 
                total + (cat.children?.reduce((subTotal, subCat) => 
                  subTotal + (subCat.machineCount || 0), 0) || 0), 0
              )} machines
            </Badge>
          )}
        </div>
        
        <div className="space-y-1">
          {currentCategories.map(category => renderCategoryItem(category))}
        </div>
      </div>
    </div>
  );
};

export default IndustrialCategoryNavigation;

