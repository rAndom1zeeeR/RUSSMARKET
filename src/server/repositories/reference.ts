import "server-only";
import type { EmployeeDTO } from "@/entities/employee/model/types";
import type { ShiftTemplateDTO, TemplateColor } from "@/entities/shift-template/model/types";
import { prisma } from "@/server/db";

function toTemplateColor(value: string): TemplateColor {
  return value === "violet" || value === "teal" ? value : "indigo";
}

export async function listEmployees(): Promise<EmployeeDTO[]> {
  const rows = await prisma.employee.findMany({ orderBy: { sort: "asc" } });
  return rows.map(({ id, fullName, role, monthlyHours, avatarUrl }) => ({
    id,
    fullName,
    role,
    monthlyHours,
    avatarUrl,
  }));
}

export async function listTemplates(): Promise<ShiftTemplateDTO[]> {
  const rows = await prisma.shiftTemplate.findMany({ orderBy: { sort: "asc" } });
  return rows.map(({ id, name, start, end, color }) => ({
    id,
    name,
    start,
    end,
    color: toTemplateColor(color),
  }));
}
