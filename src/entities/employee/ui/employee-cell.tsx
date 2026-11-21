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
        className="size-8 shrink-0 rounded-md object-cover md:size-10"
      />
    );
  }
  return (
    <span
      aria-hidden
      className="from-brand flex size-8 shrink-0 items-center justify-center rounded-md bg-linear-to-b to-[#7da2ff] text-xs font-medium text-white md:size-10 md:text-sm"
    >
      {initials(employee.fullName)}
    </span>
  );
}

/** Ячейка сотрудника: аватар, ФИО, «роль · N ч». */
export function EmployeeCell({ employee }: { employee: EmployeeDTO }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5 md:gap-2">
      <EmployeeAvatar employee={employee} />
      <div className="min-w-0">
        <div className="text-xs leading-4 md:truncate md:text-base md:leading-6">{employee.fullName}</div>
        <div className="text-muted-foreground hidden text-xs leading-4 md:block">
          {employee.role} · {employee.monthlyHours} ч
        </div>
      </div>
    </div>
  );
}
