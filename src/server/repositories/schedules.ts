import "server-only";
import type { ScheduleDTO } from "@/entities/schedule/model/types";
import type { SaveShiftsPayload } from "@/entities/shift/model/schemas";
import type { ShiftDTO } from "@/entities/shift/model/types";
import { cellKey } from "@/entities/shift/model/cell";
import { prisma } from "@/server/db";
import { ConflictError, prismaCode } from "@/server/errors";

interface ScheduleRow {
  id: string;
  title: string;
  status: string;
  publishedAt: Date | null;
  updatedAt: Date;
}

function toScheduleDTO(row: ScheduleRow): ScheduleDTO {
  return {
    id: row.id,
    title: row.title,
    status: row.status === "published" ? "published" : "draft",
    publishedAt: row.publishedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getSchedule(id: string): Promise<ScheduleDTO | null> {
  const row = await prisma.schedule.findUnique({ where: { id } });
  return row ? toScheduleDTO(row) : null;
}

export async function getFirstScheduleId(): Promise<string | null> {
  const row = await prisma.schedule.findFirst({
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });
  return row?.id ?? null;
}

export async function listShifts(scheduleId: string, from: string, to: string): Promise<ShiftDTO[]> {
  const rows = await prisma.shift.findMany({
    where: { scheduleId, date: { gte: from, lte: to } },
    orderBy: { date: "asc" },
  });
  return rows.map(({ id, employeeId, date, start, end, templateId }) => ({
    id,
    employeeId,
    date,
    start,
    end,
    templateId,
  }));
}

/**
 * Размер пачек под лимит параметров запроса. Prisma для SQLite пропускает не больше 999 параметров:
 * удаление по паре (сотрудник, дата) стоит 2 параметра, вставка смены — 7 полей. Postgres принимает
 * намного больше, но те же пачки держат запросы короткими и там.
 */
const DELETE_BATCH = 400; // 1 (scheduleId) + 2 × 400 = 801 параметр
const CREATE_BATCH = 120; // 7 × 120 = 840 параметров

function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}

/**
 * Применяет diff правок одной транзакцией. Любая правка возвращает график в черновик.
 *
 * Все затронутые ячейки (и удалённые, и изменённые) удаляются пачками, затем новые значения вставляются
 * пачками через `createMany`. Это несколько запросов на любой размер diff вместо запроса на каждую смену.
 * Транзакция пакетная (`$transaction([...])`): у неё нет таймаута интерактивной транзакции, который
 * на Postgres по сети срабатывал бы на больших сохранениях. У изменённой смены меняется `id` —
 * клиент работает с ячейками (`employeeId|date`), а не с id.
 */
export async function saveShifts(
  scheduleId: string,
  { upserts, deletes, expectedUpdatedAt }: SaveShiftsPayload
): Promise<ScheduleDTO> {
  // Если ячейка пришла дважды, побеждает последнее значение: в базе на ячейку одна смена.
  const finalValues = new Map(upserts.map(shift => [cellKey(shift.employeeId, shift.date), shift]));
  const touched = new Map<string, { employeeId: string; date: string }>();
  for (const { employeeId, date } of [...deletes, ...upserts])
    touched.set(cellKey(employeeId, date), { employeeId, date });

  const writes = [
    ...chunk([...touched.values()], DELETE_BATCH).map(cells =>
      prisma.shift.deleteMany({ where: { scheduleId, OR: cells } })
    ),
    ...chunk([...finalValues.values()], CREATE_BATCH).map(rows =>
      prisma.shift.createMany({
        data: rows.map(({ employeeId, date, start, end, templateId }) => ({
          scheduleId,
          employeeId,
          date,
          start,
          end,
          templateId,
        })),
      })
    ),
  ];

  // Обновление графика идёт первым: несуществующий график или чужая правка (не совпал `updatedAt`)
  // обрывает транзакцию до записи смен, ничего не меняя.
  const where = expectedUpdatedAt ? { id: scheduleId, updatedAt: new Date(expectedUpdatedAt) } : { id: scheduleId };
  try {
    const [schedule] = await prisma.$transaction([
      prisma.schedule.update({ where, data: { status: "draft", publishedAt: null } }),
      ...writes,
    ]);
    return toScheduleDTO(schedule);
  } catch (error) {
    // «Запись не найдена» при заданной версии: либо графика нет (тогда это обычная ошибка), либо он изменился.
    if (expectedUpdatedAt && prismaCode(error) === "P2025") {
      const exists = await prisma.schedule.findUnique({ where: { id: scheduleId }, select: { id: true } });
      if (exists) throw new ConflictError();
    }
    throw error;
  }
}

export async function publishSchedule(id: string): Promise<ScheduleDTO> {
  const row = await prisma.schedule.update({
    where: { id },
    data: { status: "published", publishedAt: new Date() },
  });
  return toScheduleDTO(row);
}
