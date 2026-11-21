"use client";

import type { ShiftTone } from "@/entities/shift-template/model/styles";
import type { ShiftValue } from "@/entities/shift/model/types";
import type { CalendarView } from "@/shared/lib/date";
import type { PointerEvent } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";
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
  onCellPointerDown: (event: PointerEvent<HTMLDivElement>, employeeId: string, date: string) => void;
  onCellPointerEnter: (employeeId: string, date: string) => void;
}

export function GridCell({
  employeeId,
  date,
  value,
  tone,
  selected,
  striped,
  view,
  onCellPointerDown,
  onCellPointerEnter,
}: GridCellProps) {
  const key = cellKey(employeeId, date);
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: key });
  const {
    setNodeRef: setDragRef,
    listeners,
    attributes,
    isDragging,
  } = useDraggable({ id: `shift:${key}`, data: { kind: "shift", key, value }, disabled: !value });

  const setRefs = (node: HTMLDivElement | null) => {
    setDropRef(node);
    setDragRef(node);
  };

  return (
    <div
      ref={setRefs}
      {...(value ? attributes : {})}
      {...(value ? listeners : {})}
      role="gridcell"
      aria-selected={selected}
      data-cell={key}
      onPointerDown={event => onCellPointerDown(event, employeeId, date)}
      onPointerEnter={() => onCellPointerEnter(employeeId, date)}
      className={cn(
        "relative min-w-0 select-none",
        selected ? "p-0" : "p-1",
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
          <ShiftChip
            start={value.start}
            end={value.end}
            tone={tone}
            view={view}
            className={cn(selected && "ring-cell-selected-line ring-2")}
          />
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
}
