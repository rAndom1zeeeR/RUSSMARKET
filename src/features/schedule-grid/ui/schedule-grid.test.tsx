import type { ShiftValue } from "@/entities/shift/model/types";
import type { ComponentProps } from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ANCHOR, EMPLOYEES, SHIFTS, TEMPLATES } from "@tests/helpers/fixtures";
import { stubLayoutSize } from "@tests/helpers/render";
import { setViewportWidth } from "@tests/helpers/viewport";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useScheduleStore } from "@/entities/schedule/model/store";
import { cellKey } from "@/entities/shift/model/cell";
import { ShiftDndProvider } from "@/features/shift-dnd/ui/shift-dnd-provider";
import { getRange } from "@/shared/lib/date";
import { ScheduleGrid } from "./schedule-grid";

const state = () => useScheduleStore.getState();

const WEEK = getRange("week", ANCHOR);
const MONTH = getRange("month", ANCHOR);

const SHIFT_MAP = new Map<string, ShiftValue>(
  SHIFTS.map(shift => [
    cellKey(shift.employeeId, shift.date),
    { start: shift.start, end: shift.end, templateId: shift.templateId },
  ])
);

function coverageOf(shifts: ReadonlyMap<string, ShiftValue>) {
  const coverage = new Map<string, number>();
  for (const key of shifts.keys()) {
    const date = key.slice(key.lastIndexOf("|") + 1);
    coverage.set(date, (coverage.get(date) ?? 0) + 1);
  }
  return coverage;
}

type GridProps = ComponentProps<typeof ScheduleGrid>;

function renderGrid(overrides: Partial<GridProps> = {}) {
  const props: GridProps = {
    view: "week",
    range: WEEK,
    employees: EMPLOYEES,
    shifts: SHIFT_MAP,
    coverage: coverageOf(SHIFT_MAP),
    templates: TEMPLATES,
    renderDayHeader: (date, label) => <span data-testid={`day-${date}`}>{label}</span>,
    ...overrides,
  };
  const view = render(
    <ShiftDndProvider view={props.view} templates={TEMPLATES}>
      <ScheduleGrid {...props} />
    </ShiftDndProvider>
  );
  const cell = (employeeId: string, date: string): HTMLElement => {
    const element = view.container.querySelector<HTMLElement>(`[data-cell="${cellKey(employeeId, date)}"]`);
    if (!element) throw new Error(`Нет ячейки ${employeeId} ${date}`);
    return element;
  };
  return { ...view, cell };
}

let restoreLayout: () => void;

beforeEach(() => {
  useScheduleStore.setState(useScheduleStore.getInitialState(), true);
  restoreLayout = stubLayoutSize(1000, 700);
});

afterEach(() => {
  restoreLayout();
  vi.restoreAllMocks();
});

describe("ScheduleGrid: разметка", () => {
  it("это grid с подписью, заголовок колонок — дни недели", () => {
    renderGrid();
    expect(screen.getByRole("grid", { name: "График смен" })).toBeInTheDocument();
    expect(screen.getByTestId("day-2026-11-16")).toHaveTextContent("пн 16");
    expect(screen.getByTestId("day-2026-11-22")).toHaveTextContent("вс 22");
    expect(screen.getByText("Сотрудник")).toBeInTheDocument();
  });

  it("строка на каждого сотрудника", () => {
    renderGrid();
    for (const employee of EMPLOYEES) expect(screen.getByText(employee.fullName)).toBeInTheDocument();
    expect(screen.getAllByRole("rowheader")).toHaveLength(EMPLOYEES.length);
  });

  it("смены отображаются в своих ячейках", () => {
    const { cell } = renderGrid();
    expect(within(cell("emp-1", "2026-11-17")).getByText("10 - 18")).toBeInTheDocument();
    expect(within(cell("emp-2", "2026-11-17")).getByText("10 - 18")).toBeInTheDocument();
    expect(within(cell("emp-1", "2026-11-18")).getByText("10 - 23")).toBeInTheDocument();
    expect(within(cell("emp-3", "2026-11-17")).queryByText(/\d - \d/)).not.toBeInTheDocument();
  });

  it("нет сотрудников — сообщение вместо строк", () => {
    renderGrid({ employees: [] });
    expect(screen.getByText("Сотрудники не найдены")).toBeInTheDocument();
    expect(screen.queryAllByRole("rowheader")).toHaveLength(0);
  });

  it("в месяце заголовки двухстрочные, колонок по числу дней", () => {
    renderGrid({ view: "month", range: MONTH });
    const header = screen.getByTestId("day-2026-11-01");
    expect(header).toHaveTextContent("вс1");
    expect(screen.getAllByRole("columnheader")).toHaveLength(31);
  });

  it("в месяце в ячейке только длительность", () => {
    const { cell } = renderGrid({ view: "month", range: MONTH });
    const chip = cell("emp-1", "2026-11-17");
    expect(within(chip).getByText("8 ч")).toBeInTheDocument();
    expect(within(chip).queryByText("10 - 18")).not.toBeInTheDocument();
  });
});

describe("ScheduleGrid: покрытие", () => {
  it("показывает число смен на дату", () => {
    renderGrid();
    expect(screen.getByLabelText("Покрытие 2026-11-17: 2")).toHaveTextContent("2");
    expect(screen.getByLabelText("Покрытие 2026-11-18: 1")).toHaveTextContent("1");
  });

  it("день без смен — красное «0», со сменами — голубое", () => {
    renderGrid();
    const empty = screen.getByLabelText("Покрытие 2026-11-19: 0");
    expect(empty).toHaveTextContent("0");
    expect(empty.className).toContain("bg-danger-soft");
    expect(screen.getByLabelText("Покрытие 2026-11-17: 2").className).toContain("bg-brand-soft");
  });

  it("обновляется при новых данных без перемонтирования", () => {
    const view = renderGrid();
    expect(screen.getByLabelText("Покрытие 2026-11-19: 0")).toBeInTheDocument();

    const next = new Map(SHIFT_MAP).set("emp-3|2026-11-19", {
      start: "07:00",
      end: "15:00",
      templateId: "tpl-morning",
    });
    view.rerender(
      <ShiftDndProvider view="week" templates={TEMPLATES}>
        <ScheduleGrid
          view="week"
          range={WEEK}
          employees={EMPLOYEES}
          shifts={next}
          coverage={coverageOf(next)}
          templates={TEMPLATES}
          renderDayHeader={(_date, label) => label}
        />
      </ShiftDndProvider>
    );
    expect(screen.getByLabelText("Покрытие 2026-11-19: 1").className).toContain("bg-brand-soft");
  });
});

describe("ScheduleGrid: выделение мышью", () => {
  it("клик выделяет ячейку", async () => {
    const { cell } = renderGrid();
    await userEvent.click(cell("emp-3", "2026-11-19"));
    expect(cell("emp-3", "2026-11-19")).toHaveAttribute("aria-selected", "true");
    expect([...state().selection]).toEqual(["emp-3|2026-11-19"]);
  });

  it("выделенная пустая ячейка показывает «+»", async () => {
    const { cell } = renderGrid();
    await userEvent.click(cell("emp-3", "2026-11-19"));
    expect(cell("emp-3", "2026-11-19").querySelector("svg")).not.toBeNull();
  });

  it("повторный клик по единственной выделенной ячейке снимает выделение", async () => {
    const { cell } = renderGrid();
    await userEvent.click(cell("emp-3", "2026-11-19"));
    await userEvent.click(cell("emp-3", "2026-11-19"));
    expect(state().selection.size).toBe(0);
  });

  it("обычный клик по другой ячейке заменяет выделение", async () => {
    const { cell } = renderGrid();
    await userEvent.click(cell("emp-3", "2026-11-19"));
    await userEvent.click(cell("emp-3", "2026-11-20"));
    expect([...state().selection]).toEqual(["emp-3|2026-11-20"]);
  });

  it("Ctrl-клик добавляет и убирает ячейки", async () => {
    const { cell } = renderGrid();
    await userEvent.click(cell("emp-3", "2026-11-19"));
    fireEvent.pointerDown(cell("emp-3", "2026-11-20"), { button: 0, pointerType: "mouse", ctrlKey: true });
    expect(state().selection.size).toBe(2);
    fireEvent.pointerDown(cell("emp-3", "2026-11-19"), { button: 0, pointerType: "mouse", ctrlKey: true });
    expect([...state().selection]).toEqual(["emp-3|2026-11-20"]);
  });

  it("⌘-клик (macOS) работает как Ctrl-клик", async () => {
    const { cell } = renderGrid();
    await userEvent.click(cell("emp-3", "2026-11-19"));
    fireEvent.pointerDown(cell("emp-3", "2026-11-20"), { button: 0, pointerType: "mouse", metaKey: true });
    expect(state().selection.size).toBe(2);
  });

  it("Shift-клик выделяет прямоугольник от якоря", async () => {
    const { cell } = renderGrid();
    await userEvent.click(cell("emp-1", "2026-11-16"));
    fireEvent.pointerDown(cell("emp-2", "2026-11-18"), { button: 0, pointerType: "mouse", shiftKey: true });

    expect(state().selection.size).toBe(6);
    expect(state().selection.has("emp-1|2026-11-16")).toBe(true);
    expect(state().selection.has("emp-2|2026-11-18")).toBe(true);
    expect(state().selection.has("emp-3|2026-11-17")).toBe(false);
  });

  it("протяжка с пустой ячейки выделяет прямоугольник", () => {
    const { cell } = renderGrid();
    fireEvent.pointerDown(cell("emp-3", "2026-11-19"), { button: 0, pointerType: "mouse" });
    fireEvent.pointerEnter(cell("emp-3", "2026-11-21"));
    fireEvent.pointerEnter(cell("emp-2", "2026-11-21"));
    fireEvent.pointerUp(window);

    expect(state().selection.size).toBe(6);
    expect(state().selection.has("emp-2|2026-11-19")).toBe(true);
  });

  it("после отпускания кнопки протяжка прекращается", () => {
    const { cell } = renderGrid();
    fireEvent.pointerDown(cell("emp-3", "2026-11-19"), { button: 0, pointerType: "mouse" });
    fireEvent.pointerUp(window);
    fireEvent.pointerEnter(cell("emp-3", "2026-11-21"));
    expect([...state().selection]).toEqual(["emp-3|2026-11-19"]);
  });

  it("с заполненной ячейки протяжка выделения не начинается (там drag-and-drop)", () => {
    const { cell } = renderGrid();
    fireEvent.pointerDown(cell("emp-1", "2026-11-17"), { button: 0, pointerType: "mouse" });
    fireEvent.pointerEnter(cell("emp-3", "2026-11-19"));
    expect([...state().selection]).toEqual(["emp-1|2026-11-17"]);
  });

  it("правая кнопка мыши выделение не меняет", () => {
    const { cell } = renderGrid();
    fireEvent.pointerDown(cell("emp-3", "2026-11-19"), { button: 2, pointerType: "mouse" });
    expect(state().selection.size).toBe(0);
  });

  it("Esc снимает выделение", async () => {
    const { cell } = renderGrid();
    await userEvent.click(cell("emp-3", "2026-11-19"));
    await userEvent.keyboard("{Escape}");
    expect(state().selection.size).toBe(0);
  });
});

describe("ScheduleGrid: Esc и занятость", () => {
  it("Esc, уже обработанный попапом (defaultPrevented), выделение не снимает", async () => {
    const { cell } = renderGrid();
    await userEvent.click(cell("emp-3", "2026-11-19"));
    const event = new KeyboardEvent("keydown", { key: "Escape", cancelable: true, bubbles: true });
    event.preventDefault();
    act(() => {
      window.dispatchEvent(event);
    });
    expect(state().selection.size).toBe(1);
  });

  it("busy: aria-busy включён", () => {
    renderGrid({ busy: true });
    expect(screen.getByRole("grid")).toHaveAttribute("aria-busy", "true");
  });

  it("без busy aria-busy выключен", () => {
    renderGrid();
    expect(screen.getByRole("grid")).toHaveAttribute("aria-busy", "false");
  });
});

describe("ScheduleGrid: клавиатура", () => {
  const tabbable = (container: HTMLElement) =>
    [...container.querySelectorAll<HTMLElement>("[data-cell]")].filter(element => element.tabIndex === 0);

  it("в порядке табуляции одна ячейка — первая", () => {
    const { container, cell } = renderGrid();
    expect(tabbable(container)).toEqual([cell("emp-1", "2026-11-16")]);
  });

  it("у ячейки есть подпись для скринридера", () => {
    const { cell } = renderGrid();
    const label = cell("emp-3", "2026-11-19").getAttribute("aria-label") ?? "";
    expect(label).toContain("нет смены");
    expect(label).toContain(EMPLOYEES[2]?.fullName);
  });

  it("стрелки двигают фокус, Space выделяет, Shift+стрелка расширяет диапазон", async () => {
    const { cell, container } = renderGrid();
    act(() => cell("emp-1", "2026-11-16").focus());

    await userEvent.keyboard("{ArrowRight}");
    await vi.waitFor(() => expect(document.activeElement).toBe(cell("emp-1", "2026-11-17")));
    expect(tabbable(container)).toEqual([cell("emp-1", "2026-11-17")]);

    await userEvent.keyboard("{ArrowDown}");
    await vi.waitFor(() => expect(document.activeElement).toBe(cell("emp-2", "2026-11-17")));

    await userEvent.keyboard(" ");
    expect([...state().selection]).toEqual(["emp-2|2026-11-17"]);

    await userEvent.keyboard("{Shift>}{ArrowRight}{/Shift}");
    await vi.waitFor(() => expect(document.activeElement).toBe(cell("emp-2", "2026-11-18")));
    expect([...state().selection].toSorted()).toEqual(["emp-2|2026-11-17", "emp-2|2026-11-18"]);
  });

  it("Home/End и границы сетки", async () => {
    const { cell } = renderGrid();
    act(() => cell("emp-1", "2026-11-18").focus());
    await userEvent.keyboard("{End}");
    await vi.waitFor(() => expect(document.activeElement).toBe(cell("emp-1", "2026-11-22")));
    await userEvent.keyboard("{ArrowRight}{ArrowUp}");
    expect(document.activeElement).toBe(cell("emp-1", "2026-11-22"));
    await userEvent.keyboard("{Home}");
    await vi.waitFor(() => expect(document.activeElement).toBe(cell("emp-1", "2026-11-16")));
  });

  it("Enter выделяет ячейку, повторный Enter снимает; прочие клавиши игнорируются", async () => {
    const { cell } = renderGrid();
    act(() => cell("emp-1", "2026-11-16").focus());
    await userEvent.keyboard("{Enter}");
    expect(state().selection.size).toBe(1);
    await userEvent.keyboard("{Enter}");
    expect(state().selection.size).toBe(0);
    await userEvent.keyboard("a");
    expect(state().selection.size).toBe(0);
  });
});

describe("ScheduleGrid: касания", () => {
  it("тап добавляет ячейки в выделение, повторный тап убирает", () => {
    const { cell } = renderGrid();
    fireEvent.pointerDown(cell("emp-3", "2026-11-19"), { button: 0, pointerType: "touch" });
    fireEvent.pointerDown(cell("emp-3", "2026-11-20"), { button: 0, pointerType: "touch" });
    expect(state().selection.size).toBe(2);

    fireEvent.pointerDown(cell("emp-3", "2026-11-19"), { button: 0, pointerType: "touch" });
    expect([...state().selection]).toEqual(["emp-3|2026-11-20"]);
  });

  it("протяжка пальцем выделение не растягивает", () => {
    const { cell } = renderGrid();
    fireEvent.pointerDown(cell("emp-3", "2026-11-19"), { button: 0, pointerType: "touch" });
    fireEvent.pointerEnter(cell("emp-3", "2026-11-21"));
    expect(state().selection.size).toBe(1);
  });
});

describe("ScheduleGrid: размеры по брейкпоинтам", () => {
  const columnsOf = () => screen.getAllByRole("row")[0]?.style.gridTemplateColumns;

  it("sm: колонка сотрудника 116, день от 60", () => {
    setViewportWidth(360);
    renderGrid();
    expect(columnsOf()).toBe("116px repeat(7, minmax(60px, 1fr))");
  });

  it("md: колонка сотрудника 180, день от 76", () => {
    setViewportWidth(800);
    renderGrid();
    expect(columnsOf()).toBe("180px repeat(7, minmax(76px, 1fr))");
  });

  it("lg с широкой карточкой — размеры из макета: 220 и 88", () => {
    setViewportWidth(1700);
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 993, 600));
    renderGrid();
    expect(columnsOf()).toBe("220px repeat(7, minmax(88px, 1fr))");
  });

  it("lg с узкой карточкой (≈1200 px экрана) — компактнее: 168 и 64", () => {
    setViewportWidth(1200);
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 493, 600));
    renderGrid();
    expect(columnsOf()).toBe("168px repeat(7, minmax(64px, 1fr))");
  });

  it("в месяце минимальная ширина дня меньше", () => {
    setViewportWidth(1700);
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 993, 600));
    renderGrid({ view: "month", range: MONTH });
    expect(columnsOf()).toBe("220px repeat(30, minmax(64px, 1fr))");
  });

  it("реагирует на смену ширины окна", () => {
    setViewportWidth(1700);
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 993, 600));
    renderGrid();
    expect(columnsOf()).toContain("220px");
    act(() => setViewportWidth(400));
    expect(columnsOf()).toContain("116px");
  });
});

describe("ScheduleGrid: виртуализация", () => {
  it("при сотне сотрудников рисует только видимые строки", () => {
    const many = Array.from({ length: 100 }, (_, index) => ({
      id: `emp-${index}`,
      fullName: `Сотрудник ${index}`,
      role: "агент",
      monthlyHours: 24,
      avatarUrl: null,
    }));
    renderGrid({ employees: many });
    const rendered = screen.getAllByRole("rowheader").length;
    expect(rendered).toBeGreaterThan(0);
    expect(rendered).toBeLessThan(30);
  });
});
