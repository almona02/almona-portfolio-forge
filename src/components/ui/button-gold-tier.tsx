import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import * as React from "react";

// Gold-tier button variants
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap font-medium transition-all duration-150 ease-out ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden select-none touch-manipulation",
  {
    variants: {
      variant: {
        primary: "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md hover:from-amber-600 hover:to-amber-700 hover:shadow-amber-500/25 border border-amber-400/20",
        secondary: "bg-slate-700 text-white hover:bg-slate-600 shadow-md hover:shadow-slate-500/25 border border-slate-600/20",
        outline: "border-2 border-amber-400/60 bg-transparent text-amber-400 hover:bg-amber-400/10 hover:border-amber-400 shadow-sm",
        ghost: "bg-transparent text-slate-300 hover:bg-white/5 hover:text-white shadow-none border-0",
        danger: "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md hover:from-red-600 hover:to-red-700 hover:shadow-red-500/25 border border-red-400/20",
        success: "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md hover:from-green-600 hover:to-green-700 hover:shadow-green-500/25 border border-green-400/20",
      },
      size: {
        xs: "h-7 px-2 py-1 text-xs rounded-sm gap-1",
        sm: "h-8 px-3 py-1.5 text-sm rounded-md gap-1.5",
        md: "h-10 px-4 py-2 text-sm rounded-md gap-2",
        lg: "h-12 px-6 py-3 text-base rounded-lg gap-2.5",
        xl: "h-14 px-8 py-4 text-lg rounded-lg gap-3",
        icon: "h-10 w-10 p-0 rounded-md",
      },
      loading: {
        true: "cursor-not-allowed",
        false: "",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      loading: false,
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

// Enhanced LoadingSpinner with proper typing
const LoadingSpinner = ({ size }: { size: VariantProps<typeof buttonVariants>['size'] }) => {
  const sizeMap: Record<string, string> = {
    xs: "h-3 w-3",
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
    xl: "h-6 w-6",
    icon: "h-4 w-4",
  };
  
  const spinnerClass = sizeMap[size || 'md'] || sizeMap.md;

  return (
    <Loader2 className={cn("animate-spin", spinnerClass)} aria-hidden="true" />
  );
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className,
    variant,
    size,
    loading = false,
    loadingText,
    fullWidth = false,
    leftIcon,
    rightIcon,
    children,
    disabled,
    asChild = false,
    ...props
  }, ref) => {
    const isDisabled = disabled || loading;
    // Safe gap calculation based on size token
    const safeSize = size || 'md';
    const gapMap: Record<string, string> = {
      xs: 'gap-1',
      sm: 'gap-1.5',
      md: 'gap-2',
      lg: 'gap-2.5',
      xl: 'gap-3',
      icon: 'gap-0'
    };
    const iconGap = gapMap[safeSize] || 'gap-2';

    // If asChild is true, we merge props safely without casting to any
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<any>, {
        className: cn(buttonVariants({ variant, size, loading, className }), fullWidth ? "w-full" : "", children.props.className),
        ref,
        disabled: isDisabled,
        ...props,
      });
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size, loading, className }), fullWidth ? "w-full" : "", iconGap)}
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading}
        {...props}
      >
        {loading && <LoadingSpinner size={size} />}
        {leftIcon && !loading && <span className="inline-flex shrink-0">{leftIcon}</span>}
        
        {loading && loadingText ? (
           <span>{loadingText}</span>
        ) : (
           children
        )}
        
        {rightIcon && !loading && <span className="inline-flex shrink-0">{rightIcon}</span>}
        
        {/* Subtle touch feedback overlay (Gold Tier Polish) */}
        {!isDisabled && !asChild && (
           <span className="absolute inset-0 rounded-[inherit] bg-white/0 hover:bg-white/5 active:bg-black/5 transition-colors duration-200 pointer-events-none" />
        )}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
