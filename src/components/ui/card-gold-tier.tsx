import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
import { X } from "lucide-react";
import * as React from "react";

// Gold-tier card variants with market-leader inspiration (Tailwind UI, Shadcn)
const cardVariants = cva(
  "rounded-lg border bg-white text-slate-950 shadow-sm transition-all duration-200",
  {
    variants: {
      variant: {
        default: "border-slate-200 shadow-sm",
        elevated: "border-slate-200 shadow-md",
        outlined: "border-slate-300 bg-transparent shadow-none",
        filled: "border-transparent bg-slate-50",
        ghost: "border-transparent bg-transparent shadow-none",
      },
      interactive: {
        true: "hover:shadow-md hover:scale-[1.02] cursor-pointer transition-all duration-200",
        false: "",
      },
      loading: {
        true: "animate-pulse",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      interactive: false,
      loading: false,
    },
  }
);

// Card header variants
const cardHeaderVariants = cva(
  "flex flex-col space-y-1.5",
  {
    variants: {
      size: {
        sm: "pb-2",
        md: "pb-3",
        lg: "pb-4",
        xl: "pb-6",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

// Card content variants
const cardContentVariants = cva(
  "",
  {
    variants: {
      size: {
        sm: "",
        md: "",
        lg: "",
        xl: "",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

// Card footer variants
const cardFooterVariants = cva(
  "flex items-center",
  {
    variants: {
      size: {
        sm: "pt-2",
        md: "pt-3",
        lg: "pt-4",
        xl: "pt-6",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

// Enhanced card props with gold-tier features
interface GoldTierCardProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "outlined" | "filled" | "ghost";
  size?: "sm" | "md" | "lg" | "xl";
  interactive?: boolean;
  loading?: boolean;
  dismissible?: boolean;
  onDismiss?: () => void;
  actions?: React.ReactNode;
}

// Card header props
interface CardHeaderProps
  extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl";
}

// Card content props
interface CardContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl";
}

// Card footer props
interface CardFooterProps
  extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl";
}

// Card title component
const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight text-slate-900",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

// Card description component
const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-slate-600", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

// Card header component
const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, size = "md", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardHeaderVariants({ size }), className)}
      {...props}
    />
  )
);
CardHeader.displayName = "CardHeader";

// Card content component
const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, size = "md", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardContentVariants({ size }), className)}
      {...props}
    />
  )
);
CardContent.displayName = "CardContent";

// Card footer component
const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, size = "md", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardFooterVariants({ size }), className)}
      {...props}
    />
  )
);
CardFooter.displayName = "CardFooter";

// Main card component with gold-tier features
const Card = React.forwardRef<HTMLDivElement, GoldTierCardProps>(
  ({
    className,
    variant,
    size,
    interactive,
    loading,
    dismissible,
    onDismiss,
    actions,
    children,
    ...props
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          cardVariants({ variant, interactive, loading }),
          size === "sm" && "p-3",
          size === "md" && "p-4",
          size === "lg" && "p-6",
          size === "xl" && "p-8",
          className
        )}
        {...props}
      >
        {/* Dismissible close button */}
        {(dismissible || actions) && (
          <div className="flex items-center justify-end mb-2">
            {actions && (
              <div className="flex items-center gap-1">
                {actions}
              </div>
            )}
            {dismissible && (
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                onClick={onDismiss}
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-white/50 rounded-lg flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-400"></div>
          </div>
        )}

        {children}
      </div>
    );
  }
);
Card.displayName = "GoldTierCard";

// Specialized card variants for common use cases

// Stats card for dashboard metrics
interface StatsCardProps extends GoldTierCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    label: string;
    trend: 'up' | 'down' | 'neutral';
  };
  icon?: React.ReactNode;
}

const StatsCard = React.forwardRef<HTMLDivElement, StatsCardProps>(
  ({ title, value, change, icon, className, ...props }, ref) => (
    <Card
      ref={ref}
      className={cn("relative overflow-hidden", className)}
      {...props}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-600">{title}</p>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            {change && (
              <p className={cn(
                "text-xs font-medium",
                change.trend === 'up' && "text-green-600",
                change.trend === 'down' && "text-red-600",
                change.trend === 'neutral' && "text-slate-600"
              )}>
                {change.trend === 'up' && '+'}
                {change.value}% {change.label}
              </p>
            )}
          </div>
          {icon && (
            <div className="text-slate-400">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
);
StatsCard.displayName = "StatsCard";

// Action card for interactive elements
interface ActionCardProps extends GoldTierCardProps {
  title: string;
  description?: string;
  actionLabel: string;
  onAction: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
}

const ActionCard = React.forwardRef<HTMLDivElement, ActionCardProps>(
  ({ title, description, actionLabel, onAction, icon, disabled, className, ...props }, ref) => (
    <Card
      ref={ref}
      interactive={!disabled}
      className={cn(disabled && "opacity-50 cursor-not-allowed", className)}
      onClick={!disabled ? onAction : undefined}
      {...props}
    >
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {icon && (
            <div className="text-amber-500 mt-1">
              {icon}
            </div>
          )}
          <div className="flex-1 space-y-2">
            <h3 className="font-semibold text-slate-900">{title}</h3>
            {description && (
              <p className="text-sm text-slate-600">{description}</p>
            )}
            <button
              type="button"
              className="text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onAction();
              }}
              disabled={disabled}
            >
              {actionLabel}
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
);
ActionCard.displayName = "ActionCard";

export {
  ActionCard,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  cardVariants,
  Card as GoldTierCard,
  StatsCard,
  type ActionCardProps,
  type CardContentProps,
  type CardFooterProps,
  type CardHeaderProps,
  type GoldTierCardProps,
  type StatsCardProps
};

