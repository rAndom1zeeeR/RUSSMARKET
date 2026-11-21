"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useScheduleStore } from "@/entities/schedule/model/store";
import { Button } from "@/shared/components/ui/button";
import { SearchInput } from "@/shared/components/ui/search-input";
import { SegmentedControl } from "@/shared/components/ui/segmented-control";
import { type CalendarView, stepAnchor, todayISO } from "@/shared/lib/date";

const VIEW_OPTIONS = [
  { value: "month", label: "Месяц" },
  { value: "week", label: "Неделя" },
] as const;

/** Поиск по ФИО, навигация по датам и переключатель Месяц/Неделя (398 + 301 px слева, 256 px блок дат справа). */
export function ScheduleToolbar({ title }: { title: string }) {
  const view = useScheduleStore(state => state.view);
  const anchor = useScheduleStore(state => state.anchor);
  const search = useScheduleStore(state => state.search);
  const setView = useScheduleStore(state => state.setView);
  const setAnchor = useScheduleStore(state => state.setAnchor);
  const setSearch = useScheduleStore(state => state.setSearch);

  return (
    <div className="flex items-center gap-2">
      <SearchInput
        value={search}
        onValueChange={setSearch}
        placeholder="Поиск по ФИО"
        aria-label="Поиск по ФИО"
        className="max-w-99.5 min-w-45 flex-1"
      />
      <SegmentedControl<CalendarView> aria-label="Период" value={view} onValueChange={setView} options={VIEW_OPTIONS} />
      <div className="ml-auto flex h-12 w-[256px] shrink-0 items-center justify-between">
        <Button
          variant="secondary"
          size="icon"
          aria-label="Предыдущий период"
          onClick={() => setAnchor(stepAnchor(view, anchor, -1))}
        >
          <ChevronLeft />
        </Button>
        <button
          type="button"
          title="Перейти к текущему периоду"
          onClick={() => setAnchor(todayISO())}
          className="hover:bg-muted min-w-0 flex-1 truncate rounded-lg px-1 py-1 text-center text-sm first-letter:uppercase"
          aria-live="polite"
        >
          {title}
        </button>
        <Button
          variant="secondary"
          size="icon"
          aria-label="Следующий период"
          onClick={() => setAnchor(stepAnchor(view, anchor, 1))}
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
