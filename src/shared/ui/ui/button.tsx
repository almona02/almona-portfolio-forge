import * as React from "react"
import { buttonVariants } from "./buttonVariants";
import type { VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils"



export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    // Safer handling for asChild: avoid Radix Slot clone issues when child is not forwardRef
    if (asChild && React.isValidElement(children)) {
      const mergedClass = cn(buttonVariants({ variant, size, className }), (children as any).props?.className);
      return React.cloneElement(children as React.ReactElement, {
        className: mergedClass,
        ref,
        ...props,
      });
    }

    // Default: render native button
    const Comp = "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {children}
      </Comp>
    );
  }
)
Button.displayName = "Button"

export { Button }
