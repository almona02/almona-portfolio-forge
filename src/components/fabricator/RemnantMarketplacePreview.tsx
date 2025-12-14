/**
 * Remnant Marketplace Preview Component
 * Quick preview and access to remnant marketplace
 */

import type { MarketplaceListing } from '@/lib/inventory/RemnantMarketplace';
import { RemnantMarketplace } from '@/lib/inventory/RemnantMarketplace';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@/shared/ui/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/ui/dialog';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { ArrowRight, Plus, ShoppingCart } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface RemnantMarketplacePreviewProps {
  workshopId: string;
  onListingCreated?: () => void;
  remnantId?: string; // If provided, shows one-click listing button
  remnantLength?: number;
  remnantProfileId?: string;
}

export const RemnantMarketplacePreview: React.FC<RemnantMarketplacePreviewProps> = ({
  workshopId,
  onListingCreated,
  remnantId,
  remnantLength,
  remnantProfileId: _remnantProfileId,
}) => {
  const [recentListings, setRecentListings] = useState<MarketplaceListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showListingDialog, setShowListingDialog] = useState(false);
  const [listingPrice, setListingPrice] = useState('');
  const [listingDescription, setListingDescription] = useState('');
  const [isCreatingListing, setIsCreatingListing] = useState(false);
  const marketplace = new RemnantMarketplace();

  useEffect(() => {
    loadRecentListings();
  }, [workshopId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadRecentListings = async () => {
    try {
      setIsLoading(true);
      const listings = await marketplace.searchListings({
        // Show recent available listings
      });
      setRecentListings(listings.slice(0, 3)); // Show top 3
    } catch (error) {
      console.error('Error loading marketplace listings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOneClickListing = async () => {
    if (!remnantId || !listingPrice) return;

    setIsCreatingListing(true);
    try {
      const price = parseFloat(listingPrice);
      await marketplace.createListing(remnantId, workshopId, price, {
        description: listingDescription,
        expiresInDays: 30,
      });
      setShowListingDialog(false);
      setListingPrice('');
      setListingDescription('');
      onListingCreated?.();
      await loadRecentListings();
    } catch (error) {
      console.error('Failed to create listing:', error);
    } finally {
      setIsCreatingListing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <CardTitle className="text-lg">Remnant Marketplace</CardTitle>
          <CardDescription className="text-sm">Buy and sell excess materials</CardDescription>
        </div>
        {remnantId ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowListingDialog(true)}
            className="bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20"
          >
            <Plus className="h-4 w-4 mr-1" />
            List on Marketplace
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              // Navigate to full marketplace
              window.location.href = '/fabricator/marketplace';
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            List Remnant
          </Button>
        )}
      </div>

      {/* One-Click Listing Dialog */}
      <Dialog open={showListingDialog} onOpenChange={setShowListingDialog}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>List Remnant on Marketplace</DialogTitle>
            <DialogDescription>
              {remnantLength && `Remnant: ${(remnantLength / 1000).toFixed(2)}m`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Price ({'EGP'})</Label>
              <Input
                type="number"
                value={listingPrice}
                onChange={(e) => setListingPrice(e.target.value)}
                placeholder="Enter price"
                className="bg-gray-800 border-gray-700"
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input
                value={listingDescription}
                onChange={(e) => setListingDescription(e.target.value)}
                placeholder="Add description"
                className="bg-gray-800 border-gray-700"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowListingDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleOneClickListing}
              disabled={!listingPrice || isCreatingListing}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {isCreatingListing ? 'Creating...' : 'Create Listing'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="text-sm text-gray-400">Loading listings...</div>
      ) : recentListings.length === 0 ? (
        <div className="text-sm text-gray-400 text-center py-4">
          No listings available. Be the first to list a remnant!
        </div>
      ) : (
        <div className="space-y-2">
          {recentListings.map((listing) => (
            <Card key={listing.id} className="bg-gray-900/50 border-gray-800">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold">{listing.profileName || 'Profile'}</span>
                      <Badge variant="outline" className="text-xs">
                        {listing.quality}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-400">
                      {listing.length.toFixed(0)}mm · {listing.price.toFixed(2)} {listing.currency}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      // Navigate to listing details
                      window.location.href = `/fabricator/marketplace/${listing.id}`;
                    }}
                  >
                    <ShoppingCart className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => {
              window.location.href = '/fabricator/marketplace';
            }}
          >
            View All Listings
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
};

