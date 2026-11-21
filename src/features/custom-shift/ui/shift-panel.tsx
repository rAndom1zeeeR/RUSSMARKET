"use client";

import type { ShiftTemplateDTO } from "@/entities/shift-template/model/types";
import type { DragData } from "@/entities/shift/model/dnd";
import { useDraggable } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useScheduleStore } from "@/entities/schedule/model/store";
import { TemplateCard } from "@/entities/shift-template/ui/template-card";
import { customValue, templateValue, validateCustomTime } from "@/entities/shift/model/value";
import { Button } from "@/shared/components/ui/button";
import { TimeField } from "@/shared/components/ui/time-field";
import { cn } from "@/shared/lib/utils";

const DEFAULT_START = "09:00";
const DEFAULT_END = "17:00";

interface ShiftPanelProps {
  templates: ShiftTemplateDTO[];
  usage: ReadonlyMap<string, number>;
}

/** Правая панель: шаблоны смен (клик или drag-and-drop на ячейку) и блок «Своя смена». */
export function ShiftPanel({ templates, usage }: ShiftPanelProps) {
  const customStart = useScheduleStore(state => state.customStart);
  const customEnd = useScheduleStore(state => state.customEnd);
  const setCustomTime = useScheduleStore(state => state.setCustomTime);
  const setCells = useScheduleStore(state => state.setCells);

  const customError = validateCustomTime(customStart, customEnd);

  const applyToSelection = (value: ReturnType<typeof customValue>) => {
    const { selection } = useScheduleStore.getState();
    if (selection.size === 0) {
      toast.info("Сначала выделите ячейки в календаре");
      return;
    }
    setCells(selection, value);
  };

  return (
    <aside className="bg-surface flex w-84 shrink-0 flex-col gap-10 rounded-[20px] p-4">
      <section aria-labelledby="templates-title">
        <h2 id="templates-title" className="mb-2 text-base leading-6 font-normal">
          Шаблоны смен
        </h2>
        <ul className="flex flex-col gap-1">
          {templates.map(template => (
            <li key={template.id}>
              <DraggableTemplate
                template={template}
                usage={usage.get(template.id) ?? 0}
                onApply={() => applyToSelection(templateValue(template))}
              />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="custom-title">
        <h2 id="custom-title" className="mb-2 text-base leading-6 font-normal">
          Своя смена
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <TimeField
            label="Начало"
            muted={customStart === DEFAULT_START}
            value={customStart}
            onValueChange={value => setCustomTime({ customStart: value })}
          />
          <TimeField
            label="Конец"
            muted={customEnd === DEFAULT_END}
            value={customEnd}
            onValueChange={value => setCustomTime({ customEnd: value })}
          />
        </div>
        {customError && <p className="text-danger mt-2 text-xs">{customError}</p>}
        <Button
          tone="brand"
          variant="secondary"
          size="lg"
          className="mt-2 w-full"
          disabled={customError !== null}
          onClick={() => applyToSelection(customValue(customStart, customEnd))}
        >
          <Plus /> Поставить в выделенные
        </Button>
      </section>
    </aside>
  );
}

function DraggableTemplate({
  template,
  usage,
  onApply,
}: {
  template: ShiftTemplateDTO;
  usage: number;
  onApply: () => void;
}) {
  const data: DragData = { kind: "template", template };
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: `template:${template.id}`,
    data,
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onApply}
      {...attributes}
      {...listeners}
      className={cn(
        "hover:bg-line/60 block w-full cursor-grab rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
        isDragging && "opacity-40"
      )}
    >
      <TemplateCard template={template} usage={usage} />
    </button>
  );
}
