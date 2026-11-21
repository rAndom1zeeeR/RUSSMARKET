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
});

export const shiftsQuerySchema = z.object({
  from: dateSchema,
  to: dateSchema,
});

export type SaveShiftsPayload = z.infer<typeof saveShiftsSchema>;
