import type { EmployeeDTO } from "@/entities/employee/model/types";
import type { ScheduleDTO } from "@/entities/schedule/model/types";
import type { ShiftTemplateDTO } from "@/entities/shift-template/model/types";
import type { ShiftDTO } from "@/entities/shift/model/types";

/** Неделя 16–22 ноября 2026 (пн–вс): якорь `ANCHOR` — суббота. */
export const ANCHOR = "2026-11-21";
export const SCHEDULE_ID = "main";

export const EMPLOYEES: EmployeeDTO[] = [
  { id: "emp-1", fullName: "Кузнецова Алина", role: "агент", monthlyHours: 24, avatarUrl: "/users/user1.png" },
  { id: "emp-2", fullName: "Волков Тимур", role: "агент", monthlyHours: 24, avatarUrl: null },
  { id: "emp-3", fullName: "Морозова Виктория", role: "агент", monthlyHours: 24, avatarUrl: null },
];

export const TEMPLATES: ShiftTemplateDTO[] = [
  { id: "tpl-morning", name: "Утро", start: "07:00", end: "15:00", color: "indigo" },
  { id: "tpl-day", name: "День", start: "10:00", end: "18:00", color: "violet" },
  { id: "tpl-evening", name: "Вечер", start: "15:00", end: "23:00", color: "teal" },
];

export const SCHEDULE: ScheduleDTO = {
  id: SCHEDULE_ID,
  title: "График",
  status: "draft",
  publishedAt: null,
  updatedAt: "2026-11-20T10:00:00.000Z",
};

/** Вторник: две смены «День»; среда: одна собственная смена. */
export const SHIFTS: ShiftDTO[] = [
  { id: "s1", employeeId: "emp-1", date: "2026-11-17", start: "10:00", end: "18:00", templateId: "tpl-day" },
  { id: "s2", employeeId: "emp-2", date: "2026-11-17", start: "10:00", end: "18:00", templateId: "tpl-day" },
  { id: "s3", employeeId: "emp-1", date: "2026-11-18", start: "10:00", end: "23:00", templateId: null },
];
