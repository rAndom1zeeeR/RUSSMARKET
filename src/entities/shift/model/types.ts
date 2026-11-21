export interface ShiftDTO {
  id: string;
  employeeId: string;
  date: string;
  start: string;
  end: string;
  templateId: string | null;
}

/** Значение смены в ячейке (без id) — то, что назначает пользователь. */
export interface ShiftValue {
  start: string;
  end: string;
  templateId: string | null;
}
