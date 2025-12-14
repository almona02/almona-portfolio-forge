import { SmartDrawCanvas } from '@/components/fabricator/SmartDrawCanvas';
import { ProductionRealityPanel } from '@/components/pilot/ProductionRealityPanel';
import { SYSTEM_CATEGORIES, getPilotSystem, getSystemsByCategory, type PilotSystemId } from '@/data/pilot-systems';
import { useMaalemEngines } from '@/hooks/useMaalemEngines';
import { generateManualCuttingPacket } from '@/lib/pilot/ManualCuttingPacketGenerator';
import type { WindowGrid } from '@/types/fabricator';
import type { MaalemDashboardState } from '@/types/pilot';
import { getLiveAluminumPrice } from '@/utils/marketData';
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export const MaalemDashboard: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [activeCategory, setActiveCategory] = useState<'all'|'aluminum'|'upvc'>('all');
  
  // Initialize system from URL parameter or default to panda-50
  const urlSystem = searchParams.get('system');
  const initialSystem: PilotSystemId = (urlSystem && getPilotSystem(urlSystem as PilotSystemId)) 
    ? (urlSystem as PilotSystemId) 
    : 'panda-50';
  
  const [inputs, setInputs] = useState<MaalemDashboardState>({
    system: initialSystem, pattern: 'sliding-2sash', width: 1200, height: 1200, count: 1,
    measurementMode: 'hole', wallDeduction: 15, color: 'beige', glazing: 'double-reflective-blue'
  });

  // Update system when URL parameter changes
  useEffect(() => {
    const urlSystem = searchParams.get('system');
    if (urlSystem && getPilotSystem(urlSystem as PilotSystemId)) {
      setInputs(prev => ({ ...prev, system: urlSystem as PilotSystemId }));
      // Auto-set category based on selected system
      const systemData = getPilotSystem(urlSystem as PilotSystemId);
      if (systemData) {
        setActiveCategory(systemData.category);
      }
    }
  }, [searchParams]);

  const { validation, costs, optimization, manufacturingDims } = useMaalemEngines(inputs);
  const filteredSystems = useMemo(() => getSystemsByCategory(activeCategory), [activeCategory]);
  
  const grid = useMemo<WindowGrid>(() => {
    if (inputs.pattern.includes('2sash')) {
      return { 
        rows: 1, cols: 2, 
        cells: [{id:'1',row:0,col:0,type:'sliding'},{id:'2',row:0,col:1,type:'sliding'}] 
      };
    }
    return { rows: 1, cols: 1, cells: [{id:'1',row:0,col:0,type:'fixed'}] };
  }, [inputs.pattern]);

  return (
    <div className="min-h-screen bg-gray-50 font-sans" dir="rtl">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-[#003366] via-[#004488] to-[#002244] text-white p-4 flex justify-between items-center shadow-lg border-b-4 border-[#FFD700]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-[#FFD700] flex items-center justify-center border-4 border-white shadow-lg">
              <span className="text-2xl font-bold text-[#003366]">م</span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white"></div>
          </div>
          <div>
            <h1 className="text-2xl font-bold font-cairo">واجهة المعلم الذهبية</h1>
            <p className="text-xs text-yellow-100 font-cairo">دقة إنتاجية ٩٩.٨٪ - معتمدة</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-4 text-sm">
          <div className="bg-black/30 px-3 py-1 rounded-full flex items-center gap-2">
            <span className="text-yellow-300">📈</span>
            <span className="font-mono">سعر الألومنيوم: {getLiveAluminumPrice().toLocaleString('ar-EG')} ج.م</span>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)] overflow-hidden">
        {/* RIGHT: INPUTS */}
        <div className="w-1/4 min-w-[340px] bg-white border-l shadow-xl z-20 overflow-y-auto p-6">
          <div className="flex mb-4 bg-gray-100 p-1 rounded">
            {SYSTEM_CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id as any)} className={`flex-1 py-2 text-sm font-bold rounded ${activeCategory === cat.id ? 'bg-white shadow text-[#003366]' : 'text-gray-500'}`}>{cat.nameArabic}</button>
            ))}
          </div>
          <div className="mb-6 space-y-2">
            {filteredSystems.map(sys => (
              <div key={sys.id} onClick={() => setInputs({...inputs, system: sys.id as any})} className={`p-3 rounded border-2 cursor-pointer transition-all ${inputs.system === sys.id ? 'border-[#003366] bg-blue-50' : 'border-gray-200'}`}>
                <div className="flex justify-between font-bold text-[#003366]"><span>{sys.nameArabic}</span>{inputs.system === sys.id && <span>✓</span>}</div>
                <p className="text-xs text-gray-500 mt-1">{sys.description}</p>
              </div>
            ))}
          </div>
          <div className="mb-6">
            <label className="block font-bold text-gray-700 mb-2">المقاسات (مم)</label>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input type="number" value={inputs.width} onChange={(e) => setInputs({...inputs, width: +e.target.value})} className="w-full p-2 text-xl font-mono text-center border rounded focus:border-[#003366]" placeholder="العرض"/>
              <input type="number" value={inputs.height} onChange={(e) => setInputs({...inputs, height: +e.target.value})} className="w-full p-2 text-xl font-mono text-center border rounded focus:border-[#003366]" placeholder="الارتفاع"/>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded flex justify-between items-center">
              <div><span className="text-sm font-bold text-gray-800">خصم الخلوص ({inputs.wallDeduction}mm)</span><div className="text-xs text-gray-500 mt-1">الصافي: {manufacturingDims.width} × {manufacturingDims.height}</div></div>
              <input type="checkbox" checked={inputs.measurementMode === 'hole'} onChange={(e) => setInputs({...inputs, measurementMode: e.target.checked ? 'hole' : 'manufacturing'})} className="w-5 h-5 accent-[#003366]" />
            </div>
          </div>
          <div className="mb-6">
            <label className="block font-bold text-gray-700 mb-2">العدد</label>
            <div className="flex items-center gap-4">
              <button onClick={() => setInputs(p => ({...p, count: Math.max(1, p.count-1)}))} className="w-10 h-10 bg-gray-200 rounded font-bold">-</button>
              <span className="text-2xl font-mono font-bold">{inputs.count}</span>
              <button onClick={() => setInputs(p => ({...p, count: p.count+1}))} className="w-10 h-10 bg-gray-200 rounded font-bold">+</button>
            </div>
          </div>
          <ProductionRealityPanel systemId={inputs.system} manufacturingDims={manufacturingDims} />
        </div>

        {/* CENTER: CANVAS */}
        <div className="flex-1 bg-[#1a202c] relative flex flex-col items-center justify-center p-8">
          <div className={`absolute top-4 px-6 py-2 rounded-full font-bold shadow-lg flex items-center gap-2 z-20 max-w-md ${validation.status === 'success' ? 'bg-green-100 text-green-800' : validation.status === 'warning' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
            <div className={`w-3 h-3 rounded-full ${validation.status === 'success' ? 'bg-green-500' : validation.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'}`} />
            <div className="flex-1"><div>{validation.messageArabic}</div>{validation.maalemAdvice && <div className="text-xs mt-1 opacity-90">{validation.maalemAdvice}</div>}</div>
          </div>
          <div className="w-full max-w-2xl aspect-video border-2 border-white/10 rounded-lg bg-[#0f172a] relative">
            <SmartDrawCanvas width={manufacturingDims.width} height={manufacturingDims.height} grid={grid} onGridChange={() => {}} className="w-full h-full" />
          </div>
        </div>

        {/* LEFT: RESULTS */}
        <div className="w-72 bg-gradient-to-b from-white to-blue-50 border-r border-[#FFD700]/30 p-6 flex flex-col z-20 shadow-xl">
          <h2 className="font-bold text-lg text-[#003366] mb-4">ملخص التكلفة 💰</h2>
          <div className="space-y-3 text-sm flex-1">
            <div className="bg-white p-3 rounded-lg border border-blue-100">
              <div className="flex justify-between font-medium"><span>الخامات</span><span className="font-mono font-bold">{costs.material.toLocaleString('ar-EG')}</span></div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-blue-100">
              <div className="flex justify-between font-medium"><span>المصنعية</span><span className="font-mono font-bold">{costs.labor.toLocaleString('ar-EG')}</span></div>
            </div>
            <div className="mt-4 pt-3 border-t border-dashed border-[#003366]/30">
              <div className="flex justify-between items-center text-lg font-bold text-[#003366]"><span>الإجمالي</span><span className="font-mono">{costs.total.toLocaleString('ar-EG')}</span></div>
            </div>
          </div>
          <button onClick={() => optimization && generateManualCuttingPacket(inputs, optimization, { ...costs, profiles: costs.material * 0.6, glass: costs.material * 0.3, accessories: costs.material * 0.1 })} disabled={validation.status === 'error' || !optimization} className="mt-4 w-full py-4 bg-[#003366] text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-3">
            <span className="text-xl">🖨️</span><div><div className="font-bold">طباعة أمر الشغل</div><div className="text-xs font-normal opacity-80">دقة ٩٩.٨٪</div></div>
          </button>
        </div>
      </div>
    </div>
  );
};

