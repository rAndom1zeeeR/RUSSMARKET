"use client";

import type { ShiftTemplateDTO } from "@/entities/shift-template/model/types";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Eraser, UserRoundPen } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useScheduleStore } from "@/entities/schedule/model/store";
import { TONE_STYLES } from "@/entities/shift-template/model/styles";
import { cellKey } from "@/entities/shift/model/cell";
import { customValue, templateValue, validateCustomTime } from "@/entities/shift/model/value";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { fromISODate } from "@/shared/lib/date";
import { formatRangeFull } from "@/shared/lib/time";
import { cn } from "@/shared/lib/utils";

interface QuickAssignMenuProps {
  date: string;
  /** Подпись дня в заголовке — она же триггер меню. */
  children: ReactNode;
  /** Сотрудники, которым назначается смена (видимые с учётом поиска). */
  employeeIds: string[];
  templates: ShiftTemplateDTO[];
}

/** Быстрое назначение: клик по дате → меню → смена всем видимым сотрудникам на эту дату. */
export function QuickAssignMenu({ date, children, employeeIds, templates }: QuickAssignMenuProps) {
  const [open, setOpen] = useState(false);
  const setCells = useScheduleStore(state => state.setCells);
  const customStart = useScheduleStore(state => state.customStart);
  const customEnd = useScheduleStore(state => state.customEnd);

  const keys = employeeIds.map(id => cellKey(id, date));
  const customError = validateCustomTime(customStart, customEnd);

  const assign = (value: Parameters<typeof setCells>[1]) => {
    setCells(keys, value);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="hover:bg-muted data-[state=open]:bg-muted rounded-lg px-2 py-1 transition-colors"
        aria-label={`Быстро назначить смену на ${date}`}
        disabled={employeeIds.length === 0}
      >
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <div className="text-muted-foreground px-2 pt-1 pb-2 text-xs">
          Смена на {format(fromISODate(date), "d MMMM, EEEEEE", { locale: ru })} · {employeeIds.length} сотр.
        </div>
        <ul className="flex flex-col gap-1">
          {templates.map(template => (
            <li key={template.id}>
              <button
                type="button"
                onClick={() => assign(templateValue(template))}
                className={cn(
                  "bg-muted hover:bg-line w-full rounded-lg border-l-4 px-3 py-2 text-left text-sm",
                  TONE_STYLES[template.color].stripe
                )}
              >
                <span className="font-medium">{template.name}</span>{" "}
                <span className="text-muted-foreground">{formatRangeFull(template.start, template.end)}</span>
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => {
                if (customError) {
                  toast.error(customError);
                  return;
                }
                assign(customValue(customStart, customEnd));
              }}
              className="hover:bg-muted flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm"
            >
              <UserRoundPen className="size-4" aria-hidden />
              Своя смена {customStart}–{customEnd}
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => assign(null)}
              className="text-danger hover:bg-danger-soft flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm"
            >
              <Eraser className="size-4" aria-hidden />
              Очистить день
            </button>
          </li>
        </ul>
      </PopoverContent>
    </Popover>
  );
}
