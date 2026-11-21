import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useScheduleStore } from "@/entities/schedule/model/store";
import { TEMPLATES } from "../../../../tests/helpers/fixtures";
import { ShiftPanel } from "./shift-panel";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() }, Toaster: () => null }));

const state = () => useScheduleStore.getState();
const A = "emp-1|2026-11-16";
const B = "emp-2|2026-11-17";

function renderPanel(usage = new Map<string, number>()) {
  return render(<ShiftPanel templates={TEMPLATES} usage={usage} />);
}

beforeEach(() => {
  useScheduleStore.setState(useScheduleStore.getInitialState(), true);
  vi.mocked(toast.info).mockClear();
});

describe("ShiftPanel: шаблоны", () => {
  it("показывает все шаблоны со счётчиками использований", () => {
    renderPanel(
      new Map([
        ["tpl-day", 4],
        ["tpl-evening", 2],
      ])
    );
    expect(screen.getByRole("heading", { name: "Шаблоны смен" })).toBeInTheDocument();
    expect(screen.getByLabelText("Использований: 0")).toBeInTheDocument();
    expect(screen.getByLabelText("Использований: 4")).toBeInTheDocument();
    expect(screen.getByLabelText("Использований: 2")).toBeInTheDocument();
  });

  it("клик по шаблону назначает его во все выделенные ячейки", async () => {
    state().setSelection([A, B], A);
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: /Утро/ }));
    const morning = { start: "07:00", end: "15:00", templateId: "tpl-morning" };
    expect(state().draft).toEqual({ [A]: morning, [B]: morning });
  });

  it("без выделения подсказывает, что делать, и ничего не меняет", async () => {
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: /День/ }));
    expect(toast.info).toHaveBeenCalledWith("Сначала выделите ячейки в календаре");
    expect(state().draft).toEqual({});
  });
});

describe("ShiftPanel: своя смена", () => {
  it("поля времени по умолчанию 09:00–17:00 и приглушены", () => {
    renderPanel();
    expect(screen.getByLabelText("Начало")).toHaveValue("09:00");
    expect(screen.getByLabelText("Конец")).toHaveValue("17:00");
    expect(screen.getByLabelText("Начало").className).toContain("text-muted-foreground");
  });

  it("изменение времени пишется в хранилище и снимает приглушение", () => {
    renderPanel();
    fireEvent.change(screen.getByLabelText("Начало"), { target: { value: "08:15" } });
    fireEvent.change(screen.getByLabelText("Конец"), { target: { value: "20:00" } });
    expect([state().customStart, state().customEnd]).toEqual(["08:15", "20:00"]);
    expect(screen.getByLabelText("Начало").className).toContain("text-foreground");
  });

  it("«Поставить в выделенные» назначает собственную смену без шаблона", async () => {
    state().setSelection([A, B], A);
    renderPanel();
    fireEvent.change(screen.getByLabelText("Начало"), { target: { value: "08:00" } });
    await userEvent.click(screen.getByRole("button", { name: "Поставить в выделенные" }));
    const custom = { start: "08:00", end: "17:00", templateId: null };
    expect(state().draft).toEqual({ [A]: custom, [B]: custom });
  });

  it("без выделения подсказывает выделить ячейки", async () => {
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: "Поставить в выделенные" }));
    expect(toast.info).toHaveBeenCalledWith("Сначала выделите ячейки в календаре");
  });

  it("одинаковые начало и конец — показывает ошибку и блокирует кнопку", () => {
    renderPanel();
    fireEvent.change(screen.getByLabelText("Конец"), { target: { value: "09:00" } });
    expect(screen.getByText("Начало и конец не должны совпадать")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Поставить в выделенные" })).toBeDisabled();
  });

  it("принимает смену через полночь", () => {
    renderPanel();
    fireEvent.change(screen.getByLabelText("Начало"), { target: { value: "22:00" } });
    fireEvent.change(screen.getByLabelText("Конец"), { target: { value: "06:00" } });
    expect(screen.queryByText(/не должны совпадать/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Поставить в выделенные" })).toBeEnabled();
  });
});
