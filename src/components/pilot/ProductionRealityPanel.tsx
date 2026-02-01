import React from 'react';

export const ProductionRealityPanel: React.FC<{
  systemId: string;
  manufacturingDims: { width: number; height: number };
}> = ({ systemId, manufacturingDims: _manufacturingDims }) => {
  return (
    <div className="mt-4 bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="btn-primary">⚙️</div>
        <h3 className="typography-h3 text-amber-800 font-cairo">حقائق التصنيع للورشة</h3>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-700">هدر المنشار:</span>
          <span className="font-mono font-bold text-amber-700">٤.٢ مم/قص</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-700">أطراف البار المؤكسدة:</span>
          <span className="font-mono font-bold text-amber-700">١٥ مم من كل طرف</span>
        </div>
        
        {systemId.includes('panda') && (
          <div className="mt-2 pt-2 border-t border-amber-200">
            <div className="flex justify-between">
              <span className="text-gray-700">إزاحة مجرى السلك:</span>
              <span className="font-mono font-bold text-green-700">١٥ مم</span>
            </div>
            <div className="text-xs text-amber-600 mt-1">⚠️ بدون هذه الإزاحة، سيكون شبك السلك أصغر ب ٣٠ مم</div>
          </div>
        )}
        
        {systemId.includes('upvc') && (
          <div className="mt-2 pt-2 border-t border-amber-200">
            <div className="flex justify-between">
              <span className="text-gray-700">هدر اللحام الحراري:</span>
              <span className="font-mono font-bold text-purple-700">٣ مم/زاوية</span>
            </div>
            <div className="text-xs text-amber-600 mt-1">⚙️ يتم خصم ٣ مم من كل زاوية عند اللحام</div>
          </div>
        )}
      </div>
    </div>
  );
};

