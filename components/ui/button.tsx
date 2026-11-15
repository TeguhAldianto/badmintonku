import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[2px] font-mono text-xs font-bold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F3EE] disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[#C84B31] text-[#FAF9F6] border border-[#141824] hover:bg-[#141824]",
        navy: "bg-[#141824] text-[#FAF9F6] border border-[#141824] hover:bg-[#C84B31] hover:border-[#C84B31]",
        outline:
          "bg-[#FAF9F6] text-[#141824] border border-[#141824]/30 hover:border-[#141824] hover:bg-[#EAE6DD]",
        secondary:
          "bg-[#EAE6DD] text-[#141824] border border-[#141824]/30 hover:bg-[#FAF9F6] hover:border-[#141824]",
        ghost: "text-[#141824] hover:bg-[#EAE6DD] border border-transparent",
        destructive:
          "bg-[#FAF9F6] text-[#C84B31] border border-[#C84B31]/60 hover:bg-[#C84B31] hover:text-[#FAF9F6] hover:border-[#C84B31]",
        link: "text-[#1E3A8A] underline-offset-4 hover:underline border border-transparent normal-case",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-2.5 text-[10px]",
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
