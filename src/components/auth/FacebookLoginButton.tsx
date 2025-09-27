import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Facebook } from "lucide-react";
import { toast } from "sonner";

interface FacebookLoginButtonProps {
  onSuccess: () => void;
}

export const FacebookLoginButton: React.FC<FacebookLoginButtonProps> = ({
  onSuccess,
}) => {
  const [sdkLoaded, setSdkLoaded] = useState(false);

  useEffect(() => {
    // Load Facebook SDK
    const loadFacebookSDK = () => {
      if ((window as Window & { FB?: any }).FB) {
        setSdkLoaded(true);
        return;
      }

      // Create script element
      const script = document.createElement('script');
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      
      script.onload = () => {
        (window as unknown as Window & { FB: any }).FB.init({
          appId: import.meta.env.VITE_FACEBOOK_APP_ID || '1234567890', // Replace with your Facebook App ID
          cookie: true,
          xfbml: true,
          version: 'v18.0'
        });
        setSdkLoaded(true);
      };

      script.onerror = () => {
        console.error('Failed to load Facebook SDK');
        toast.error('Failed to load Facebook SDK');
      };

      document.head.appendChild(script);
    };

    loadFacebookSDK();
  }, []);

  const handleFacebookLogin = async () => {
    try {
      // Check if Facebook SDK is loaded
      if (!(window as Window & { FB?: any }).FB || !sdkLoaded) {
        toast.error("Facebook SDK not loaded. Please try again later.");
        return;
      }

      (window as unknown as Window & { FB: any }).FB.login(
        async (response: { authResponse?: { accessToken: string } }) => {
          if (response.authResponse) {
            try {
              // Get user info from Facebook
              (window as unknown as Window & { FB: any }).FB.api('/me', { fields: 'name,email' }, async (userInfo: { name: string; email: string }) => {
                try {
                  // Send to backend for processing
                  const res = await fetch("/api/auth/facebook/callback", {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      accessToken: response.authResponse.accessToken,
                      userInfo: userInfo
                    })
                  });
                  
                  const data = await res.json();
                  if (data.success) {
                    toast.success("Successfully logged in with Facebook!");
                    onSuccess();
                  } else {
                    toast.error(data.message || "Failed to complete Facebook login.");
                  }
                } catch (error) {
                  console.error("Backend Facebook login error:", error);
                  toast.error("Failed to complete Facebook login.");
                }
              });
            } catch (error) {
              console.error("Facebook API error:", error);
              toast.error("Failed to get user information from Facebook.");
            }
          } else {
            toast.error("Facebook login cancelled or failed.");
          }
        },
        { scope: "email,public_profile" }
      );
    } catch (error) {
      console.error("Facebook login error:", error);
      toast.error("Facebook login failed");
    }
  };

  return (
    <Button
      onClick={handleFacebookLogin}
      disabled={!sdkLoaded}
      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white flex items-center justify-center"
    >
      <Facebook className="w-5 h-5 mr-2" />
      {sdkLoaded ? 'Facebook' : 'Loading Facebook...'}
    </Button>
  );
};
