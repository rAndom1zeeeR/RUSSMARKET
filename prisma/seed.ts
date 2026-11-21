import { existsSync } from "node:fs";
import { addDays, format, startOfWeek } from "date-fns";
import { createPrismaClient } from "../src/server/create-client";
import { DEFAULT_DATABASE_URL } from "./database-url";

if (existsSync(".env")) process.loadEnvFile(".env");

const SCHEDULE_ID = "main";

const TEMPLATES = [
  { id: "tpl-morning", name: "Утро", start: "07:00", end: "15:00", color: "indigo", sort: 1 },
  { id: "tpl-day", name: "День", start: "10:00", end: "18:00", color: "violet", sort: 2 },
  { id: "tpl-evening", name: "Вечер", start: "15:00", end: "23:00", color: "teal", sort: 3 },
] as const;

const EMPLOYEES = [
  { id: "emp-1", fullName: "Кузнецова Алина", avatarUrl: "/users/user1.png" },
  { id: "emp-2", fullName: "Волков Тимур", avatarUrl: "/users/user2.png" },
  { id: "emp-3", fullName: "Морозова Виктория", avatarUrl: "/users/user3.png" },
  { id: "emp-4", fullName: "Соколов Артём", avatarUrl: "/users/user4.png" },
  { id: "emp-5", fullName: "Лебедева Полина", avatarUrl: "/users/user5.png" },
  { id: "emp-6", fullName: "Новиков Кирилл", avatarUrl: "/users/user6.png" },
  { id: "emp-7", fullName: "Ерохина Дарья", avatarUrl: "/users/user7.png" },
  { id: "emp-8", fullName: "Гаврилов Егор", avatarUrl: "/users/user8.png" },
] as const;

type Cell = { employeeId: string; day: number; templateId: string | null; start: string; end: string };

const tpl = (employeeId: string, day: number, templateId: string): Cell => {
  const t = TEMPLATES.find(item => item.id === templateId);
  if (!t) throw new Error(`Unknown template ${templateId}`);
  return { employeeId, day, templateId, start: t.start, end: t.end };
};

/** day: смещение от понедельника текущей недели (0 = пн). */
const SHIFTS: Cell[] = [
  tpl("emp-1", 1, "tpl-day"),
  tpl("emp-1", 2, "tpl-day"),
  { employeeId: "emp-1", day: 3, templateId: null, start: "10:00", end: "23:00" },
  { employeeId: "emp-1", day: 4, templateId: null, start: "10:00", end: "23:00" },
  tpl("emp-2", 1, "tpl-day"),
  tpl("emp-2", 2, "tpl-day"),
  tpl("emp-2", 4, "tpl-evening"),
  tpl("emp-3", 3, "tpl-day"),
  tpl("emp-4", 3, "tpl-day"),
  tpl("emp-5", 1, "tpl-morning"),
  tpl("emp-5", 3, "tpl-day"),
  tpl("emp-5", 4, "tpl-day"),
];

/** `--force` или `SEED_FORCE=1`: разрешает затереть уже существующие данные. */
const FORCE = process.argv.includes("--force") || process.env.SEED_FORCE === "1";

/**
 * Сидирует ту базу, на которую указывает DATABASE_URL: SQLite (file:) или Postgres (postgresql://).
 * Сидер удаляет все данные, поэтому на непустой базе без `--force` он отказывается работать:
 * случайный `pnpm db:setup` с боевым URL ничего не сотрёт.
 */
async function main() {
  const prisma = await createPrismaClient(process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL);
  try {
    const schedules = await prisma.schedule.count();
    if (schedules > 0 && !FORCE) {
      console.error(
        `Сидер не запущен: в базе уже есть графики (${schedules}). Он удаляет все данные. ` +
          "Чтобы пересоздать их осознанно: pnpm db:reseed (или SEED_FORCE=1)."
      );
      process.exitCode = 1;
      return;
    }
    await seed(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

async function seed(prisma: Awaited<ReturnType<typeof createPrismaClient>>) {
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });

  await prisma.$transaction(async tx => {
    await tx.shift.deleteMany();
    await tx.schedule.deleteMany();
    await tx.shiftTemplate.deleteMany();
    await tx.employee.deleteMany();

    await tx.shiftTemplate.createMany({ data: TEMPLATES.map(t => ({ ...t })) });
    await tx.employee.createMany({
      data: EMPLOYEES.map((e, index) => ({
        id: e.id,
        fullName: e.fullName,
        avatarUrl: e.avatarUrl,
        role: "агент",
        monthlyHours: 24,
        sort: index + 1,
      })),
    });
    await tx.schedule.create({
      data: { id: SCHEDULE_ID, title: "График", status: "draft" },
    });
    await tx.shift.createMany({
      data: SHIFTS.map(({ day, ...cell }) => ({
        ...cell,
        scheduleId: SCHEDULE_ID,
        date: format(addDays(monday, day), "yyyy-MM-dd"),
      })),
    });
  });

  console.log(`Seed: ${EMPLOYEES.length} сотрудников, ${TEMPLATES.length} шаблона, ${SHIFTS.length} смен`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
