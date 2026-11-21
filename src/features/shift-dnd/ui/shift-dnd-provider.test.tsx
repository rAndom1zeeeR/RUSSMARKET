import type { DragData } from "@/entities/shift/model/dnd";
import type { ReactNode } from "react";
import { pointerWithin, type DndContextProps, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useScheduleStore } from "@/entities/schedule/model/store";
import { TEMPLATES } from "../../../../tests/helpers/fixtures";
import { ShiftDndProvider } from "./shift-dnd-provider";

/**
 * Настоящая механика перетаскивания (сенсоры, измерения) — дело dnd-kit.
 * Здесь проверяем нашу обвязку: подменяем DndContext перехватчиком и вызываем его обработчики напрямую.
 */
const captured = vi.hoisted(() => ({ props: null as unknown }));

vi.mock("@dnd-kit/core", async importOriginal => {
  const actual = await importOriginal<typeof import("@dnd-kit/core")>();
  return {
    ...actual,
    DndContext: (props: { children: ReactNode }) => {
      captured.props = props;
      return <div data-testid="dnd-context">{props.children}</div>;
    },
    DragOverlay: ({ children }: { children: ReactNode }) => <div data-testid="overlay">{children}</div>,
  };
});

const state = () => useScheduleStore.getState();
const context = () => captured.props as DndContextProps;

const MORNING = TEMPLATES[0];
const SOURCE = "emp-1|2026-11-17";
const TARGET = "emp-2|2026-11-18";
const DAY_VALUE = { start: "10:00", end: "18:00", templateId: "tpl-day" };

const templateData = (): DragData => {
  if (!MORNING) throw new Error("нет фикстуры");
  return { kind: "template", template: MORNING };
};
const shiftData = (): DragData => ({ kind: "shift", key: SOURCE, value: DAY_VALUE });

function startEvent(data: unknown, altKey = false): DragStartEvent {
  // Нам нужны только active.data.current и activatorEvent.altKey.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return { active: { data: { current: data } }, activatorEvent: { altKey } } as unknown as DragStartEvent;
}

function endEvent(data: unknown, overId: string | null): DragEndEvent {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return {
    active: { data: { current: data } },
    over: overId === null ? null : { id: overId },
  } as unknown as DragEndEvent;
}

function drag(data: DragData, overId: string | null, altKey = false) {
  act(() => context().onDragStart?.(startEvent(data, altKey)));
  act(() => context().onDragEnd?.(endEvent(data, overId)));
}

beforeEach(() => {
  captured.props = null;
  useScheduleStore.setState(useScheduleStore.getInitialState(), true);
  render(
    <ShiftDndProvider view="week" templates={TEMPLATES}>
      <p>контент</p>
    </ShiftDndProvider>
  );
});

describe("ShiftDndProvider: настройка", () => {
  it("рендерит children и определяет цель по положению указателя", () => {
    expect(screen.getByText("контент")).toBeInTheDocument();
    expect(context().collisionDetection).toBe(pointerWithin);
  });

  it("мышь активируется после 6 px, касание — долгим нажатием", () => {
    const sensors = context().sensors ?? [];
    expect(sensors).toHaveLength(2);
    expect(sensors.map(sensor => JSON.stringify(sensor.options))).toEqual([
      JSON.stringify({ activationConstraint: { distance: 6 } }),
      JSON.stringify({ activationConstraint: { delay: 200, tolerance: 6 } }),
    ]);
  });
});

describe("ShiftDndProvider: шаблон → ячейка", () => {
  it("назначает шаблон ячейке вне выделения", () => {
    drag(templateData(), TARGET);
    expect(state().draft).toEqual({ [TARGET]: { start: "07:00", end: "15:00", templateId: "tpl-morning" } });
  });

  it("если цель в выделении — назначает во все выделенные", () => {
    state().setSelection([SOURCE, TARGET], SOURCE);
    drag(templateData(), TARGET);
    expect(Object.keys(state().draft).toSorted()).toEqual([SOURCE, TARGET].toSorted());
  });
});

describe("ShiftDndProvider: смена → ячейка", () => {
  it("переносит: цель получает смену, источник очищается, цель выделяется", () => {
    drag(shiftData(), TARGET);
    expect(state().draft).toEqual({ [TARGET]: DAY_VALUE, [SOURCE]: null });
    expect([...state().selection]).toEqual([TARGET]);
    expect(state().selectionAnchor).toBe(TARGET);
  });

  it("с зажатым Alt копирует: источник остаётся", () => {
    drag(shiftData(), TARGET, true);
    expect(state().draft).toEqual({ [TARGET]: DAY_VALUE });
  });

  it("Alt действует только на текущее перетаскивание", () => {
    drag(shiftData(), TARGET, true);
    useScheduleStore.getState().clearDraft();
    drag(shiftData(), TARGET, false);
    expect(state().draft).toEqual({ [TARGET]: DAY_VALUE, [SOURCE]: null });
  });

  it("сброс в ту же ячейку ничего не меняет", () => {
    drag(shiftData(), SOURCE);
    expect(state().draft).toEqual({});
  });
});

describe("ShiftDndProvider: отмена и мусор", () => {
  it("сброс мимо ячеек ничего не меняет", () => {
    drag(shiftData(), null);
    expect(state().draft).toEqual({});
  });

  it("чужие данные перетаскивания игнорируются", () => {
    act(() => context().onDragStart?.(startEvent({ kind: "unknown" })));
    act(() => context().onDragEnd?.(endEvent({ kind: "unknown" }, TARGET)));
    expect(state().draft).toEqual({});
  });
});

describe("ShiftDndProvider: оверлей под курсором", () => {
  it("пока ничего не тянем — пусто", () => {
    expect(screen.getByTestId("overlay")).toBeEmptyDOMElement();
  });

  it("при перетаскивании шаблона показывает его карточку", () => {
    act(() => context().onDragStart?.(startEvent(templateData())));
    expect(screen.getByTestId("overlay")).toHaveTextContent("Утро");
    expect(screen.getByTestId("overlay")).toHaveTextContent("07:00 - 15:00");
  });

  it("при перетаскивании смены показывает чип со временем", () => {
    act(() => context().onDragStart?.(startEvent(shiftData())));
    expect(screen.getByTestId("overlay")).toHaveTextContent("10 - 18");
  });

  it("оверлей исчезает после сброса и после отмены", () => {
    act(() => context().onDragStart?.(startEvent(shiftData())));
    act(() => context().onDragEnd?.(endEvent(shiftData(), TARGET)));
    expect(screen.getByTestId("overlay")).toBeEmptyDOMElement();

    act(() => context().onDragStart?.(startEvent(shiftData())));
    act(() =>
      context().onDragCancel?.({
        active: { id: "x", data: { current: undefined }, rect: { current: { initial: null, translated: null } } },
        activatorEvent: new Event("x"),
        collisions: null,
        delta: { x: 0, y: 0 },
        over: null,
      })
    );
    expect(screen.getByTestId("overlay")).toBeEmptyDOMElement();
  });
});
