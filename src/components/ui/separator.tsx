import * as React from "react"
import * as SeparatorPrimitive from "@radix-ui/react-separator"

import { cn } from "@/lib/utils"

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  variant = "default",
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root> & {
  variant?: "default" | "gradient"
}) {
  return (
    <SeparatorPrimitive.Root
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        variant === "gradient"
          ? orientation === "horizontal"
            ? "bg-gradient-to-r from-transparent via-gray-200 to-transparent"
            : "bg-gradient-to-b from-transparent via-gray-200 to-transparent"
          : "bg-gray-200",
        "transition-all duration-200",
        className
      )}
      {...props}
    />
  )
}

export { Separator }
