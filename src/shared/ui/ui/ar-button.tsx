import React, { useState, useEffect } from 'react';
import { Button } from './button';
import '../../components/3d-model/SwiftXR.css';

interface ArButtonProps {
  productId: string;
  onClick?: () => void;
}

export const ArButton = ({ productId: _productId, onClick }: ArButtonProps) => {
  const [isArSupported, setIsArSupported] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkArSupport = async () => {
      const nav = navigator as Navigator & { xr?: { isSessionSupported?: (mode: string) => Promise<boolean> } };
      if (nav.xr?.isSessionSupported) {
        try {
          const supported = await nav.xr.isSessionSupported('immersive-ar');
          setIsArSupported(supported);
        } catch {
          setIsArSupported(false);
        }
      } else {
        setIsArSupported(false);
      }
    };

    const win = window as Window & { opera?: string };
    const userAgent = navigator.userAgent || navigator.vendor || win.opera || '';
    setIsMobile(/android|iphone|ipad|ipod/i.test(userAgent));

    void checkArSupport();
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
        SwiftXR Not Supported on Desktop
      </Button>
    );
  }

  if (!isArSupported) {
    return (
      <Button disabled className="opacity-50 cursor-not-allowed">
        SwiftXR Not Supported on Device
      </Button>
    );
  }

  return (
    <Button onClick={handleClick} className="swiftxr-launch-button">
      <span className="swiftxr-text-gradient">SwiftXR</span> - View in Your Space
    </Button>
  );
};
