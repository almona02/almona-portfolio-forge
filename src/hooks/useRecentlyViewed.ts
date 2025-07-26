
import { useState, useEffect } from 'react';

const RECENTLY_VIEWED_KEY = 'recentlyViewedProducts';
const MAX_RECENTLY_VIEWED = 5;

export const useRecentlyViewed = () => {
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(RECENTLY_VIEWED_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to parse recently viewed from localStorage', error);
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(recentlyViewed));
    } catch (error) {
      console.error('Failed to save recently viewed to localStorage', error);
    }
  }, [recentlyViewed]);

  const addRecentlyViewed = (productId: string) => {
    setRecentlyViewed(prev => {
      const newItems = [productId, ...prev.filter(id => id !== productId)];
      return newItems.slice(0, MAX_RECENTLY_VIEWED);
    });
  };

  return { recentlyViewed, addRecentlyViewed };
};
