import type { ShiftValue } from "@/entities/shift/model/types";
import { create } from "zustand";
import { todayISO, type CalendarView } from "@/shared/lib/date";

/**
 * UI-состояние страницы графика.
 * Серверные данные (смены, сотрудники, шаблоны) живут в TanStack Query;
 * здесь — только то, что принадлежит клиенту, и черновик несохранённых правок.
 */
interface ScheduleUiState {
  view: CalendarView;
  anchor: string;
  search: string;

  selection: ReadonlySet<string>;
  selectionAnchor: string | null;

  customStart: string;
  customEnd: string;

  /** Черновик правок: ключ ячейки → новое значение смены или null (смена удалена). */
  draft: Readonly<Record<string, ShiftValue | null>>;

  setView: (view: CalendarView) => void;
  setAnchor: (anchor: string) => void;
  setSearch: (search: string) => void;

  setSelection: (keys: Iterable<string>, anchor?: string | null) => void;
  toggleCell: (key: string) => void;
  clearSelection: () => void;

  setCustomTime: (patch: Partial<Pick<ScheduleUiState, "customStart" | "customEnd">>) => void;

  /** Назначить значение (или удалить смену при null) во все ячейки. */
  setCells: (keys: Iterable<string>, value: ShiftValue | null) => void;
  clearDraft: () => void;
}

export const useScheduleStore = create<ScheduleUiState>(set => ({
  view: "week",
  anchor: todayISO(),
  search: "",

  selection: new Set(),
  selectionAnchor: null,

  customStart: "09:00",
  customEnd: "17:00",

  draft: {},

  setView: view => set({ view, selection: new Set(), selectionAnchor: null }),
  setAnchor: anchor => set({ anchor, selection: new Set(), selectionAnchor: null }),
  setSearch: search => set({ search }),

  setSelection: (keys, anchor) =>
    set(state => ({
      selection: new Set(keys),
      selectionAnchor: anchor === undefined ? state.selectionAnchor : anchor,
    })),
  toggleCell: key =>
    set(state => {
      const next = new Set(state.selection);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { selection: next, selectionAnchor: key };
    }),
  clearSelection: () => set({ selection: new Set(), selectionAnchor: null }),

  setCustomTime: patch => set(patch),

  setCells: (keys, value) =>
    set(state => {
      const draft = { ...state.draft };
      for (const key of keys) draft[key] = value;
      return { draft };
    }),
  clearDraft: () => set({ draft: {} }),
}));
