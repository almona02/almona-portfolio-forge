import React, { useState, useEffect } from 'react';
import { Button } from './button';

interface ArButtonProps {
  productId: string;
  onClick?: () => void;
}

export const ArButton = ({ productId, onClick }: ArButtonProps) => {
  const [isArSupported, setIsArSupported] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check for WebXR AR support
    const checkArSupport = async () => {
      if ('xr' in navigator) {
        try {
          const supported = await (navigator as any).xr.isSessionSupported('immersive-ar');
          setIsArSupported(supported);
        } catch {
          setIsArSupported(false);
        }
      } else {
        setIsArSupported(false);
      }
    };

    // Check if device is mobile (iOS or Android)
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const mobile = /android|iphone|ipad|ipod/i.test(userAgent);
    setIsMobile(mobile);

    checkArSupport();
  }, []);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      alert('AR feature coming soon.');
    }
  };

  if (!isMobile) {
    return (
      <Button disabled className="opacity-50 cursor-not-allowed">
        AR Not Supported on Desktop
      </Button>
    );
  }

  if (!isArSupported) {
    return (
      <Button disabled className="opacity-50 cursor-not-allowed">
        AR Not Supported on Device
      </Button>
    );
  }

  return (
    <Button onClick={handleClick} className="bg-orange-600 hover:bg-orange-700">
      View in Your Space
    </Button>
  );
};
