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
import { isDragData, type DragData } from "@/entities/shift/model/dnd";
import { templateValue } from "@/entities/shift/model/value";
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

    if (data.kind === "template") {
      const { selection } = useScheduleStore.getState();
      const keys = selection.has(targetKey) ? [...selection] : [targetKey];
      setCells(keys, templateValue(data.template));
      return;
    }

    if (data.key === targetKey) return;
    setCells([targetKey], data.value);
    if (!copyRef.current) setCells([data.key], null);
    setSelection([targetKey], targetKey);
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
          <div className="w-75 cursor-grabbing shadow-lg">
            <TemplateCard template={active.template} usage={0} />
          </div>
        )}
        {active?.kind === "shift" && (
          <div className="h-16 w-24 cursor-grabbing opacity-90 shadow-lg">
            <ShiftChip
              start={active.value.start}
              end={active.value.end}
              tone={active.value.templateId ? (toneByTemplate.get(active.value.templateId) ?? "custom") : "custom"}
              view={view}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
