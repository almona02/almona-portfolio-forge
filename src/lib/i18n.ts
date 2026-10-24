import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Dynamic JSON loader (autoâ€‘discovers files in /locales) ---------------------------------
// This allows adding new translation namespaces without touching this file.
// Vite's import.meta.glob eagerly loads JSON; merge into resources below.
type TranslationTree = Record<string, unknown>;
type DiscoveredNamespaces = Record<string, Record<string, TranslationTree>>;
const discoveredResources: DiscoveredNamespaces = {};
try {
  // Pattern: ../../locales/<lang>/<namespace>.json (from src/lib directory)
  const modules = import.meta.glob('../../locales/*/*.json', { eager: true });
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
    const tVal = (result)[key];
    if (sVal && typeof sVal === 'object' && !Array.isArray(sVal)) {
      (result)[key] = deepMerge(
        (tVal && typeof tVal === 'object' && !Array.isArray(tVal) ? tVal : {}) as TranslationTree,
        sVal as TranslationTree
      );
    } else {
      (result)[key] = sVal;
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
      home: 'Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ©',
      about: 'Ø¹Ù† Ø§Ù„Ø´Ø±ÙƒØ©',
      services: 'Ø§Ù„Ø®Ø¯Ù…Ø§Øª',
      products: 'Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª',
      shop: 'Ø§Ù„Ù…ØªØ¬Ø±',
      contact: 'Ø§ØªØµÙ„ Ø¨Ù†Ø§',
      portfolio: 'Ø£Ø¹Ù…Ø§Ù„Ù†Ø§',
      login: 'ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„',
      register: 'Ø¥Ù†Ø´Ø§Ø¡ Ø­Ø³Ø§Ø¨',
      profile: 'Ø§Ù„Ù…Ù„Ù Ø§Ù„Ø´Ø®ØµÙŠ',
      dashboard: 'Ù„ÙˆØ­Ø© Ø§Ù„ØªØ­ÙƒÙ…',
      orders: 'Ø§Ù„Ø·Ù„Ø¨Ø§Øª',
      quotes: 'Ø¹Ø±ÙˆØ¶ Ø§Ù„Ø£Ø³Ø¹Ø§Ø±',
      wishlist: 'Ø§Ù„Ù…ÙØ¶Ù„Ø©',
      cart: 'Ø§Ù„Ø³Ù„Ø©'
    },
    
    // Actions
    actions: {
      viewMore: 'Ø¹Ø±Ø¶ Ø§Ù„Ù…Ø²ÙŠØ¯',
      viewDetails: 'Ø¹Ø±Ø¶ Ø§Ù„ØªÙØ§ØµÙŠÙ„',
      contactUs: 'Ø§ØªØµÙ„ Ø¨Ù†Ø§',
      requestQuote: 'Ø·Ù„Ø¨ Ø¹Ø±Ø¶ Ø³Ø¹Ø±',
      addToQuote: 'Ø¥Ø¶Ø§ÙØ© Ø¥Ù„Ù‰ Ø¹Ø±Ø¶ Ø§Ù„Ø³Ø¹Ø±',
      addToCart: 'Ø¥Ø¶Ø§ÙØ© Ø¥Ù„Ù‰ Ø§Ù„Ø³Ù„Ø©',
      addToWishlist: 'Ø¥Ø¶Ø§ÙØ© Ø¥Ù„Ù‰ Ø§Ù„Ù…ÙØ¶Ù„Ø©',
      removeFromWishlist: 'Ø¥Ø²Ø§Ù„Ø© Ù…Ù† Ø§Ù„Ù…ÙØ¶Ù„Ø©',
      downloadSpec: 'ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ù…ÙˆØ§ØµÙØ§Øª',
      downloadCatalog: 'ØªØ­Ù…ÙŠÙ„ Ø§Ù„ÙƒØªØ§Ù„ÙˆØ¬',
      watchVideo: 'Ù…Ø´Ø§Ù‡Ø¯Ø© Ø§Ù„ÙÙŠØ¯ÙŠÙˆ',
      learnMore: 'Ø§Ø¹Ø±Ù Ø§Ù„Ù…Ø²ÙŠØ¯',
      readMore: 'Ø§Ù‚Ø±Ø£ Ø§Ù„Ù…Ø²ÙŠØ¯',
      showLess: 'Ø¹Ø±Ø¶ Ø£Ù‚Ù„',
      edit: 'ØªØ¹Ø¯ÙŠÙ„',
      delete: 'Ø­Ø°Ù',
      save: 'Ø­ÙØ¸',
      cancel: 'Ø¥Ù„ØºØ§Ø¡',
      confirm: 'ØªØ£ÙƒÙŠØ¯',
      submit: 'Ø¥Ø±Ø³Ø§Ù„',
      search: 'Ø¨Ø­Ø«',
      filter: 'ØªØµÙÙŠØ©',
      sort: 'ØªØ±ØªÙŠØ¨',
      share: 'Ù…Ø´Ø§Ø±ÙƒØ©',
      print: 'Ø·Ø¨Ø§Ø¹Ø©',
      export: 'ØªØµØ¯ÙŠØ±',
      import: 'Ø§Ø³ØªÙŠØ±Ø§Ø¯',
      upload: 'Ø±ÙØ¹',
      download: 'ØªØ­Ù…ÙŠÙ„',
      back: 'Ø±Ø¬ÙˆØ¹',
      next: 'Ø§Ù„ØªØ§Ù„ÙŠ',
      previous: 'Ø§Ù„Ø³Ø§Ø¨Ù‚',
      close: 'Ø¥ØºÙ„Ø§Ù‚',
      open: 'ÙØªØ­'
    },
    
    // Status
    status: {
      loading: 'Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù…ÙŠÙ„...',
      error: 'Ø­Ø¯Ø« Ø®Ø·Ø£',
      success: 'ØªÙ… Ø¨Ù†Ø¬Ø§Ø­',
      warning: 'ØªØ­Ø°ÙŠØ±',
      info: 'Ù…Ø¹Ù„ÙˆÙ…Ø§Øª',
      pending: 'ÙÙŠ Ø§Ù„Ø§Ù†ØªØ¸Ø§Ø±',
      processing: 'Ø¬Ø§Ø±ÙŠ Ø§Ù„Ù…Ø¹Ø§Ù„Ø¬Ø©',
      completed: 'Ù…ÙƒØªÙ…Ù„',
      cancelled: 'Ù…Ù„ØºÙŠ',
      active: 'Ù†Ø´Ø·',
      inactive: 'ØºÙŠØ± Ù†Ø´Ø·',
      available: 'Ù…ØªÙˆÙØ±',
      outOfStock: 'ØºÙŠØ± Ù…ØªÙˆÙØ±',
      inStock: 'Ù…ØªÙˆÙØ± ÙÙŠ Ø§Ù„Ù…Ø®Ø²Ù†',
      lowStock: 'ÙƒÙ…ÙŠØ© Ù‚Ù„ÙŠÙ„Ø©'
    },
    
    // Forms
    forms: {
      name: 'Ø§Ù„Ø§Ø³Ù…',
      fullName: 'Ø§Ù„Ø§Ø³Ù… Ø§Ù„ÙƒØ§Ù…Ù„',
      firstName: 'Ø§Ù„Ø§Ø³Ù… Ø§Ù„Ø£ÙˆÙ„',
      lastName: 'Ø§Ø³Ù… Ø§Ù„Ø¹Ø§Ø¦Ù„Ø©',
      email: 'Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ',
      phone: 'Ø±Ù‚Ù… Ø§Ù„Ù‡Ø§ØªÙ',
      mobile: 'Ø§Ù„Ù‡Ø§ØªÙ Ø§Ù„Ù…Ø­Ù…ÙˆÙ„',
      message: 'Ø§Ù„Ø±Ø³Ø§Ù„Ø©',
      subject: 'Ø§Ù„Ù…ÙˆØ¶ÙˆØ¹',
      company: 'Ø§Ù„Ø´Ø±ÙƒØ©',
      position: 'Ø§Ù„Ù…Ù†ØµØ¨',
      address: 'Ø§Ù„Ø¹Ù†ÙˆØ§Ù†',
      city: 'Ø§Ù„Ù…Ø¯ÙŠÙ†Ø©',
      governorate: 'Ø§Ù„Ù…Ø­Ø§ÙØ¸Ø©',
      country: 'Ø§Ù„Ø¨Ù„Ø¯',
      postalCode: 'Ø§Ù„Ø±Ù…Ø² Ø§Ù„Ø¨Ø±ÙŠØ¯ÙŠ',
      website: 'Ø§Ù„Ù…ÙˆÙ‚Ø¹ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ',
      password: 'ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ±',
      confirmPassword: 'ØªØ£ÙƒÙŠØ¯ ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ±',
      currentPassword: 'ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± Ø§Ù„Ø­Ø§Ù„ÙŠØ©',
      newPassword: 'ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± Ø§Ù„Ø¬Ø¯ÙŠØ¯Ø©',
      username: 'Ø§Ø³Ù… Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…',
      description: 'Ø§Ù„ÙˆØµÙ',
      notes: 'Ù…Ù„Ø§Ø­Ø¸Ø§Øª',
      quantity: 'Ø§Ù„ÙƒÙ…ÙŠØ©',
      price: 'Ø§Ù„Ø³Ø¹Ø±',
      total: 'Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ',
      subtotal: 'Ø§Ù„Ù…Ø¬Ù…ÙˆØ¹ Ø§Ù„ÙØ±Ø¹ÙŠ',
      tax: 'Ø§Ù„Ø¶Ø±ÙŠØ¨Ø©',
      shipping: 'Ø§Ù„Ø´Ø­Ù†',
      discount: 'Ø§Ù„Ø®ØµÙ…',
      required: 'Ù‡Ø°Ø§ Ø§Ù„Ø­Ù‚Ù„ Ù…Ø·Ù„ÙˆØ¨',
      optional: 'Ø§Ø®ØªÙŠØ§Ø±ÙŠ',
      invalid: 'ØºÙŠØ± ØµØ­ÙŠØ­',
      tooShort: 'Ù‚ØµÙŠØ± Ø¬Ø¯Ø§Ù‹',
      tooLong: 'Ø·ÙˆÙŠÙ„ Ø¬Ø¯Ø§Ù‹',
      invalidEmail: 'Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ ØºÙŠØ± ØµØ­ÙŠØ­',
      invalidPhone: 'Ø±Ù‚Ù… Ø§Ù„Ù‡Ø§ØªÙ ØºÙŠØ± ØµØ­ÙŠØ­',
      passwordMismatch: 'ÙƒÙ„Ù…Ø§Øª Ø§Ù„Ù…Ø±ÙˆØ± ØºÙŠØ± Ù…ØªØ·Ø§Ø¨Ù‚Ø©',
      weakPassword: 'ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± Ø¶Ø¹ÙŠÙØ©'
    },
    
    // Time and dates
    time: {
      now: 'Ø§Ù„Ø¢Ù†',
      today: 'Ø§Ù„ÙŠÙˆÙ…',
      yesterday: 'Ø£Ù…Ø³',
      tomorrow: 'ØºØ¯Ø§Ù‹',
      thisWeek: 'Ù‡Ø°Ø§ Ø§Ù„Ø£Ø³Ø¨ÙˆØ¹',
      lastWeek: 'Ø§Ù„Ø£Ø³Ø¨ÙˆØ¹ Ø§Ù„Ù…Ø§Ø¶ÙŠ',
      thisMonth: 'Ù‡Ø°Ø§ Ø§Ù„Ø´Ù‡Ø±',
      lastMonth: 'Ø§Ù„Ø´Ù‡Ø± Ø§Ù„Ù…Ø§Ø¶ÙŠ',
      thisYear: 'Ù‡Ø°Ø§ Ø§Ù„Ø¹Ø§Ù…',
      lastYear: 'Ø§Ù„Ø¹Ø§Ù… Ø§Ù„Ù…Ø§Ø¶ÙŠ',
      minute: 'Ø¯Ù‚ÙŠÙ‚Ø©',
      minutes: 'Ø¯Ù‚Ø§Ø¦Ù‚',
      hour: 'Ø³Ø§Ø¹Ø©',
      hours: 'Ø³Ø§Ø¹Ø§Øª',
      day: 'ÙŠÙˆÙ…',
      days: 'Ø£ÙŠØ§Ù…',
      week: 'Ø£Ø³Ø¨ÙˆØ¹',
      weeks: 'Ø£Ø³Ø§Ø¨ÙŠØ¹',
      month: 'Ø´Ù‡Ø±',
      months: 'Ø£Ø´Ù‡Ø±',
      year: 'Ø³Ù†Ø©',
      years: 'Ø³Ù†ÙˆØ§Øª'
    },
    
    // Currency and numbers
    currency: {
      egp: 'Ø¬Ù†ÙŠÙ‡ Ù…ØµØ±ÙŠ',
      usd: 'Ø¯ÙˆÙ„Ø§Ø± Ø£Ù…Ø±ÙŠÙƒÙŠ',
      eur: 'ÙŠÙˆØ±Ùˆ',
      sar: 'Ø±ÙŠØ§Ù„ Ø³Ø¹ÙˆØ¯ÙŠ',
      aed: 'Ø¯Ø±Ù‡Ù… Ø¥Ù…Ø§Ø±Ø§ØªÙŠ'
    }
  },
  
  // E-commerce specific translations
  shop: {
    title: 'Ù…ØªØ¬Ø± Ø§Ù„Ù…ÙÙ†Ù‰ Ø§Ù„ØµÙ†Ø§Ø¹ÙŠ',
    subtitle: 'Ø£Ø­Ø¯Ø« Ø§Ù„Ø¢Ù„Ø§Øª Ø§Ù„ØµÙ†Ø§Ø¹ÙŠØ© ÙˆÙ‚Ø·Ø¹ Ø§Ù„ØºÙŠØ§Ø±',
    categories: {
      all: 'Ø¬Ù…ÙŠØ¹ Ø§Ù„ÙØ¦Ø§Øª',
      machines: 'Ø§Ù„Ø¢Ù„Ø§Øª Ø§Ù„ØµÙ†Ø§Ø¹ÙŠØ©',
      spareParts: 'Ù‚Ø·Ø¹ Ø§Ù„ØºÙŠØ§Ø±',
      rawMaterials: 'Ø§Ù„Ù…ÙˆØ§Ø¯ Ø§Ù„Ø®Ø§Ù…',
      tools: 'Ø§Ù„Ø£Ø¯ÙˆØ§Øª',
      accessories: 'Ø§Ù„Ø¥ÙƒØ³Ø³ÙˆØ§Ø±Ø§Øª',
      cnc: 'Ø¢Ù„Ø§Øª CNC',
      cutting: 'Ø¢Ù„Ø§Øª Ø§Ù„Ù‚Ø·Ø¹',
      welding: 'Ø¢Ù„Ø§Øª Ø§Ù„Ù„Ø­Ø§Ù…',
      electrical: 'Ù‚Ø·Ø¹ ÙƒÙ‡Ø±Ø¨Ø§Ø¦ÙŠØ©',
      mechanical: 'Ù‚Ø·Ø¹ Ù…ÙŠÙƒØ§Ù†ÙŠÙƒÙŠØ©'
    },
    product: {
      sku: 'Ø±Ù‚Ù… Ø§Ù„Ù…Ù†ØªØ¬',
      brand: 'Ø§Ù„Ø¹Ù„Ø§Ù…Ø© Ø§Ù„ØªØ¬Ø§Ø±ÙŠØ©',
      model: 'Ø§Ù„Ù…ÙˆØ¯ÙŠÙ„',
      category: 'Ø§Ù„ÙØ¦Ø©',
      specifications: 'Ø§Ù„Ù…ÙˆØ§ØµÙØ§Øª',
      features: 'Ø§Ù„Ù…Ù…ÙŠØ²Ø§Øª',
      dimensions: 'Ø§Ù„Ø£Ø¨Ø¹Ø§Ø¯',
      weight: 'Ø§Ù„ÙˆØ²Ù†',
      warranty: 'Ø§Ù„Ø¶Ù…Ø§Ù†',
      availability: 'Ø§Ù„ØªÙˆÙØ±',
      compatibleWith: 'Ù…ØªÙˆØ§ÙÙ‚ Ù…Ø¹',
      relatedProducts: 'Ù…Ù†ØªØ¬Ø§Øª Ø°Ø§Øª ØµÙ„Ø©',
      recommendedProducts: 'Ù…Ù†ØªØ¬Ø§Øª Ù…ÙÙˆØµÙ‰ Ø¨Ù‡Ø§',
      recentlyViewed: 'Ø´ÙˆÙ‡Ø¯Øª Ù…Ø¤Ø®Ø±Ø§Ù‹',
      newProducts: 'Ù…Ù†ØªØ¬Ø§Øª Ø¬Ø¯ÙŠØ¯Ø©',
      featuredProducts: 'Ù…Ù†ØªØ¬Ø§Øª Ù…Ù…ÙŠØ²Ø©',
      bestSellers: 'Ø§Ù„Ø£ÙƒØ«Ø± Ù…Ø¨ÙŠØ¹Ø§Ù‹',
      onSale: 'ÙÙŠ Ø§Ù„ØªØ®ÙÙŠØ¶Ø§Øª'
    },
    filters: {
      priceRange: 'Ù†Ø·Ø§Ù‚ Ø§Ù„Ø³Ø¹Ø±',
      brand: 'Ø§Ù„Ø¹Ù„Ø§Ù…Ø© Ø§Ù„ØªØ¬Ø§Ø±ÙŠØ©',
      category: 'Ø§Ù„ÙØ¦Ø©',
      availability: 'Ø§Ù„ØªÙˆÙØ±',
      rating: 'Ø§Ù„ØªÙ‚ÙŠÙŠÙ…',
      sortBy: 'ØªØ±ØªÙŠØ¨ Ø­Ø³Ø¨',
      newest: 'Ø§Ù„Ø£Ø­Ø¯Ø«',
      oldest: 'Ø§Ù„Ø£Ù‚Ø¯Ù…',
      priceHighToLow: 'Ø§Ù„Ø³Ø¹Ø± Ù…Ù† Ø§Ù„Ø£Ø¹Ù„Ù‰ Ù„Ù„Ø£Ù‚Ù„',
      priceLowToHigh: 'Ø§Ù„Ø³Ø¹Ø± Ù…Ù† Ø§Ù„Ø£Ù‚Ù„ Ù„Ù„Ø£Ø¹Ù„Ù‰',
      mostPopular: 'Ø§Ù„Ø£ÙƒØ«Ø± Ø´Ø¹Ø¨ÙŠØ©',
      bestRated: 'Ø§Ù„Ø£Ø¹Ù„Ù‰ ØªÙ‚ÙŠÙŠÙ…Ø§Ù‹'
    },
    cart: {
      title: 'Ø³Ù„Ø© Ø§Ù„ØªØ³ÙˆÙ‚',
      empty: 'Ø§Ù„Ø³Ù„Ø© ÙØ§Ø±ØºØ©',
      itemCount: 'Ø¹Ù†ØµØ±',
      itemsCount: 'Ø¹Ù†Ø§ØµØ±',
      subtotal: 'Ø§Ù„Ù…Ø¬Ù…ÙˆØ¹ Ø§Ù„ÙØ±Ø¹ÙŠ',
      shipping: 'Ø§Ù„Ø´Ø­Ù†',
      tax: 'Ø§Ù„Ø¶Ø±ÙŠØ¨Ø©',
      total: 'Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ',
      checkout: 'Ø¥ØªÙ…Ø§Ù… Ø§Ù„Ø´Ø±Ø§Ø¡',
      continueShopping: 'Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„ØªØ³ÙˆÙ‚',
      updateCart: 'ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø³Ù„Ø©',
      removeItem: 'Ø¥Ø²Ø§Ù„Ø© Ø§Ù„Ø¹Ù†ØµØ±',
      quantityUpdated: 'ØªÙ… ØªØ­Ø¯ÙŠØ« Ø§Ù„ÙƒÙ…ÙŠØ©',
      itemAdded: 'ØªÙ… Ø¥Ø¶Ø§ÙØ© Ø§Ù„Ø¹Ù†ØµØ±',
      itemRemoved: 'ØªÙ… Ø¥Ø²Ø§Ù„Ø© Ø§Ù„Ø¹Ù†ØµØ±'
    },
    quote: {
      title: 'Ø·Ù„Ø¨ Ø¹Ø±Ø¶ Ø³Ø¹Ø±',
      requestQuote: 'Ø·Ù„Ø¨ Ø¹Ø±Ø¶ Ø³Ø¹Ø±',
      quoteNumber: 'Ø±Ù‚Ù… Ø¹Ø±Ø¶ Ø§Ù„Ø³Ø¹Ø±',
      quoteDate: 'ØªØ§Ø±ÙŠØ® Ø¹Ø±Ø¶ Ø§Ù„Ø³Ø¹Ø±',
      validUntil: 'ØµØ§Ù„Ø­ Ø­ØªÙ‰',
      status: 'Ø§Ù„Ø­Ø§Ù„Ø©',
      draft: 'Ù…Ø³ÙˆØ¯Ø©',
      pending: 'ÙÙŠ Ø§Ù„Ø§Ù†ØªØ¸Ø§Ø±',
      sent: 'Ù…ÙØ±Ø³Ù„',
      accepted: 'Ù…Ù‚Ø¨ÙˆÙ„',
      rejected: 'Ù…Ø±ÙÙˆØ¶',
      expired: 'Ù…Ù†ØªÙ‡ÙŠ Ø§Ù„ØµÙ„Ø§Ø­ÙŠØ©',
      items: 'Ø§Ù„Ø¹Ù†Ø§ØµØ±',
      addItem: 'Ø¥Ø¶Ø§ÙØ© Ø¹Ù†ØµØ±',
      removeItem: 'Ø¥Ø²Ø§Ù„Ø© Ø¹Ù†ØµØ±',
      notes: 'Ù…Ù„Ø§Ø­Ø¸Ø§Øª',
      terms: 'Ø§Ù„Ø´Ø±ÙˆØ· ÙˆØ§Ù„Ø£Ø­ÙƒØ§Ù…',
      deliveryTime: 'Ù…Ø¯Ø© Ø§Ù„ØªØ³Ù„ÙŠÙ…',
      paymentTerms: 'Ø´Ø±ÙˆØ· Ø§Ù„Ø¯ÙØ¹',
      contactInfo: 'Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø§Ù„Ø§ØªØµØ§Ù„',
      shippingAddress: 'Ø¹Ù†ÙˆØ§Ù† Ø§Ù„Ø´Ø­Ù†',
      submitQuote: 'Ø¥Ø±Ø³Ø§Ù„ Ø·Ù„Ø¨ Ø¹Ø±Ø¶ Ø§Ù„Ø³Ø¹Ø±',
      quoteSubmitted: 'ØªÙ… Ø¥Ø±Ø³Ø§Ù„ Ø·Ù„Ø¨ Ø¹Ø±Ø¶ Ø§Ù„Ø³Ø¹Ø± Ø¨Ù†Ø¬Ø§Ø­',
      quoteUpdated: 'ØªÙ… ØªØ­Ø¯ÙŠØ« Ø¹Ø±Ø¶ Ø§Ù„Ø³Ø¹Ø±',
      downloadQuote: 'ØªØ­Ù…ÙŠÙ„ Ø¹Ø±Ø¶ Ø§Ù„Ø³Ø¹Ø±'
    },
    orders: {
      title: 'Ø§Ù„Ø·Ù„Ø¨Ø§Øª',
      orderNumber: 'Ø±Ù‚Ù… Ø§Ù„Ø·Ù„Ø¨',
      orderDate: 'ØªØ§Ø±ÙŠØ® Ø§Ù„Ø·Ù„Ø¨',
      status: 'Ø­Ø§Ù„Ø© Ø§Ù„Ø·Ù„Ø¨',
      draft: 'Ù…Ø³ÙˆØ¯Ø©',
      pending: 'ÙÙŠ Ø§Ù„Ø§Ù†ØªØ¸Ø§Ø±',
      confirmed: 'Ù…Ø¤ÙƒØ¯',
      paid: 'Ù…Ø¯ÙÙˆØ¹',
      processing: 'Ù‚ÙŠØ¯ Ø§Ù„Ù…Ø¹Ø§Ù„Ø¬Ø©',
      shipped: 'ØªÙ… Ø§Ù„Ø´Ø­Ù†',
      delivered: 'ØªÙ… Ø§Ù„ØªØ³Ù„ÙŠÙ…',
      cancelled: 'Ù…Ù„ØºÙŠ',
      refunded: 'Ù…ÙØ³ØªØ±Ø¯',
      trackingNumber: 'Ø±Ù‚Ù… Ø§Ù„ØªØªØ¨Ø¹',
      estimatedDelivery: 'Ø§Ù„ØªØ³Ù„ÙŠÙ… Ø§Ù„Ù…ØªÙˆÙ‚Ø¹',
      shippingAddress: 'Ø¹Ù†ÙˆØ§Ù† Ø§Ù„Ø´Ø­Ù†',
      billingAddress: 'Ø¹Ù†ÙˆØ§Ù† Ø§Ù„ÙÙˆØ§ØªÙŠØ±',
      paymentMethod: 'Ø·Ø±ÙŠÙ‚Ø© Ø§Ù„Ø¯ÙØ¹',
      orderTotal: 'Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø·Ù„Ø¨',
      orderItems: 'Ø¹Ù†Ø§ØµØ± Ø§Ù„Ø·Ù„Ø¨',
      orderHistory: 'ØªØ§Ø±ÙŠØ® Ø§Ù„Ø·Ù„Ø¨Ø§Øª',
      reorder: 'Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„Ø·Ù„Ø¨',
      cancelOrder: 'Ø¥Ù„ØºØ§Ø¡ Ø§Ù„Ø·Ù„Ø¨',
      returnOrder: 'Ø¥Ø±Ø¬Ø§Ø¹ Ø§Ù„Ø·Ù„Ø¨'
    }
  },
  
  // Company and services
  company: {
    name: 'Ø´Ø±ÙƒØ© Ø§Ù„Ù…ÙÙ†Ù‰ Ù„Ù„Ø¢Ù„Ø§Øª Ø§Ù„ØµÙ†Ø§Ø¹ÙŠØ©',
    tagline: 'Ø´Ø±ÙŠÙƒÙƒ Ø§Ù„Ù…ÙˆØ«ÙˆÙ‚ ÙÙŠ Ø§Ù„Ø­Ù„ÙˆÙ„ Ø§Ù„ØµÙ†Ø§Ø¹ÙŠØ©',
    about: {
      title: 'Ø¹Ù† Ø´Ø±ÙƒØ© Ø§Ù„Ù…ÙÙ†Ù‰',
      description: 'Ø´Ø±ÙƒØ© Ø§Ù„Ù…ÙÙ†Ù‰ Ù‡ÙŠ Ø§Ù„ÙˆÙƒÙŠÙ„ Ø§Ù„Ø­ØµØ±ÙŠ ÙˆØ§Ù„Ù…Ø¹ØªÙ…Ø¯ Ù„Ø¢Ù„Ø§Øª ÙŠÙ„Ù…Ø§Ø² Ù…Ù†Ø° Ø¹Ø§Ù… 2000ØŒ ÙˆÙ‚Ø¯ Ø¨Ù†ÙŠÙ†Ø§ Ø³Ù…Ø¹Ø© Ù…ØªÙ…ÙŠØ²Ø© ÙÙŠ Ø§Ù„ØªÙ…ÙŠØ² ÙÙŠ ÙƒÙ„ Ù…Ù† Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª ÙˆØ§Ù„Ø®Ø¯Ù…Ø§Øª.',
      mission: 'Ù…Ù‡Ù…ØªÙ†Ø§',
      vision: 'Ø±Ø¤ÙŠØªÙ†Ø§',
      values: 'Ù‚ÙŠÙ…Ù†Ø§',
      history: 'ØªØ§Ø±ÙŠØ®Ù†Ø§',
      team: 'ÙØ±ÙŠÙ‚Ù†Ø§',
      certifications: 'Ø§Ù„Ø´Ù‡Ø§Ø¯Ø§Øª',
      awards: 'Ø§Ù„Ø¬ÙˆØ§Ø¦Ø²'
    },
    services: {
      title: 'Ø®Ø¯Ù…Ø§ØªÙ†Ø§',
      installation: 'Ø§Ù„ØªØ±ÙƒÙŠØ¨',
      maintenance: 'Ø§Ù„ØµÙŠØ§Ù†Ø©',
      repair: 'Ø§Ù„Ø¥ØµÙ„Ø§Ø­',
      training: 'Ø§Ù„ØªØ¯Ø±ÙŠØ¨',
      consultation: 'Ø§Ù„Ø§Ø³ØªØ´Ø§Ø±Ø§Øª',
      support: 'Ø§Ù„Ø¯Ø¹Ù… Ø§Ù„ÙÙ†ÙŠ',
      warranty: 'Ø§Ù„Ø¶Ù…Ø§Ù†',
      spareParts: 'Ù‚Ø·Ø¹ Ø§Ù„ØºÙŠØ§Ø±'
    },
    contact: {
      title: 'Ø§ØªØµÙ„ Ø¨Ù†Ø§',
      address: 'Ø§Ù„Ø¹Ù†ÙˆØ§Ù†',
      phone: 'Ø§Ù„Ù‡Ø§ØªÙ',
      email: 'Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ',
      workingHours: 'Ø³Ø§Ø¹Ø§Øª Ø§Ù„Ø¹Ù…Ù„',
      getInTouch: 'ØªÙˆØ§ØµÙ„ Ù…Ø¹Ù†Ø§',
      sendMessage: 'Ø¥Ø±Ø³Ø§Ù„ Ø±Ø³Ø§Ù„Ø©',
      messageSent: 'ØªÙ… Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø±Ø³Ø§Ù„Ø© Ø¨Ù†Ø¬Ø§Ø­',
      messageError: 'Ø­Ø¯Ø« Ø®Ø·Ø£ ÙÙŠ Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø±Ø³Ø§Ù„Ø©'
    }
  }
};

// Extend Arabic translations with training page namespace
Object.assign(arTranslations, {
  trainingPage: {
    enroll: 'Ø§Ù„ØªØ³Ø¬ÙŠÙ„ ÙÙŠ Ø§Ù„Ø¨Ø±Ù†Ø§Ù…Ø¬',
    subtitle: 'Ø§Ù…Ù„Ø£ Ø§Ù„Ù†Ù…ÙˆØ°Ø¬ Ù„Ù„Ø§Ù†Ø¶Ù…Ø§Ù… Ø¥Ù„Ù‰ Ø£Ø­Ø¯ Ø¨Ø±Ø§Ù…Ø¬Ù†Ø§ Ø§Ù„ØªØ¯Ø±ÙŠØ¨ÙŠØ© Ø§Ù„Ù…ØªØ®ØµØµØ©',
    material: {
      aluminium: 'Ø£Ù„Ù…Ù†ÙŠÙˆÙ…',
      upvc: 'ÙŠÙˆ Ø¨ÙŠ ÙÙŠ Ø³ÙŠ'
    },
    form: {
      name: 'Ø§Ù„Ø§Ø³Ù… Ø§Ù„ÙƒØ§Ù…Ù„',
      email: 'Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ',
      company: 'Ø§Ù„Ø´Ø±ÙƒØ©',
      phone: 'Ø±Ù‚Ù… Ø§Ù„Ù‡Ø§ØªÙ',
      program: 'Ø§Ù„Ø¨Ø±Ù†Ø§Ù…Ø¬',
      selectProgram: 'Ø§Ø®ØªØ± Ø¨Ø±Ù†Ø§Ù…Ø¬Ù‹Ø§',
      material: 'Ø§Ù„Ù…Ø§Ø¯Ø©',
      startDate: 'ØªØ§Ø±ÙŠØ® Ø§Ù„Ø¨Ø¯Ø¡ Ø§Ù„Ù…ÙØ¶Ù„',
      flexible: 'Ù…Ø±Ù† (Ø£ÙˆÙ„ Ø¯ÙØ¹Ø© Ù…ØªØ§Ø­Ø©)',
      notes: 'Ù…Ù„Ø§Ø­Ø¸Ø§Øª Ø¥Ø¶Ø§ÙÙŠØ©',
      cancel: 'Ø¥Ù„ØºØ§Ø¡',
      submit: 'Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø·Ù„Ø¨',
      submitting: 'Ø¬Ø§Ø±Ù Ø§Ù„Ø¥Ø±Ø³Ø§Ù„...',
      success: 'ØªÙ… Ø¥Ø±Ø³Ø§Ù„ Ø·Ù„Ø¨ Ø§Ù„ØªØ³Ø¬ÙŠÙ„ Ø¨Ù†Ø¬Ø§Ø­'
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
      about: 'HakkÄ±mÄ±zda',
      services: 'Hizmetler',
      products: 'ÃœrÃ¼nler',
      shop: 'MaÄŸaza',
      contact: 'Ä°letiÅŸim',
      portfolio: 'PortfÃ¶y',
      login: 'GiriÅŸ Yap',
      register: 'KayÄ±t Ol',
      profile: 'Profil',
      dashboard: 'Pano',
      orders: 'SipariÅŸler',
      quotes: 'Teklifler',
      wishlist: 'Ä°stek Listesi',
      cart: 'Sepet'
    },
    actions: {
      viewMore: 'Daha Fazla GÃ¶r',
      viewDetails: 'DetaylarÄ± GÃ¶r',
      contactUs: 'Bizimle Ä°letiÅŸime GeÃ§',
      requestQuote: 'Teklif Ä°ste',
      addToQuote: 'Teklife Ekle',
      addToCart: 'Sepete Ekle',
      addToWishlist: 'Ä°stek Listesine Ekle',
      removeFromWishlist: 'Ä°stek Listesinden Ã‡Ä±kar',
      downloadSpec: 'Ã–zellikleri Ä°ndir',
      downloadCatalog: 'Katalogu Ä°ndir',
      watchVideo: 'Videoyu Ä°zle',
      learnMore: 'Daha Fazla Ã–ÄŸren',
      readMore: 'DevamÄ±nÄ± Oku',
      showLess: 'Daha Az GÃ¶ster',
      edit: 'DÃ¼zenle',
      delete: 'Sil',
      save: 'Kaydet',
      cancel: 'Ä°ptal',
      confirm: 'Onayla',
      submit: 'GÃ¶nder',
      search: 'Ara',
      filter: 'Filtrele',
      sort: 'SÄ±rala',
      share: 'PaylaÅŸ',
      print: 'YazdÄ±r',
      export: 'DÄ±ÅŸa Aktar',
      import: 'Ä°Ã§e Aktar',
      upload: 'YÃ¼kle',
      download: 'Ä°ndir',
      back: 'Geri',
      next: 'Ä°leri',
      previous: 'Ã–nceki',
      close: 'Kapat',
      open: 'AÃ§'
    },
    status: {
      loading: 'YÃ¼kleniyor...',
      error: 'Hata oluÅŸtu',
      success: 'BaÅŸarÄ±lÄ±',
      warning: 'UyarÄ±',
      info: 'Bilgi',
      pending: 'Beklemede',
      processing: 'Ä°ÅŸleniyor',
      completed: 'TamamlandÄ±',
      failed: 'BaÅŸarÄ±sÄ±z',
      cancelled: 'Ä°ptal edildi'
    },
    forms: {
      name: 'Ad',
      email: 'E-posta',
      phone: 'Telefon',
      message: 'Mesaj',
      company: 'Åžirket',
      address: 'Adres',
      city: 'Åžehir',
      country: 'Ãœlke',
      postalCode: 'Posta Kodu',
      required: 'Gerekli',
      optional: 'Ä°steÄŸe baÄŸlÄ±',
      submit: 'GÃ¶nder',
      reset: 'SÄ±fÄ±rla',
      clear: 'Temizle'
    },
    auth: {
      login: 'GiriÅŸ Yap',
      logout: 'Ã‡Ä±kÄ±ÅŸ Yap',
      register: 'KayÄ±t Ol',
      email: 'E-posta',
      password: 'Åžifre',
      confirmPassword: 'Åžifreyi Onayla',
      forgotPassword: 'Åžifremi Unuttum',
      resetPassword: 'Åžifreyi SÄ±fÄ±rla',
      rememberMe: 'Beni HatÄ±rla',
      createAccount: 'Hesap OluÅŸtur',
      alreadyHaveAccount: 'Zaten hesabÄ±nÄ±z var mÄ±?',
      dontHaveAccount: 'HesabÄ±nÄ±z yok mu?'
    },
    contact: {
      title: 'Ä°letiÅŸim',
      subtitle: 'Bizimle iletiÅŸime geÃ§in',
      name: 'AdÄ±nÄ±z',
      email: 'E-posta Adresiniz',
      phone: 'Telefon NumaranÄ±z',
      company: 'Åžirketiniz',
      message: 'MesajÄ±nÄ±z',
      address: 'Adres',
      workingHours: 'Ã‡alÄ±ÅŸma Saatleri',
      getInTouch: 'Bizimle Ä°letiÅŸime GeÃ§in',
      sendMessage: 'Mesaj GÃ¶nder',
      messageSent: 'Mesaj baÅŸarÄ±yla gÃ¶nderildi',
      messageError: 'Mesaj gÃ¶nderilirken hata oluÅŸtu'
    }
  }
};

// Extend Turkish translations with training page namespace
Object.assign(trTranslations, {
  trainingPage: {
    enroll: 'Programa KayÄ±t Ol',
    subtitle: 'Ã–zel eÄŸitim programlarÄ±mÄ±zdan birine katÄ±lmak iÃ§in formu doldurun',
    material: {
      aluminium: 'AlÃ¼minyum',
      upvc: 'UPVC'
    },
    form: {
      name: 'Tam Ad',
      email: 'E-posta',
      company: 'Åžirket',
      phone: 'Telefon NumarasÄ±',
      program: 'Program',
      selectProgram: 'Program SeÃ§in',
      material: 'Malzeme',
      startDate: 'Tercih Edilen BaÅŸlangÄ±Ã§ Tarihi',
      flexible: 'Esnek (Ä°lk Mevcut Grup)',
      notes: 'Ek Notlar',
      cancel: 'Ä°ptal',
      submit: 'BaÅŸvuruyu GÃ¶nder',
      submitting: 'GÃ¶nderiliyor...',
      success: 'KayÄ±t talebi baÅŸarÄ±yla gÃ¶nderildi'
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

  void i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: 'en',
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
        document.documentElement.lang = i18n.language;
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
      document.documentElement.lang = lng;
    }
  });
  
  export default i18n;
