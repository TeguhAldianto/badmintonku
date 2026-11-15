import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-[2px] border border-[#141824]/30 bg-[#F5F3EE] px-3 py-2 text-sm text-[#141824] outline-none transition-colors placeholder:text-[#6E6A61]/70 focus:border-[#141824] disabled:cursor-not-allowed disabled:opacity-50 file:border-0 file:bg-transparent file:text-xs file:font-semibold file:uppercase file:tracking-wider file:text-[#141824]",
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
