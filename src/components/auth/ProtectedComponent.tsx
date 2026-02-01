import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { AlertCircle, Lock } from 'lucide-react';

interface ProtectedComponentProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireRole?: string[];
  message?: string;
}

export const ProtectedComponent: React.FC<ProtectedComponentProps> = ({
  children,
  fallback,
  requireRole,
  message = 'يجب تسجيل الدخول للوصول إلى هذه الميزة'
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!user) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-amber-600" />
          </div>
          <CardTitle className="text-lg">مطلوب تسجيل الدخول</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">{message}</p>
          <Button 
            onClick={() => window.location.href = '/login'}
            className="btn-primary"
          >
            تسجيل الدخول
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (requireRole && !requireRole.includes(user.role)) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-lg">غير مصرح بالوصول</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            ليس لديك الصلاحية للوصول إلى هذه الميزة
          </p>
          <p className="text-sm text-gray-500">
            المطلوب: {requireRole.join(' أو ')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
};
