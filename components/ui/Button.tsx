import { cn } from "@/lib/utils/cn";
import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md";
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center gap-1.5 font-medium rounded transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
        size === "sm" && "px-2.5 py-1 text-xs",
        size === "md" && "px-3.5 py-1.5 text-sm",
        variant === "primary" &&
          "bg-accent text-bg hover:bg-accent-dim",
        variant === "outline" &&
          "border border-border text-text hover:bg-raised",
        variant === "ghost" &&
          "text-muted hover:text-text hover:bg-raised",
        variant === "danger" &&
          "text-danger hover:bg-raised",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
