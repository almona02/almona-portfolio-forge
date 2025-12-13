/**
 * Micron Parameter Panel
 * 
 * Visual tuning interface for 99.8% accuracy parameters:
 * - Saw Blade Kerf (4.2mm)
 * - Bar End Trim (15mm)
 * - Transom Milling Depth (2.5mm)
 * - UPVC Welding Loss (3mm)
 * - Screen Adapter Offset (15mm)
 */

import React from 'react';
import type { MicronParameters } from '@/types/tuning';

interface MicronParameterPanelProps {
  /** Current micron parameters */
  params: MicronParameters;
  /** System category (aluminum vs UPVC) */
  category: 'aluminum' | 'upvc';
  /** Callback when parameters change */
  onChange: (params: MicronParameters) => void;
  /** System name for context */
  systemName?: string;
}

export const MicronParameterPanel: React.FC<MicronParameterPanelProps> = ({
  params,
  category,
  onChange,
  systemName,
}) => {
  const handleChange = (key: keyof MicronParameters, value: number) => {
    onChange({ ...params, [key]: value });
  };

  const getValidationWarning = (key: keyof MicronParameters, value: number): string | null => {
    switch (key) {
      case 'sawBladeKerf':
        if (value < 3.5) return '⚠️ Kerf too small may cause fit issues';
        if (value > 5.0) return '⚠️ Kerf too large increases waste';
        return null;
      case 'barEndTrim':
        if (value < 10) return '⚠️ Trim too small may leave oxidized ends';
        if (value > 20) return '⚠️ Trim too large increases waste';
        return null;
      case 'transomMillingDepth':
        if (value < 1.0) return '⚠️ Milling too shallow may not clear transom';
        if (value > 5.0) return '⚠️ Milling too deep weakens profile';
        return null;
      case 'upvcWeldingLoss':
        if (category === 'upvc') {
          if (value < 2) return '⚠️ Welding loss too small may cause fit issues';
          if (value > 5) return '⚠️ Welding loss too large increases waste';
        }
        return null;
      case 'screenAdapterOffset':
        if (value < 12) return '⚠️ Offset too small may cause screen clash';
        if (value > 18) return '⚠️ Offset too large pushes screen too far';
        return null;
      default:
        return null;
    }
  };

  const ParameterSlider: React.FC<{
    label: string;
    labelArabic: string;
    value: number;
    min: number;
    max: number;
    step: number;
    unit: string;
    description: string;
    descriptionArabic: string;
    onChange: (value: number) => void;
    warning?: string | null;
  }> = ({ label, labelArabic, value, min, max, step, unit, description, descriptionArabic, onChange, warning }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <label className="font-bold text-gray-900 text-sm">{label}</label>
            <span className="text-xs text-gray-500">({labelArabic})</span>
          </div>
          <p className="text-xs text-gray-600 mt-1">{description}</p>
          <p className="text-xs text-gray-500 mt-0.5" dir="rtl">{descriptionArabic}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-mono font-bold text-[#003366]">{value.toFixed(1)}</div>
          <div className="text-xs text-gray-500">{unit}</div>
        </div>
      </div>
      
      <div className="space-y-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#003366]"
          style={{
            background: `linear-gradient(to right, #003366 0%, #003366 ${((value - min) / (max - min)) * 100}%, #e5e7eb ${((value - min) / (max - min)) * 100}%, #e5e7eb 100%)`
          }}
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>{min} {unit}</span>
          <span>{max} {unit}</span>
        </div>
      </div>
      
      {warning && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-xs text-yellow-800">
          {warning}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6" dir="ltr">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003366] to-[#001133] text-white p-4 rounded-lg">
        <h3 className="text-lg font-bold font-cairo">Micron Parameters</h3>
        <p className="text-sm text-yellow-100 mt-1">99.8% Accuracy Tuning</p>
        {systemName && (
          <p className="text-xs text-gray-300 mt-1">System: {systemName}</p>
        )}
      </div>

      {/* Category Badge */}
      <div className="flex items-center gap-2">
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
          category === 'aluminum' 
            ? 'bg-[#003366] text-white' 
            : 'bg-[#27ae60] text-white'
        }`}>
          {category === 'aluminum' ? 'Aluminum System' : 'UPVC System'}
        </span>
        <span className="text-xs text-gray-500">These parameters affect cutting calculations</span>
      </div>

      {/* Core Parameters (All Systems) */}
      <div className="space-y-4">
        <h4 className="font-bold text-gray-700 text-sm">Core Parameters</h4>
        
        <ParameterSlider
          label="Saw Blade Kerf"
          labelArabic="هدر المنشار"
          value={params.sawBladeKerf}
          min={3.5}
          max={5.0}
          step={0.1}
          unit="mm"
          description="Width of material removed by saw blade during cutting"
          descriptionArabic="عرض المادة المزالة بواسطة شفرة المنشار أثناء القطع"
          onChange={(v) => handleChange('sawBladeKerf', v)}
          warning={getValidationWarning('sawBladeKerf', params.sawBladeKerf)}
        />

        <ParameterSlider
          label="Bar End Trim"
          labelArabic="أطراف البار المؤكسدة"
          value={params.barEndTrim}
          min={10}
          max={20}
          step={0.5}
          unit="mm"
          description="Length to trim from each bar end (oxidized material)"
          descriptionArabic="الطول المقطوع من كل طرف بار (مادة مؤكسدة)"
          onChange={(v) => handleChange('barEndTrim', v)}
          warning={getValidationWarning('barEndTrim', params.barEndTrim)}
        />

        <ParameterSlider
          label="Transom Milling Depth"
          labelArabic="عمق تفريز العارضة"
          value={params.transomMillingDepth}
          min={1.0}
          max={5.0}
          step={0.1}
          unit="mm"
          description="Depth of milling operation for transom clearance"
          descriptionArabic="عمق عملية التفريز لخلوص العارضة"
          onChange={(v) => handleChange('transomMillingDepth', v)}
          warning={getValidationWarning('transomMillingDepth', params.transomMillingDepth)}
        />
      </div>

      {/* UPVC-Specific Parameters */}
      {category === 'upvc' && params.upvcWeldingLoss !== undefined && (
        <div className="space-y-4">
          <h4 className="font-bold text-gray-700 text-sm">UPVC-Specific</h4>
          
          <ParameterSlider
            label="Welding Loss"
            labelArabic="هدر اللحام الحراري"
            value={params.upvcWeldingLoss}
            min={2}
            max={5}
            step={0.1}
            unit="mm"
            description="Material lost per corner during thermal welding"
            descriptionArabic="المادة المفقودة لكل زاوية أثناء اللحام الحراري"
            onChange={(v) => handleChange('upvcWeldingLoss', v)}
            warning={getValidationWarning('upvcWeldingLoss', params.upvcWeldingLoss)}
          />
        </div>
      )}

      {/* Aluminum-Specific Parameters (Panda Screen Adapter) */}
      {category === 'aluminum' && params.screenAdapterOffset !== undefined && (
        <div className="space-y-4">
          <h4 className="font-bold text-gray-700 text-sm">Screen Adapter (Panda-Specific)</h4>
          
          <ParameterSlider
            label="Screen Adapter Offset"
            labelArabic="إزاحة مجرى السلك"
            value={params.screenAdapterOffset}
            min={12}
            max={18}
            step={0.5}
            unit="mm"
            description="How much the screen adapter pushes the screen sash outward"
            descriptionArabic="كم يدفع مجرى السلك شبك السلك للخارج"
            onChange={(v) => handleChange('screenAdapterOffset', v)}
            warning={getValidationWarning('screenAdapterOffset', params.screenAdapterOffset)}
          />
          
          <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-800">
            <strong>⚠️ Critical:</strong> Without this offset, the screen sash will be 30mm smaller than intended, causing fit issues.
          </div>
        </div>
      )}

      {/* Batch Calibration (Optional) */}
      {params.batchCalibrationOffset !== undefined && (
        <div className="space-y-4">
          <h4 className="font-bold text-gray-700 text-sm">Machine Calibration</h4>
          
          <ParameterSlider
            label="Batch Calibration Offset"
            labelArabic="معايرة الدفعة"
            value={params.batchCalibrationOffset}
            min={-2}
            max={2}
            step={0.1}
            unit="mm"
            description="Machine-specific adjustment for batch calibration"
            descriptionArabic="تعديل خاص بالماكينة لمعايرة الدفعة"
            onChange={(v) => handleChange('batchCalibrationOffset', v)}
            warning={params.batchCalibrationOffset !== 0 ? '⚠️ Non-zero calibration affects all cuts' : null}
          />
        </div>
      )}

      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-bold text-blue-900 text-sm mb-2">Formula Impact</h4>
        <div className="text-xs text-blue-800 space-y-1">
          <p>• <strong>Glass Fit:</strong> Frame inner gap - (2 × Kerf) - Trim</p>
          <p>• <strong>Cutting Length:</strong> Design length + Kerf + Calibration</p>
          {category === 'upvc' && (
            <p>• <strong>UPVC Frame:</strong> Design length + (2 × Welding Loss)</p>
          )}
          {category === 'aluminum' && params.screenAdapterOffset && (
            <p>• <strong>Screen Sash:</strong> Design length + (2 × Adapter Offset)</p>
          )}
        </div>
      </div>
    </div>
  );
};

