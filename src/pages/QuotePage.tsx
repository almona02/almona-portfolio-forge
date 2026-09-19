
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuote } from '@/context/QuoteContext';
import { EmailDraftDownload } from '@/components/contact/EmailDraftDownload';
// import Navbar from '@/components/layout/Navbar';
// import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { withErrorBoundary } from "@/hocs/withErrorBoundary";
import { AnimatePresence, motion } from 'framer-motion';

const QuotePage = () => {
  const { quoteItems, removeFromQuote, updateQuantity, subtotal } = useQuote();
  const [emailDraft, setEmailDraft] = useState<string | null>(null);
  useEffect(() => setEmailDraft(null), [quoteItems]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const items = quoteItems.map(item => `${item.quantity} x ${item.product_name_en} (${item.product_sku || item.product_id})`).join('\n');
    const body = `Name: ${form.get('name')}\nEmail: ${form.get('email')}\nPhone: ${form.get('phone')}\nCompany: ${form.get('company') || '-'}\n\nRequested items:\n${items}\n\nPlease confirm pricing, availability, taxes and delivery.`;
    setEmailDraft(`mailto:almona02@yahoo.com?subject=${encodeURIComponent('ALMONA machine quote request')}&body=${encodeURIComponent(body)}`);
  };

  return (
    <main className="flex-grow pt-20">
        <div className="container mx-auto px-4 py-12">
          <h1 className="typography-h1 md:text-5xl mb-6 text-gradient-orange">Your Quote Request</h1>

          {quoteItems.length === 0 ? (
            <div className="space-y-4">
              <p className="text-xl text-gray-400">Your quote basket is empty.</p>
              <Button asChild><Link to="/shop">Browse machines</Link></Button>
            </div>
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
                          key={item.id}
                          layout
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="flex flex-wrap gap-4 items-center justify-between py-4 border-b border-almona-light"
                        >
                          <div className="flex items-center gap-4">
                            <img src={item.catalogue_image || item.product?.image_urls?.[0] || '/placeholder.svg'} alt={item.product_name_en} className="w-20 h-20 object-cover rounded-md" />
                            <div>
                              <h3 className="typography-h3">{item.product_name_en}</h3>
                              <p className="text-sm text-gray-400">{item.unit_price ? `${item.unit_price.toLocaleString()} EGP` : 'Price on request'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <Input
                              type="number"
                              min="1"
                              step="1"
                              aria-label={`Quantity for ${item.product_name_en}`}
                              value={item.quantity}
                              onChange={(e) => {
                                const quantity = Number(e.target.value);
                                if (Number.isSafeInteger(quantity) && quantity > 0) updateQuantity(item.id, quantity);
                              }}
                              className="w-20 bg-almona-dark border-almona-light"
                            />
                            <Button variant="ghost" size="icon" aria-label={`Remove ${item.product_name_en}`} onClick={() => removeFromQuote(item.id)}>
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
                    <p className="text-sm text-gray-300 mb-4">Prepare a quote enquiry, then review and send it from your email app. Your basket stays available.</p>
                    <form onSubmit={handleSubmit} onChange={() => setEmailDraft(null)} className="space-y-4">
                      <div>
                        <Label htmlFor="name" className="typography-label">Full Name</Label>
                        <Input id="name" name="name" type="text" required className="bg-almona-dark border-almona-light" />
                      </div>
                      <div>
                        <Label htmlFor="email" className="typography-label">Email Address</Label>
                        <Input id="email" name="email" type="email" required className="bg-almona-dark border-almona-light" />
                      </div>
                      <div>
                        <Label htmlFor="phone" className="typography-label">Phone Number</Label>
                        <Input id="phone" name="phone" type="tel" required className="bg-almona-dark border-almona-light" />
                      </div>
                      <div>
                        <Label htmlFor="company" className="typography-label">Company (Optional)</Label>
                        <Input id="company" name="company" type="text" className="bg-almona-dark border-almona-light" />
                      </div>
                      <div className="text-2xl font-bold text-right border-t border-almona-light pt-4">
                        {subtotal > 0 ? `Priced items subtotal: ${subtotal.toLocaleString()} EGP` : 'Pricing confirmed by ALMONA'}
                      </div>
                      <p className="text-sm text-gray-400">Excludes unpriced items, taxes and delivery. ALMONA will confirm the final quotation.</p>
                      <Button type="submit" className="w-full bg-gradient-orange">Prepare Quote Email</Button>
                    </form>
                    {emailDraft && <div role="status" className="mt-4 space-y-2 text-sm text-gray-200">
                      <p>Your draft is ready. Your request has not been sent.</p>
                      <a href={emailDraft} className="text-amber-400 underline">Open quote email draft</a>
                      <EmailDraftDownload mailto={emailDraft} />
                      <p>No email app? Contact almona02@yahoo.com or call +20 100 309 7177.</p>
                    </div>}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>
  );
};

export default withErrorBoundary(QuotePage);
