import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useScheduleStore } from "@/entities/schedule/model/store";
import { ANCHOR } from "../../../../tests/helpers/fixtures";
import { ScheduleToolbar } from "./schedule-toolbar";

const state = () => useScheduleStore.getState();

beforeEach(() => {
  useScheduleStore.setState(useScheduleStore.getInitialState(), true);
  state().setAnchor(ANCHOR);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ScheduleToolbar", () => {
  it("показывает переданный заголовок периода", () => {
    render(<ScheduleToolbar title="16 – 22 ноября 2026" />);
    expect(screen.getByRole("button", { name: "16 – 22 ноября 2026" })).toBeInTheDocument();
  });

  it("поиск пишет в хранилище", async () => {
    render(<ScheduleToolbar title="x" />);
    await userEvent.type(screen.getByRole("textbox", { name: "Поиск по ФИО" }), "Волков");
    expect(state().search).toBe("Волков");
  });

  it("переключатель вида меняет view", async () => {
    render(<ScheduleToolbar title="x" />);
    expect(screen.getByRole("radio", { name: "Неделя" })).toHaveAttribute("aria-checked", "true");

    await userEvent.click(screen.getByRole("radio", { name: "Месяц" }));
    expect(state().view).toBe("month");
    expect(screen.getByRole("radio", { name: "Месяц" })).toHaveAttribute("aria-checked", "true");

    await userEvent.click(screen.getByRole("radio", { name: "Неделя" }));
    expect(state().view).toBe("week");
  });

  it("стрелки двигают неделю", async () => {
    render(<ScheduleToolbar title="x" />);
    await userEvent.click(screen.getByRole("button", { name: "Следующий период" }));
    expect(state().anchor).toBe("2026-11-28");
    await userEvent.click(screen.getByRole("button", { name: "Предыдущий период" }));
    await userEvent.click(screen.getByRole("button", { name: "Предыдущий период" }));
    expect(state().anchor).toBe("2026-11-14");
  });

  it("в месяце стрелки двигают месяц", async () => {
    state().setView("month");
    render(<ScheduleToolbar title="x" />);
    await userEvent.click(screen.getByRole("button", { name: "Следующий период" }));
    expect(state().anchor).toBe("2026-12-21");
  });

  it("клик по заголовку возвращает к сегодняшней дате", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2027, 0, 15));
    render(<ScheduleToolbar title="x" />);
    await userEvent.click(screen.getByRole("button", { name: "x" }));
    expect(state().anchor).toBe("2027-01-15");
  });

  it("смена периода снимает выделение", async () => {
    state().setSelection(["emp-1|2026-11-17"], "emp-1|2026-11-17");
    render(<ScheduleToolbar title="x" />);
    await userEvent.click(screen.getByRole("button", { name: "Следующий период" }));
    expect(state().selection.size).toBe(0);
  });
});
