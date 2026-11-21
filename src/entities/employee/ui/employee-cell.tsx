import type { EmployeeDTO } from "../model/types";
import Image from "next/image";

function initials(fullName: string): string {
  return fullName
    .split(" ")
    .slice(0, 2)
    .map(part => part.charAt(0))
    .join("")
    .toUpperCase();
}

function EmployeeAvatar({ employee }: { employee: EmployeeDTO }) {
  if (employee.avatarUrl) {
    return (
      <Image
        src={employee.avatarUrl}
        alt=""
        width={40}
        height={40}
        className="size-10 shrink-0 rounded-md object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden
      className="from-brand flex size-10 shrink-0 items-center justify-center rounded-md bg-linear-to-b to-[#7da2ff] text-sm font-medium text-white"
    >
      {initials(employee.fullName)}
    </span>
  );
}

/** Ячейка сотрудника: аватар, ФИО, «роль · N ч». */
export function EmployeeCell({ employee }: { employee: EmployeeDTO }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <EmployeeAvatar employee={employee} />
      <div className="min-w-0">
        <div className="truncate text-base leading-6">{employee.fullName}</div>
        <div className="text-muted-foreground text-xs leading-4">
          {employee.role} · {employee.monthlyHours} ч
        </div>
      </div>
    </div>
  );
}
