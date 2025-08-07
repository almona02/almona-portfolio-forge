import React from "react";
import { Button } from "@/components/ui/button";
import { Facebook } from "lucide-react";
import { toast } from "sonner";

interface FacebookLoginButtonProps {
  onSuccess: () => void;
}

export const FacebookLoginButton: React.FC<FacebookLoginButtonProps> = ({
  onSuccess,
}) => {
  const handleFacebookLogin = async () => {
    try {
      // Initialize Facebook SDK
      if (!(window as any).FB) {
        toast.error("Facebook SDK not loaded");
        return;
      }

      (window as any).FB.login(
        async (response: any) => {
          if (response.authResponse) {
            // Redirect to backend for OAuth flow
            const res = await fetch("/api/auth/facebook/login");
            const data = await res.json();
            if (data.url) {
              window.location.href = data.url;
            } else {
              toast.error("Failed to initiate Facebook login.");
            }
          } else {
            toast.error("Facebook login cancelled or failed.");
          }
        },
        { scope: "email,public_profile" }
      );
    } catch (error) {
      toast.error("Facebook login failed");
    }
  };

  return (
    <Button
      onClick={handleFacebookLogin}
      className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center"
    >
      <Facebook className="w-5 h-5 mr-2" />
      Facebook
    </Button>
  );
};
