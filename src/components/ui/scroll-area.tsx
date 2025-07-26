import React, { ReactNode } from "react";

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export const ScrollArea = ({ children, className = "", ...props }: ScrollAreaProps) => {
  return (
    <div className={`overflow-auto ${className}`} {...props}>
      {children}
    </div>
  );
};
