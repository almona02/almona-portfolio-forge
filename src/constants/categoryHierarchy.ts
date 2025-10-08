// Progressive Disclosure Category Hierarchy
// This file defines the hierarchical structure for product categories
// to implement progressive disclosure and avoid overwhelming users

export interface CategoryNode {
  id: string;
  name: string;
  nameAr?: string;
  description?: string;
  icon?: string;
  children?: CategoryNode[];
  machineCount?: number;
  isMainCategory?: boolean;
}

export const categoryHierarchy: CategoryNode[] = [
  {
    id: "cutting-machines",
    name: "Cutting Machines",
    nameAr: "ماكينات القطع",
    description: "Precision cutting equipment for aluminum and PVC profiles",
    icon: "scissors",
    isMainCategory: true,
    children: [
      {
        id: "double-head-cutting",
        name: "Double Head Cutting",
        nameAr: "قطع رأس مزدوج",
        description: "High-precision double head cutting machines",
        machineCount: 8
      },
      {
        id: "single-head-cutting",
        name: "Single Head Cutting",
        nameAr: "قطع رأس واحد",
        description: "Versatile single head cutting machines",
        machineCount: 4
      },
      {
        id: "mitre-saws",
        name: "Mitre Saws",
        nameAr: "مناشير ميتري",
        description: "Precision angle cutting saws",
        machineCount: 6
      },
      {
        id: "specialized-cutting",
        name: "Specialized Cutting",
        nameAr: "قطع متخصص",
        description: "Specialized cutting machines for specific applications",
        machineCount: 3
      }
    ]
  },
  {
    id: "processing-centers",
    name: "Processing Centers",
    nameAr: "مراكز المعالجة",
    description: "Advanced CNC and automated processing equipment",
    icon: "cpu",
    isMainCategory: true,
    children: [
      {
        id: "cnc-centers",
        name: "CNC Centers",
        nameAr: "مراكز التحكم الرقمي",
        description: "Computer numerical control processing centers",
        machineCount: 5
      },
      {
        id: "copy-routers",
        name: "Copy Routers",
        nameAr: "أجهزة التوجيه بالنسخ",
        description: "Template-based routing machines",
        machineCount: 7
      },
      {
        id: "milling-machines",
        name: "Milling Machines",
        nameAr: "ماكينات الطحن",
        description: "End milling and profiling machines",
        machineCount: 4
      },
      {
        id: "slotting-machines",
        name: "Slotting Machines",
        nameAr: "ماكينات الفتحات",
        description: "Specialized slotting and drilling machines",
        machineCount: 2
      }
    ]
  },
  {
    id: "welding-machines",
    name: "Welding Machines",
    nameAr: "ماكينات اللحام",
    description: "PVC and aluminum welding equipment",
    icon: "zap",
    isMainCategory: true,
    children: [
      {
        id: "single-corner-welding",
        name: "Single Corner Welding",
        nameAr: "لحام زاوية واحدة",
        description: "Single corner welding machines",
        machineCount: 2
      },
      {
        id: "double-corner-welding",
        name: "Double Corner Welding",
        nameAr: "لحام زاوية مزدوجة",
        description: "Double corner welding machines",
        machineCount: 3
      },
      {
        id: "four-head-welding",
        name: "Four Head Welding",
        nameAr: "لحام أربعة رؤوس",
        description: "High-capacity four head welding machines",
        machineCount: 1
      }
    ]
  },
  {
    id: "fabrication-equipment",
    name: "Fabrication Equipment",
    nameAr: "معدات التصنيع",
    description: "Complete fabrication and production line equipment",
    icon: "factory",
    isMainCategory: true,
    children: [
      {
        id: "production-lines",
        name: "Production Lines",
        nameAr: "خطوط الإنتاج",
        description: "Complete automated production lines",
        machineCount: 2
      },
      {
        id: "corner-cleaning",
        name: "Corner Cleaning",
        nameAr: "تنظيف الزوايا",
        description: "CNC corner cleaning machines",
        machineCount: 1
      },
      {
        id: "cooling-systems",
        name: "Cooling Systems",
        nameAr: "أنظمة التبريد",
        description: "Cooling and temperature control systems",
        machineCount: 1
      }
    ]
  },
  {
    id: "accessories",
    name: "Accessories & Parts",
    nameAr: "الملحقات والأجزاء",
    description: "Spare parts, tools, and machine accessories",
    icon: "wrench",
    isMainCategory: true,
    children: [
      {
        id: "cutting-tools",
        name: "Cutting Tools",
        nameAr: "أدوات القطع",
        description: "Saw blades, router bits, and cutting tools",
        machineCount: 8
      },
      {
        id: "machine-accessories",
        name: "Machine Accessories",
        nameAr: "ملحقات الماكينات",
        description: "Clamps, guides, and machine accessories",
        machineCount: 5
      },
      {
        id: "automation-parts",
        name: "Automation Parts",
        nameAr: "أجزاء الأتمتة",
        description: "Robot units and automation components",
        machineCount: 2
      }
    ]
  }
];

// Helper function to get all category IDs (including subcategories)
export const getAllCategoryIds = (): string[] => {
  const ids: string[] = [];
  
  const traverse = (nodes: CategoryNode[]) => {
    nodes.forEach(node => {
      ids.push(node.id);
      if (node.children) {
        traverse(node.children);
      }
    });
  };
  
  traverse(categoryHierarchy);
  return ids;
};

// Helper function to find a category by ID
export const findCategoryById = (id: string): CategoryNode | null => {
  const traverse = (nodes: CategoryNode[]): CategoryNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = traverse(node.children);
        if (found) return found;
      }
    }
    return null;
  };
  
  return traverse(categoryHierarchy);
};

// Helper function to get main categories only
export const getMainCategories = (): CategoryNode[] => {
  return categoryHierarchy.filter(category => category.isMainCategory);
};

// Helper function to get subcategories for a main category
export const getSubcategories = (mainCategoryId: string): CategoryNode[] => {
  const mainCategory = findCategoryById(mainCategoryId);
  return mainCategory?.children || [];
};

// Helper function to get breadcrumb path for a category
export const getCategoryBreadcrumb = (categoryId: string): CategoryNode[] => {
  const breadcrumb: CategoryNode[] = [];
  
  const traverse = (nodes: CategoryNode[], targetId: string, path: CategoryNode[]): boolean => {
    for (const node of nodes) {
      const currentPath = [...path, node];
      
      if (node.id === targetId) {
        breadcrumb.push(...currentPath);
        return true;
      }
      
      if (node.children && traverse(node.children, targetId, currentPath)) {
        return true;
      }
    }
    return false;
  };
  
  traverse(categoryHierarchy, categoryId, []);
  return breadcrumb;
};

// Machine category mapping for backward compatibility
export const machineCategoryMapping: Record<string, string> = {
  // Main categories
  "cutting-machines": "cutting-machines",
  "processing-centers": "processing-centers", 
  "welding-machines": "welding-machines",
  "fabrication-equipment": "fabrication-equipment",
  "accessories": "accessories",
  
  // Subcategories
  "double-head-cutting": "cutting-machines",
  "single-head-cutting": "cutting-machines",
  "mitre-saws": "cutting-machines",
  "specialized-cutting": "cutting-machines",
  
  "cnc-centers": "processing-centers",
  "copy-routers": "processing-centers",
  "milling-machines": "processing-centers",
  "slotting-machines": "processing-centers",
  
  "single-corner-welding": "welding-machines",
  "double-corner-welding": "welding-machines",
  "four-head-welding": "welding-machines",
  
  "production-lines": "fabrication-equipment",
  "corner-cleaning": "fabrication-equipment",
  "cooling-systems": "fabrication-equipment",
  
  "cutting-tools": "accessories",
  "machine-accessories": "accessories",
  "automation-parts": "accessories"
};

