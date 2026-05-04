"use client";

import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="bottom-right"
      expand={false}
      visibleToasts={3}
      closeButton
      richColors
      toastOptions={{
        classNames: {
          toast: "bg-white border border-ink-6 shadow-ww-md font-sans rounded-md",
          title: "font-medium text-ink-0",
          description: "font-sans text-sm text-ink-3",
          actionButton: "bg-ink-1 text-white font-medium border border-ink-1 hover:bg-ink-0 rounded-sm",
          cancelButton: "bg-white text-ink-0 border border-ink-6 rounded-sm",
          closeButton: "bg-white border border-ink-6 hover:bg-ink-8 rounded-sm",
          error: "border-red-600 bg-red-50",
          success: "border-emerald-600 bg-emerald-50",
          warning: "border-amber-600 bg-amber-50",
          info: "border-blue-600 bg-blue-50",
        },
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
