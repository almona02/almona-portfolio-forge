import React, { useState, useMemo } from 'react';
import { SYSTEM_GALLERY_DATA } from '@/data/systemGallery';
import { NationalHeader } from './NationalHeader';
import { SystemPackCard } from './SystemPackCard';
import type { GalleryFilterState } from '@/types/gallery';

export const CivilizationGallery: React.FC = () => {
  // State
  const [filter, setFilter] = useState<GalleryFilterState>({
    category: 'all',
    tier: 'all',
    search: '',
    sortBy: 'marketShare'
  });

  // Filtering Logic
  const filteredSystems = useMemo(() => {
    return SYSTEM_GALLERY_DATA.filter(system => {
      // Category Filter
      if (filter.category !== 'all' && system.category !== filter.category) return false;
      
      // Tier Filter
      if (filter.tier !== 'all' && system.tier !== filter.tier) return false;
      
      // Search Filter
      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        return (
          system.name.toLowerCase().includes(searchLower) ||
          system.nameArabic.includes(searchLower) ||
          system.manufacturer.toLowerCase().includes(searchLower)
        );
      }
      
      return true;
    }).sort((a, b) => {
      // Sorting Logic
      if (filter.sortBy === 'marketShare') return b.marketShare - a.marketShare;
      if (filter.sortBy === 'price') return a.priceRange.min - b.priceRange.min;
      if (filter.sortBy === 'uValue') return a.specs.uValue - b.specs.uValue;
      return 0;
    });
  }, [filter]);

  return (
    <div className="min-h-screen bg-gray-50 font-sans" dir="rtl">
      
      {/* 1. National Header */}
      <NationalHeader />

      <div className="container mx-auto px-4 py-8">
        
        {/* 2. Controls Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-8 sticky top-4 z-30">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            
            {/* Search */}
            <div className="relative w-full md:w-96">
              <input 
                type="text" 
                placeholder="بحث في الأنظمة (الاسم، الشركة...)" 
                className="w-full pl-4 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-[#003366] outline-none"
                value={filter.search}
                onChange={e => setFilter({...filter, search: e.target.value})}
              />
              <span className="absolute right-3 top-2.5 text-gray-400">🔍</span>
            </div>

            {/* Filters */}
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
              <select 
                className="px-4 py-2 border rounded-lg bg-gray-50 text-sm font-bold text-gray-700"
                value={filter.category}
                onChange={e => setFilter({...filter, category: e.target.value as any})}
              >
                <option value="all">كل الأنظمة</option>
                <option value="aluminum">ألومنيوم</option>
                <option value="upvc">UPVC</option>
              </select>

              <select 
                className="px-4 py-2 border rounded-lg bg-gray-50 text-sm font-bold text-gray-700"
                value={filter.sortBy}
                onChange={e => setFilter({...filter, sortBy: e.target.value as any})}
              >
                <option value="marketShare">الأكثر انتشاراً</option>
                <option value="price">الأقل سعراً</option>
                <option value="uValue">الأفضل عزلاً</option>
              </select>
            </div>

          </div>
        </div>

        {/* 3. Systems Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredSystems.map(system => (
            <SystemPackCard key={system.id} system={system} />
          ))}
        </div>

        {/* Empty State */}
        {filteredSystems.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-bold text-gray-700">لا توجد نتائج</h3>
            <p className="text-gray-500">جرب تغيير معايير البحث</p>
          </div>
        )}

      </div>
    </div>
  );
};

