export interface UniqueProduct {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  category: string;
  featured?: boolean;
  releaseDate: string;
  tags?: string[];
  rarity: string; // e.g. "one-of-a-kind", "limited edition"
}

export const uniqueProducts: UniqueProduct[] = [
  {
    id: "unique-001",
    name: "Vintage CNC Milling Machine",
    description: "A rare vintage CNC milling machine from the 1980s, fully restored and operational.",
    imageUrl: "/images/machines/vintage-cnc-milling.jpg",
    category: "prototypes",
    featured: true,
    releaseDate: "2023-01-15",
    tags: ["Vintage", "Collector's Item"],
    rarity: "one-of-a-kind"
  },
  {
    id: "unique-002",
    name: "Custom Handcrafted Welding Rig",
    description: "A custom-built welding rig designed for precision and durability, limited to 5 units worldwide.",
    imageUrl: "/images/machines/custom-welding-rig.jpg",
    category: "custom-fabrications",
    featured: false,
    releaseDate: "2023-03-10",
    tags: ["Limited Edition", "Handcrafted"],
    rarity: "limited edition"
  }
];
