
import { QuoteContext } from './QuoteContext';
import { Machine } from '@/types';

interface QuoteItem {
  product: Machine;
  quantity: number;
}

interface QuoteContextType {
  quoteItems: QuoteItem[];
  addToQuote: (product: Machine) => void;
  removeFromQuote: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearQuote: () => void;
}

const QuoteContext = createContext<QuoteContextType | undefined>(undefined);

export const useQuote = () => {
  const context = useContext(QuoteContext);
  if (!context) {
    throw new Error('useQuote must be used within a QuoteProvider');
  }
  return context;
};

interface QuoteProviderProps {
  children: ReactNode;
}

export const QuoteProvider: React.FC<QuoteProviderProps> = ({ children }) => {
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);

  const addToQuote = (product: Machine) => {
    setQuoteItems(prevItems => {
      const existingItem = prevItems.find(item => item.product.id === product.id);
      if (existingItem) {
        return prevItems.map(item =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevItems, { product, quantity: 1 }];
    });
  };

  const removeFromQuote = (productId: string) => {
    setQuoteItems(prevItems => prevItems.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromQuote(productId);
    } else {
      setQuoteItems(prevItems =>
        prevItems.map(item =>
          item.product.id === productId ? { ...item, quantity } : item
        )
      );
    }
  };

  const clearQuote = () => {
    setQuoteItems([]);
  };

  return (
    <QuoteContext.Provider value={{ quoteItems, addToQuote, removeFromQuote, updateQuantity, clearQuote }}>
      {children}
    </QuoteContext.Provider>
  );
};
