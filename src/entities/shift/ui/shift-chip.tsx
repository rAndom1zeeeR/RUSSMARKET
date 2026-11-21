import type { CalendarView } from "@/shared/lib/date";
import { TONE_STYLES, type ShiftTone } from "@/entities/shift-template/model/styles";
import { formatDuration, formatRange } from "@/shared/lib/time";
import { cn } from "@/shared/lib/utils";

interface ShiftChipProps {
  start: string;
  end: string;
  tone: ShiftTone;
  view: CalendarView;
  className?: string;
}

/** Смена в ячейке: неделя — «08 - 18 / 10 ч», месяц — только «10 ч». */
export function ShiftChip({ start, end, tone, view, className }: ShiftChipProps) {
  const style = TONE_STYLES[tone];
  const duration = formatDuration(start, end);

  return (
    <div
      className={cn(
        "flex size-full flex-col items-center justify-center rounded-lg text-center",
        style.chip,
        className
      )}
      title={`${start} – ${end} · ${duration}`}
    >
      {view === "week" ? (
        <>
          <span className="text-xs leading-4 md:text-base md:leading-6">{formatRange(start, end)}</span>
          <span className={cn("text-[10px] leading-3 md:text-xs md:leading-4", style.accent)}>{duration}</span>
        </>
      ) : (
        <span
          className={cn(
            "text-sm leading-5 font-medium md:text-base md:leading-6",
            tone === "custom" ? "text-white" : style.accent
          )}
        >
          {duration}
        </span>
      )}
    </div>
  );
}
