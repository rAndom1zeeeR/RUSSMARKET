"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useScheduleStore } from "@/entities/schedule/model/store";
import { SelectionToolbar } from "@/features/cell-selection/ui/selection-toolbar";
import { ShiftPanel } from "@/features/custom-shift/ui/shift-panel";
import { QuickAssignMenu } from "@/features/quick-assign/ui/quick-assign-menu";
import { ScheduleActions } from "@/features/schedule-actions/ui/schedule-actions";
import { useScheduleData } from "@/features/schedule-grid/model/use-schedule-data";
import { ScheduleGrid } from "@/features/schedule-grid/ui/schedule-grid";
import { ScheduleToolbar } from "@/features/schedule-toolbar/ui/schedule-toolbar";
import { ShiftDndProvider } from "@/features/shift-dnd/ui/shift-dnd-provider";
import { rangeTitle } from "@/shared/lib/date";
import { AppShell } from "./app-shell";

export function SchedulePage({ scheduleId }: { scheduleId: string }) {
  const data = useScheduleData(scheduleId);
  const hasSelection = useScheduleStore(state => state.selection.size > 0);
  const { view, range, employees, templates, shifts, coverage, usage } = data;

  return (
    <AppShell>
      <div className="flex h-10 shrink-0 items-center gap-3">
        <Link
          href="/"
          aria-label="Назад к графикам смен"
          className="bg-surface flex size-10 shrink-0 items-center justify-center rounded-full"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <span className="text-base">Графики смен</span>
      </div>

      <div className="flex h-12 shrink-0 items-center justify-between">
        <h1 className="text-[32px] leading-8 font-medium tracking-[-1px]">График</h1>
        <ScheduleActions scheduleId={scheduleId} />
      </div>

      <ShiftDndProvider view={view} templates={templates}>
        <div className="flex max-h-186 min-h-0 flex-1 gap-2">
          <section className="bg-surface flex min-h-0 min-w-0 flex-1 flex-col gap-5 rounded-[20px] p-3">
            <div className="h-12 shrink-0">
              {hasSelection ? (
                <SelectionToolbar shifts={shifts} templates={templates} />
              ) : (
                <ScheduleToolbar title={rangeTitle(view, range)} />
              )}
            </div>

            {data.error ? (
              <p role="alert" className="text-danger p-6 text-sm">
                {data.error.message}
              </p>
            ) : data.isLoading ? (
              <p className="text-muted-foreground p-6 text-sm">Загрузка графика…</p>
            ) : (
              <ScheduleGrid
                view={view}
                range={range}
                employees={employees}
                shifts={shifts}
                coverage={coverage}
                templates={templates}
                renderDayHeader={(date, label) => (
                  <QuickAssignMenu
                    date={date}
                    employeeIds={employees.map(employee => employee.id)}
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
      </ShiftDndProvider>
    </AppShell>
  );
}
