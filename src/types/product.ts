export interface Product {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  category: string;
  price: number;
  tags: string[];
  stock: number;
}