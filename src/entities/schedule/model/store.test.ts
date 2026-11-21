import { beforeEach, describe, expect, it, vi } from "vitest";
import { useScheduleStore } from "./store";

const A = "emp-1|2026-11-16";
const B = "emp-1|2026-11-17";
const C = "emp-2|2026-11-17";
const VALUE = { start: "10:00", end: "18:00", templateId: "tpl-day" };

const state = () => useScheduleStore.getState();

beforeEach(() => {
  useScheduleStore.setState(useScheduleStore.getInitialState(), true);
});

describe("начальное состояние", () => {
  it("неделя, пустой поиск и выделение, время своей смены по умолчанию", () => {
    expect(state().view).toBe("week");
    expect(state().search).toBe("");
    expect(state().selection.size).toBe(0);
    expect(state().selectionAnchor).toBeNull();
    expect([state().customStart, state().customEnd]).toEqual(["09:00", "17:00"]);
    expect(state().draft).toEqual({});
  });

  it("при загрузке модуля дата периода не считается: anchor = null", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 21));
    vi.resetModules();
    const { useScheduleStore: fresh } = await import("./store");
    expect(fresh.getState().anchor).toBeNull();
    vi.useRealTimers();
  });

  it("ensureAnchor выставляет «сегодня» по часам того, кто вызывает", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 21, 23, 30));
    state().ensureAnchor();
    expect(state().anchor).toBe("2026-11-21");
    vi.useRealTimers();
  });

  it("ensureAnchor не перетирает уже выбранный период", () => {
    state().setAnchor("2027-03-10");
    state().ensureAnchor();
    expect(state().anchor).toBe("2027-03-10");
  });
});

describe("выделение", () => {
  it("setSelection заменяет выделение и запоминает якорь", () => {
    state().setSelection([A, B], A);
    expect([...state().selection]).toEqual([A, B]);
    expect(state().selectionAnchor).toBe(A);
  });

  it("setSelection без якоря сохраняет прежний", () => {
    state().setSelection([A], A);
    state().setSelection([B, C]);
    expect(state().selectionAnchor).toBe(A);
  });

  it("setSelection(…, null) сбрасывает якорь", () => {
    state().setSelection([A], A);
    state().setSelection([A], null);
    expect(state().selectionAnchor).toBeNull();
  });

  it("toggleCell добавляет и убирает ячейку", () => {
    state().toggleCell(A);
    expect(state().selection.has(A)).toBe(true);
    state().toggleCell(B);
    expect(state().selection.size).toBe(2);
    state().toggleCell(A);
    expect([...state().selection]).toEqual([B]);
    expect(state().selectionAnchor).toBe(A);
  });

  it("clearSelection очищает выделение и якорь", () => {
    state().setSelection([A, B], A);
    state().clearSelection();
    expect(state().selection.size).toBe(0);
    expect(state().selectionAnchor).toBeNull();
  });

  it("смена вида и периода снимает выделение", () => {
    state().setSelection([A], A);
    state().setView("month");
    expect(state().view).toBe("month");
    expect(state().selection.size).toBe(0);

    state().setSelection([B], B);
    state().setAnchor("2026-12-01");
    expect(state().anchor).toBe("2026-12-01");
    expect(state().selection.size).toBe(0);
  });

  it("поиск не снимает выделение", () => {
    state().setSelection([A], A);
    state().setSearch("Алина");
    expect(state().search).toBe("Алина");
    expect(state().selection.size).toBe(1);
  });
});

describe("своя смена", () => {
  it("setCustomTime обновляет только переданные поля", () => {
    state().setCustomTime({ customStart: "08:00" });
    expect([state().customStart, state().customEnd]).toEqual(["08:00", "17:00"]);
    state().setCustomTime({ customEnd: "20:00" });
    expect(state().customEnd).toBe("20:00");
  });
});

describe("черновик", () => {
  it("setCells назначает значение сразу в несколько ячеек", () => {
    state().setCells([A, B], VALUE);
    expect(state().draft).toEqual({ [A]: VALUE, [B]: VALUE });
  });

  it("null помечает смену как удалённую", () => {
    state().setCells([A], null);
    expect(state().draft).toEqual({ [A]: null });
  });

  it("повторная правка перезаписывает значение, остальные не трогает", () => {
    state().setCells([A, B], VALUE);
    state().setCells([A], { ...VALUE, start: "11:00" });
    expect(state().draft[A]?.start).toBe("11:00");
    expect(state().draft[B]).toEqual(VALUE);
  });

  it("принимает любой Iterable (Set)", () => {
    state().setCells(new Set([A, C]), VALUE);
    expect(Object.keys(state().draft)).toEqual([A, C]);
  });

  it("не мутирует предыдущий объект черновика", () => {
    state().setCells([A], VALUE);
    const before = state().draft;
    state().setCells([B], VALUE);
    expect(before).toEqual({ [A]: VALUE });
  });

  it("clearDraft очищает все правки", () => {
    state().setCells([A, B], VALUE);
    state().clearDraft();
    expect(state().draft).toEqual({});
  });
});

describe("привязка к графику", () => {
  const value = { start: "09:00", end: "17:00", templateId: null };

  it("при смене графика черновик и выделение сбрасываются", () => {
    useScheduleStore.getState().bindSchedule("a");
    useScheduleStore.getState().setCells(["emp-1|2026-11-17"], value);
    useScheduleStore.getState().setSelection(["emp-1|2026-11-17"], "emp-1|2026-11-17");

    useScheduleStore.getState().bindSchedule("b");

    expect(useScheduleStore.getState().scheduleId).toBe("b");
    expect(useScheduleStore.getState().draft).toEqual({});
    expect(useScheduleStore.getState().selection.size).toBe(0);
  });

  it("повторная привязка к тому же графику ничего не трогает", () => {
    useScheduleStore.getState().bindSchedule("a");
    useScheduleStore.getState().setCells(["emp-1|2026-11-17"], value);
    useScheduleStore.getState().bindSchedule("a");
    expect(Object.keys(useScheduleStore.getState().draft)).toEqual(["emp-1|2026-11-17"]);
  });
});
