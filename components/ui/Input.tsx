import { cn } from "@/lib/utils/cn";
import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  inline?: boolean;
}

export function Input({ label, inline, className, id, ...props }: InputProps) {
  return (
    <div className={inline ? "flex items-center gap-1.5" : "flex flex-col gap-1"}>
      {label && (
        <label
          htmlFor={id}
          className={cn(
            "text-xs text-muted uppercase tracking-wider",
            inline && "shrink-0"
          )}
        >
          {label}
        </label>
      )}
      <input
        id={id}
        className={cn(
          "bg-raised border border-border rounded px-3 py-1.5 text-sm text-text",
          "placeholder:text-dim",
          "focus:outline-none focus:border-accent",
          "transition-colors",
          inline && "min-w-0 w-full",
          className
        )}
        {...props}
      />
    </div>
  );
}
