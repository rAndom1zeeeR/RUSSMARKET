"use client";

import type { ShiftTone } from "@/entities/shift-template/model/styles";
import type { ShiftValue } from "@/entities/shift/model/types";
import type { CalendarView } from "@/shared/lib/date";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { memo, type PointerEvent } from "react";
import { cellKey } from "@/entities/shift/model/cell";
import { ShiftChip } from "@/entities/shift/ui/shift-chip";
import { cn } from "@/shared/lib/utils";

interface GridCellProps {
  employeeId: string;
  date: string;
  value: ShiftValue | undefined;
  tone: ShiftTone;
  selected: boolean;
  striped: boolean;
  view: CalendarView;
  /** Подпись для скринридера: «Сотрудник, день: смена». */
  label: string;
  /** Единственная ячейка сетки в порядке табуляции (roving tabindex), остальные — стрелками. */
  tabbable: boolean;
  onCellFocus: (key: string) => void;
  onCellPointerDown: (event: PointerEvent<HTMLDivElement>, employeeId: string, date: string) => void;
  onCellPointerEnter: (employeeId: string, date: string) => void;
}

/**
 * Обёрнута в `memo`: при выделении или протяжке перерисовываются только ячейки, у которых изменились пропсы,
 * а не вся видимая сетка (в «Месяце» это до ~370 ячеек с хуками dnd-kit). Для этого обработчики снаружи
 * должны быть стабильными, а `value` — одним и тем же объектом, пока смена не менялась.
 */
export const GridCell = memo(function GridCell({
  employeeId,
  date,
  value,
  tone,
  selected,
  striped,
  view,
  label,
  tabbable,
  onCellFocus,
  onCellPointerDown,
  onCellPointerEnter,
}: GridCellProps) {
  const key = cellKey(employeeId, date);
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: key });
  // Drag node is the chip: DragOverlay copies that rect, so cell padding is not part of the preview.
  const {
    setNodeRef: setDragRef,
    listeners,
    attributes,
    isDragging,
  } = useDraggable({ id: `shift:${key}`, data: { kind: "shift", key, value }, disabled: !value });

  return (
    <div
      ref={setDropRef}
      {...(value ? attributes : {})}
      {...(value ? listeners : {})}
      role="gridcell"
      aria-selected={selected}
      aria-label={label}
      // После spread: dnd-kit ставит заполненным ячейкам tabIndex=0, а в порядке табуляции должна быть одна.
      tabIndex={tabbable ? 0 : -1}
      data-cell={key}
      onFocus={() => onCellFocus(key)}
      onPointerDown={event => onCellPointerDown(event, employeeId, date)}
      onPointerEnter={() => onCellPointerEnter(employeeId, date)}
      className={cn(
        "focus-visible:ring-brand relative min-w-0 outline-none select-none focus-visible:ring-2 focus-visible:ring-inset",
        selected ? "p-0" : "p-0.5 md:p-1",
        value && "cursor-grab",
        isDragging && "opacity-40"
      )}
    >
      <div
        className={cn(
          "size-full rounded-lg border transition-colors",
          selected
            ? "border-cell-selected-line bg-cell-selected-bg rounded-none"
            : value
              ? "border-transparent"
              : cn("border-dashed border-line", !striped && "bg-surface"),
          isOver && "border-brand border-solid bg-brand-soft"
        )}
      >
        {value ? (
          <div ref={setDragRef} className="size-full">
            <ShiftChip
              start={value.start}
              end={value.end}
              tone={tone}
              view={view}
              className={cn(selected && "ring-cell-selected-line ring-2")}
            />
          </div>
        ) : (
          selected && (
            <div className="flex size-full items-center justify-center">
              <Plus className="bg-brand size-5 rounded-full p-0.5 text-white" aria-hidden />
            </div>
          )
        )}
      </div>
    </div>
  );
});
