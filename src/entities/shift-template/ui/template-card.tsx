import type { ShiftTemplateDTO } from "../model/types";
import { Badge } from "@/shared/components/ui/badge";
import { formatDuration, formatRangeFull } from "@/shared/lib/time";
import { cn } from "@/shared/lib/utils";
import { TONE_STYLES } from "../model/styles";

interface TemplateCardProps {
  template: ShiftTemplateDTO;
  /** Сколько раз шаблон использован в текущем периоде. */
  usage: number;
  className?: string;
}

export function TemplateCard({ template, usage, className }: TemplateCardProps) {
  return (
    <div
      className={cn(
        "bg-muted flex h-16 items-start justify-between rounded-lg border-l-[3px] px-3 py-2 text-left",
        TONE_STYLES[template.color].stripe,
        className
      )}
    >
      <div className="text-base leading-6">
        <div className="font-semibold">{template.name}</div>
        <div>
          {formatRangeFull(template.start, template.end)} · {formatDuration(template.start, template.end)}
        </div>
      </div>
      <Badge tone="counter" className="mt-0.75 -mr-0.5" aria-label={`Использований: ${usage}`}>
        {usage}
      </Badge>
    </div>
  );
}
