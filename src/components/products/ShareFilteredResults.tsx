import React, { useState } from 'react';
import { Share2, Copy, Check, MessageCircle } from 'lucide-react';
import { Button } from '@/shared/ui/ui/button';
import { useToast } from '@/hooks/useToast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/ui/dropdown-menu';

interface ShareFilteredResultsProps {
  searchQuery: string;
  resultCount: number;
  className?: string;
}

export const ShareFilteredResults: React.FC<ShareFilteredResultsProps> = ({
  searchQuery,
  resultCount,
  className = ''
}) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  // Generate shareable URL with search query
  const generateShareUrl = (): string => {
    const baseUrl = window.location.origin;
    const path = '/products';
    const params = new URLSearchParams();
    
    if (searchQuery.trim()) {
      params.set('search', searchQuery.trim());
    }
    
    const queryString = params.toString();
    return `${baseUrl}${path}${queryString ? `?${queryString}` : ''}`;
  };

  // Copy link to clipboard
  const handleCopyLink = async () => {
    try {
      const url = generateShareUrl();
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({
        title: 'Link copied!',
        description: 'Shareable link copied to clipboard',
        duration: 2000,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (_error) {
      toast({
        title: 'Failed to copy',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  };

  // Share via WhatsApp
  const handleShareWhatsApp = () => {
    const url = generateShareUrl();
    const message = `Check out these ${resultCount} recommended machines:\n\n${url}`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
    
    toast({
      title: 'Opening WhatsApp...',
      description: 'Share the link with your customer',
      duration: 2000,
    });
  };

  // Share via native share API (mobile)
  const handleNativeShare = async () => {
    const url = generateShareUrl();
    const shareData = {
      title: `${resultCount} Recommended Machines`,
      text: `Check out these ${resultCount} recommended machines: ${searchQuery}`,
      url: url,
    };

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        toast({
          title: 'Shared successfully!',
          duration: 2000,
        });
      } else {
        // Fallback to copy
        handleCopyLink();
      }
    } catch (error: any) {
      // User cancelled or error occurred
      if (error.name !== 'AbortError') {
        handleCopyLink();
      }
    }
  };

  // Don't show if no search query or results
  if (!searchQuery.trim() || resultCount === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`gap-2 border-orange-500/30 hover:border-orange-500/60 hover:bg-orange-500/10 ${className}`}
        >
          <Share2 className="h-4 w-4" />
          <span className="hidden sm:inline">Share Results</span>
          <span className="sm:hidden">Share</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-gray-900 border-gray-700">
        <DropdownMenuItem
          onClick={handleCopyLink}
          className="cursor-pointer hover:bg-gray-800"
        >
          {copied ? (
            <>
              <Check className="mr-2 h-4 w-4 text-green-500" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="mr-2 h-4 w-4" />
              <span>Copy Link</span>
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleShareWhatsApp}
          className="cursor-pointer hover:bg-gray-800"
        >
          <MessageCircle className="mr-2 h-4 w-4 text-green-500" />
          <span>Share via WhatsApp</span>
        </DropdownMenuItem>
        {navigator.share && (
          <DropdownMenuItem
            onClick={handleNativeShare}
            className="cursor-pointer hover:bg-gray-800"
          >
            <Share2 className="mr-2 h-4 w-4" />
            <span>Share via...</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

