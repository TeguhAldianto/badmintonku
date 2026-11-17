import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-[2px] border border-navy/30 bg-chalk px-3 py-2 text-sm text-navy outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt transition-colors placeholder:text-slate-muted/70 focus:border-navy disabled:cursor-not-allowed disabled:opacity-50 file:border-0 file:bg-transparent file:text-xs file:font-semibold file:uppercase file:tracking-wider file:text-navy",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
