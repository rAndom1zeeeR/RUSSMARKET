"use client";

import type { SaveShiftsPayload } from "@/entities/shift/model/schemas";
import { useQuery } from "@tanstack/react-query";
import { usePublishSchedule, scheduleQuery } from "@/entities/schedule/api/queries";
import { useScheduleStore } from "@/entities/schedule/model/store";
import { useSaveShifts } from "@/entities/shift/api/queries";
import { parseCellKey } from "@/entities/shift/model/cell";
import { Button } from "@/shared/components/ui/button";

/** Кнопки «Опубликовать» и «Сохранить». Сохранение отправляет diff черновика одной транзакцией. */
export function ScheduleActions({ scheduleId }: { scheduleId: string }) {
  const draft = useScheduleStore(state => state.draft);
  const clearDraft = useScheduleStore(state => state.clearDraft);
  const { data: schedule } = useQuery(scheduleQuery(scheduleId));

  const save = useSaveShifts(scheduleId, clearDraft);
  const publish = usePublishSchedule(scheduleId);

  const dirty = Object.keys(draft).length > 0;

  const handleSave = () => {
    const payload: SaveShiftsPayload = { upserts: [], deletes: [] };
    for (const [key, value] of Object.entries(draft)) {
      const { employeeId, date } = parseCellKey(key);
      if (value) payload.upserts.push({ employeeId, date, ...value });
      else payload.deletes.push({ employeeId, date });
    }
    save.mutate(payload);
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        tone="brand"
        variant="secondary"
        size="lg"
        disabled={dirty || publish.isPending || schedule?.status === "published"}
        title={dirty ? "Сначала сохраните изменения" : undefined}
        onClick={() => publish.mutate()}
      >
        {schedule?.status === "published" ? "Опубликовано" : "Опубликовать"}
      </Button>
      <Button tone="brand" variant="primary" size="lg" disabled={!dirty || save.isPending} onClick={handleSave}>
        {save.isPending ? "Сохранение…" : "Сохранить"}
      </Button>
    </div>
  );
}
