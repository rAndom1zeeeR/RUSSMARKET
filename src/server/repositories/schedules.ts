import "server-only";
import type { ScheduleDTO } from "@/entities/schedule/model/types";
import type { SaveShiftsPayload } from "@/entities/shift/model/schemas";
import type { ShiftDTO } from "@/entities/shift/model/types";
import { prisma } from "@/server/db";

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

/** Применяет diff правок одной транзакцией. Любая правка возвращает график в черновик. */
export async function saveShifts(scheduleId: string, { upserts, deletes }: SaveShiftsPayload): Promise<ScheduleDTO> {
  const schedule = await prisma.$transaction(async tx => {
    if (deletes.length > 0) {
      await tx.shift.deleteMany({
        where: {
          scheduleId,
          OR: deletes.map(({ employeeId, date }) => ({ employeeId, date })),
        },
      });
    }
    await Promise.all(
      upserts.map(({ employeeId, date, start, end, templateId }) =>
        tx.shift.upsert({
          where: { scheduleId_employeeId_date: { scheduleId, employeeId, date } },
          create: { scheduleId, employeeId, date, start, end, templateId },
          update: { start, end, templateId },
        })
      )
    );
    return tx.schedule.update({
      where: { id: scheduleId },
      data: { status: "draft", publishedAt: null },
    });
  });
  return toScheduleDTO(schedule);
}

export async function publishSchedule(id: string): Promise<ScheduleDTO> {
  const row = await prisma.schedule.update({
    where: { id },
    data: { status: "published", publishedAt: new Date() },
  });
  return toScheduleDTO(row);
}
