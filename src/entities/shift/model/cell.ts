const SEPARATOR = "|";

/** Ключ ячейки на пересечении сотрудника и даты. */
export function cellKey(employeeId: string, date: string): string {
  return `${employeeId}${SEPARATOR}${date}`;
}

export function parseCellKey(key: string): { employeeId: string; date: string } {
  const index = key.lastIndexOf(SEPARATOR);
  return { employeeId: key.slice(0, index), date: key.slice(index + 1) };
}
