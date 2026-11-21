import { prisma } from "@/server/db";

export const SCHEDULE_ID = "sched-1";

export const EMPLOYEES = [
  { id: "emp-1", fullName: "Кузнецова Алина", sort: 1 },
  { id: "emp-2", fullName: "Волков Тимур", sort: 2 },
] as const;

const TEMPLATES = [
  { id: "tpl-morning", name: "Утро", start: "07:00", end: "15:00", color: "indigo", sort: 1 },
  { id: "tpl-day", name: "День", start: "10:00", end: "18:00", color: "violet", sort: 2 },
  { id: "tpl-evening", name: "Вечер", start: "15:00", end: "23:00", color: "teal", sort: 3 },
] as const;

/** Очищает все таблицы и создаёт минимальный набор: 2 сотрудника, 3 шаблона, 1 график. */
export async function resetDb(): Promise<void> {
  await prisma.shift.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.shiftTemplate.deleteMany();
  await prisma.employee.deleteMany();

  await prisma.employee.createMany({ data: [...EMPLOYEES] });
  await prisma.shiftTemplate.createMany({ data: [...TEMPLATES] });
  await prisma.schedule.create({ data: { id: SCHEDULE_ID, title: "График" } });
}
