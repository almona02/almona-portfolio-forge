import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Dynamic JSON loader (auto‑discovers files in /locales) ---------------------------------
// This allows adding new translation namespaces without touching this file.
// Vite's import.meta.glob eagerly loads JSON; merge into resources below.
type TranslationTree = Record<string, unknown>;
type DiscoveredNamespaces = Record<string, Record<string, TranslationTree>>;
const discoveredResources: DiscoveredNamespaces = {};
try {
  // Pattern: ../../locales/<lang>/<namespace>.json (from src/lib directory)
  const modules = import.meta.glob('../../locales/*/*.json', { eager: true }) as Record<string, { default: TranslationTree }>;
  for (const path in modules) {
    const parts = path.split('/');
    const lang = parts[parts.length - 2];
    const file = parts[parts.length - 1];
    const namespace = file.replace(/\.json$/, '');
    discoveredResources[lang] = discoveredResources[lang] || {};
    // merge namespace JSON under its own key (namespaced usage: t('services:title'))
    discoveredResources[lang][namespace] = modules[path].default;
  }
} catch (e) {
  // Non-fatal; build still succeeds
  console.warn('[i18n] Dynamic locale discovery failed:', e);
}

// Helper: Deep merge (simple implementation sufficient for translation trees)
function deepMerge<T extends TranslationTree, S extends TranslationTree>(target: T, source: S): T & S {
  const result: TranslationTree = { ...(target as object) };
  for (const key of Object.keys(source)) {
    const sVal = (source as TranslationTree)[key];
    const tVal = (result as TranslationTree)[key];
    if (sVal && typeof sVal === 'object' && !Array.isArray(sVal)) {
      (result as TranslationTree)[key] = deepMerge(
        (tVal && typeof tVal === 'object' && !Array.isArray(tVal) ? tVal : {}) as TranslationTree,
        sVal as TranslationTree
      );
    } else {
      (result as TranslationTree)[key] = sVal;
    }
  }
  return result as T & S;
}

// Alias Egyptian Arabic to base Arabic resources if dedicated files are absent
if (discoveredResources['ar'] && !discoveredResources['ar-EG']) {
  discoveredResources['ar-EG'] = deepMerge({}, discoveredResources['ar']);
}

// Comprehensive Arabic-first translations
const arTranslations = {
  common: {
    // Navigation
    navigation: {
      home: 'الرئيسية',
      about: 'عن الشركة',
      services: 'الخدمات',
      products: 'المنتجات',
      shop: 'المتجر',
      contact: 'اتصل بنا',
      portfolio: 'أعمالنا',
      login: 'تسجيل الدخول',
      register: 'إنشاء حساب',
      profile: 'الملف الشخصي',
      dashboard: 'لوحة التحكم',
      orders: 'الطلبات',
      quotes: 'عروض الأسعار',
      wishlist: 'المفضلة',
      cart: 'السلة'
    },
    
    // Actions
    actions: {
      viewMore: 'عرض المزيد',
      viewDetails: 'عرض التفاصيل',
      contactUs: 'اتصل بنا',
      requestQuote: 'طلب عرض سعر',
      addToQuote: 'إضافة إلى عرض السعر',
      addToCart: 'إضافة إلى السلة',
      addToWishlist: 'إضافة إلى المفضلة',
      removeFromWishlist: 'إزالة من المفضلة',
      downloadSpec: 'تحميل المواصفات',
      downloadCatalog: 'تحميل الكتالوج',
      watchVideo: 'مشاهدة الفيديو',
      learnMore: 'اعرف المزيد',
      readMore: 'اقرأ المزيد',
      showLess: 'عرض أقل',
      edit: 'تعديل',
      delete: 'حذف',
      save: 'حفظ',
      cancel: 'إلغاء',
      confirm: 'تأكيد',
      submit: 'إرسال',
      search: 'بحث',
      filter: 'تصفية',
      sort: 'ترتيب',
      share: 'مشاركة',
      print: 'طباعة',
      export: 'تصدير',
      import: 'استيراد',
      upload: 'رفع',
      download: 'تحميل',
      back: 'رجوع',
      next: 'التالي',
      previous: 'السابق',
      close: 'إغلاق',
      open: 'فتح'
    },
    
    // Status
    status: {
      loading: 'جاري التحميل...',
      error: 'حدث خطأ',
      success: 'تم بنجاح',
      warning: 'تحذير',
      info: 'معلومات',
      pending: 'في الانتظار',
      processing: 'جاري المعالجة',
      completed: 'مكتمل',
      cancelled: 'ملغي',
      active: 'نشط',
      inactive: 'غير نشط',
      available: 'متوفر',
      outOfStock: 'غير متوفر',
      inStock: 'متوفر في المخزن',
      lowStock: 'كمية قليلة'
    },
    
    // Forms
    forms: {
      name: 'الاسم',
      fullName: 'الاسم الكامل',
      firstName: 'الاسم الأول',
      lastName: 'اسم العائلة',
      email: 'البريد الإلكتروني',
      phone: 'رقم الهاتف',
      mobile: 'الهاتف المحمول',
      message: 'الرسالة',
      subject: 'الموضوع',
      company: 'الشركة',
      position: 'المنصب',
      address: 'العنوان',
      city: 'المدينة',
      governorate: 'المحافظة',
      country: 'البلد',
      postalCode: 'الرمز البريدي',
      website: 'الموقع الإلكتروني',
      password: 'كلمة المرور',
      confirmPassword: 'تأكيد كلمة المرور',
      currentPassword: 'كلمة المرور الحالية',
      newPassword: 'كلمة المرور الجديدة',
      username: 'اسم المستخدم',
      description: 'الوصف',
      notes: 'ملاحظات',
      quantity: 'الكمية',
      price: 'السعر',
      total: 'الإجمالي',
      subtotal: 'المجموع الفرعي',
      tax: 'الضريبة',
      shipping: 'الشحن',
      discount: 'الخصم',
      required: 'هذا الحقل مطلوب',
      optional: 'اختياري',
      invalid: 'غير صحيح',
      tooShort: 'قصير جداً',
      tooLong: 'طويل جداً',
      invalidEmail: 'البريد الإلكتروني غير صحيح',
      invalidPhone: 'رقم الهاتف غير صحيح',
      passwordMismatch: 'كلمات المرور غير متطابقة',
      weakPassword: 'كلمة المرور ضعيفة'
    },
    
    // Time and dates
    time: {
      now: 'الآن',
      today: 'اليوم',
      yesterday: 'أمس',
      tomorrow: 'غداً',
      thisWeek: 'هذا الأسبوع',
      lastWeek: 'الأسبوع الماضي',
      thisMonth: 'هذا الشهر',
      lastMonth: 'الشهر الماضي',
      thisYear: 'هذا العام',
      lastYear: 'العام الماضي',
      minute: 'دقيقة',
      minutes: 'دقائق',
      hour: 'ساعة',
      hours: 'ساعات',
      day: 'يوم',
      days: 'أيام',
      week: 'أسبوع',
      weeks: 'أسابيع',
      month: 'شهر',
      months: 'أشهر',
      year: 'سنة',
      years: 'سنوات'
    },
    
    // Currency and numbers
    currency: {
      egp: 'جنيه مصري',
      usd: 'دولار أمريكي',
      eur: 'يورو',
      sar: 'ريال سعودي',
      aed: 'درهم إماراتي'
    }
  },
  
  // E-commerce specific translations
  shop: {
    title: 'متجر المُنى الصناعي',
    subtitle: 'أحدث الآلات الصناعية وقطع الغيار',
    categories: {
      all: 'جميع الفئات',
      machines: 'الآلات الصناعية',
      spareParts: 'قطع الغيار',
      rawMaterials: 'المواد الخام',
      tools: 'الأدوات',
      accessories: 'الإكسسوارات',
      cnc: 'آلات CNC',
      cutting: 'آلات القطع',
      welding: 'آلات اللحام',
      electrical: 'قطع كهربائية',
      mechanical: 'قطع ميكانيكية'
    },
    product: {
      sku: 'رقم المنتج',
      brand: 'العلامة التجارية',
      model: 'الموديل',
      category: 'الفئة',
      specifications: 'المواصفات',
      features: 'المميزات',
      dimensions: 'الأبعاد',
      weight: 'الوزن',
      warranty: 'الضمان',
      availability: 'التوفر',
      compatibleWith: 'متوافق مع',
      relatedProducts: 'منتجات ذات صلة',
      recommendedProducts: 'منتجات مُوصى بها',
      recentlyViewed: 'شوهدت مؤخراً',
      newProducts: 'منتجات جديدة',
      featuredProducts: 'منتجات مميزة',
      bestSellers: 'الأكثر مبيعاً',
      onSale: 'في التخفيضات'
    },
    filters: {
      priceRange: 'نطاق السعر',
      brand: 'العلامة التجارية',
      category: 'الفئة',
      availability: 'التوفر',
      rating: 'التقييم',
      sortBy: 'ترتيب حسب',
      newest: 'الأحدث',
      oldest: 'الأقدم',
      priceHighToLow: 'السعر من الأعلى للأقل',
      priceLowToHigh: 'السعر من الأقل للأعلى',
      mostPopular: 'الأكثر شعبية',
      bestRated: 'الأعلى تقييماً'
    },
    cart: {
      title: 'سلة التسوق',
      empty: 'السلة فارغة',
      itemCount: 'عنصر',
      itemsCount: 'عناصر',
      subtotal: 'المجموع الفرعي',
      shipping: 'الشحن',
      tax: 'الضريبة',
      total: 'الإجمالي',
      checkout: 'إتمام الشراء',
      continueShopping: 'متابعة التسوق',
      updateCart: 'تحديث السلة',
      removeItem: 'إزالة العنصر',
      quantityUpdated: 'تم تحديث الكمية',
      itemAdded: 'تم إضافة العنصر',
      itemRemoved: 'تم إزالة العنصر'
    },
    quote: {
      title: 'طلب عرض سعر',
      requestQuote: 'طلب عرض سعر',
      quoteNumber: 'رقم عرض السعر',
      quoteDate: 'تاريخ عرض السعر',
      validUntil: 'صالح حتى',
      status: 'الحالة',
      draft: 'مسودة',
      pending: 'في الانتظار',
      sent: 'مُرسل',
      accepted: 'مقبول',
      rejected: 'مرفوض',
      expired: 'منتهي الصلاحية',
      items: 'العناصر',
      addItem: 'إضافة عنصر',
      removeItem: 'إزالة عنصر',
      notes: 'ملاحظات',
      terms: 'الشروط والأحكام',
      deliveryTime: 'مدة التسليم',
      paymentTerms: 'شروط الدفع',
      contactInfo: 'معلومات الاتصال',
      shippingAddress: 'عنوان الشحن',
      submitQuote: 'إرسال طلب عرض السعر',
      quoteSubmitted: 'تم إرسال طلب عرض السعر بنجاح',
      quoteUpdated: 'تم تحديث عرض السعر',
      downloadQuote: 'تحميل عرض السعر'
    },
    orders: {
      title: 'الطلبات',
      orderNumber: 'رقم الطلب',
      orderDate: 'تاريخ الطلب',
      status: 'حالة الطلب',
      draft: 'مسودة',
      pending: 'في الانتظار',
      confirmed: 'مؤكد',
      paid: 'مدفوع',
      processing: 'قيد المعالجة',
      shipped: 'تم الشحن',
      delivered: 'تم التسليم',
      cancelled: 'ملغي',
      refunded: 'مُسترد',
      trackingNumber: 'رقم التتبع',
      estimatedDelivery: 'التسليم المتوقع',
      shippingAddress: 'عنوان الشحن',
      billingAddress: 'عنوان الفواتير',
      paymentMethod: 'طريقة الدفع',
      orderTotal: 'إجمالي الطلب',
      orderItems: 'عناصر الطلب',
      orderHistory: 'تاريخ الطلبات',
      reorder: 'إعادة الطلب',
      cancelOrder: 'إلغاء الطلب',
      returnOrder: 'إرجاع الطلب'
    }
  },
  
  // Company and services
  company: {
    name: 'شركة المُنى للآلات الصناعية',
    tagline: 'شريكك الموثوق في الحلول الصناعية',
    about: {
      title: 'عن شركة المُنى',
      description: 'شركة المُنى هي الوكيل الحصري والمعتمد لآلات يلماز منذ عام 2000، وقد بنينا سمعة متميزة في التميز في كل من المنتجات والخدمات.',
      mission: 'مهمتنا',
      vision: 'رؤيتنا',
      values: 'قيمنا',
      history: 'تاريخنا',
      team: 'فريقنا',
      certifications: 'الشهادات',
      awards: 'الجوائز'
    },
    services: {
      title: 'خدماتنا',
      installation: 'التركيب',
      maintenance: 'الصيانة',
      repair: 'الإصلاح',
      training: 'التدريب',
      consultation: 'الاستشارات',
      support: 'الدعم الفني',
      warranty: 'الضمان',
      spareParts: 'قطع الغيار'
    },
    contact: {
      title: 'اتصل بنا',
      address: 'العنوان',
      phone: 'الهاتف',
      email: 'البريد الإلكتروني',
      workingHours: 'ساعات العمل',
      getInTouch: 'تواصل معنا',
      sendMessage: 'إرسال رسالة',
      messageSent: 'تم إرسال الرسالة بنجاح',
      messageError: 'حدث خطأ في إرسال الرسالة'
    }
  }
};

// Extend Arabic translations with training page namespace
Object.assign(arTranslations, {
  trainingPage: {
    enroll: 'التسجيل في البرنامج',
    subtitle: 'املأ النموذج للانضمام إلى أحد برامجنا التدريبية المتخصصة',
    material: {
      aluminium: 'ألمنيوم',
      upvc: 'يو بي في سي'
    },
    form: {
      name: 'الاسم الكامل',
      email: 'البريد الإلكتروني',
      company: 'الشركة',
      phone: 'رقم الهاتف',
      program: 'البرنامج',
      selectProgram: 'اختر برنامجًا',
      material: 'المادة',
      startDate: 'تاريخ البدء المفضل',
      flexible: 'مرن (أول دفعة متاحة)',
      notes: 'ملاحظات إضافية',
      cancel: 'إلغاء',
      submit: 'إرسال الطلب',
      submitting: 'جارٍ الإرسال...',
      success: 'تم إرسال طلب التسجيل بنجاح'
    }
  }
});

const enTranslations = {
  common: {
    navigation: {
      home: 'Home',
      about: 'About',
      services: 'Services',
      products: 'Products',
      shop: 'Shop',
      contact: 'Contact',
      portfolio: 'Portfolio',
      login: 'Login',
      register: 'Register',
      profile: 'Profile',
      dashboard: 'Dashboard',
      orders: 'Orders',
      quotes: 'Quotes',
      wishlist: 'Wishlist',
      cart: 'Cart'
    },
    actions: {
      viewMore: 'View More',
      viewDetails: 'View Details',
      contactUs: 'Contact Us',
      requestQuote: 'Request Quote',
      addToQuote: 'Add to Quote',
      addToCart: 'Add to Cart',
      addToWishlist: 'Add to Wishlist',
      removeFromWishlist: 'Remove from Wishlist',
      downloadSpec: 'Download Specifications',
      downloadCatalog: 'Download Catalog',
      watchVideo: 'Watch Video',
      learnMore: 'Learn More',
      readMore: 'Read More',
      showLess: 'Show Less',
      edit: 'Edit',
      delete: 'Delete',
      save: 'Save',
      cancel: 'Cancel',
      confirm: 'Confirm',
      submit: 'Submit',
      search: 'Search',
      filter: 'Filter',
      sort: 'Sort',
      share: 'Share',
      print: 'Print',
      export: 'Export',
      import: 'Import',
      upload: 'Upload',
      download: 'Download',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      close: 'Close',
      open: 'Open'
    },
    status: {
      loading: 'Loading...',
      error: 'Error occurred',
      success: 'Success',
      warning: 'Warning',
      info: 'Information',
      pending: 'Pending',
      processing: 'Processing',
      completed: 'Completed',
      cancelled: 'Cancelled',
      active: 'Active',
      inactive: 'Inactive',
      available: 'Available',
      outOfStock: 'Out of Stock',
      inStock: 'In Stock',
      lowStock: 'Low Stock'
    },
    forms: {
      name: 'Name',
      fullName: 'Full Name',
      firstName: 'First Name',
      lastName: 'Last Name',
      email: 'Email',
      phone: 'Phone',
      mobile: 'Mobile',
      message: 'Message',
      subject: 'Subject',
      company: 'Company',
      position: 'Position',
      address: 'Address',
      city: 'City',
      governorate: 'Governorate',
      country: 'Country',
      postalCode: 'Postal Code',
      website: 'Website',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      currentPassword: 'Current Password',
      newPassword: 'New Password',
      username: 'Username',
      description: 'Description',
      notes: 'Notes',
      quantity: 'Quantity',
      price: 'Price',
      total: 'Total',
      subtotal: 'Subtotal',
      tax: 'Tax',
      shipping: 'Shipping',
      discount: 'Discount',
      required: 'This field is required',
      optional: 'Optional',
      invalid: 'Invalid',
      tooShort: 'Too short',
      tooLong: 'Too long',
      invalidEmail: 'Invalid email',
      invalidPhone: 'Invalid phone number',
      passwordMismatch: 'Passwords do not match',
      weakPassword: 'Weak password'
    },
    time: {
      now: 'Now',
      today: 'Today',
      yesterday: 'Yesterday',
      tomorrow: 'Tomorrow',
      thisWeek: 'This Week',
      lastWeek: 'Last Week',
      thisMonth: 'This Month',
      lastMonth: 'Last Month',
      thisYear: 'This Year',
      lastYear: 'Last Year',
      minute: 'minute',
      minutes: 'minutes',
      hour: 'hour',
      hours: 'hours',
      day: 'day',
      days: 'days',
      week: 'week',
      weeks: 'weeks',
      month: 'month',
      months: 'months',
      year: 'year',
      years: 'years'
    },
    currency: {
      egp: 'Egyptian Pound',
      usd: 'US Dollar',
      eur: 'Euro',
      sar: 'Saudi Riyal',
      aed: 'UAE Dirham'
    }
  },
  shop: {
    title: 'Almona Industrial Shop',
    subtitle: 'Latest Industrial Machines and Spare Parts',
    categories: {
      all: 'All Categories',
      machines: 'Industrial Machines',
      spareParts: 'Spare Parts',
      rawMaterials: 'Raw Materials',
      tools: 'Tools',
      accessories: 'Accessories',
      cnc: 'CNC Machines',
      cutting: 'Cutting Machines',
      welding: 'Welding Machines',
      electrical: 'Electrical Parts',
      mechanical: 'Mechanical Parts'
    },
    product: {
      sku: 'SKU',
      brand: 'Brand',
      model: 'Model',
      category: 'Category',
      specifications: 'Specifications',
      features: 'Features',
      dimensions: 'Dimensions',
      weight: 'Weight',
      warranty: 'Warranty',
      availability: 'Availability',
      compatibleWith: 'Compatible With',
      relatedProducts: 'Related Products',
      recommendedProducts: 'Recommended Products',
      recentlyViewed: 'Recently Viewed',
      newProducts: 'New Products',
      featuredProducts: 'Featured Products',
      bestSellers: 'Best Sellers',
      onSale: 'On Sale'
    },
    filters: {
      priceRange: 'Price Range',
      brand: 'Brand',
      category: 'Category',
      availability: 'Availability',
      rating: 'Rating',
      sortBy: 'Sort By',
      newest: 'Newest',
      oldest: 'Oldest',
      priceHighToLow: 'Price High to Low',
      priceLowToHigh: 'Price Low to High',
      mostPopular: 'Most Popular',
      bestRated: 'Best Rated'
    },
    cart: {
      title: 'Shopping Cart',
      empty: 'Cart is empty',
      itemCount: 'item',
      itemsCount: 'items',
      subtotal: 'Subtotal',
      shipping: 'Shipping',
      tax: 'Tax',
      total: 'Total',
      checkout: 'Checkout',
      continueShopping: 'Continue Shopping',
      updateCart: 'Update Cart',
      removeItem: 'Remove Item',
      quantityUpdated: 'Quantity updated',
      itemAdded: 'Item added',
      itemRemoved: 'Item removed'
    },
    quote: {
      title: 'Request Quote',
      requestQuote: 'Request Quote',
      quoteNumber: 'Quote Number',
      quoteDate: 'Quote Date',
      validUntil: 'Valid Until',
      status: 'Status',
      draft: 'Draft',
      pending: 'Pending',
      sent: 'Sent',
      accepted: 'Accepted',
      rejected: 'Rejected',
      expired: 'Expired',
      items: 'Items',
      addItem: 'Add Item',
      removeItem: 'Remove Item',
      notes: 'Notes',
      terms: 'Terms & Conditions',
      deliveryTime: 'Delivery Time',
      paymentTerms: 'Payment Terms',
      contactInfo: 'Contact Information',
      shippingAddress: 'Shipping Address',
      submitQuote: 'Submit Quote Request',
      quoteSubmitted: 'Quote request submitted successfully',
      quoteUpdated: 'Quote updated',
      downloadQuote: 'Download Quote'
    },
    orders: {
      title: 'Orders',
      orderNumber: 'Order Number',
      orderDate: 'Order Date',
      status: 'Order Status',
      draft: 'Draft',
      pending: 'Pending',
      confirmed: 'Confirmed',
      paid: 'Paid',
      processing: 'Processing',
      shipped: 'Shipped',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
      refunded: 'Refunded',
      trackingNumber: 'Tracking Number',
      estimatedDelivery: 'Estimated Delivery',
      shippingAddress: 'Shipping Address',
      billingAddress: 'Billing Address',
      paymentMethod: 'Payment Method',
      orderTotal: 'Order Total',
      orderItems: 'Order Items',
      orderHistory: 'Order History',
      reorder: 'Reorder',
      cancelOrder: 'Cancel Order',
      returnOrder: 'Return Order'
    }
  },
    company: {
      name: 'Almona Industrial Machinery',
      tagline: 'Your Trusted Partner in Industrial Solutions',
      about: {
        title: 'About Almona',
        description: 'Almona is the first and authorized dealer of YILMAZ machines since 2000, and we have built a distinguished reputation for excellence in both products and services.',
        mission: 'Our Mission',
        vision: 'Our Vision',
        values: 'Our Values',
        history: 'Our History',
        team: 'Our Team',
        certifications: 'Certifications',
        awards: 'Awards'
      },
      services: {
        title: 'Our Services',
        installation: 'Installation',
        maintenance: 'Maintenance',
        repair: 'Repair',
        training: 'Training',
        consultation: 'Consultation',
        support: 'Technical Support',
        warranty: 'Warranty',
        spareParts: 'Spare Parts'
      },
      contact: {
        title: 'Contact Us',
        address: 'Address',
        phone: 'Phone',
        email: 'Email',
        workingHours: 'Working Hours',
        getInTouch: 'Get in Touch',
        sendMessage: 'Send Message',
        messageSent: 'Message sent successfully',
        messageError: 'Error sending message'
      }
    }
  };

  // Extend English translations with training page namespace
  Object.assign(enTranslations, {
    trainingPage: {
      enroll: 'Enroll in Program',
      subtitle: 'Fill the form to join one of our specialized training programs',
      material: {
        aluminium: 'Aluminium',
        upvc: 'uPVC'
      },
      form: {
        name: 'Full Name',
        email: 'Email',
        company: 'Company',
        phone: 'Phone Number',
        program: 'Program',
        selectProgram: 'Select a program',
        material: 'Material',
        startDate: 'Preferred Start Date',
        flexible: 'Flexible (First Available Cohort)',
        notes: 'Additional Notes',
        cancel: 'Cancel',
        submit: 'Submit Application',
        submitting: 'Submitting...',
        success: 'Enrollment request submitted successfully'
      }
    }
  });

// Turkish translations
const trTranslations = {
  common: {
    navigation: {
      home: 'Ana Sayfa',
      about: 'Hakkımızda',
      services: 'Hizmetler',
      products: 'Ürünler',
      shop: 'Mağaza',
      contact: 'İletişim',
      portfolio: 'Portföy',
      login: 'Giriş Yap',
      register: 'Kayıt Ol',
      profile: 'Profil',
      dashboard: 'Pano',
      orders: 'Siparişler',
      quotes: 'Teklifler',
      wishlist: 'İstek Listesi',
      cart: 'Sepet'
    },
    actions: {
      viewMore: 'Daha Fazla Gör',
      viewDetails: 'Detayları Gör',
      contactUs: 'Bizimle İletişime Geç',
      requestQuote: 'Teklif İste',
      addToQuote: 'Teklife Ekle',
      addToCart: 'Sepete Ekle',
      addToWishlist: 'İstek Listesine Ekle',
      removeFromWishlist: 'İstek Listesinden Çıkar',
      downloadSpec: 'Özellikleri İndir',
      downloadCatalog: 'Katalogu İndir',
      watchVideo: 'Videoyu İzle',
      learnMore: 'Daha Fazla Öğren',
      readMore: 'Devamını Oku',
      showLess: 'Daha Az Göster',
      edit: 'Düzenle',
      delete: 'Sil',
      save: 'Kaydet',
      cancel: 'İptal',
      confirm: 'Onayla',
      submit: 'Gönder',
      search: 'Ara',
      filter: 'Filtrele',
      sort: 'Sırala',
      share: 'Paylaş',
      print: 'Yazdır',
      export: 'Dışa Aktar',
      import: 'İçe Aktar',
      upload: 'Yükle',
      download: 'İndir',
      back: 'Geri',
      next: 'İleri',
      previous: 'Önceki',
      close: 'Kapat',
      open: 'Aç'
    },
    status: {
      loading: 'Yükleniyor...',
      error: 'Hata oluştu',
      success: 'Başarılı',
      warning: 'Uyarı',
      info: 'Bilgi',
      pending: 'Beklemede',
      processing: 'İşleniyor',
      completed: 'Tamamlandı',
      failed: 'Başarısız',
      cancelled: 'İptal edildi'
    },
    forms: {
      name: 'Ad',
      email: 'E-posta',
      phone: 'Telefon',
      message: 'Mesaj',
      company: 'Şirket',
      address: 'Adres',
      city: 'Şehir',
      country: 'Ülke',
      postalCode: 'Posta Kodu',
      required: 'Gerekli',
      optional: 'İsteğe bağlı',
      submit: 'Gönder',
      reset: 'Sıfırla',
      clear: 'Temizle'
    },
    auth: {
      login: 'Giriş Yap',
      logout: 'Çıkış Yap',
      register: 'Kayıt Ol',
      email: 'E-posta',
      password: 'Şifre',
      confirmPassword: 'Şifreyi Onayla',
      forgotPassword: 'Şifremi Unuttum',
      resetPassword: 'Şifreyi Sıfırla',
      rememberMe: 'Beni Hatırla',
      createAccount: 'Hesap Oluştur',
      alreadyHaveAccount: 'Zaten hesabınız var mı?',
      dontHaveAccount: 'Hesabınız yok mu?'
    },
    contact: {
      title: 'İletişim',
      subtitle: 'Bizimle iletişime geçin',
      name: 'Adınız',
      email: 'E-posta Adresiniz',
      phone: 'Telefon Numaranız',
      company: 'Şirketiniz',
      message: 'Mesajınız',
      address: 'Adres',
      workingHours: 'Çalışma Saatleri',
      getInTouch: 'Bizimle İletişime Geçin',
      sendMessage: 'Mesaj Gönder',
      messageSent: 'Mesaj başarıyla gönderildi',
      messageError: 'Mesaj gönderilirken hata oluştu'
    }
  }
};

// Extend Turkish translations with training page namespace
Object.assign(trTranslations, {
  trainingPage: {
    enroll: 'Programa Kayıt Ol',
    subtitle: 'Özel eğitim programlarımızdan birine katılmak için formu doldurun',
    material: {
      aluminium: 'Alüminyum',
      upvc: 'UPVC'
    },
    form: {
      name: 'Tam Ad',
      email: 'E-posta',
      company: 'Şirket',
      phone: 'Telefon Numarası',
      program: 'Program',
      selectProgram: 'Program Seçin',
      material: 'Malzeme',
      startDate: 'Tercih Edilen Başlangıç Tarihi',
      flexible: 'Esnek (İlk Mevcut Grup)',
      notes: 'Ek Notlar',
      cancel: 'İptal',
      submit: 'Başvuruyu Gönder',
      submitting: 'Gönderiliyor...',
      success: 'Kayıt talebi başarıyla gönderildi'
    }
  }
});
  
  // i18next initialization
  // Build base inline resources (legacy structure under single "translation" namespace)
  const baseResources: Record<string, Record<string, TranslationTree>> = {
    ar: { translation: arTranslations },
    'ar-EG': { translation: arTranslations },
    en: { translation: enTranslations },
    tr: { translation: trTranslations }
  };

  // Convert discovered (lang -> namespace -> data) to i18next resource shape.
  // Each discovered namespace (e.g., services) is merged at top level to preserve namespacing.
  for (const lang of Object.keys(discoveredResources)) {
    baseResources[lang] = baseResources[lang] || {};
    for (const namespace of Object.keys(discoveredResources[lang])) {
      // If namespace == 'translation' merge directly, else attach as its own namespace.
      if (namespace === 'translation') {
        baseResources[lang].translation = deepMerge(baseResources[lang].translation || {}, discoveredResources[lang][namespace]);
      } else {
        baseResources[lang][namespace] = deepMerge(baseResources[lang][namespace] || {}, discoveredResources[lang][namespace]);
      }
    }
  }

  const resources = baseResources;
  
  const inferDefaultLanguage = () => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      const nav = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language.toLowerCase() : '';
      if (nav.startsWith('ar') || tz.toLowerCase().includes('cairo')) return 'ar-EG';
      if (nav.startsWith('tr') || tz.toLowerCase().includes('istanbul')) return 'tr';
    } catch {
      // ignore
    }
    return 'en';
  };

  const defaultFallback = inferDefaultLanguage();

  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: defaultFallback,
      debug: false,
      interpolation: {
        escapeValue: false // React already escapes
      },
      detection: {
        // default options from i18next-browser-languagedetector
        order: ['querystring', 'cookie', 'localStorage', 'navigator', 'htmlTag', 'path', 'subdomain'],
        caches: ['localStorage', 'cookie']
      },
      defaultNS: 'translation',
      ns: ['translation', ...new Set(Object.values(discoveredResources).flatMap(o => Object.keys(o)))]
    })
    .then(() => {
      if (typeof document !== 'undefined') {
        document.documentElement.dir = isRTL(i18n.language) ? 'rtl' : 'ltr';
      }
    });

  // Direction handling (RTL for Arabic, LTR for Turkish and English)
  export const isRTL = (lng: string) => {
    const code = lng?.toLowerCase() || '';
    return ['ar', 'fa', 'he', 'ur'].some(prefix => code.startsWith(prefix));
  };
  i18n.on('languageChanged', (lng) => {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = isRTL(lng) ? 'rtl' : 'ltr';
    }
  });
  
  export default i18n;
