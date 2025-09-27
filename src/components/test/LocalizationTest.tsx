import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRegionDetection } from '../../hooks/useRegionDetection';
import { useRegionalConfig } from '../../hooks/useRegionDetection';

const LocalizationTest: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { regionState, setRegion } = useRegionDetection();
  const { config } = useRegionalConfig();

  const handleLanguageChange = (language: string) => {
    i18n.changeLanguage(language);
  };

  const handleRegionChange = (region: 'TR' | 'EG' | 'DEFAULT') => {
    setRegion(region);
  };

  return (
    <div className="p-6 bg-gray-100 rounded-lg m-4">
      <h2 className="text-2xl font-bold mb-4">Localization Test</h2>
      
      {/* Current Status */}
      <div className="mb-6 p-4 bg-white rounded border">
        <h3 className="text-lg font-semibold mb-2">Current Status</h3>
        <p><strong>Language:</strong> {i18n.language}</p>
        <p><strong>Region:</strong> {regionState.region}</p>
        <p><strong>Region Language:</strong> {config?.language}</p>
        <p><strong>Currency:</strong> {config?.currency?.symbol} {config?.currency?.code}</p>
        <p><strong>RTL:</strong> {config?.features?.rtl ? 'Yes' : 'No'}</p>
      </div>

      {/* Language Switcher */}
      <div className="mb-6 p-4 bg-white rounded border">
        <h3 className="text-lg font-semibold mb-2">Language Switcher</h3>
        <div className="flex gap-2">
          <button
            onClick={() => handleLanguageChange('en')}
            className={`px-4 py-2 rounded ${
              i18n.language === 'en' ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
          >
            English
          </button>
          <button
            onClick={() => handleLanguageChange('tr')}
            className={`px-4 py-2 rounded ${
              i18n.language === 'tr' ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
          >
            Türkçe
          </button>
          <button
            onClick={() => handleLanguageChange('ar')}
            className={`px-4 py-2 rounded ${
              i18n.language === 'ar' ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
          >
            العربية
          </button>
        </div>
      </div>

      {/* Region Switcher */}
      <div className="mb-6 p-4 bg-white rounded border">
        <h3 className="text-lg font-semibold mb-2">Region Switcher</h3>
        <div className="flex gap-2">
          <button
            onClick={() => handleRegionChange('DEFAULT')}
            className={`px-4 py-2 rounded ${
              regionState.region === 'DEFAULT' ? 'bg-green-500 text-white' : 'bg-gray-200'
            }`}
          >
            🌍 International
          </button>
          <button
            onClick={() => handleRegionChange('TR')}
            className={`px-4 py-2 rounded ${
              regionState.region === 'TR' ? 'bg-green-500 text-white' : 'bg-gray-200'
            }`}
          >
            🇹🇷 Turkey
          </button>
          <button
            onClick={() => handleRegionChange('EG')}
            className={`px-4 py-2 rounded ${
              regionState.region === 'EG' ? 'bg-green-500 text-white' : 'bg-gray-200'
            }`}
          >
            🇪🇬 Egypt
          </button>
        </div>
      </div>

      {/* Translation Examples */}
      <div className="mb-6 p-4 bg-white rounded border">
        <h3 className="text-lg font-semibold mb-2">Translation Examples</h3>
        <div className="space-y-2">
          <p><strong>Welcome:</strong> {t('common.welcome')}</p>
          <p><strong>Products:</strong> {t('common.products')}</p>
          <p><strong>Services:</strong> {t('common.services')}</p>
          <p><strong>Contact:</strong> {t('common.contact')}</p>
          <p><strong>Login:</strong> {t('common.login')}</p>
          <p><strong>Register:</strong> {t('common.register')}</p>
        </div>
      </div>

      {/* Machine Examples */}
      <div className="mb-6 p-4 bg-white rounded border">
        <h3 className="text-lg font-semibold mb-2">Machine Translation Examples</h3>
        <div className="space-y-2">
          <p><strong>Title:</strong> {t('machines.title')}</p>
          <p><strong>CNC Machines:</strong> {t('machines.categories.cnc_machines')}</p>
          <p><strong>Power Consumption:</strong> {t('machines.specifications.power_consumption')}</p>
          <p><strong>Precision:</strong> {t('machines.specifications.precision')}</p>
        </div>
      </div>

      {/* Services Examples */}
      <div className="mb-6 p-4 bg-white rounded border">
        <h3 className="text-lg font-semibold mb-2">Services Translation Examples</h3>
        <div className="space-y-2">
          <p><strong>Title:</strong> {t('services.title')}</p>
          <p><strong>Maintenance:</strong> {t('services.cards.maintenance.title')}</p>
          <p><strong>Emergency:</strong> {t('services.cards.emergency.title')}</p>
          <p><strong>Training:</strong> {t('services.cards.training.title')}</p>
        </div>
      </div>

      {/* Quote Examples */}
      <div className="mb-6 p-4 bg-white rounded border">
        <h3 className="text-lg font-semibold mb-2">Quote Translation Examples</h3>
        <div className="space-y-2">
          <p><strong>Title:</strong> {t('quotes.title')}</p>
          <p><strong>Project Details:</strong> {t('quotes.steps.project_details')}</p>
          <p><strong>Equipment Selection:</strong> {t('quotes.steps.equipment_selection')}</p>
          <p><strong>Submit Quote:</strong> {t('quotes.form.submit_quote')}</p>
        </div>
      </div>

      {/* Ticket Examples */}
      <div className="mb-6 p-4 bg-white rounded border">
        <h3 className="text-lg font-semibold mb-2">Ticket Translation Examples</h3>
        <div className="space-y-2">
          <p><strong>Title:</strong> {t('tickets.title')}</p>
          <p><strong>General Support:</strong> {t('tickets.types.general')}</p>
          <p><strong>Maintenance Request:</strong> {t('tickets.types.maintenance')}</p>
          <p><strong>Emergency:</strong> {t('tickets.types.emergency')}</p>
        </div>
      </div>

      {/* Training Examples */}
      <div className="mb-6 p-4 bg-white rounded border">
        <h3 className="text-lg font-semibold mb-2">Training Translation Examples</h3>
        <div className="space-y-2">
          <p><strong>Title:</strong> {t('training.title')}</p>
          <p><strong>Basic Operator:</strong> {t('training.programs.basic_operator')}</p>
          <p><strong>Safety Training:</strong> {t('training.programs.safety_training')}</p>
          <p><strong>On-site Training:</strong> {t('training.training_types.on_site')}</p>
        </div>
      </div>

      {/* Geography Examples */}
      <div className="mb-6 p-4 bg-white rounded border">
        <h3 className="text-lg font-semibold mb-2">Geography Translation Examples</h3>
        <div className="space-y-2">
          <p><strong>Title:</strong> {t('geography.title')}</p>
          <p><strong>Industrial Zone:</strong> {t('geography.industrial_zones.industrial_zone')}</p>
          <p><strong>Automotive:</strong> {t('geography.industries.automotive')}</p>
          <p><strong>Factory:</strong> {t('geography.facilities.factory')}</p>
        </div>
      </div>
    </div>
  );
};

export default LocalizationTest;
