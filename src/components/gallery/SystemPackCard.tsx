import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { SystemGalleryItem } from '@/types/gallery';

interface SystemPackCardProps {
  system: SystemGalleryItem;
}

export const SystemPackCard: React.FC<SystemPackCardProps> = ({ system }) => {
  const navigate = useNavigate();

  const handleUseInPilot = () => {
    if (system.pilotAvailable && system.pilotSystemId) {
      // Navigate to Pilot with system pre-selected
      navigate(`/pilot?system=${system.pilotSystemId}`);
    }
  };

  const handleTuneSystem = () => {
    // Navigate to Tuning Workbench with system pre-loaded
    navigate(`/tuning?systemId=${system.id}`);
  };

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-200 group flex flex-col h-full">
      
      {/* Header Bar - Color Coded by Category */}
      <div className={`h-2 w-full ${system.category === 'aluminum' ? 'bg-[#003366]' : 'bg-[#27ae60]'}`}></div>

      <div className="p-5 flex-1 flex flex-col relative">
        
        {/* Market Share Badge */}
        <div className="absolute top-4 left-4 bg-gray-100 px-2 py-1 rounded text-xs font-mono font-bold text-gray-600 border border-gray-200">
          Share: {system.marketShare}%
        </div>

        {/* Tier Badge */}
        {system.tier === 'gold' && (
          <div className="absolute top-4 right-4 bg-[#FFD700] px-2 py-1 rounded text-xs font-bold text-[#003366] border border-[#FFD700]">
            🏆 Gold
          </div>
        )}

        {/* Title */}
        <div className="mb-4 mt-2">
          <h3 className="text-xl font-bold font-cairo text-gray-900 group-hover:text-[#003366] transition-colors">
            {system.nameArabic}
          </h3>
          <p className="text-sm text-gray-500 font-mono">{system.name}</p>
          <p className="text-xs text-gray-400 mt-1">{system.manufacturer}</p>
        </div>

        {/* Technical Grid (Blueprint Style) */}
        <div className="grid grid-cols-2 gap-px bg-gray-200 border border-gray-200 rounded mb-4 overflow-hidden text-xs">
          <div className="bg-blue-50/50 p-2">
            <span className="block text-gray-500 text-[10px]">U-VALUE</span>
            <span className="font-mono font-bold text-[#003366]">{system.specs.uValue} W/m²K</span>
          </div>
          <div className="bg-blue-50/50 p-2">
            <span className="block text-gray-500 text-[10px]">WIND LOAD</span>
            <span className="font-mono font-bold text-[#003366]">{system.specs.windLoadClass}</span>
          </div>
          <div className="bg-white p-2">
            <span className="block text-gray-500 text-[10px]">PRICE RANGE</span>
            <span className="font-mono font-bold">{system.priceRange.min}-{system.priceRange.max} {system.priceRange.currency}/m²</span>
          </div>
          <div className="bg-white p-2">
            <span className="block text-gray-500 text-[10px]">DEPTH</span>
            <span className="font-mono font-bold">{system.specs.profileDepth}mm</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 mb-4 line-clamp-2 flex-1">
          {system.descriptionArabic}
        </p>

        {/* Certifications Row */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
          {system.certifications.egyptian?.map((cert, i) => (
            <span key={i} className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] rounded border border-green-100 whitespace-nowrap">
              {cert}
            </span>
          ))}
          {system.certifications.en?.map((cert, i) => (
            <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] rounded border border-blue-100 whitespace-nowrap">
              {cert}
            </span>
          ))}
          {system.certifications.iso?.map((cert, i) => (
            <span key={i} className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] rounded border border-purple-100 whitespace-nowrap">
              {cert}
            </span>
          ))}
        </div>

        {/* Availability Badge */}
        <div className="mb-4">
          {system.availability === 'stock' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs rounded border border-green-200">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              متوفر في المخزن
            </span>
          )}
          {system.availability === 'order' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-50 text-yellow-700 text-xs rounded border border-yellow-200">
              <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
              طلب خاص
            </span>
          )}
          {system.availability === 'import' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 text-xs rounded border border-orange-200">
              <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
              استيراد
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-auto">
          {system.pilotAvailable ? (
            <button 
              onClick={handleUseInPilot}
              className="flex-1 bg-[#003366] hover:bg-[#004488] text-white py-2 rounded-lg font-bold text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <span>🛠️</span>
              <span>استخدم في الورشة</span>
            </button>
          ) : (
            <button disabled className="flex-1 bg-gray-100 text-gray-400 py-2 rounded-lg font-bold text-sm cursor-not-allowed">
              غير متاح للورشة
            </button>
          )}
          
          <button 
            onClick={handleTuneSystem}
            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
            title="Tune System Parameters"
          >
            ⚙️
          </button>
          
          <button className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors">
            📄
          </button>
        </div>

      </div>
    </div>
  );
};

