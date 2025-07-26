import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const neonButtonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden group",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.5)] hover:shadow-[0_0_30px_rgba(6,182,212,0.8)] border border-cyan-400/50 hover:border-cyan-300 before:absolute before:inset-0 before:bg-gradient-to-r before:from-cyan-400/20 before:to-blue-400/20 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300",
        orange:
          "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.5)] hover:shadow-[0_0_30px_rgba(249,115,22,0.8)] border border-orange-400/50 hover:border-orange-300 before:absolute before:inset-0 before:bg-gradient-to-r before:from-orange-400/20 before:to-red-400/20 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300",
        egyptian:
          "bg-gradient-to-r from-yellow-500 to-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.5)] hover:shadow-[0_0_30px_rgba(245,158,11,0.8)] border border-yellow-400/50 hover:border-yellow-300 before:absolute before:inset-0 before:bg-gradient-to-r before:from-yellow-400/20 before:to-amber-400/20 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300",
        ar:
          "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.5)] hover:shadow-[0_0_30px_rgba(168,85,247,0.8)] border border-purple-400/50 hover:border-purple-300 before:absolute before:inset-0 before:bg-gradient-to-r before:from-purple-400/20 before:to-pink-400/20 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300",
        success:
          "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.5)] hover:shadow-[0_0_30px_rgba(34,197,94,0.8)] border border-green-400/50 hover:border-green-300 before:absolute before:inset-0 before:bg-gradient-to-r before:from-green-400/20 before:to-emerald-400/20 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300",
        outline:
          "border-2 border-cyan-400 text-cyan-400 bg-transparent shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:bg-cyan-400/10 hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] hover:text-cyan-300 before:absolute before:inset-0 before:bg-cyan-400/5 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300",
        ghost:
          "text-cyan-400 hover:bg-cyan-400/10 hover:text-cyan-300 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] before:absolute before:inset-0 before:bg-cyan-400/5 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300",
        destructive:
          "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)] hover:shadow-[0_0_30px_rgba(239,68,68,0.8)] border border-red-400/50 hover:border-red-300 before:absolute before:inset-0 before:bg-gradient-to-r before:from-red-400/20 before:to-rose-400/20 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300",
        industrial:
          "bg-gradient-to-r from-gray-800 to-gray-900 text-cyan-400 shadow-[0_0_15px_rgba(0,255,255,0.7)] hover:shadow-[0_0_25px_rgba(0,255,255,1)] border border-cyan-500 hover:border-cyan-400 before:absolute before:inset-0 before:bg-gradient-to-r before:from-cyan-500/20 before:to-cyan-400/20 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        xl: "h-14 rounded-lg px-10 text-base",
        icon: "h-10 w-10",
      },
      glow: {
        none: "",
        subtle: "hover:animate-pulse",
        intense: "animate-pulse hover:animate-bounce",
        rainbow: "before:animate-pulse hover:animate-bounce bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 via-indigo-500 to-purple-500 bg-size-200 animate-gradient-x",
        industrialGlow: "animate-pulse hover:animate-ping",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      glow: "none",
    },
  }
);

export interface NeonButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof neonButtonVariants> {
  asChild?: boolean;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
  pulse?: boolean;
}

const NeonButton = React.forwardRef<HTMLButtonElement, NeonButtonProps>(
  ({ className, variant, size, glow, asChild = false, icon, rightIcon, loading, pulse, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    
    return (
      <Comp
        className={cn(
          neonButtonVariants({ variant, size, glow, className }),
          loading && "opacity-70 cursor-not-allowed",
          pulse && "animate-pulse",
          "group relative overflow-hidden"
        )}
        ref={ref}
        disabled={loading || props.disabled}
        {...props}
      >
        {/* Animated background effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
        
        {/* Content wrapper */}
        <span className="relative z-10 flex items-center gap-2">
          {loading && (
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {!loading && icon && <span className="shrink-0">{icon}</span>}
          <span>{children}</span>
          {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </span>
        
        {/* Glow effect overlay */}
        <div className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-20 transition-opacity duration-300 bg-gradient-to-r from-current to-current blur-xl" />
      </Comp>
    );
  }
);
NeonButton.displayName = "NeonButton";

export { NeonButton, neonButtonVariants };

