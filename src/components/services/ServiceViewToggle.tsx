import React from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ServiceViewToggleProps {
  viewMode: 'simple' | 'advanced';
  onViewChange: (mode: 'simple' | 'advanced') => void;
  className?: string;
}

export const ServiceViewToggle: React.FC<ServiceViewToggleProps> = ({
  viewMode,
  onViewChange,
  className = ''
}) => {
  const { t } = useTranslation('services');

  return (
    <div className={`flex justify-center mb-8 ${className}`}>
      <div className="inline-flex items-center bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-2xl p-2">
        <Button
          variant={viewMode === 'simple' ? 'default' : 'ghost'}
          size="lg"
          onClick={() => onViewChange('simple')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all ${
            viewMode === 'simple' 
              ? 'bg-orange-500 hover:bg-orange-600 text-white' 
              : 'text-gray-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <Users className="h-4 w-4" />
          Customer Packages
        </Button>
        <Button
          variant={viewMode === 'advanced' ? 'default' : 'ghost'}
          size="lg"
          onClick={() => onViewChange('advanced')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all ${
            viewMode === 'advanced' 
              ? 'bg-orange-500 hover:bg-orange-600 text-white' 
              : 'text-gray-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <Brain className="h-4 w-4" />
          AI Technical Hub
        </Button>
      </div>
    </div>
  );
};

export default ServiceViewToggle;
