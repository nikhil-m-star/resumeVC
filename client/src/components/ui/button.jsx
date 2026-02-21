import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
    "btn",
    {
        variants: {
            variant: {
                default: "btn-default",
                destructive: "btn-destructive",
                outline: "btn-outline",
                secondary: "btn-secondary",
                ghost: "btn-ghost",
                link: "btn-link",
            },
            size: {
                default: "",
                sm: "btn-sm",
                lg: "btn-lg",
                icon: "btn-icon",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
        <Comp
            className={cn(buttonVariants({ variant, size, className }))}
            ref={ref}
            {...props}
        />
    )
})
Button.displayName = "Button"

export { Button, buttonVariants }
