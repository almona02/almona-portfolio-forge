import * as React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  // Allow custom variant styling hook
  variant?: 'default' | 'outline';
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', type = 'text', variant = 'default', ...props }, ref) => {
    return (
      <input
        type={type}
        className={`input input-${variant} ${className}`.trim()}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";