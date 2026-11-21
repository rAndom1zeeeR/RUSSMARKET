import { z } from "zod";

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Формат HH:mm");
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Формат YYYY-MM-DD");

const shiftInputSchema = z.object({
  employeeId: z.string().min(1),
  date: dateSchema,
  start: timeSchema,
  end: timeSchema,
  templateId: z.string().min(1).nullable(),
});

const cellRefSchema = z.object({
  employeeId: z.string().min(1),
  date: dateSchema,
});

export const saveShiftsSchema = z.object({
  upserts: z.array(shiftInputSchema).max(5000),
  deletes: z.array(cellRefSchema).max(5000),
  /**
   * `updatedAt` графика, который видел клиент. Если график с тех пор менялся, сервер отвечает 409
   * вместо того, чтобы молча затереть чужие правки. Без поля проверки нет.
   */
  expectedUpdatedAt: z.iso.datetime().optional(),
});

/** Самый длинный запрашиваемый период: месяц с запасом (для «Месяца» нужно до 31 дня). */
export const MAX_PERIOD_DAYS = 62;

const DAY_MS = 24 * 60 * 60 * 1000;
const dayNumber = (date: string) => Date.parse(`${date}T00:00:00Z`) / DAY_MS;

export const shiftsQuerySchema = z
  .object({
    from: dateSchema,
    to: dateSchema,
  })
  .refine(({ from, to }) => !Number.isNaN(dayNumber(from)) && !Number.isNaN(dayNumber(to)), {
    message: "Несуществующая дата",
  })
  .refine(({ from, to }) => from <= to, { message: "Начало периода позже конца" })
  .refine(({ from, to }) => dayNumber(to) - dayNumber(from) + 1 <= MAX_PERIOD_DAYS, {
    message: `Период не может быть длиннее ${MAX_PERIOD_DAYS} дней`,
  });

export type SaveShiftsPayload = z.infer<typeof saveShiftsSchema>;
