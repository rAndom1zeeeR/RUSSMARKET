"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useLayoutEffect } from "react";
import { useScheduleStore } from "@/entities/schedule/model/store";
import { parseCellKey } from "@/entities/shift/model/cell";
import { SelectionToolbar } from "@/features/cell-selection/ui/selection-toolbar";
import { ShiftPanel } from "@/features/custom-shift/ui/shift-panel";
import { QuickAssignMenu } from "@/features/quick-assign/ui/quick-assign-menu";
import { useUnsavedChangesGuard } from "@/features/schedule-actions/model/use-unsaved-changes-guard";
import { ScheduleActions } from "@/features/schedule-actions/ui/schedule-actions";
import { useScheduleData } from "@/features/schedule-grid/model/use-schedule-data";
import { ScheduleGrid } from "@/features/schedule-grid/ui/schedule-grid";
import { ScheduleToolbar } from "@/features/schedule-toolbar/ui/schedule-toolbar";
import { ShiftDndProvider } from "@/features/shift-dnd/ui/shift-dnd-provider";
import { rangeTitle } from "@/shared/lib/date";
import { cn } from "@/shared/lib/utils";

export function SchedulePage({ scheduleId }: { scheduleId: string }) {
  const anchor = useScheduleStore(state => state.anchor);
  const ensureAnchor = useScheduleStore(state => state.ensureAnchor);
  const bindSchedule = useScheduleStore(state => state.bindSchedule);
  const hasUnsavedChanges = useScheduleStore(state => Object.keys(state.draft).length > 0);

  // «Сегодня» — только в браузере и в часовом поясе пользователя. Layout-эффект срабатывает до отрисовки,
  // поэтому мигания нет, а серверный HTML от даты не зависит и при гидратации не расходится с клиентом.
  // Заодно хранилище привязывается к графику: при смене графика черновик и выделение сбрасываются.
  useLayoutEffect(() => {
    ensureAnchor();
    bindSchedule(scheduleId);
  }, [ensureAnchor, bindSchedule, scheduleId]);

  useUnsavedChangesGuard(hasUnsavedChanges);

  return (
    <>
      <div className="flex h-10 shrink-0 items-center gap-3">
        <Link
          href="/"
          aria-label="На главную"
          className="bg-surface flex size-10 shrink-0 items-center justify-center rounded-full"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <span className="text-base">Графики смен</span>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 lg:h-12 lg:flex-nowrap">
        <h1 className="text-2xl leading-8 font-medium tracking-[-1px] md:text-[32px]">График</h1>
        <ScheduleActions scheduleId={scheduleId} />
      </div>

      {anchor === null ? (
        <section className="bg-surface rounded-2xl p-2 md:rounded-[20px] md:p-3">
          <p className="text-muted-foreground p-6 text-sm">Загрузка графика…</p>
        </section>
      ) : (
        <ScheduleWorkspace scheduleId={scheduleId} anchor={anchor} />
      )}
    </>
  );
}

/** Сетка, тулбары и панель шаблонов — рендерятся, когда дата периода уже известна. */
function ScheduleWorkspace({ scheduleId, anchor }: { scheduleId: string; anchor: string }) {
  const data = useScheduleData(scheduleId, anchor);
  const hasSelection = useScheduleStore(state => state.selection.size > 0);
  const { view, range, employees, allEmployees, templates, shifts, coverage, usage } = data;

  // Поиск скрывает сотрудников — выделение их ячеек тоже снимается, чтобы «Очистить» и «Применить шаблон»
  // не затрагивали то, чего на экране не видно.
  useEffect(() => {
    if (data.isLoading) return;
    const { selection, selectionAnchor, setSelection } = useScheduleStore.getState();
    if (selection.size === 0) return;
    const visible = new Set(employees.map(employee => employee.id));
    const kept = [...selection].filter(key => visible.has(parseCellKey(key).employeeId));
    if (kept.length === selection.size) return;
    setSelection(kept, selectionAnchor !== null && kept.includes(selectionAnchor) ? selectionAnchor : null);
  }, [employees, data.isLoading]);

  return (
    <>
      <ShiftDndProvider view={view} templates={templates}>
        <div className="flex shrink-0 flex-col gap-2 lg:max-h-186 lg:min-h-0 lg:flex-1 lg:shrink lg:flex-row">
          <section className="bg-surface flex min-w-0 shrink-0 flex-col gap-3 rounded-2xl p-2 md:rounded-[20px] md:p-3 lg:h-auto lg:min-h-0 lg:flex-1 lg:shrink lg:gap-5">
            <div className="relative shrink-0">
              <div className={cn(hasSelection && "lg:invisible")}>
                <ScheduleToolbar title={rangeTitle(view, range)} />
              </div>
              {hasSelection && (
                // sm/md: панель плавает внизу экрана; lg: перекрывает тулбар на его месте (как в макете),
                // а сам тулбар остаётся в потоке невидимым — сетка не «прыгает» при выделении.
                <div className="fixed inset-x-3 bottom-3 z-30 shadow-xl md:inset-x-6 lg:absolute lg:inset-x-0 lg:top-0 lg:bottom-auto lg:z-10 lg:shadow-none">
                  <SelectionToolbar shifts={shifts} templates={templates} />
                </div>
              )}
            </div>

            <p role="status" className="sr-only">
              {data.isPlaceholderData ? "Загружаем период…" : ""}
            </p>
            {data.error ? (
              <p role="alert" className="text-danger p-6 text-sm">
                {data.error.message}
              </p>
            ) : data.isLoading ? (
              <p className="text-muted-foreground p-6 text-sm">Загрузка графика…</p>
            ) : (
              <ScheduleGrid
                busy={data.isPlaceholderData}
                view={view}
                range={range}
                employees={employees}
                shifts={shifts}
                coverage={coverage}
                templates={templates}
                renderDayHeader={(date, label) => (
                  <QuickAssignMenu
                    date={date}
                    employeeIds={allEmployees.map(employee => employee.id)}
                    templates={templates}
                  >
                    {label}
                  </QuickAssignMenu>
                )}
              />
            )}
          </section>
          <ShiftPanel templates={templates} usage={usage} />
        </div>
        {hasSelection && <div className="h-16 shrink-0 lg:hidden" aria-hidden />}
      </ShiftDndProvider>
    </>
  );
}
