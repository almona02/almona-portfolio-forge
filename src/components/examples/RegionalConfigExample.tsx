/**
 * Regional Configuration Example Component
 * 
 * Demonstrates the regional configuration system and how to use regional hooks.
 * Features:
 * - Region detection and switching (Turkey, Egypt, Default)
 * - Currency formatting with regional preferences
 * - Date formatting with locale-specific formats
 * - Business hours and timezone handling
 * - Regional feature toggles (WhatsApp, RTL, local shipping, etc.)
 * - Payment method availability by region
 * - Special occasions and cultural considerations
 * - Shipping information with regional costs and delivery times
 * 
 * This component serves as a comprehensive example of how to implement
 * region-aware functionality in the application.
 */

import React from 'react';
import { useRegionDetection, useRegionalConfig, useRegionUtils } from '@/hooks/useRegionDetection';
import { RegionCode } from '@/lib/regionalConfig';

export const RegionalConfigExample: React.FC = () => {
  const { regionState, setRegion, refreshRegion } = useRegionDetection();
  const { config, region, isLoading, error } = useRegionalConfig();
  const utils = useRegionUtils();

  const handleRegionChange = (newRegion: RegionCode) => {
    setRegion(newRegion);
  };

  if (isLoading) {
    return <div>Loading regional configuration...</div>;
  }

  if (error) {
    return <div>Error loading regional configuration: {error}</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="typography-h1 text-2xl mb-6">Regional Configuration Example</h1>
      
      {/* Region Selection */}
      <div className="mb-6">
        <h2 className="typography-h2 text-lg font-semibold mb-3">Current Region</h2>
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => handleRegionChange('TR')}
            className={`px-4 py-2 rounded ${
              region === 'TR' ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
          >
            Turkey (TR)
          </button>
          <button
            onClick={() => handleRegionChange('EG')}
            className={`px-4 py-2 rounded ${
              region === 'EG' ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
          >
            Egypt (EG)
          </button>
          <button
            onClick={() => handleRegionChange('DEFAULT')}
            className={`px-4 py-2 rounded ${
              region === 'DEFAULT' ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
          >
            Default
          </button>
        </div>
        <div className="text-sm text-gray-600">
          <p>Region: {region}</p>
          <p>Detected by: {regionState.detectedBy}</p>
          <p>Language: {config.language}</p>
          <p>Last updated: {regionState.lastUpdated?.toLocaleString()}</p>
        </div>
        <button
          onClick={refreshRegion}
          className="mt-2 px-3 py-1 bg-green-500 text-white rounded text-sm"
        >
          Refresh Detection
        </button>
      </div>

      {/* Currency Formatting */}
      <div className="mb-6">
        <h2 className="typography-h2 text-lg font-semibold mb-3">Currency Formatting</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 border rounded">
            <p className="font-medium">Price: {utils.formatCurrency(1234.56)}</p>
            <p className="text-sm text-gray-600">With symbol</p>
          </div>
          <div className="p-3 border rounded">
            <p className="font-medium">Price: {utils.formatCurrency(1234.56, { showSymbol: false })}</p>
            <p className="text-sm text-gray-600">Without symbol</p>
          </div>
          <div className="p-3 border rounded">
            <p className="font-medium">Price: {utils.formatCurrency(1234.56, { showCode: true })}</p>
            <p className="text-sm text-gray-600">With currency code</p>
          </div>
        </div>
      </div>

      {/* Date Formatting */}
      <div className="mb-6">
        <h2 className="typography-h2 text-lg font-semibold mb-3">Date Formatting</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 border rounded">
            <p className="font-medium">Date: {utils.formatDate(new Date())}</p>
            <p className="text-sm text-gray-600">Date only</p>
          </div>
          <div className="p-3 border rounded">
            <p className="font-medium">Date & Time: {utils.formatDate(new Date(), { includeTime: true })}</p>
            <p className="text-sm text-gray-600">With time</p>
          </div>
        </div>
      </div>

      {/* Business Hours */}
      <div className="mb-6">
        <h2 className="typography-h2 text-lg font-semibold mb-3">Business Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 border rounded">
            <p className="font-medium">
              Business Hours: 9:00 - 17:00
            </p>
            <p className="text-sm text-gray-600">Timezone: UTC</p>
            <p className="text-sm">
              Currently: {utils.isBusinessHours() ? 'Open' : 'Closed'}
            </p>
          </div>
          <div className="p-3 border rounded">
            <p className="font-medium">Greeting: Hello</p>
            <p className="font-medium">Farewell: Goodbye</p>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="mb-6">
        <h2 className="typography-h2 text-lg font-semibold mb-3">Regional Features</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 border rounded text-center">
            <p className="font-medium">WhatsApp</p>
            <p className={utils.isFeatureEnabled('whatsappEnabled') ? 'text-green-600' : 'text-red-600'}>
              {utils.isFeatureEnabled('whatsappEnabled') ? 'Enabled' : 'Disabled'}
            </p>
          </div>
          <div className="p-3 border rounded text-center">
            <p className="font-medium">Local Shipping</p>
            <p className={utils.isFeatureEnabled('localShipping') ? 'text-green-600' : 'text-red-600'}>
              {utils.isFeatureEnabled('localShipping') ? 'Enabled' : 'Disabled'}
            </p>
          </div>
          <div className="p-3 border rounded text-center">
            <p className="font-medium">Cash on Delivery</p>
            <p className={utils.isFeatureEnabled('cashOnDelivery') ? 'text-green-600' : 'text-red-600'}>
              {utils.isFeatureEnabled('cashOnDelivery') ? 'Enabled' : 'Disabled'}
            </p>
          </div>
          <div className="p-3 border rounded text-center">
            <p className="font-medium">RTL Layout</p>
            <p className={utils.isFeatureEnabled('rtl') ? 'text-green-600' : 'text-red-600'}>
              {utils.isFeatureEnabled('rtl') ? 'Enabled' : 'Disabled'}
            </p>
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="mb-6">
        <h2 className="typography-h2 text-lg font-semibold mb-3">Available Payment Methods</h2>
        <div className="flex flex-wrap gap-2">
          {utils.getPaymentMethods().map((method, index) => (
            <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              {method.replace('_', ' ').toUpperCase()}
            </span>
          ))}
        </div>
      </div>

      {/* Special Occasions */}
      <div className="mb-6">
        <h2 className="typography-h2 text-lg font-semibold mb-3">Special Occasions</h2>
        <div className="flex flex-wrap gap-2">
          {['New Year', 'Eid', 'Christmas'].map((occasion, index) => (
            <span key={index} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
              {occasion}
            </span>
          ))}
        </div>
      </div>

      {/* Shipping Information */}
      <div className="mb-6">
        <h2 className="typography-h2 text-lg font-semibold mb-3">Shipping Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 border rounded">
            <h3 className="typography-h3 font-medium mb-2">Domestic Shipping</h3>
            <p>Enabled: {utils.getShippingInfo('domestic').enabled ? 'Yes' : 'No'}</p>
            <p>Estimated Days: {utils.getShippingInfo('domestic').estimatedDays}</p>
            <p>Cost: {utils.formatCurrency(utils.getShippingInfo('domestic').cost)}</p>
          </div>
          <div className="p-3 border rounded">
            <h3 className="typography-h3 font-medium mb-2">International Shipping</h3>
            <p>Enabled: {utils.getShippingInfo('international').enabled ? 'Yes' : 'No'}</p>
            <p>Estimated Days: {utils.getShippingInfo('international').estimatedDays}</p>
            <p>Cost: {utils.formatCurrency(utils.getShippingInfo('international').cost)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegionalConfigExample;
