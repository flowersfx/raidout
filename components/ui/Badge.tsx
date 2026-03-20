import { cn } from "@/lib/utils/cn";

interface BadgeProps {
  label: string;
  color?: string; // hex color for the dot
  className?: string;
}

export function Badge({ label, color, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-raised border border-border text-muted",
        className
      )}
    >
      {color && (
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
      )}
      {label}
    </span>
  );
}
