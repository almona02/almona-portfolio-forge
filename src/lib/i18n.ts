import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import enServices from '/locales/en/services.json';
import arServices from '/locales/ar/services.json';
import enProducts from '/public/locales/en/products.json';
import arProducts from '/public/locales/ar/products.json';

// Common translations (we'll create these)
const enCommon = {
  navigation: {
    home: 'Home',
    about: 'About',
    services: 'Services',
    products: 'Products',
    shop: 'Shop',
    contact: 'Contact',
    portfolio: 'Portfolio'
  },
  actions: {
    viewMore: 'View More',
    contactUs: 'Contact Us',
    requestQuote: 'Request Quote',
    downloadSpec: 'Download Specifications',
    watchVideo: 'Watch Video',
    learnMore: 'Learn More'
  },
  status: {
    loading: 'Loading...',
    error: 'Error occurred',
    success: 'Success',
    pending: 'Pending'
  },
  forms: {
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    message: 'Message',
    company: 'Company',
    submit: 'Submit',
    required: 'This field is required'
  }
};

const arCommon = {
  navigation: {
    home: 'الرئيسية',
    about: 'عن الشركة',
    services: 'الخدمات',
    products: 'المنتجات',
    shop: 'المتجر',
    contact: 'اتصل بنا',
    portfolio: 'أعمالنا'
  },
  actions: {
    viewMore: 'عرض المزيد',
    contactUs: 'اتصل بنا',
    requestQuote: 'طلب عرض سعر',
    downloadSpec: 'تحميل المواصفات',
    watchVideo: 'مشاهدة الفيديو',
    learnMore: 'اعرف المزيد'
  },
  status: {
    loading: 'جاري التحميل...',
    error: 'حدث خطأ',
    success: 'نجح',
    pending: 'في الانتظار'
  },
  forms: {
    name: 'الاسم',
    email: 'البريد الإلكتروني',
    phone: 'الهاتف',
    message: 'الرسالة',
    company: 'الشركة',
    submit: 'إرسال',
    required: 'هذا الحقل مطلوب'
  }
};

const resources = {
  en: {
    services: enServices,
    products: enProducts,
    common: enCommon
  },
  ar: {
    services: arServices,
    products: arProducts,
    common: arCommon
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('language') || 'en',
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'services', 'products'],
    
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    
    react: {
      useSuspense: false,
    },
  });

export default i18n;

// Type-safe translation function
export const t = i18n.t.bind(i18n);

// Language switching utility
export const changeLanguage = (lng: 'en' | 'ar') => {
  i18n.changeLanguage(lng);
  
  // Update document direction for Arabic
  document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
};

// Get current language
export const getCurrentLanguage = (): 'en' | 'ar' => {
  return i18n.language.startsWith('ar') ? 'ar' : 'en';
};

// Check if current language is RTL
export const isRTL = (): boolean => {
  return getCurrentLanguage() === 'ar';
};
