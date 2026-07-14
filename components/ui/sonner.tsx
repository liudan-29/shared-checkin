"use client";

import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      position="bottom-center"
      toastOptions={{
        classNames: {
          toast:
            "bg-popover text-foreground border border-border shadow-lg rounded-md font-body text-base",
          actionButton: "!bg-ink !text-primary-foreground",
        },
        duration: 3000,
      }}
      {...props}
    />
  );
};

export { Toaster };
