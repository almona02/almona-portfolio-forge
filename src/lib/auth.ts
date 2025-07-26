import { useState } from 'react';
import { User } from '@/types';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);

  const login = (email: string, password: string) => {
    // This is a mock login. In a real application, you would make an API call
    // to authenticate the user and store a token in localStorage or sessionStorage.
    console.log('Logging in with:', email, password);
    const mockUser: User = {
      id: 'user-123',
      name: 'Mohamed Hassan',
      email: email,
      role: 'customer',
      company: 'Almona Industries',
      phone: '123-456-7890',
      machines: ['machine-001', 'machine-002'],
    };
    setUser(mockUser);
  };

  const logout = () => {
    // In a real app, you would clear the auth token from storage.
    setUser(null);
  };

  return { user, login, logout };
};
