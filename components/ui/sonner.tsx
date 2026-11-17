"use client";

import { CircleCheck, Info, LoaderCircle, OctagonX, TriangleAlert } from "lucide-react";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Toaster bergaya arsitektural: permukaan kertas #FAF9F6, garis 1px #141824,
 * aksen terracotta untuk error dan cobalt untuk sukses (tanpa warna hijau).
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: <CircleCheck className="h-4 w-4 text-cobalt" strokeWidth={1.5} />,
        info: <Info className="h-4 w-4 text-navy" strokeWidth={1.5} />,
        warning: <TriangleAlert className="h-4 w-4 text-terracotta" strokeWidth={1.5} />,
        error: <OctagonX className="h-4 w-4 text-terracotta" strokeWidth={1.5} />,
        loading: <LoaderCircle className="h-4 w-4 animate-spin text-navy" strokeWidth={1.5} />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:rounded-[2px] group-[.toaster]:border group-[.toaster]:border-navy group-[.toaster]:bg-paper group-[.toaster]:text-navy group-[.toaster]:font-mono group-[.toaster]:text-xs group-[.toaster]:shadow-none",
          title: "group-[.toast]:font-bold group-[.toast]:tracking-wide",
          description: "group-[.toast]:text-slate-muted",
          actionButton:
            "group-[.toast]:rounded-[2px] group-[.toast]:border group-[.toast]:border-navy group-[.toast]:bg-navy group-[.toast]:font-mono group-[.toast]:text-[11px] group-[.toast]:uppercase group-[.toast]:text-paper",
          cancelButton:
            "group-[.toast]:rounded-[2px] group-[.toast]:border group-[.toast]:border-navy/30 group-[.toast]:bg-birch group-[.toast]:font-mono group-[.toast]:text-[11px] group-[.toast]:uppercase group-[.toast]:text-navy",
          success: "group-[.toaster]:border-cobalt",
          error: "group-[.toaster]:border-terracotta",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
