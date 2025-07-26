import * as React from "react";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "outline";
}

export const Badge = ({ className, variant = "default", ...props }: BadgeProps) => {
  return (
    <span
      className={`badge ${variant} ${className || ''}`}
      {...props}
    />
  );
};