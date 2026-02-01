import * as React from "react";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "outline" | "destructive" | "custom";
}

export const Badge = ({ className, variant = "default", ...props }: BadgeProps) => {
  const baseClasses = variant === "custom" ? "" : `badge ${variant}`;
  const classes = [baseClasses, className].filter(Boolean).join(" ");

  return (
    <span
      className={classes}
      {...props}
    />
  );
};