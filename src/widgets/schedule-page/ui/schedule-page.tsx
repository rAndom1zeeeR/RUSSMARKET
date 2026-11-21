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
import { cn } from "@/shared/lib/utils";
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

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 lg:h-12 lg:flex-nowrap">
        <h1 className="text-2xl leading-8 font-medium tracking-[-1px] md:text-[32px]">График</h1>
        <ScheduleActions scheduleId={scheduleId} />
      </div>

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
        {hasSelection && <div className="h-16 shrink-0 lg:hidden" aria-hidden />}
      </ShiftDndProvider>
    </AppShell>
  );
}
