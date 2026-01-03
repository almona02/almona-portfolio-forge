import { ProtectedComponent } from '@/components/auth/ProtectedComponent';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/useToast';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Input } from '@/shared/ui/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { motion } from 'framer-motion';
import {
    Copy,
    FileText,
    Search,
    ShoppingCart,
    Wrench
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface Quote {
  id: string;
  quote_number: string;
  digital_twin_code?: string;
  status: string;
  total_amount: number;
  created_at: string;
  items_count: number;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  items_count: number;
}

interface ServiceTicket {
  id: string;
  ticket_number: string;
  digital_twin_code?: string;
  status: string;
  priority: string;
  created_at: string;
  title: string;
}

const Portal = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('quotes');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tickets, setTickets] = useState<ServiceTicket[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock data - in real implementation, fetch from API
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setQuotes([
        {
          id: '1',
          quote_number: 'QT-2024001',
          digital_twin_code: 'QT-20241201-ABC12345',
          status: 'pending',
          total_amount: 150000,
          created_at: '2024-12-01T10:00:00Z',
          items_count: 3
        },
        {
          id: '2',
          quote_number: 'QT-2024002',
          digital_twin_code: 'QT-20241201-DEF67890',
          status: 'sent',
          total_amount: 75000,
          created_at: '2024-11-28T14:30:00Z',
          items_count: 2
        }
      ]);

      setOrders([
        {
          id: '1',
          order_number: 'ORD-2024001',
          status: 'processing',
          total_amount: 150000,
          created_at: '2024-12-01T10:00:00Z',
          items_count: 3
        }
      ]);

      setTickets([
        {
          id: '1',
          ticket_number: 'TKT-2024001',
          digital_twin_code: 'ST-20241201-GHI12345',
          status: 'open',
          priority: 'high',
          created_at: '2024-12-01T10:00:00Z',
          title: 'طلب صيانة دورية'
        },
        {
          id: '2',
          ticket_number: 'TKT-2024002',
          digital_twin_code: 'ST-20241201-JKL67890',
          status: 'in_progress',
          priority: 'medium',
          created_at: '2024-11-30T16:45:00Z',
          title: 'طلب قطع غيار'
        }
      ]);

      setLoading(false);
    };

    fetchData();
  }, []);

  const getStatusBadge = (status: string, type: 'quote' | 'order' | 'ticket') => {
    const statusMap: Record<string, Record<string, { label: string; color: string }>> = {
      quote: {
        pending: { label: 'قيد المراجعة', color: 'yellow' },
        sent: { label: 'تم الإرسال', color: 'blue' },
        accepted: { label: 'مقبول', color: 'green' },
        rejected: { label: 'مرفوض', color: 'red' },
        expired: { label: 'منتهي الصلاحية', color: 'gray' }
      },
      order: {
        pending: { label: 'قيد المراجعة', color: 'yellow' },
        confirmed: { label: 'مؤكد', color: 'blue' },
        processing: { label: 'قيد المعالجة', color: 'orange' },
        shipped: { label: 'تم الشحن', color: 'blue' },
        delivered: { label: 'تم التسليم', color: 'green' },
        cancelled: { label: 'ملغي', color: 'red' }
      },
      ticket: {
        open: { label: 'مفتوح', color: 'yellow' },
        in_progress: { label: 'قيد العمل', color: 'blue' },
        resolved: { label: 'تم الحل', color: 'green' },
        closed: { label: 'مغلق', color: 'gray' }
      }
    };

    const statusInfo = statusMap[type]?.[status] || 
                      { label: status, color: 'gray' };

    return (
      <Badge 
        variant="secondary" 
        className={`${
          statusInfo.color === 'green' ? 'bg-green-100 text-green-800' :
          statusInfo.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
          statusInfo.color === 'blue' ? 'bg-blue-100 text-blue-800' :
          statusInfo.color === 'orange' ? 'bg-orange-100 text-orange-800' :
          statusInfo.color === 'red' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}
      >
        {statusInfo.label}
      </Badge>
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: 'تم النسخ',
        description: 'تم نسخ النص إلى الحافظة',
      });
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP'
    }).format(amount);
  };

  if (loading) {
    return (
      <main className="flex-grow pt-20">
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <ProtectedComponent 
      message="يجب تسجيل الدخول للوصول إلى البوابة"
    >
      <main className="flex-grow pt-20">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold mb-4">
            <span className="text-gradient-orange">بوابة العميل</span>
          </h1>
          <p className="text-xl text-gray-600">
            مرحباً {user?.full_name}، يمكنك هنا تتبع جميع طلباتك وخدماتك
          </p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="ابحث برقم الطلب أو كود التتبع..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="quotes" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                عروض الأسعار ({quotes.length})
              </TabsTrigger>
              <TabsTrigger value="orders" className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                الطلبات ({orders.length})
              </TabsTrigger>
              <TabsTrigger value="tickets" className="flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                تذاكر الخدمة ({tickets.length})
              </TabsTrigger>
            </TabsList>

            {/* Quotes Tab */}
            <TabsContent value="quotes" className="space-y-4">
              {quotes.map((quote, index) => (
                <motion.div
                  key={quote.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          {quote.quote_number}
                        </CardTitle>
                        {getStatusBadge(quote.status, 'quote')}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">المبلغ الإجمالي</p>
                          <p className="text-lg font-semibold">{formatCurrency(quote.total_amount)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">عدد العناصر</p>
                          <p className="text-lg font-semibold">{quote.items_count}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">تاريخ الإنشاء</p>
                          <p className="text-lg font-semibold">{formatDate(quote.created_at)}</p>
                        </div>
                      </div>
                      {quote.digital_twin_code && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-600">كود التتبع الرقمي</p>
                              <p className="font-mono text-sm">{quote.digital_twin_code}</p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(quote.digital_twin_code!)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </TabsContent>

            {/* Orders Tab */}
            <TabsContent value="orders" className="space-y-4">
              {orders.map((order, index) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <ShoppingCart className="h-5 w-5" />
                          {order.order_number}
                        </CardTitle>
                        {getStatusBadge(order.status, 'order')}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">المبلغ الإجمالي</p>
                          <p className="text-lg font-semibold">{formatCurrency(order.total_amount)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">عدد العناصر</p>
                          <p className="text-lg font-semibold">{order.items_count}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">تاريخ الطلب</p>
                          <p className="text-lg font-semibold">{formatDate(order.created_at)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </TabsContent>

            {/* Tickets Tab */}
            <TabsContent value="tickets" className="space-y-4">
              {tickets.map((ticket, index) => (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Wrench className="h-5 w-5" />
                          {ticket.ticket_number}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(ticket.status, 'ticket')}
                          <Badge 
                            variant="outline"
                            className={
                              ticket.priority === 'high' ? 'border-red-500 text-red-500' :
                              ticket.priority === 'medium' ? 'border-yellow-500 text-yellow-500' :
                              'border-green-500 text-green-500'
                            }
                          >
                            {ticket.priority === 'high' ? 'عاجل' :
                             ticket.priority === 'medium' ? 'متوسط' : 'منخفض'}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-gray-600">عنوان الطلب</p>
                          <p className="text-lg font-semibold">{ticket.title}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">تاريخ الإنشاء</p>
                            <p className="text-lg font-semibold">{formatDate(ticket.created_at)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">الأولوية</p>
                            <p className="text-lg font-semibold">
                              {ticket.priority === 'high' ? 'عاجل' :
                               ticket.priority === 'medium' ? 'متوسط' : 'منخفض'}
                            </p>
                          </div>
                        </div>
                        {ticket.digital_twin_code && (
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-gray-600">كود التتبع الرقمي</p>
                                <p className="font-mono text-sm">{ticket.digital_twin_code}</p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyToClipboard(ticket.digital_twin_code!)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
      </main>
    </ProtectedComponent>
  );
};

export default Portal;
