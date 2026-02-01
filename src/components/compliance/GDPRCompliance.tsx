import { Check, Cookie, Download, Eye, Settings, Shield, Trash2, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

interface GDPRComplianceProps {
  onConsentChange?: (consent: CookiePreferences) => void;
}

export const GDPRCompliance: React.FC<GDPRComplianceProps> = ({ onConsentChange }) => {
  const { t } = useTranslation();
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    // Check if user has already given consent
    const consent = localStorage.getItem('gdpr_consent');
    if (!consent) {
      setShowBanner(true);
    } else {
      const savedPreferences = JSON.parse(consent);
      setPreferences(savedPreferences);
    }
  }, []);

  const handleAcceptAll = () => {
    const allAccepted = {
      necessary: true,
      analytics: true,
      marketing: true,
    };
    saveConsent(allAccepted);
  };

  const handleRejectAll = () => {
    const onlyNecessary = {
      necessary: true,
      analytics: false,
      marketing: false,
    };
    saveConsent(onlyNecessary);
  };

  const handleSavePreferences = () => {
    saveConsent(preferences);
    setShowPreferences(false);
  };

  const saveConsent = (consent: CookiePreferences) => {
    localStorage.setItem('gdpr_consent', JSON.stringify(consent));
    localStorage.setItem('gdpr_consent_date', new Date().toISOString());
    setPreferences(consent);
    setShowBanner(false);
    onConsentChange?.(consent);
  };

  const handleDataExport = async () => {
    try {
      // In a real implementation, this would call your API
      const userData = {
        profile: { /* user profile data */ },
        preferences: preferences,
        activity: { /* user activity data */ },
        exportDate: new Date().toISOString(),
      };
      
      const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `almona-data-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Data export failed:', error);
    }
  };

  const handleDataDeletion = async () => {
    const confirmed = window.confirm(t('gdpr.confirmDeletion', 'Are you sure you want to delete all your data? This action cannot be undone.'));
    if (confirmed) {
      try {
        // In a real implementation, this would call your API
        localStorage.clear();
        alert(t('gdpr.deletionSuccess', 'Your data has been successfully deleted.'));
      } catch (error) {
        console.error('Data deletion failed:', error);
      }
    }
  };

  if (showBanner) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-6 shadow-lg z-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start gap-4">
            <Cookie className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="typography-h3 text-lg mb-2">
                {t('gdpr.cookieTitle', 'We respect your privacy')}
              </h3>
              <p className="text-gray-300 mb-4">
                {t('gdpr.cookieDescription', 'We use cookies to enhance your experience and analyze our traffic. You can choose which cookies to accept.')}
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleAcceptAll}
                  className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  {t('gdpr.acceptAll', 'Accept All')}
                </button>
                <button
                  onClick={handleRejectAll}
                  className="bg-gray-600 hover:bg-gray-700 px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  {t('gdpr.rejectAll', 'Reject All')}
                </button>
                <button
                  onClick={() => setShowPreferences(true)}
                  className="bg-transparent border border-gray-500 hover:border-gray-400 px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  {t('gdpr.customize', 'Customize')}
                </button>
              </div>
            </div>
            <button
              onClick={() => setShowBanner(false)}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showPreferences) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Settings className="w-6 h-6 text-blue-600" />
              <h2 className="typography-h2 text-xl font-semibold">
                {t('gdpr.cookiePreferences', 'Cookie Preferences')}
              </h2>
            </div>
            
            <div className="space-y-6">
              <div className="border-b pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="typography-h3 font-medium">{t('gdpr.necessary', 'Necessary Cookies')}</h3>
                    <p className="text-gray-600 text-sm">
                      {t('gdpr.necessaryDesc', 'Required for the website to function properly.')}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="ml-2 text-sm text-gray-500">
                      {t('gdpr.required', 'Required')}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="border-b pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="typography-h3 font-medium">{t('gdpr.analytics', 'Analytics Cookies')}</h3>
                    <p className="text-gray-600 text-sm">
                      {t('gdpr.analyticsDesc', 'Help us understand how visitors interact with our website.')}
                    </p>
                  </div>
                  <label className="typography-label relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={preferences.analytics}
                      onChange={(e) => setPreferences(prev => ({ ...prev, analytics: e.target.checked }))}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
              
              <div className="border-b pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="typography-h3 font-medium">{t('gdpr.marketing', 'Marketing Cookies')}</h3>
                    <p className="text-gray-600 text-sm">
                      {t('gdpr.marketingDesc', 'Used to deliver personalized advertisements.')}
                    </p>
                  </div>
                  <label className="typography-label relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={preferences.marketing}
                      onChange={(e) => setPreferences(prev => ({ ...prev, marketing: e.target.checked }))}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSavePreferences}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                {t('gdpr.savePreferences', 'Save Preferences')}
              </button>
              <button
                onClick={() => setShowPreferences(false)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-lg font-medium transition-colors"
              >
                {t('gdpr.cancel', 'Cancel')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 border rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <Shield className="w-6 h-6 text-green-600" />
        <h2 className="typography-h2 text-lg font-semibold">{t('gdpr.dataRights', 'Your Data Rights')}</h2>
      </div>
      
      <p className="text-gray-600 mb-6">
        {t('gdpr.dataRightsDesc', 'Under GDPR, you have the right to access, correct, or delete your personal data.')}
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => setShowPreferences(true)}
          className="flex items-center gap-2 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Eye className="w-5 h-5 text-blue-600" />
          <span>{t('gdpr.viewPreferences', 'View Preferences')}</span>
        </button>
        
        <button
          onClick={handleDataExport}
          className="flex items-center gap-2 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Download className="w-5 h-5 text-green-600" />
          <span>{t('gdpr.exportData', 'Export Data')}</span>
        </button>
        
        <button
          onClick={handleDataDeletion}
          className="flex items-center gap-2 p-4 border border-gray-200 rounded-lg hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-5 h-5 text-red-600" />
          <span>{t('gdpr.deleteData', 'Delete Data')}</span>
        </button>
      </div>
    </div>
  );
};

export default GDPRCompliance;