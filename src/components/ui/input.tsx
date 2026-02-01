import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { Eye, EyeOff, Search, X } from "lucide-react";
import * as React from "react";

// Gold-tier input variants with market-leader inspiration (Material Design 3, Ant Design)
const inputVariants = cva(
  "flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-150 hover:border-slate-400 focus:border-amber-400 invalid:border-red-500 invalid:ring-red-400 focus-visible:invalid:ring-red-400 select-text touch-manipulation",
  {
    variants: {
      variant: {
        default: "",
        error: "border-red-500 focus-visible:ring-red-400",
        success: "border-green-500 focus-visible:ring-green-400",
        warning: "border-amber-500 focus-visible:ring-amber-400",
      },
      size: {
        sm: "h-8 px-2 py-1 text-xs",
        md: "h-10 px-3 py-2 text-sm",
        lg: "h-12 px-4 py-3 text-base",
        xl: "h-14 px-5 py-4 text-lg",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      fullWidth: false,
    },
  }
);

// Enhanced input props with gold-tier features
export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  label?: string;
  helperText?: string;
  error?: string;
  success?: string;
  warning?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  clearable?: boolean;
  showPasswordToggle?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
}

// Password input component
const PasswordInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    type: _type = "password", 
    showPasswordToggle = true, 
    fullWidth, 
    variant, 
    size,
    label: _label,
    helperText: _helperText,
    error: _error,
    success: _success,
    warning: _warning,
    leftIcon: _leftIcon,
    rightIcon: _rightIcon,
    clearable: _clearable,
    loading: _loading,
    ...props 
  }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);

    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword);
    };

    return (
      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          className={cn(inputVariants({ variant, size, fullWidth }), className)}
          ref={ref}
          {...props}
        />
        {showPasswordToggle && (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors"
            onClick={togglePasswordVisibility}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";

// Search input component
const SearchInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    clearable = true, 
    onChange, 
    value, 
    fullWidth, 
    variant, 
    size,
    label: _label,
    helperText: _helperText,
    error: _error,
    success: _success,
    warning: _warning,
    leftIcon: _leftIcon,
    rightIcon: _rightIcon,
    showPasswordToggle: _showPasswordToggle,
    loading: _loading,
    ...props 
  }, ref) => {
    const handleClear = () => {
      if (onChange) {
        const event = {
          target: { value: "" },
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(event);
      }
    };

    return (
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <input
          type="search"
          className={cn(inputVariants({ variant, size, fullWidth }), "pl-9", className)}
          ref={ref}
          value={value}
          onChange={onChange}
          {...props}
        />
        {clearable && value && (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors"
            onClick={handleClear}
            tabIndex={-1}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
);

SearchInput.displayName = "SearchInput";

// Main input component with gold-tier features
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({
    className,
    variant,
    size,
    fullWidth,
    label,
    helperText,
    error,
    success,
    warning,
    leftIcon,
    rightIcon,
    clearable,
    showPasswordToggle,
    loading,
    type = "text",
    onChange,
    value,
    id,
    ...props
  }, ref) => {
    // Generate unique ID for accessibility
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const helperId = `${inputId}-helper`;
    const errorId = `${inputId}-error`;

    // Determine variant based on state
    const computedVariant = error ? "error" : success ? "success" : warning ? "warning" : variant;

    // Handle clear functionality
    const handleClear = () => {
      if (onChange) {
        const event = {
          target: { value: "" },
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(event);
      }
    };

    // Special handling for password inputs
    if (type === "password") {
      return (
        <div className={cn("space-y-2", fullWidth && "w-full")}>
          {label && (
            <label
              htmlFor={inputId}
              className="text-sm font-medium text-slate-700"
            >
              {label}
            </label>
          )}
          <PasswordInput
            ref={ref}
            id={inputId}
            className={className}
            variant={computedVariant}
            size={size}
            fullWidth={fullWidth}
            showPasswordToggle={showPasswordToggle}
            value={value}
            onChange={onChange}
            {...props}
          />
          {(error || success || warning || helperText) && (
            <div
              id={error ? errorId : helperId}
              className={cn(
                "text-xs",
                error && "text-red-600",
                success && "text-green-600",
                warning && "text-amber-600",
                !error && !success && !warning && "text-slate-500"
              )}
            >
              {error || success || warning || helperText}
            </div>
          )}
        </div>
      );
    }

    // Special handling for search inputs
    if (type === "search") {
      return (
        <div className={cn("space-y-2", fullWidth && "w-full")}>
          {label && (
            <label
              htmlFor={inputId}
              className="text-sm font-medium text-slate-700"
            >
              {label}
            </label>
          )}
          <SearchInput
            ref={ref}
            id={inputId}
            className={className}
            variant={computedVariant}
            size={size}
            fullWidth={fullWidth}
            clearable={clearable}
            onChange={onChange}
            value={value}
            {...props}
          />
          {(error || success || warning || helperText) && (
            <div
              id={error ? errorId : helperId}
              className={cn(
                "text-xs",
                error && "text-red-600",
                success && "text-green-600",
                warning && "text-amber-600",
                !error && !success && !warning && "text-slate-500"
              )}
            >
              {error || success || warning || helperText}
            </div>
          )}
        </div>
      );
    }

    // Standard input with icons
    return (
      <div className={cn("space-y-2", fullWidth && "w-full")}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-slate-700"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
              {leftIcon}
            </div>
          )}
          <input
            type={type}
            id={inputId}
            className={cn(
              inputVariants({ variant: computedVariant, size, fullWidth }),
              leftIcon && "pl-9",
              rightIcon && "pr-9",
              clearable && value && "pr-9",
              loading && "pr-9",
              className
            )}
            ref={ref}
            value={value}
            onChange={onChange}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            aria-invalid={!!error}
            {...props}
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-400"></div>
            </div>
          )}
          {clearable && value && !loading && (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors"
              onClick={handleClear}
              tabIndex={-1}
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {rightIcon && !clearable && !loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
              {rightIcon}
            </div>
          )}
        </div>
        {(error || success || warning || helperText) && (
          <div
            id={error ? errorId : helperId}
            className={cn(
              "text-xs",
              error && "text-red-600",
              success && "text-green-600",
              warning && "text-amber-600",
              !error && !success && !warning && "text-slate-500"
            )}
          >
            {error || success || warning || helperText}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input, inputVariants, PasswordInput, SearchInput };

