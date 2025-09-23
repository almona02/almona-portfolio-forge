// Shared Shop Product shape accepted by QuoteContext.addToQuote and Shop components

export interface ShopProductBase {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  category: string;
  tags?: string[];
}

export interface ShopMachine extends ShopProductBase {
  stock: number;
  specifications?: { key: string; value: string }[];
  certifications?: { standard: string }[];
  pricing?: { basePrice?: number };
  isFeatured?: boolean;
  isNew?: boolean;
  discount?: number;
}

export interface ShopProductSimple extends ShopProductBase {
  price: number;
  stock: number;
}

export interface ShopPart extends ShopProductBase {
  price?: number;
}

export type ShopProductInput = ShopMachine | ShopProductSimple | ShopPart;
