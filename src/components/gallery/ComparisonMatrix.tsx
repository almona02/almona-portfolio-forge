import React from 'react';
import type { SystemGalleryItem } from '@/types/gallery';

interface ComparisonMatrixProps {
  systems: SystemGalleryItem[];
}

export const ComparisonMatrix: React.FC<ComparisonMatrixProps> = ({ systems }) => {
  if (systems.length === 0) return null;

  return (
    <div className="overflow-x-auto bg-card rounded-xl shadow border border-border mt-8">
      <table className="w-full text-sm text-right">
        <thead className="bg-[#003366] text-primary-foreground">
          <tr>
            <th className="p-4 font-bold border-l border-blue-800 w-48">المواصفات الفنية</th>
            {systems.map(sys => (
              <th key={sys.id} className="p-4 font-bold border-l border-blue-800 min-w-[200px]">
                {sys.nameArabic}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          
          {/* U-Value */}
          <tr className="hover:bg-background">
            <td className="p-4 font-bold text-foreground bg-background">العزل الحراري (U-Value)</td>
            {systems.map(sys => (
              <td key={sys.id} className="p-4 font-mono text-[#003366] font-bold">
                {sys.specs.uValue} W/m²K
              </td>
            ))}
          </tr>

          {/* Wind Load */}
          <tr className="hover:bg-background">
            <td className="p-4 font-bold text-foreground bg-background">مقاومة الرياح</td>
            {systems.map(sys => (
              <td key={sys.id} className="p-4 font-mono">
                {sys.specs.windLoadClass}
              </td>
            ))}
          </tr>

          {/* Air Permeability */}
          <tr className="hover:bg-background">
            <td className="p-4 font-bold text-foreground bg-background">نفاذية الهواء</td>
            {systems.map(sys => (
              <td key={sys.id} className="p-4 font-mono">
                {sys.specs.airPermeability}
              </td>
            ))}
          </tr>

          {/* Water Tightness */}
          <tr className="hover:bg-background">
            <td className="p-4 font-bold text-foreground bg-background">مقاومة الماء</td>
            {systems.map(sys => (
              <td key={sys.id} className="p-4 font-mono">
                {sys.specs.waterTightness}
              </td>
            ))}
          </tr>

          {/* Sound Reduction */}
          <tr className="hover:bg-background">
            <td className="p-4 font-bold text-foreground bg-background">عزل الصوت</td>
            {systems.map(sys => (
              <td key={sys.id} className="p-4 font-mono">
                {sys.specs.soundReduction} dB
              </td>
            ))}
          </tr>

          {/* Profile Depth */}
          <tr className="hover:bg-background">
            <td className="p-4 font-bold text-foreground bg-background">عمق المقطع</td>
            {systems.map(sys => (
              <td key={sys.id} className="p-4 font-mono">
                {sys.specs.profileDepth} mm
              </td>
            ))}
          </tr>

          {/* Price Range */}
          <tr className="hover:bg-background">
            <td className="p-4 font-bold text-foreground bg-background">متوسط السعر</td>
            {systems.map(sys => (
              <td key={sys.id} className="p-4 font-mono text-green-700 font-bold">
                {sys.priceRange.min} - {sys.priceRange.max} EGP
              </td>
            ))}
          </tr>

          {/* Market Share */}
          <tr className="hover:bg-background">
            <td className="p-4 font-bold text-foreground bg-background">حصة السوق</td>
            {systems.map(sys => (
              <td key={sys.id} className="p-4">
                <div className="flex items-center gap-2">
                  <div className="w-full bg-muted rounded-full h-2.5 max-w-[100px]">
                    <div className="bg-[#FFD700] h-2.5 rounded-full" style={{ width: `${sys.marketShare}%` }}></div>
                  </div>
                  <span className="text-xs font-bold">{sys.marketShare}%</span>
                </div>
              </td>
            ))}
          </tr>

          {/* Certifications */}
          <tr className="hover:bg-background">
            <td className="p-4 font-bold text-foreground bg-background">الشهادات</td>
            {systems.map(sys => (
              <td key={sys.id} className="p-4">
                <div className="flex flex-wrap gap-1">
                  {sys.certifications.egyptian?.map((cert, i) => (
                    <span key={i} className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] rounded border border-green-100">
                      {cert}
                    </span>
                  ))}
                  {sys.certifications.en?.map((cert, i) => (
                    <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] rounded border border-blue-100">
                      {cert}
                    </span>
                  ))}
                  {sys.certifications.iso?.map((cert, i) => (
                    <span key={i} className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] rounded border border-amber-100">
                      {cert}
                    </span>
                  ))}
                </div>
              </td>
            ))}
          </tr>

        </tbody>
      </table>
    </div>
  );
};

