import { cn } from "@/lib/utils/cn";
import { formatGap, type ChangeoverStatus } from "@/lib/utils/time";

interface Props {
  gap: number;
  status: ChangeoverStatus;
  samePosition: boolean;
}

const STATUS_STYLES: Record<ChangeoverStatus, string> = {
  overlap: "text-danger border-danger/40 bg-danger/10",
  tight: "text-warn border-warn/40 bg-warn/10",
  comfortable: "text-ok border-ok/40 bg-ok/10",
};

export function ChangeoverBadge({ gap, status, samePosition }: Props) {
  return (
    <div className="flex items-center gap-2 py-1 pl-8">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs mono",
          STATUS_STYLES[status]
        )}
      >
        {samePosition && (
          <span title="Same position — critical changeover">⚠</span>
        )}
        {formatGap(gap)} changeover
      </span>
    </div>
  );
}
