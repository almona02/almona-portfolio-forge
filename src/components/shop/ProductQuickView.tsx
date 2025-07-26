
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/shared/ui/ui/dialog';
import { Button } from '@/shared/ui/ui/button';
import { useTranslation } from 'react-i18next';
import { Machine } from '@/types';
import { useQuote } from '@/context/QuoteContext';
import { toast } from 'sonner';

interface ProductQuickViewProps {
  product: Machine;
  isOpen: boolean;
  onClose: () => void;
}

export const ProductQuickView: React.FC<ProductQuickViewProps> = ({
  product,
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation('shop');
  const { addToQuote } = useQuote();

  const handleAddToQuote = () => {
    addToQuote(product);
    toast.success(`${product.name} has been added to your quote.`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-almona-darker border-almona-light text-white p-0">
        <DialogHeader className="p-6">
          <DialogTitle className="text-2xl font-bold text-gradient-orange">{product.name}</DialogTitle>
          <DialogDescription className="text-gray-400">{product.description}</DialogDescription>
        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-6 p-6">
          <img src={product.imageUrl} alt={product.name} className="w-full h-auto object-cover rounded-lg" loading="lazy" />
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Features:</h3>
              <ul className="list-disc list-inside text-gray-300">
                {product.specifications?.map((spec, index) => (
                  <li key={index}>{spec}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Price:</h3>
              <p className="text-xl font-bold text-gradient-orange">
                {product.pricing?.basePrice ? `${product.pricing.basePrice.toLocaleString()} EGP` : 'Price on request'}
              </p>
            </div>
            <Button onClick={handleAddToQuote} className="w-full bg-gradient-orange">
              {t('shop.buttons.add_to_quote')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
