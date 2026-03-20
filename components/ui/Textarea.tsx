import { cn } from "@/lib/utils/cn";
import type { TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function Textarea({ label, className, id, ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-xs text-muted uppercase tracking-wider">
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={cn(
          "bg-raised border border-border rounded px-3 py-2 text-sm text-text mono",
          "placeholder:text-dim resize-y min-h-[80px]",
          "focus:outline-none focus:border-accent",
          "transition-colors",
          className
        )}
        {...props}
      />
    </div>
  );
}
