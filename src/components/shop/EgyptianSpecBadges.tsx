import React from 'react';
import { MachineSpec, EgyptCertification } from '@/types/shop';

interface EgyptianSpecBadgesProps {
  machine: MachineSpec;
}

const EgyptianSpecBadges: React.FC<EgyptianSpecBadgesProps> = ({ machine }) => {
  const getCertificationLabel = (cert: EgyptCertification) => {
    const labels: Record<EgyptCertification, string> = {
      'EGYPT-ISO-9001': 'ISO 9001 (Egypt)',
      'EGYPT-ISO-14001': 'ISO 14001 (Egypt)',
      'EGYPT-OSHA': 'OSHA Compliance (Egypt)',
      'EGYPT-QC': 'Quality Certified (Egypt)'
    };
    return labels[cert] || cert;
  };

  return (
    <div className="flex flex-wrap gap-2">
      {machine.egyptCertifications?.map(cert => (
        <span key={cert} className="bg-[#ce1126] text-white px-3 py-1 rounded-full text-xs flex items-center">
          <span className="mr-1">🇪🇬</span>
          {getCertificationLabel(cert)}
        </span>
      ))}
    </div>
  );
};

export default EgyptianSpecBadges;
