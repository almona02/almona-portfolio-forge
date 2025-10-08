// Professional Industrial Category Hierarchy for ALMONA
// Industry-standard terminology for aluminum and UPVC processing machinery

export interface IndustrialCategoryNode {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  icon: string;
  children?: IndustrialCategoryNode[];
  machineCount?: number;
  isMainCategory?: boolean;
  materialType?: 'aluminum' | 'upvc' | 'both';
  workflowStage?: 'cutting' | 'routing' | 'welding' | 'crimping' | 'punching' | 'finishing' | 'assembly';
}

// Aluminum Processing Machine Categories
export const aluminumCategories: IndustrialCategoryNode[] = [
  {
    id: "aluminum-cutting",
    name: "Cutting Machines",
    nameAr: "ماكينات القطع",
    description: "Precision cutting equipment for aluminum profiles and extrusions",
    descriptionAr: "معدات القطع الدقيقة للملفات والمواد المطروقة من الألومنيوم",
    icon: "scissors",
    materialType: "aluminum",
    workflowStage: "cutting",
    isMainCategory: true,
    children: [
      {
        id: "single-head-cutting-aluminum",
        name: "Single Head Cutting Machines",
        nameAr: "ماكينات القطع برأس واحد",
        description: "Versatile single head cutting machines for aluminum profiles",
        descriptionAr: "ماكينات قطع متعددة الاستخدام برأس واحد للملفات الألومنيومية",
        icon: "scissors",
        machineCount: 4,
        materialType: "aluminum",
        workflowStage: "cutting"
      },
      {
        id: "double-head-cutting-aluminum",
        name: "Double Head Cutting Machines",
        nameAr: "ماكينات القطع برأسين",
        description: "High-precision double head cutting machines for aluminum",
        descriptionAr: "ماكينات قطع عالية الدقة برأسين للألومنيوم",
        icon: "scissors",
        machineCount: 8,
        materialType: "aluminum",
        workflowStage: "cutting"
      },
      {
        id: "cnc-cutting-centers-aluminum",
        name: "CNC Cutting Centers",
        nameAr: "مراكز القطع بالتحكم الرقمي",
        description: "Computer numerical control cutting centers for aluminum",
        descriptionAr: "مراكز قطع بالتحكم الرقمي الحاسوبي للألومنيوم",
        icon: "cpu",
        machineCount: 3,
        materialType: "aluminum",
        workflowStage: "cutting"
      },
      {
        id: "angular-cutting-aluminum",
        name: "Angular Cutting Machines",
        nameAr: "ماكينات القطع الزاوي",
        description: "Specialized angular cutting machines for aluminum profiles",
        descriptionAr: "ماكينات قطع زاوي متخصصة للملفات الألومنيومية",
        icon: "scissors",
        machineCount: 6,
        materialType: "aluminum",
        workflowStage: "cutting"
      }
    ]
  },
  {
    id: "aluminum-routing",
    name: "Copy & CNC Routers",
    nameAr: "أجهزة التوجيه بالنسخ والتحكم الرقمي",
    description: "Advanced routing equipment for aluminum profile processing",
    descriptionAr: "معدات التوجيه المتقدمة لمعالجة الملفات الألومنيومية",
    icon: "cpu",
    materialType: "aluminum",
    workflowStage: "routing",
    isMainCategory: true,
    children: [
      {
        id: "copy-routers-aluminum",
        name: "3-Axis Copy Routers",
        nameAr: "أجهزة التوجيه بالنسخ ثلاثية المحاور",
        description: "Template-based copy routers for aluminum profiles",
        descriptionAr: "أجهزة توجيه بالنسخ قائمة على القوالب للملفات الألومنيومية",
        icon: "cpu",
        machineCount: 7,
        materialType: "aluminum",
        workflowStage: "routing"
      },
      {
        id: "cnc-routers-aluminum",
        name: "5-Axis CNC Routers",
        nameAr: "أجهزة التوجيه بالتحكم الرقمي خمسية المحاور",
        description: "Multi-axis CNC routers for complex aluminum processing",
        descriptionAr: "أجهزة توجيه بالتحكم الرقمي متعددة المحاور للمعالجة المعقدة للألومنيوم",
        icon: "cpu",
        machineCount: 2,
        materialType: "aluminum",
        workflowStage: "routing"
      },
      {
        id: "high-speed-routing-aluminum",
        name: "High-Speed Routing Centers",
        nameAr: "مراكز التوجيه عالية السرعة",
        description: "High-speed routing centers for aluminum profile processing",
        descriptionAr: "مراكز توجيه عالية السرعة لمعالجة الملفات الألومنيومية",
        icon: "zap",
        machineCount: 1,
        materialType: "aluminum",
        workflowStage: "routing"
      },
      {
        id: "profile-processing-routers",
        name: "Profile Processing Routers",
        nameAr: "أجهزة توجيه معالجة الملفات",
        description: "Specialized routers for aluminum profile processing",
        descriptionAr: "أجهزة توجيه متخصصة لمعالجة الملفات الألومنيومية",
        icon: "cpu",
        machineCount: 4,
        materialType: "aluminum",
        workflowStage: "routing"
      }
    ]
  },
  {
    id: "aluminum-crimping",
    name: "Corner Crimping & Assembly",
    nameAr: "الضغط الزاوي والتجميع",
    description: "Corner crimping and assembly equipment for aluminum frames",
    descriptionAr: "معدات الضغط الزاوي والتجميع للإطارات الألومنيومية",
    icon: "wrench",
    materialType: "aluminum",
    workflowStage: "crimping",
    isMainCategory: true,
    children: [
      {
        id: "single-head-crimpers",
        name: "Single Head Corner Crimpers",
        nameAr: "مكابس الضغط الزاوي برأس واحد",
        description: "Single head corner crimping machines for aluminum",
        descriptionAr: "ماكينات الضغط الزاوي برأس واحد للألومنيوم",
        icon: "wrench",
        machineCount: 2,
        materialType: "aluminum",
        workflowStage: "crimping"
      },
      {
        id: "double-head-crimpers",
        name: "Double Head Corner Crimpers",
        nameAr: "مكابس الضغط الزاوي برأسين",
        description: "Double head corner crimping machines for aluminum",
        descriptionAr: "ماكينات الضغط الزاوي برأسين للألومنيوم",
        icon: "wrench",
        machineCount: 3,
        materialType: "aluminum",
        workflowStage: "crimping"
      },
      {
        id: "automatic-corner-assembly",
        name: "Automatic Corner Assembly",
        nameAr: "التجميع الزاوي التلقائي",
        description: "Automatic corner assembly systems for aluminum frames",
        descriptionAr: "أنظمة التجميع الزاوي التلقائي للإطارات الألومنيومية",
        icon: "factory",
        machineCount: 1,
        materialType: "aluminum",
        workflowStage: "assembly"
      },
      {
        id: "hydraulic-corner-presses",
        name: "Hydraulic Corner Presses",
        nameAr: "المكابس الهيدروليكية الزاوية",
        description: "Hydraulic corner pressing machines for aluminum",
        descriptionAr: "ماكينات الضغط الهيدروليكي الزاوي للألومنيوم",
        icon: "wrench",
        machineCount: 2,
        materialType: "aluminum",
        workflowStage: "crimping"
      }
    ]
  },
  {
    id: "aluminum-punching",
    name: "Punch & Notching Presses",
    nameAr: "مكابس الثقب والقطع",
    description: "Punching and notching equipment for aluminum profiles",
    descriptionAr: "معدات الثقب والقطع للملفات الألومنيومية",
    icon: "target",
    materialType: "aluminum",
    workflowStage: "punching",
    isMainCategory: true,
    children: [
      {
        id: "cnc-punch-presses",
        name: "CNC Punch Presses",
        nameAr: "مكابس الثقب بالتحكم الرقمي",
        description: "CNC punch presses for aluminum profile processing",
        descriptionAr: "مكابس ثقب بالتحكم الرقمي لمعالجة الملفات الألومنيومية",
        icon: "target",
        machineCount: 2,
        materialType: "aluminum",
        workflowStage: "punching"
      },
      {
        id: "automatic-notching-machines",
        name: "Automatic Notching Machines",
        nameAr: "ماكينات القطع التلقائي",
        description: "Automatic notching machines for aluminum profiles",
        descriptionAr: "ماكينات قطع تلقائي للملفات الألومنيومية",
        icon: "target",
        machineCount: 1,
        materialType: "aluminum",
        workflowStage: "punching"
      },
      {
        id: "multi-function-punching",
        name: "Multi-Function Punching Centers",
        nameAr: "مراكز الثقب متعددة الوظائف",
        description: "Multi-function punching centers for aluminum",
        descriptionAr: "مراكز ثقب متعددة الوظائف للألومنيوم",
        icon: "target",
        machineCount: 1,
        materialType: "aluminum",
        workflowStage: "punching"
      },
      {
        id: "hydraulic-punch-machines",
        name: "Hydraulic Punch Machines",
        nameAr: "ماكينات الثقب الهيدروليكية",
        description: "Hydraulic punch machines for aluminum processing",
        descriptionAr: "ماكينات ثقب هيدروليكية لمعالجة الألومنيوم",
        icon: "target",
        machineCount: 1,
        materialType: "aluminum",
        workflowStage: "punching"
      }
    ]
  }
];

// UPVC Processing Machine Categories
export const upvcCategories: IndustrialCategoryNode[] = [
  {
    id: "upvc-cutting",
    name: "Cutting & Sawing",
    nameAr: "القطع والمنشار",
    description: "Cutting and sawing equipment for UPVC profiles",
    descriptionAr: "معدات القطع والمنشار للملفات UPVC",
    icon: "scissors",
    materialType: "upvc",
    workflowStage: "cutting",
    isMainCategory: true,
    children: [
      {
        id: "single-head-upvc-saws",
        name: "Single Head UPVC Saws",
        nameAr: "مناشير UPVC برأس واحد",
        description: "Single head sawing machines for UPVC profiles",
        descriptionAr: "ماكينات منشار برأس واحد للملفات UPVC",
        icon: "scissors",
        machineCount: 3,
        materialType: "upvc",
        workflowStage: "cutting"
      },
      {
        id: "double-head-upvc-saws",
        name: "Double Head UPVC Saws",
        nameAr: "مناشير UPVC برأسين",
        description: "Double head sawing machines for UPVC profiles",
        descriptionAr: "ماكينات منشار برأسين للملفات UPVC",
        icon: "scissors",
        machineCount: 5,
        materialType: "upvc",
        workflowStage: "cutting"
      },
      {
        id: "angular-cutting-upvc",
        name: "Angular Cutting Machines",
        nameAr: "ماكينات القطع الزاوي",
        description: "Angular cutting machines for UPVC profiles",
        descriptionAr: "ماكينات قطع زاوي للملفات UPVC",
        icon: "scissors",
        machineCount: 4,
        materialType: "upvc",
        workflowStage: "cutting"
      },
      {
        id: "cnc-cutting-centers-upvc",
        name: "CNC Cutting Centers",
        nameAr: "مراكز القطع بالتحكم الرقمي",
        description: "CNC cutting centers for UPVC processing",
        descriptionAr: "مراكز قطع بالتحكم الرقمي لمعالجة UPVC",
        icon: "cpu",
        machineCount: 2,
        materialType: "upvc",
        workflowStage: "cutting"
      }
    ]
  },
  {
    id: "upvc-welding",
    name: "Welding Equipment",
    nameAr: "معدات اللحام",
    description: "Welding equipment for UPVC profile assembly",
    descriptionAr: "معدات اللحام لتجميع الملفات UPVC",
    icon: "zap",
    materialType: "upvc",
    workflowStage: "welding",
    isMainCategory: true,
    children: [
      {
        id: "single-head-welding-upvc",
        name: "Single Head Welding Machines",
        nameAr: "ماكينات اللحام برأس واحد",
        description: "Single head welding machines for UPVC",
        descriptionAr: "ماكينات لحام برأس واحد لـ UPVC",
        icon: "zap",
        machineCount: 2,
        materialType: "upvc",
        workflowStage: "welding"
      },
      {
        id: "double-head-welding-upvc",
        name: "Double Head Welding Machines",
        nameAr: "ماكينات اللحام برأسين",
        description: "Double head welding machines for UPVC",
        descriptionAr: "ماكينات لحام برأسين لـ UPVC",
        icon: "zap",
        machineCount: 3,
        materialType: "upvc",
        workflowStage: "welding"
      },
      {
        id: "four-head-welding-centers",
        name: "Four Head Welding Centers",
        nameAr: "مراكز اللحام بأربعة رؤوس",
        description: "Four head welding centers for UPVC processing",
        descriptionAr: "مراكز لحام بأربعة رؤوس لمعالجة UPVC",
        icon: "zap",
        machineCount: 1,
        materialType: "upvc",
        workflowStage: "welding"
      },
      {
        id: "automatic-welding-stations",
        name: "Automatic Welding Stations",
        nameAr: "محطات اللحام التلقائي",
        description: "Automatic welding stations for UPVC assembly",
        descriptionAr: "محطات لحام تلقائي لتجميع UPVC",
        icon: "factory",
        machineCount: 1,
        materialType: "upvc",
        workflowStage: "welding"
      }
    ]
  },
  {
    id: "upvc-routing",
    name: "Copy Routers for UPVC",
    nameAr: "أجهزة التوجيه بالنسخ لـ UPVC",
    description: "Routing equipment for UPVC profile processing",
    descriptionAr: "معدات التوجيه لمعالجة الملفات UPVC",
    icon: "cpu",
    materialType: "upvc",
    workflowStage: "routing",
    isMainCategory: true,
    children: [
      {
        id: "profile-copy-routers-upvc",
        name: "Profile Copy Routers",
        nameAr: "أجهزة التوجيه بالنسخ للملفات",
        description: "Profile copy routers for UPVC processing",
        descriptionAr: "أجهزة توجيه بالنسخ للملفات لمعالجة UPVC",
        icon: "cpu",
        machineCount: 4,
        materialType: "upvc",
        workflowStage: "routing"
      },
      {
        id: "cnc-upvc-routers",
        name: "CNC UPVC Routers",
        nameAr: "أجهزة التوجيه بالتحكم الرقمي لـ UPVC",
        description: "CNC routers for UPVC profile processing",
        descriptionAr: "أجهزة توجيه بالتحكم الرقمي لمعالجة الملفات UPVC",
        icon: "cpu",
        machineCount: 2,
        materialType: "upvc",
        workflowStage: "routing"
      },
      {
        id: "end-milling-machines-upvc",
        name: "End Milling Machines",
        nameAr: "ماكينات الطحن النهائي",
        description: "End milling machines for UPVC profiles",
        descriptionAr: "ماكينات طحن نهائي للملفات UPVC",
        icon: "cpu",
        machineCount: 3,
        materialType: "upvc",
        workflowStage: "routing"
      },
      {
        id: "v-groove-milling-upvc",
        name: "V-Groove Milling Machines",
        nameAr: "ماكينات طحن الأخاديد على شكل V",
        description: "V-groove milling machines for UPVC",
        descriptionAr: "ماكينات طحن الأخاديد على شكل V لـ UPVC",
        icon: "cpu",
        machineCount: 2,
        materialType: "upvc",
        workflowStage: "routing"
      }
    ]
  },
  {
    id: "upvc-finishing",
    name: "Finishing & Cleaning",
    nameAr: "الإنهاء والتنظيف",
    description: "Finishing and cleaning equipment for UPVC profiles",
    descriptionAr: "معدات الإنهاء والتنظيف للملفات UPVC",
    icon: "sparkles",
    materialType: "upvc",
    workflowStage: "finishing",
    isMainCategory: true,
    children: [
      {
        id: "automatic-cleaning-stations",
        name: "Automatic Cleaning Stations",
        nameAr: "محطات التنظيف التلقائي",
        description: "Automatic cleaning stations for UPVC processing",
        descriptionAr: "محطات تنظيف تلقائي لمعالجة UPVC",
        icon: "sparkles",
        machineCount: 2,
        materialType: "upvc",
        workflowStage: "finishing"
      },
      {
        id: "glazing-bead-processing",
        name: "Glazing Bead Processing",
        nameAr: "معالجة حشوات الزجاج",
        description: "Glazing bead processing machines for UPVC",
        descriptionAr: "ماكينات معالجة حشوات الزجاج لـ UPVC",
        icon: "sparkles",
        machineCount: 1,
        materialType: "upvc",
        workflowStage: "finishing"
      },
      {
        id: "end-milling-finishing",
        name: "End Milling Machines",
        nameAr: "ماكينات الطحن النهائي",
        description: "End milling machines for UPVC finishing",
        descriptionAr: "ماكينات طحن نهائي لإنهاء UPVC",
        icon: "cpu",
        machineCount: 2,
        materialType: "upvc",
        workflowStage: "finishing"
      },
      {
        id: "profile-finishing-centers",
        name: "Profile Finishing Centers",
        nameAr: "مراكز إنهاء الملفات",
        description: "Profile finishing centers for UPVC",
        descriptionAr: "مراكز إنهاء الملفات لـ UPVC",
        icon: "sparkles",
        machineCount: 1,
        materialType: "upvc",
        workflowStage: "finishing"
      }
    ]
  }
];

// Combined hierarchy for progressive disclosure
export const industrialCategoryHierarchy = {
  aluminum: aluminumCategories,
  upvc: upvcCategories,
  all: [...aluminumCategories, ...upvcCategories]
};

// Helper functions
export const getCategoriesByMaterial = (materialType: 'aluminum' | 'upvc' | 'all'): IndustrialCategoryNode[] => {
  return industrialCategoryHierarchy[materialType];
};

export const findIndustrialCategoryById = (id: string): IndustrialCategoryNode | null => {
  const allCategories = [...aluminumCategories, ...upvcCategories];
  
  const traverse = (nodes: IndustrialCategoryNode[]): IndustrialCategoryNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = traverse(node.children);
        if (found) return found;
      }
    }
    return null;
  };
  
  return traverse(allCategories);
};

export const getIndustrialCategoryBreadcrumb = (categoryId: string): IndustrialCategoryNode[] => {
  const breadcrumb: IndustrialCategoryNode[] = [];
  
  const traverse = (nodes: IndustrialCategoryNode[], targetId: string, path: IndustrialCategoryNode[]): boolean => {
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
  
  const allCategories = [...aluminumCategories, ...upvcCategories];
  traverse(allCategories, categoryId, []);
  return breadcrumb;
};

// Machine mapping for backward compatibility
export const industrialMachineMapping: Record<string, string> = {
  // Aluminum Cutting
  "single-head-cutting-aluminum": "cutting-machines",
  "double-head-cutting-aluminum": "cutting-machines",
  "cnc-cutting-centers-aluminum": "processing-centers",
  "angular-cutting-aluminum": "cutting-machines",
  
  // Aluminum Routing
  "copy-routers-aluminum": "processing-centers",
  "cnc-routers-aluminum": "processing-centers",
  "high-speed-routing-aluminum": "processing-centers",
  "profile-processing-routers": "processing-centers",
  
  // Aluminum Crimping
  "single-head-crimpers": "fabrication-equipment",
  "double-head-crimpers": "fabrication-equipment",
  "automatic-corner-assembly": "fabrication-equipment",
  "hydraulic-corner-presses": "fabrication-equipment",
  
  // Aluminum Punching
  "cnc-punch-presses": "processing-centers",
  "automatic-notching-machines": "processing-centers",
  "multi-function-punching": "processing-centers",
  "hydraulic-punch-machines": "processing-centers",
  
  // UPVC Cutting
  "single-head-upvc-saws": "cutting-machines",
  "double-head-upvc-saws": "cutting-machines",
  "angular-cutting-upvc": "cutting-machines",
  "cnc-cutting-centers-upvc": "processing-centers",
  
  // UPVC Welding
  "single-head-welding-upvc": "welding-machines",
  "double-head-welding-upvc": "welding-machines",
  "four-head-welding-centers": "welding-machines",
  "automatic-welding-stations": "welding-machines",
  
  // UPVC Routing
  "profile-copy-routers-upvc": "processing-centers",
  "cnc-upvc-routers": "processing-centers",
  "end-milling-machines-upvc": "processing-centers",
  "v-groove-milling-upvc": "processing-centers",
  
  // UPVC Finishing
  "automatic-cleaning-stations": "fabrication-equipment",
  "glazing-bead-processing": "processing-centers",
  "end-milling-finishing": "processing-centers",
  "profile-finishing-centers": "fabrication-equipment"
};

