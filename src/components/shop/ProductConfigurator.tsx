
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Database } from '@/types/database';
import { calculateTieredPrice } from '@/lib/pricing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useQuote } from '@/context/QuoteContext';
import { useToast } from '@/hooks/use-toast';

// Simple currency formatter
const formatCurrency = (amount: number, currency: string = 'EGP'): string => {
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

interface ConfigurationOption {
  id: string;
  label_ar: string;
  label_en: string;
  description_ar?: string;
  description_en?: string;
  price: number;
  image_url?: string;
}

interface ConfigurationCategory {
  id: string;
  name_ar: string;
  name_en: string;
  description_ar?: string;
  description_en?: string;
  required: boolean;
  options: ConfigurationOption[];
}

interface ProductConfiguratorProps {
  product: Database['public']['Tables']['products']['Row'];
  onConfigurationChange?: (configurations: Record<string, ConfigurationOption>, totalPrice: number) => void;
  showAddToQuote?: boolean;
}

// Sample configuration data - in a real app, this would come from the database
const getConfigurationCategories = (productCategory: string): ConfigurationCategory[] => {
  const baseCategories: ConfigurationCategory[] = [];

  if (productCategory === 'machine') {
    baseCategories.push(
      {
        id: 'automation',
        name_ar: 'Ù…Ø³ØªÙˆÙ‰ Ø§Ù„Ø£ØªÙ…ØªØ©',
        name_en: 'Automation Level',
        description_ar: 'Ø§Ø®ØªØ± Ù…Ø³ØªÙˆÙ‰ Ø§Ù„Ø£ØªÙ…ØªØ© Ø§Ù„Ù…Ù†Ø§Ø³Ø¨ Ù„Ø§Ø­ØªÙŠØ§Ø¬Ø§ØªÙƒ',
        description_en: 'Choose the automation level that suits your needs',
        required: true,
        options: [
          {
            id: 'manual',
            label_ar: 'ÙŠØ¯ÙˆÙŠ',
            label_en: 'Manual',
            description_ar: 'ØªØ´ØºÙŠÙ„ ÙŠØ¯ÙˆÙŠ Ø¨Ø§Ù„ÙƒØ§Ù…Ù„',
            description_en: 'Fully manual operation',
            price: 0,
          },
          {
            id: 'semi_auto',
            label_ar: 'Ø´Ø¨Ù‡ Ø£ÙˆØªÙˆÙ…Ø§ØªÙŠÙƒÙŠ',
            label_en: 'Semi-Automatic',
            description_ar: 'ØªØ´ØºÙŠÙ„ Ø´Ø¨Ù‡ Ø£ÙˆØªÙˆÙ…Ø§ØªÙŠÙƒÙŠ Ù…Ø¹ ØªØ¯Ø®Ù„ Ù…Ø­Ø¯ÙˆØ¯',
            description_en: 'Semi-automatic operation with limited intervention',
            price: 25000,
          },
          {
            id: 'full_auto',
            label_ar: 'Ø£ÙˆØªÙˆÙ…Ø§ØªÙŠÙƒÙŠ Ø¨Ø§Ù„ÙƒØ§Ù…Ù„',
            label_en: 'Fully Automatic',
            description_ar: 'ØªØ´ØºÙŠÙ„ Ø£ÙˆØªÙˆÙ…Ø§ØªÙŠÙƒÙŠ Ø¨Ø§Ù„ÙƒØ§Ù…Ù„ Ù…Ø¹ Ù†Ø¸Ø§Ù… ØªØ­ÙƒÙ… Ù…ØªÙ‚Ø¯Ù…',
            description_en: 'Fully automatic operation with advanced control system',
            price: 75000,
          },
        ],
      },
      {
        id: 'tooling',
        name_ar: 'Ù†Ø¸Ø§Ù… Ø§Ù„Ø£Ø¯ÙˆØ§Øª',
        name_en: 'Tooling System',
        description_ar: 'Ø§Ø®ØªØ± Ù†Ø¸Ø§Ù… Ø§Ù„Ø£Ø¯ÙˆØ§Øª Ø§Ù„Ù…Ù†Ø§Ø³Ø¨',
        description_en: 'Choose the appropriate tooling system',
        required: true,
        options: [
          {
            id: 'basic',
            label_ar: 'Ø£Ø³Ø§Ø³ÙŠ (10 Ø£Ø¯ÙˆØ§Øª)',
            label_en: 'Basic (10 Tools)',
            description_ar: 'Ù†Ø¸Ø§Ù… Ø£Ø¯ÙˆØ§Øª Ø£Ø³Ø§Ø³ÙŠ ÙŠØªØ³Ø¹ Ù„Ù€ 10 Ø£Ø¯ÙˆØ§Øª',
            description_en: 'Basic tooling system for 10 tools',
            price: 0,
          },
          {
            id: 'standard',
            label_ar: 'Ù‚ÙŠØ§Ø³ÙŠ (20 Ø£Ø¯Ø§Ø©)',
            label_en: 'Standard (20 Tools)',
            description_ar: 'Ù†Ø¸Ø§Ù… Ø£Ø¯ÙˆØ§Øª Ù‚ÙŠØ§Ø³ÙŠ ÙŠØªØ³Ø¹ Ù„Ù€ 20 Ø£Ø¯Ø§Ø©',
            description_en: 'Standard tooling system for 20 tools',
            price: 15000,
          },
          {
            id: 'advanced',
            label_ar: 'Ù…ØªÙ‚Ø¯Ù… (40 Ø£Ø¯Ø§Ø©)',
            label_en: 'Advanced (40 Tools)',
            description_ar: 'Ù†Ø¸Ø§Ù… Ø£Ø¯ÙˆØ§Øª Ù…ØªÙ‚Ø¯Ù… ÙŠØªØ³Ø¹ Ù„Ù€ 40 Ø£Ø¯Ø§Ø©',
            description_en: 'Advanced tooling system for 40 tools',
            price: 35000,
          },
        ],
      },
      {
        id: 'cooling',
        name_ar: 'Ù†Ø¸Ø§Ù… Ø§Ù„ØªØ¨Ø±ÙŠØ¯',
        name_en: 'Cooling System',
        description_ar: 'Ø§Ø®ØªØ± Ù†Ø¸Ø§Ù… Ø§Ù„ØªØ¨Ø±ÙŠØ¯ Ø§Ù„Ù…Ù†Ø§Ø³Ø¨',
        description_en: 'Choose the appropriate cooling system',
        required: false,
        options: [
          {
            id: 'air',
            label_ar: 'ØªØ¨Ø±ÙŠØ¯ Ù‡ÙˆØ§Ø¦ÙŠ',
            label_en: 'Air Cooling',
            description_ar: 'Ù†Ø¸Ø§Ù… ØªØ¨Ø±ÙŠØ¯ Ù‡ÙˆØ§Ø¦ÙŠ Ø§Ù‚ØªØµØ§Ø¯ÙŠ',
            description_en: 'Economical air cooling system',
            price: 0,
          },
          {
            id: 'liquid',
            label_ar: 'ØªØ¨Ø±ÙŠØ¯ Ø³Ø§Ø¦Ù„',
            label_en: 'Liquid Cooling',
            description_ar: 'Ù†Ø¸Ø§Ù… ØªØ¨Ø±ÙŠØ¯ Ø³Ø§Ø¦Ù„ Ø¹Ø§Ù„ÙŠ Ø§Ù„ÙƒÙØ§Ø¡Ø©',
            description_en: 'High-efficiency liquid cooling system',
            price: 8000,
          },
          {
            id: 'mist',
            label_ar: 'ØªØ¨Ø±ÙŠØ¯ Ø¶Ø¨Ø§Ø¨ÙŠ',
            label_en: 'Mist Cooling',
            description_ar: 'Ù†Ø¸Ø§Ù… ØªØ¨Ø±ÙŠØ¯ Ø¶Ø¨Ø§Ø¨ÙŠ Ù…ØªÙ‚Ø¯Ù…',
            description_en: 'Advanced mist cooling system',
            price: 12000,
          },
        ],
      },
      {
        id: 'warranty',
        name_ar: 'ÙØªØ±Ø© Ø§Ù„Ø¶Ù…Ø§Ù†',
        name_en: 'Warranty Period',
        description_ar: 'Ø§Ø®ØªØ± ÙØªØ±Ø© Ø§Ù„Ø¶Ù…Ø§Ù† Ø§Ù„Ù…Ù†Ø§Ø³Ø¨Ø©',
        description_en: 'Choose the appropriate warranty period',
        required: false,
        options: [
          {
            id: 'standard',
            label_ar: 'Ø¶Ù…Ø§Ù† Ù‚ÙŠØ§Ø³ÙŠ (Ø³Ù†Ø© ÙˆØ§Ø­Ø¯Ø©)',
            label_en: 'Standard Warranty (1 Year)',
            description_ar: 'Ø¶Ù…Ø§Ù† Ù‚ÙŠØ§Ø³ÙŠ Ù„Ù…Ø¯Ø© Ø³Ù†Ø© ÙˆØ§Ø­Ø¯Ø©',
            description_en: 'Standard warranty for one year',
            price: 0,
          },
          {
            id: 'extended',
            label_ar: 'Ø¶Ù…Ø§Ù† Ù…Ù…ØªØ¯ (Ø³Ù†ØªØ§Ù†)',
            label_en: 'Extended Warranty (2 Years)',
            description_ar: 'Ø¶Ù…Ø§Ù† Ù…Ù…ØªØ¯ Ù„Ù…Ø¯Ø© Ø³Ù†ØªÙŠÙ†',
            description_en: 'Extended warranty for two years',
            price: 5000,
          },
          {
            id: 'premium',
            label_ar: 'Ø¶Ù…Ø§Ù† Ø´Ø§Ù…Ù„ (3 Ø³Ù†ÙˆØ§Øª)',
            label_en: 'Premium Warranty (3 Years)',
            description_ar: 'Ø¶Ù…Ø§Ù† Ø´Ø§Ù…Ù„ Ù„Ù…Ø¯Ø© 3 Ø³Ù†ÙˆØ§Øª Ù…Ø¹ ØµÙŠØ§Ù†Ø© Ø¯ÙˆØ±ÙŠØ©',
            description_en: 'Premium warranty for 3 years with periodic maintenance',
            price: 12000,
          },
        ],
      }
    );
  }

  return baseCategories;
};

export const ProductConfigurator: React.FC<ProductConfiguratorProps> = ({
  product,
  onConfigurationChange,
  showAddToQuote = true,
}) => {
  const { t, i18n } = useTranslation();
  const { addToQuote } = useQuote();
  const { toast } = useToast();
  
  const [selectedConfigurations, setSelectedConfigurations] = useState<Record<string, ConfigurationOption>>({});
  const [quantity, setQuantity] = useState(1);
  const [configurationCategories] = useState(() => getConfigurationCategories(product.category));

  // Memoize price calculations to prevent unnecessary recalculations
  const basePrice = useMemo(() => product.price || 0, [product.price]);
  const configurationsPrice = useMemo(() => 
    Object.values(selectedConfigurations).reduce((sum, option) => sum + option.price, 0),
    [selectedConfigurations]
  );
  const unitPrice = useMemo(() => 
    calculateTieredPrice(basePrice + configurationsPrice, quantity),
    [basePrice, configurationsPrice, quantity]
  );
  const totalPrice = useMemo(() => unitPrice * quantity, [unitPrice, quantity]);

  // Update parent component when configuration changes
  useEffect(() => {
    onConfigurationChange?.(selectedConfigurations, totalPrice);
  }, [selectedConfigurations, totalPrice, onConfigurationChange]);

  const handleConfigurationChange = useCallback((categoryId: string, optionId: string) => {
    const category = configurationCategories.find(cat => cat.id === categoryId);
    const option = category?.options.find(opt => opt.id === optionId);
    
    if (option) {
      setSelectedConfigurations(prev => ({
        ...prev,
        [categoryId]: option,
      }));
    }
  }, [configurationCategories]);

  const handleQuantityChange = useCallback((newQuantity: number) => {
    if (newQuantity > 0) {
      setQuantity(newQuantity);
    }
  }, []);

  const handleAddToQuote = useCallback(async () => {
    try {
      await addToQuote(product, quantity, selectedConfigurations);
      
      toast({
        title: t('shop.cart.itemAdded'),
        description: `${i18n.language === 'ar' ? product.name_ar : product.name_en} ${t('common.actions.addToQuote')}`,
      });
    } catch (error) {
      console.error('Error adding to quote:', error);
      toast({
        title: t('common.status.error'),
        description: t('shop.cart.itemRemoved'),
        variant: 'destructive',
      });
    }
  }, [addToQuote, product, quantity, selectedConfigurations, toast, t, i18n.language]);

  // Memoize configuration completeness check
  const isConfigurationComplete = useMemo(() => 
    configurationCategories
      .filter(cat => cat.required)
      .every(cat => selectedConfigurations[cat.id]),
    [configurationCategories, selectedConfigurations]
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">
            {t('shop.product.specifications')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Base Product Info */}
          <div className="space-y-2">
            <h3 className="typography-h3 font-medium text-lg">
              {i18n.language === 'ar' ? product.name_ar : product.name_en}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('shop.product.sku')}: {product.sku}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{t('common.forms.price')}:</span>
              <span className="font-semibold">{formatCurrency(basePrice)}</span>
            </div>
          </div>

          <Separator />

          {/* Configuration Options */}
          {configurationCategories.map((category) => (
            <div key={category.id} className="space-y-3">
              <div className="space-y-1">
                <Label className="typography-label text-base font-medium flex items-center gap-2">
                  {i18n.language === 'ar' ? category.name_ar : category.name_en}
                  {category.required && (
                    <Badge variant="secondary" className="text-xs bg-red-100 text-red-800">
                      {t('common.forms.required')}
                    </Badge>
                  )}
                </Label>
                {category.description_ar && category.description_en && (
                  <p className="text-sm text-muted-foreground">
                    {i18n.language === 'ar' ? category.description_ar : category.description_en}
                  </p>
                )}
              </div>

              <Select
                value={selectedConfigurations[category.id]?.id || ''}
                onValueChange={(value) => handleConfigurationChange(category.id, value)}
              >
                <SelectTrigger>
                  <SelectValue 
                    placeholder={`${t('common.actions.select')} ${i18n.language === 'ar' ? category.name_ar : category.name_en}`}
                  />
                </SelectTrigger>
                <SelectContent>
                  {category.options.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{i18n.language === 'ar' ? option.label_ar : option.label_en}</span>
                        {option.price > 0 && (
                          <span className="text-sm text-muted-foreground ml-2">
                            +{formatCurrency(option.price)}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedConfigurations[category.id]?.description_ar && (
                <p className="text-sm text-muted-foreground">
                  {i18n.language === 'ar' 
                    ? selectedConfigurations[category.id].description_ar 
                    : selectedConfigurations[category.id].description_en
                  }
                </p>
              )}
            </div>
          ))}

          <Separator />

          {/* Quantity Selection */}
          <div className="space-y-3">
            <Label className="typography-label text-base font-medium">
              {t('common.forms.quantity')}
            </Label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuantityChange(quantity - 1)}
                disabled={quantity <= 1}
              >
                -
              </Button>
              <span className="font-medium min-w-[3rem] text-center">{quantity}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuantityChange(quantity + 1)}
              >
                +
              </Button>
            </div>
          </div>

          <Separator />

          {/* Price Summary */}
          <div className="space-y-3">
            <h4 className="typography-h4 font-medium">{t('shop.quote.title')}</h4>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>{t('common.forms.price')} ({t('common.forms.quantity')}: {quantity})</span>
                <span>{formatCurrency(basePrice * quantity)}</span>
              </div>
              
              {Object.entries(selectedConfigurations).map(([categoryId, option]) => (
                <div key={categoryId} className="flex justify-between text-muted-foreground">
                  <span>
                    {i18n.language === 'ar' ? option.label_ar : option.label_en}
                  </span>
                  <span>+{formatCurrency(option.price * quantity)}</span>
                </div>
              ))}
              
              {quantity > 1 && (
                <div className="flex justify-between text-green-600">
                  <span>{t('shop.filters.priceRange')} ({t('shop.filters.bestRated')})</span>
                  <span>-{formatCurrency((basePrice + configurationsPrice) * quantity - totalPrice)}</span>
                </div>
              )}
            </div>

            <Separator />
            
            <div className="flex justify-between font-semibold text-lg">
              <span>{t('common.forms.total')}</span>
              <span className="text-primary">{formatCurrency(totalPrice)}</span>
            </div>
          </div>

          {/* Add to Quote Button */}
          {showAddToQuote && (
            <Button
              onClick={() => void handleAddToQuote()}
              disabled={!isConfigurationComplete}
              className="w-full"
              size="lg"
            >
              {t('common.actions.addToQuote')}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductConfigurator;
