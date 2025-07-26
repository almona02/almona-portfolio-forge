export interface UniqueProduct {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  category: string;
  uniqueId: string;
  fabricationDate: Date;
  designer: string;
  material: string;
  stock: number;
  pricing?: {
    currency: "EGP" | "USD" | "EUR";
    basePrice?: number;
  };
}