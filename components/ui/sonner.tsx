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
        success: <CircleCheck className="h-4 w-4 text-[#1E3A8A]" strokeWidth={1.5} />,
        info: <Info className="h-4 w-4 text-[#141824]" strokeWidth={1.5} />,
        warning: <TriangleAlert className="h-4 w-4 text-[#C84B31]" strokeWidth={1.5} />,
        error: <OctagonX className="h-4 w-4 text-[#C84B31]" strokeWidth={1.5} />,
        loading: <LoaderCircle className="h-4 w-4 animate-spin text-[#141824]" strokeWidth={1.5} />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:rounded-[2px] group-[.toaster]:border group-[.toaster]:border-[#141824] group-[.toaster]:bg-[#FAF9F6] group-[.toaster]:text-[#141824] group-[.toaster]:font-mono group-[.toaster]:text-xs group-[.toaster]:shadow-none",
          title: "group-[.toast]:font-bold group-[.toast]:tracking-wide",
          description: "group-[.toast]:text-[#6E6A61]",
          actionButton:
            "group-[.toast]:rounded-[2px] group-[.toast]:border group-[.toast]:border-[#141824] group-[.toast]:bg-[#141824] group-[.toast]:font-mono group-[.toast]:text-[10px] group-[.toast]:uppercase group-[.toast]:text-[#FAF9F6]",
          cancelButton:
            "group-[.toast]:rounded-[2px] group-[.toast]:border group-[.toast]:border-[#141824]/30 group-[.toast]:bg-[#EAE6DD] group-[.toast]:font-mono group-[.toast]:text-[10px] group-[.toast]:uppercase group-[.toast]:text-[#141824]",
          success: "group-[.toaster]:border-[#1E3A8A]",
          error: "group-[.toaster]:border-[#C84B31]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
