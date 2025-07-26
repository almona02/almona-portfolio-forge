export interface Seller {
  name: string;
  rating: number;
  verified: boolean;
}

export interface UsedMachine {
  id: string;
  title: string;
  price: string;
  location: string;
  condition: string;
  type: string;
  year: number;
  hours: number;
  images: string[];
  description: string;
  seller: Seller;
}

export const usedMachines: UsedMachine[] = [
  {
    id: '1',
    title: 'Yılmaz K 139 Copy Router',
    price: 'EGP 180,000',
    location: 'Cairo',
    condition: 'Excellent',
    type: 'copy-router',
    year: 2020,
    hours: 3200,
    images: ['/images/machines/1-1.jpg', '/images/machines/1-2.jpg'],
    description: 'Well-maintained copy router with automatic feeding system. Perfect for UPVC window production.',
    seller: {
      name: 'El Masria Fabricators',
      rating: 4.8,
      verified: true
    }
  },
  {
    id: '2',
    title: 'Altınsoy Double Head Cutting Machine',
    price: 'EGP 120,000',
    location: 'Alexandria',
    condition: 'Good',
    type: 'cutting',
    year: 2018,
    hours: 5800,
    images: ['/images/machines/2-1.jpg', '/images/machines/2-2.jpg'],
    description: 'Reliable cutting machine for aluminum profiles. Includes pneumatic clamping system.',
    seller: {
      name: 'Mediterranean Aluminum',
      rating: 4.5,
      verified: true
    }
  },
  {
    id: '3',
    title: 'YILMAZ CA601',
    price: 'EGP 125,000',
    location: 'Giza',
    condition: 'GOOD',
    type: 'CLEANING MACHINE',
    year: 2015,
    hours: 2000,
    images: ['/images/machines/3-1.jpg', '/images/machines/3-2.jpg'],
    description: 'AUTOMATIC CLEANING MACHINE FOR UPVC PROFILES.',
    seller: {
      name: 'ALMONA-COMPANY',
      rating: 3.5,
      verified: true
    }
  }
];
