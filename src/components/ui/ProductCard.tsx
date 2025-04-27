
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { ArrowRight, ShoppingCart } from "lucide-react";

interface Product {
  id: string;
  name: string;
  brand: string;
  imageUrl: string;
  description: string;
  category: string;
  price: number;
  featured?: boolean;
  path: string;
}

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  return (
    <Card className="bg-almona-dark-lighter border-gray-800 overflow-hidden hover:border-almona-orange/30 transition-all group">
      <div className="relative overflow-hidden">
        {product.featured && (
          <span className="absolute top-4 left-0 bg-almona-orange text-white text-xs font-medium px-3 py-1 z-10">
            Featured
          </span>
        )}
        <Link to={product.path}>
          <img 
            src={product.imageUrl} 
            alt={product.name}
            className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105" 
          />
        </Link>
        <div className="absolute inset-0 bg-gradient-to-t from-almona-dark-default to-transparent opacity-50"></div>
      </div>
      
      <CardHeader className="pt-4 pb-2 px-4">
        <span className="text-sm text-almona-orange">{product.brand}</span>
        <Link to={product.path} className="text-lg font-semibold text-white hover:text-almona-orange transition-colors">
          {product.name}
        </Link>
        <span className="text-xs text-gray-400">{product.category}</span>
      </CardHeader>
      
      <CardContent className="px-4 py-2">
        <p className="text-gray-400 text-sm line-clamp-2">{product.description}</p>
      </CardContent>
      
      <CardFooter className="flex justify-between items-center px-4 py-4 border-t border-gray-800">
        <div>
          <span className="text-xl font-bold text-white">${product.price.toLocaleString()}</span>
          {product.brand === "ALFAPEN" && <span className="text-xs text-gray-400 block">Per meter</span>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="border-almona-orange text-almona-orange hover:bg-almona-orange hover:text-white">
            <ShoppingCart className="h-4 w-4" />
          </Button>
          <Button asChild variant="default" size="sm" className="bg-gradient-orange hover:bg-almona-orange-dark text-white">
            <Link to={product.path}>
              Details
              <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default ProductCard;
