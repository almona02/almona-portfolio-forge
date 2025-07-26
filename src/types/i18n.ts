// Type-safe translation keys based on actual JSON structure

// Services translations structure
export interface ServicesTranslations {
  title: string;
  subtitle: string;
  egypt_support_cta: string;
  tabs: {
    overview: string;
    register: string;
    dashboard: string;
    portal: string;
    nile_logistics: string;
    egypt_support: string;
    ai: string;
  };
  cards: {
    maintenance: {
      title: string;
      description: string;
      features: string[];
      action: string;
    };
    emergency: {
      title: string;
      description: string;
      features: string[];
      action: string;
    };
    training: {
      title: string;
      description: string;
      features: string[];
      action: string;
    };
    nile_logistics: {
      title: string;
      description: string;
      features: string[];
      action: string;
    };
  };
  connected_network: {
    title: string;
    serial: string;
    installed: string;
    show_map: string;
    show_list: string;
    active_warranty: string;
  };
  tech_highlights: {
    badge: string;
    title: string;
    description: string;
    features: string[];
  };
  service_network: {
    title: string;
    description: string;
  };
  standards: {
    title: string;
    description: string;
    cta: string;
  };
  old_page_title: string;
  old_page_message: string;
  old_page_instruction: string;
  old_page_link: string;
  direct_url: string;
}

// Products translations structure
export interface ProductsTranslations {
  shop: {
    tabs: {
      'industrial-machines': string;
      'industrial-parts': string;
      'unique-prototypes': string;
      'unique-custom-fabrications': string;
      profiles: string;
      reports: string;
    };
    products: {
      'KM-212': {
        title: string;
        description: string;
      };
      'DC-421-PBS': {
        title: string;
        description: string;
      };
    };
    buttons: {
      configure: string;
      requestQuote: string;
      compare: string;
      viewInAR: string;
    };
    labels: {
      price: string;
      contactWhatsApp: string;
    };
    messages: {
      localShipping: string;
      cashOnDelivery: string;
      ramadanMode: string;
      eidMode: string;
    };
  };
}

// Common translations that should be present in all languages
export interface CommonTranslations {
  navigation: {
    home: string;
    about: string;
    services: string;
    products: string;
    shop: string;
    contact: string;
    portfolio: string;
  };
  actions: {
    viewMore: string;
    contactUs: string;
    requestQuote: string;
    downloadSpec: string;
    watchVideo: string;
    learnMore: string;
  };
  status: {
    loading: string;
    error: string;
    success: string;
    pending: string;
  };
  forms: {
    name: string;
    email: string;
    phone: string;
    message: string;
    company: string;
    submit: string;
    required: string;
  };
}

// Complete translation structure
export interface Translations {
  services: ServicesTranslations;
  products: ProductsTranslations;
  common: CommonTranslations;
}

// Language codes supported
export type LanguageCode = 'en' | 'ar';

// Translation keys for type-safe access
export type TranslationKey = 
  | 'services.title'
  | 'services.subtitle'
  | 'services.egypt_support_cta'
  | 'services.tabs.overview'
  | 'services.tabs.register'
  | 'services.tabs.dashboard'
  | 'services.tabs.portal'
  | 'services.tabs.nile_logistics'
  | 'services.tabs.egypt_support'
  | 'services.tabs.ai'
  | 'services.cards.maintenance.title'
  | 'services.cards.maintenance.description'
  | 'services.cards.maintenance.action'
  | 'services.cards.emergency.title'
  | 'services.cards.emergency.description'
  | 'services.cards.emergency.action'
  | 'services.cards.training.title'
  | 'services.cards.training.description'
  | 'services.cards.training.action'
  | 'services.cards.nile_logistics.title'
  | 'services.cards.nile_logistics.description'
  | 'services.cards.nile_logistics.action'
  | 'shop.tabs.industrial-machines'
  | 'shop.tabs.industrial-parts'
  | 'shop.tabs.unique-prototypes'
  | 'shop.tabs.unique-custom-fabrications'
  | 'shop.tabs.profiles'
  | 'shop.tabs.reports'
  | 'shop.buttons.configure'
  | 'shop.buttons.requestQuote'
  | 'shop.buttons.compare'
  | 'shop.buttons.viewInAR'
  | 'shop.labels.price'
  | 'shop.labels.contactWhatsApp'
  | 'common.navigation.home'
  | 'common.navigation.about'
  | 'common.navigation.services'
  | 'common.navigation.products'
  | 'common.navigation.shop'
  | 'common.navigation.contact'
  | 'common.navigation.portfolio'
  | 'common.actions.viewMore'
  | 'common.actions.contactUs'
  | 'common.actions.requestQuote'
  | 'common.actions.downloadSpec'
  | 'common.actions.watchVideo'
  | 'common.actions.learnMore'
  | 'common.status.loading'
  | 'common.status.error'
  | 'common.status.success'
  | 'common.status.pending'
  | 'common.forms.name'
  | 'common.forms.email'
  | 'common.forms.phone'
  | 'common.forms.message'
  | 'common.forms.company'
  | 'common.forms.submit'
  | 'common.forms.required';

// Declare module augmentation for react-i18next
declare module 'react-i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      services: ServicesTranslations;
      products: ProductsTranslations;
      common: CommonTranslations;
    };
  }
}

