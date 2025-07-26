
import React from 'react';
import { useQuote } from '@/context/QuoteContext';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatePresence, motion } from 'framer-motion';

const QuotePage = () => {
  const { quoteItems, removeFromQuote, updateQuantity, clearQuote } = useQuote();

  const total = quoteItems.reduce((acc, item) => acc + (item.product.pricing?.basePrice || 0) * item.quantity, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle quote submission logic here
    console.log('Quote submitted');
    clearQuote();
  };

  return (
    <div className="flex flex-col min-h-screen bg-almona-dark text-white">
      <Navbar />
      <main className="flex-grow pt-24">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-gradient-orange">Your Quote Request</h1>

          {quoteItems.length === 0 ? (
            <p className="text-xl text-gray-400">Your quote basket is empty.</p>
          ) : (
            <div className="grid md:grid-cols-3 gap-8">
              <div className="md:col-span-2">
                <Card className="bg-almona-darker border-almona-light">
                  <CardHeader>
                    <CardTitle>Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AnimatePresence>
                      {quoteItems.map(item => (
                        <motion.div
                          key={item.product.id}
                          layout
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="flex items-center justify-between py-4 border-b border-almona-light"
                        >
                          <div className="flex items-center gap-4">
                            <img src={item.product.imageUrl} alt={item.product.name} className="w-20 h-20 object-cover rounded-md" />
                            <div>
                              <h3 className="font-semibold">{item.product.name}</h3>
                              <p className="text-sm text-gray-400">{item.product.pricing?.basePrice ? `${item.product.pricing.basePrice.toLocaleString()} EGP` : 'Price on request'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateQuantity(item.product.id, parseInt(e.target.value))}
                              className="w-20 bg-almona-dark border-almona-light"
                            />
                            <Button variant="ghost" size="icon" onClick={() => removeFromQuote(item.product.id)}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </div>
              <div>
                <Card className="bg-almona-darker border-almona-light">
                  <CardHeader>
                    <CardTitle>Request Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="name">Full Name</Label>
                        <Input id="name" type="text" required className="bg-almona-dark border-almona-light" />
                      </div>
                      <div>
                        <Label htmlFor="email">Email Address</Label>
                        <Input id="email" type="email" required className="bg-almona-dark border-almona-light" />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input id="phone" type="tel" required className="bg-almona-dark border-almona-light" />
                      </div>
                      <div>
                        <Label htmlFor="company">Company (Optional)</Label>
                        <Input id="company" type="text" className="bg-almona-dark border-almona-light" />
                      </div>
                      <div className="text-2xl font-bold text-right border-t border-almona-light pt-4">
                        Total: {total.toLocaleString()} EGP
                      </div>
                      <Button type="submit" className="w-full bg-gradient-orange">Submit Quote Request</Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default QuotePage;
