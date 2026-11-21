"use client";

import type { ShiftTone } from "@/entities/shift-template/model/styles";
import type { ShiftTemplateDTO } from "@/entities/shift-template/model/types";
import type { CalendarView } from "@/shared/lib/date";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useRef, useState, type ReactNode } from "react";
import { useScheduleStore } from "@/entities/schedule/model/store";
import { TemplateCard } from "@/entities/shift-template/ui/template-card";
import { isDragData, resolveDrop, type DragData } from "@/entities/shift/model/dnd";
import { ShiftChip } from "@/entities/shift/ui/shift-chip";

interface ShiftDndProviderProps {
  children: ReactNode;
  view: CalendarView;
  templates: ShiftTemplateDTO[];
}

/**
 * Drag-and-drop: шаблон → ячейка (или все выделенные, если цель в выделении),
 * смена → другая ячейка (перенос; с зажатым Alt — копирование).
 */
export function ShiftDndProvider({ children, view, templates }: ShiftDndProviderProps) {
  const [active, setActive] = useState<DragData | null>(null);
  const copyRef = useRef(false);
  const setCells = useScheduleStore(state => state.setCells);
  const setSelection = useScheduleStore(state => state.setSelection);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } })
  );

  const handleDragStart = ({ active: item, activatorEvent }: DragStartEvent) => {
    const data: unknown = item.data.current;
    setActive(isDragData(data) ? data : null);
    copyRef.current = "altKey" in activatorEvent && Boolean(activatorEvent.altKey);
  };

  const handleDragEnd = ({ active: item, over }: DragEndEvent) => {
    setActive(null);
    if (!over) return;
    const data: unknown = item.data.current;
    if (!isDragData(data)) return;
    const targetKey = String(over.id);

    const { selection } = useScheduleStore.getState();
    const result = resolveDrop(data, targetKey, selection, copyRef.current);
    if (!result) return;
    for (const { keys, value } of result.assignments) setCells(keys, value);
    if (result.select) setSelection(result.select, result.select[0]);
  };

  const toneByTemplate = new Map<string, ShiftTone>(templates.map(t => [t.id, t.color]));

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActive(null)}
    >
      {children}
      <DragOverlay dropAnimation={null}>
        {active?.kind === "template" && (
          <div className="size-full cursor-grabbing shadow-lg">
            <TemplateCard template={active.template} usage={0} className="h-full" />
          </div>
        )}
        {active?.kind === "shift" && (
          <ShiftChip
            start={active.value.start}
            end={active.value.end}
            tone={active.value.templateId ? (toneByTemplate.get(active.value.templateId) ?? "custom") : "custom"}
            view={view}
            className="cursor-grabbing opacity-90 shadow-lg"
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
