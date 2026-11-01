import React from 'react';
import { usePublicCopy } from '@/hooks/usePublicCopy';

/**
 * Minimal, brand-neutral footer for the public used-machines marketplace.
 * Contains only the liability notice — the platform stays out of transactions.
 */
const MarketplaceFooter: React.FC = () => {
  const copy = usePublicCopy();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-almona-light/10 bg-almona-dark py-6">
      <div className="container mx-auto px-4 text-center space-y-2">
        <p className="text-xs text-gray-500 max-w-2xl mx-auto leading-relaxed">
          {copy(
            'This marketplace connects buyers and sellers directly. The platform does not participate in transactions, does not guarantee listings, and takes no responsibility for sales or disputes.'
          )}
        </p>
        <p className="text-xs text-gray-600">{copy('All brands welcome — free to post and browse.')}</p>
        <p className="text-xs text-gray-600" dir="ltr">
          © {year} {copy('Machines Market')}
        </p>
      </div>
    </footer>
  );
};

export default MarketplaceFooter;
