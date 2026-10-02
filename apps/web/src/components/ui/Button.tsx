import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none cursor-pointer",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-[#001015] hover:bg-accent-soft active:scale-[0.98] shadow-lg shadow-accent/20",
        secondary:
          "bg-surface-elevated text-foreground border border-border hover:bg-surface-hover hover:border-accent/40",
        ghost: "text-foreground hover:bg-surface-hover",
        danger: "bg-danger text-[#1a0505] hover:brightness-110 active:scale-[0.98]",
      },
      size: {
        lg: "text-lg px-7 py-4",
        md: "text-base px-5 py-3",
        sm: "text-sm px-4 py-2",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "lg",
    },
  }
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}
