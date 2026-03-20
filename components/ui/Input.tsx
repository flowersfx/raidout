import { cn } from "@/lib/utils/cn";
import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className, id, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-xs text-muted uppercase tracking-wider">
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
          className
        )}
        {...props}
      />
    </div>
  );
}
