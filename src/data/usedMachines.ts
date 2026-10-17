// Used Machines Marketplace — public listing shape.
// Keeps legacy field names (price as formatted string, seller, type, year/hours) for
// backward compatibility with existing search/related components, plus contact fields.

export interface Seller {
  name: string;
  rating: number;
  verified: boolean;
}

export interface UsedMachine {
  id: string;
  title: string;
  price: string; // formatted e.g. "EGP 180,000"
  currency: string;
  location: string;
  condition: string;
  type: string; // machine category
  year: number;
  hours: number;
  images: string[];
  description: string;
  seller: Seller;
  contactName: string;
  contactPhone: string;
  contactWhatsapp: string | null;
  status: string;
  views: number;
  createdAt: string;
}

export function formatMachinePrice(price: number, currency = 'EGP'): string {
  try {
    return new Intl.NumberFormat('en-EG', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return `${price} ${currency}`;
  }
}

// Placeholder is empty; the page fetches live listings from Supabase via UsedMachineService.
export const usedMachines: UsedMachine[] = [];

// Map a Supabase row (snake_case) to the camelCase UsedMachine shape.
export function mapListingToMachine(row: {
  id: string; title: string; price: number; currency: string; location: string;
  condition: string; category: string; year: number | null; hours: number | null;
  description: string; contact_name: string; contact_phone: string; contact_whatsapp: string | null;
  images: string[]; status: string; views: number; created_at: string;
}): UsedMachine {
  return {
    id: row.id,
    title: row.title,
    price: formatMachinePrice(row.price, row.currency),
    currency: row.currency,
    location: row.location,
    condition: row.condition,
    type: row.category,
    year: row.year ?? 0,
    hours: row.hours ?? 0,
    images: row.images ?? [],
    description: row.description,
    seller: { name: row.contact_name, rating: 0, verified: false },
    contactName: row.contact_name,
    contactPhone: row.contact_phone,
    contactWhatsapp: row.contact_whatsapp,
    status: row.status,
    views: row.views,
    createdAt: row.created_at,
  };
}
