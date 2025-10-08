import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Button } from '@/shared/ui/ui/button';
import { getCategoryBreadcrumb, findCategoryById } from '@/constants/categoryHierarchy';

interface CategoryBreadcrumbProps {
  currentCategoryId: string;
  onCategorySelect: (categoryId: string) => void;
  onHomeClick?: () => void;
  className?: string;
  showHome?: boolean;
}

const CategoryBreadcrumb: React.FC<CategoryBreadcrumbProps> = ({
  currentCategoryId,
  onCategorySelect,
  onHomeClick,
  className = '',
  showHome = true
}) => {
  const breadcrumb = getCategoryBreadcrumb(currentCategoryId);
  
  if (breadcrumb.length === 0) {
    return null;
  }

  return (
    <nav className={`flex items-center space-x-1 text-sm ${className}`} aria-label="Breadcrumb">
      {showHome && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={onHomeClick}
            className="text-gray-400 hover:text-white p-1 h-auto"
          >
            <Home className="h-4 w-4" />
          </Button>
          <ChevronRight className="h-4 w-4 text-gray-500" />
        </>
      )}
      
      {breadcrumb.map((category, index) => {
        const isLast = index === breadcrumb.length - 1;
        
        return (
          <React.Fragment key={category.id}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => !isLast && onCategorySelect(category.id)}
              className={`
                p-1 h-auto text-xs
                ${isLast 
                  ? 'text-orange-400 font-medium cursor-default' 
                  : 'text-gray-400 hover:text-white cursor-pointer'
                }
              `}
              disabled={isLast}
            >
              {category.name}
            </Button>
            
            {!isLast && (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default CategoryBreadcrumb;

