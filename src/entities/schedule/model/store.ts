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
  /** График, которому принадлежат черновик и выделение (ключ ячейки `сотрудник|дата` его не содержит). */
  scheduleId: string | null;
  /**
   * Дата, от которой строится период. `null`, пока страница не смонтировалась в браузере: «сегодня»
   * считается на клиенте (`ensureAnchor`), а не при загрузке модуля. Иначе сервер подставил бы дату
   * своего запуска и свой часовой пояс, и серверный HTML разошёлся бы с клиентским при гидратации.
   */
  anchor: string | null;
  search: string;

  selection: ReadonlySet<string>;
  selectionAnchor: string | null;

  customStart: string;
  customEnd: string;

  /** Черновик правок: ключ ячейки → новое значение смены или null (смена удалена). */
  draft: Readonly<Record<string, ShiftValue | null>>;

  setView: (view: CalendarView) => void;
  /** При смене графика черновик и выделение сбрасываются: правки одного графика не должны уйти в другой. */
  bindSchedule: (scheduleId: string) => void;
  setAnchor: (anchor: string) => void;
  /** Выставляет «сегодня», если дата ещё не задана. Вызывать только на клиенте. */
  ensureAnchor: () => void;
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
  scheduleId: null,
  anchor: null,
  search: "",

  selection: new Set(),
  selectionAnchor: null,

  customStart: "09:00",
  customEnd: "17:00",

  draft: {},

  setView: view => set({ view, selection: new Set(), selectionAnchor: null }),
  bindSchedule: scheduleId =>
    set(state =>
      state.scheduleId === scheduleId ? {} : { scheduleId, draft: {}, selection: new Set(), selectionAnchor: null }
    ),
  setAnchor: anchor => set({ anchor, selection: new Set(), selectionAnchor: null }),
  ensureAnchor: () => set(state => (state.anchor === null ? { anchor: todayISO() } : {})),
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
