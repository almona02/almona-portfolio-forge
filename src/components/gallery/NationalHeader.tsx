import React from 'react';
import { getLiveAluminumPrice } from '@/utils/marketData';

export const NationalHeader: React.FC = () => {
  const aluminumPrice = getLiveAluminumPrice();
  const date = new Date().toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="w-full bg-gradient-to-r from-[#003366] to-[#001133] text-white shadow-xl border-b-4 border-[#FFD700] relative overflow-hidden">
      {/* Background Pattern (Subtle Blueprint Grid) */}
      <div className="absolute inset-0 opacity-5 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
      </div>

      <div className="container mx-auto px-4 py-6 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          
          {/* Logo / Title Area */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#FFD700] rounded-full flex items-center justify-center border-4 border-white shadow-lg text-[#003366] font-bold text-2xl font-cairo">
              م
            </div>
            <div>
              <h1 className="typography-h1 text-2xl md:text-3xl font-cairo text-white">
                السجل القومي للأنظمة الصناعية
              </h1>
              <p className="text-yellow-100 text-sm font-cairo opacity-90">
                المصدر المعتمد لأنظمة النوافذ والأبواب في مصر
              </p>
            </div>
          </div>

          {/* Market Tickers */}
          <div className="flex flex-col gap-2 w-full md:w-auto">
            {/* Aluminum Ticker */}
            <div className="bg-white/10 backdrop-blur-md rounded-lg px-4 py-2 flex justify-between items-center border border-white/20 min-w-[280px]">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏭</span>
                <span className="font-bold text-sm">سعر الألومنيوم (LME)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-[#FFD700]">{aluminumPrice.toLocaleString()}</span>
                <span className="text-xs">ج.م/طن</span>
                <span className="text-green-400 text-xs">▲</span>
              </div>
            </div>

            {/* Date / Status */}
            <div className="flex justify-between items-center px-2 text-xs text-gray-300">
              <span>{date}</span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                سوق مستقر
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

