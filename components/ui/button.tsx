import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[2px] font-mono text-xs font-bold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt focus-visible:ring-2 focus-visible:ring-cobalt focus-visible:ring-offset-2 focus-visible:ring-offset-chalk disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-terracotta text-paper border border-navy hover:bg-navy",
        navy: "bg-navy text-paper border border-navy hover:bg-terracotta hover:border-terracotta",
        outline:
          "bg-paper text-navy border border-navy/30 hover:border-navy hover:bg-birch",
        secondary:
          "bg-birch text-navy border border-navy/30 hover:bg-paper hover:border-navy",
        ghost: "text-navy hover:bg-birch border border-transparent",
        destructive:
          "bg-paper text-terracotta border border-terracotta/60 hover:bg-terracotta hover:text-paper hover:border-terracotta",
        link: "text-cobalt underline-offset-4 hover:underline border border-transparent normal-case",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-2.5 text-[11px]",
        lg: "h-12 px-6 text-sm",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
