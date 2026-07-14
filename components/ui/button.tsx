import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md font-body text-lg font-normal transition-all duration-fast ease-default disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        primary:
          "bg-ink text-primary-foreground hover:bg-ink-hover active:bg-ink-hover active:scale-[0.98]",
        secondary:
          "border-[1.5px] border-border bg-transparent text-foreground hover:border-ink active:bg-ink-subtle",
        ghost:
          "bg-transparent text-muted-foreground hover:bg-secondary active:bg-secondary active:scale-[0.92]",
        danger: "text-danger hover:text-danger-hover",
      },
      size: {
        default: "h-12 px-4 text-lg",
        sm: "h-11 px-4 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  loadingText?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, loadingText = "保存中…", disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? <span className="animate-pulse">{loadingText}</span> : children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
