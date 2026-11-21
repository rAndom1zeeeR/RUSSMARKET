"use client";

import type { ShiftTemplateDTO } from "@/entities/shift-template/model/types";
import type { ShiftValue } from "@/entities/shift/model/types";
import { LayoutTemplate, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useScheduleStore } from "@/entities/schedule/model/store";
import { parseCellKey } from "@/entities/shift/model/cell";
import { templateValue, validateCustomTime } from "@/entities/shift/model/value";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { TimeField } from "@/shared/components/ui/time-field";
import { plural } from "@/shared/lib/plural";
import { formatRangeFull } from "@/shared/lib/time";

interface SelectionToolbarProps {
  shifts: ReadonlyMap<string, ShiftValue>;
  templates: ShiftTemplateDTO[];
}

const ghostButton =
  "bg-transparent text-white hover:bg-white/10 active:bg-white/20 disabled:bg-transparent disabled:text-white/40";

/** Тёмная панель над сеткой: сводка по выделению и действия над ним. */
export function SelectionToolbar({ shifts, templates }: SelectionToolbarProps) {
  const selection = useScheduleStore(state => state.selection);
  const setCells = useScheduleStore(state => state.setCells);
  const clearSelection = useScheduleStore(state => state.clearSelection);

  const keys = [...selection];
  const employees = new Set<string>();
  const days = new Set<string>();
  const filledKeys: string[] = [];
  for (const key of keys) {
    const { employeeId, date } = parseCellKey(key);
    employees.add(employeeId);
    days.add(date);
    if (shifts.has(key)) filledKeys.push(key);
  }

  return (
    <div
      role="toolbar"
      aria-label="Действия с выделенными ячейками"
      className="bg-ink-bar flex h-13 items-center gap-3 rounded-lg px-3 text-sm text-white"
    >
      <span>Выделено:</span>
      <Badge tone="onDark">
        {keys.length} {plural(keys.length, ["ячейка", "ячейки", "ячеек"])}
      </Badge>
      <span className="text-white/90">
        {employees.size} сотрудника(-ов) · {days.size} дн.
      </span>

      <div className="ml-auto flex items-center gap-1">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="quaternary" size="sm" className={ghostButton}>
              <LayoutTemplate /> Применить шаблон
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="text-foreground w-64">
            <ul className="flex flex-col gap-1">
              {templates.map(template => (
                <li key={template.id}>
                  <PopoverClose asChild>
                    <button
                      type="button"
                      onClick={() => setCells(keys, templateValue(template))}
                      className="hover:bg-muted w-full rounded-lg px-3 py-2 text-left text-sm"
                    >
                      <span className="font-medium">{template.name}</span>{" "}
                      <span className="text-muted-foreground">{formatRangeFull(template.start, template.end)}</span>
                    </button>
                  </PopoverClose>
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>

        {filledKeys.length > 0 && (
          <EditTimePopover
            key={filledKeys[0]}
            initial={shifts.get(filledKeys[0] ?? "")}
            onApply={(start, end) => {
              for (const key of filledKeys) {
                const current = shifts.get(key);
                if (current) setCells([key], { ...current, start, end });
              }
            }}
          />
        )}

        <Button
          variant="quaternary"
          size="sm"
          className={ghostButton}
          onClick={() => {
            setCells(filledKeys, null);
          }}
          disabled={filledKeys.length === 0}
        >
          <Trash2 /> Очистить
        </Button>
        <Button variant="quaternary" size="sm" className={ghostButton} onClick={clearSelection}>
          <X /> Снять
        </Button>
      </div>
    </div>
  );
}

function EditTimePopover({
  initial,
  onApply,
}: {
  initial: ShiftValue | undefined;
  onApply: (start: string, end: string) => void;
}) {
  const [start, setStart] = useState(initial?.start ?? "09:00");
  const [end, setEnd] = useState(initial?.end ?? "17:00");
  const error = validateCustomTime(start, end);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="quaternary" size="sm" className={ghostButton}>
          <Pencil /> Изменить
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="text-foreground w-72 p-3">
        <div className="grid grid-cols-2 gap-2">
          <TimeField label="Начало" value={start} onValueChange={setStart} />
          <TimeField label="Конец" value={end} onValueChange={setEnd} />
        </div>
        {error && <p className="text-danger mt-2 text-xs">{error}</p>}
        <PopoverClose asChild>
          <Button
            tone="brand"
            variant="primary"
            className="mt-3 w-full"
            disabled={error !== null}
            onClick={() => onApply(start, end)}
          >
            Применить к выделенным сменам
          </Button>
        </PopoverClose>
      </PopoverContent>
    </Popover>
  );
}
