import * as React from "react"
import { badgeVariants } from "./badgeVariants";
import { type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils"



export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge }
