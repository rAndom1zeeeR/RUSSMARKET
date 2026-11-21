import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ru } from "date-fns/locale";

export type CalendarView = "week" | "month";

const ISO_DATE = "yyyy-MM-dd";

function toISODate(date: Date): string {
  return format(date, ISO_DATE);
}

export function fromISODate(value: string): Date {
  return parseISO(value);
}

export function todayISO(): string {
  return toISODate(new Date());
}

export interface DateRange {
  from: string;
  to: string;
  days: string[];
}

export function getRange(view: CalendarView, anchor: string): DateRange {
  const date = fromISODate(anchor);
  const start = view === "week" ? startOfWeek(date, { weekStartsOn: 1 }) : startOfMonth(date);
  const end = view === "week" ? endOfWeek(date, { weekStartsOn: 1 }) : endOfMonth(date);
  const days = eachDayOfInterval({ start, end }).map(toISODate);
  return { from: toISODate(start), to: toISODate(end), days };
}

export function stepAnchor(view: CalendarView, anchor: string, direction: 1 | -1): string {
  const date = fromISODate(anchor);
  return toISODate(view === "week" ? addWeeks(date, direction) : addMonths(date, direction));
}

export function weekdayShort(iso: string): string {
  return format(fromISODate(iso), "EEEEEE", { locale: ru });
}

export function dayOfMonth(iso: string): number {
  return fromISODate(iso).getDate();
}

export function rangeTitle(view: CalendarView, range: DateRange): string {
  const start = fromISODate(range.from);
  if (view === "month") return format(start, "LLLL yyyy", { locale: ru });
  const end = fromISODate(range.to);
  return start.getMonth() === end.getMonth()
    ? `${format(start, "d", { locale: ru })} – ${format(end, "d MMMM yyyy", { locale: ru })}`
    : `${format(start, "d MMM", { locale: ru })} – ${format(end, "d MMM yyyy", { locale: ru })}`;
}
