/**
 * Shared type definitions for shop components
 */

export type EgyptCertification = 
  | 'EGYPT-ISO-9001'
  | 'EGYPT-ISO-14001'
  | 'EGYPT-OSHA'
  | 'EGYPT-QC';

export interface MachineSpec {
  id: string;
  name: string;
  specs: Record<string, string | number>;
  egyptCertifications?: EgyptCertification[];
  power: {
    voltage: '220V' | '380V' | '400V' | '440V';
    frequency: '50Hz' | '60Hz';
  };
  category: string; // Added category property to match usage in Shop.tsx
}

export interface IndustrialProductCardProps {
  title: string;
  description: string;
  imageUrl: string;
  price: string;
  features: string[];
  badges?: string[];
  egyptCertifications?: EgyptCertification[];
  actions: {
    label: string;
    action: () => void;
  }[];
}

export type Governorate = 
  | 'القاهرة'
  | 'الجيزة'
  | 'الإسكندرية'
  | 'بورسعيد'
  | 'السويس'
  | 'المنصورة'
  | 'المنيا'
  | 'أسيوط'
  | 'سوهاج'
  | 'قنا'
  | 'أسوان';

export type NilePort = 'Alexandria' | 'PortSaid' | 'Suez';