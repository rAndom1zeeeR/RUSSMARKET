import type { ShiftValue } from "@/entities/shift/model/types";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TEMPLATES } from "@tests/helpers/fixtures";
import { beforeEach, describe, expect, it } from "vitest";
import { useScheduleStore } from "@/entities/schedule/model/store";
import { SelectionToolbar } from "./selection-toolbar";

const state = () => useScheduleStore.getState();

const FILLED = "emp-1|2026-11-17";
const FILLED_2 = "emp-2|2026-11-17";
const EMPTY = "emp-1|2026-11-19";
const DAY: ShiftValue = { start: "10:00", end: "18:00", templateId: "tpl-day" };

const SHIFTS = new Map<string, ShiftValue>([
  [FILLED, DAY],
  [FILLED_2, DAY],
]);

function renderToolbar(selection: string[], shifts = SHIFTS) {
  state().setSelection(selection, selection[0] ?? null);
  return render(<SelectionToolbar shifts={shifts} templates={TEMPLATES} />);
}

beforeEach(() => {
  useScheduleStore.setState(useScheduleStore.getInitialState(), true);
});

describe("SelectionToolbar: сводка", () => {
  it("считает ячейки, сотрудников и дни, склоняя слово", () => {
    renderToolbar([FILLED, FILLED_2, EMPTY]);
    expect(screen.getByRole("toolbar", { name: "Действия с выделенными ячейками" })).toBeInTheDocument();
    expect(screen.getByText("3 ячейки")).toBeInTheDocument();
    expect(screen.getByText("2 сотрудника(-ов) · 2 дн.")).toBeInTheDocument();
  });

  it.each([
    [1, "1 ячейка"],
    [5, "5 ячеек"],
  ])("для %i выделенных — «%s»", (count, label) => {
    renderToolbar(Array.from({ length: count }, (_, index) => `emp-${index}|2026-11-16`));
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});

describe("SelectionToolbar: применить шаблон", () => {
  it("предлагает все шаблоны", async () => {
    renderToolbar([FILLED]);
    await userEvent.click(screen.getByRole("button", { name: "Применить шаблон" }));
    const offered = await Promise.all(
      TEMPLATES.map(template =>
        screen.findByRole("button", { name: (_name, element) => element.textContent?.includes(template.name) ?? false })
      )
    );
    expect(offered).toHaveLength(TEMPLATES.length);
  });

  it("назначает выбранный шаблон во все выделенные ячейки и закрывает список", async () => {
    renderToolbar([FILLED, EMPTY]);
    await userEvent.click(screen.getByRole("button", { name: "Применить шаблон" }));
    await userEvent.click(await screen.findByRole("button", { name: /Вечер/ }));

    const evening = { start: "15:00", end: "23:00", templateId: "tpl-evening" };
    expect(state().draft).toEqual({ [FILLED]: evening, [EMPTY]: evening });
    expect(screen.queryByRole("button", { name: /Вечер/ })).not.toBeInTheDocument();
  });
});

describe("SelectionToolbar: очистить", () => {
  it("недоступна, если среди выделенного нет смен", () => {
    renderToolbar([EMPTY]);
    expect(screen.getByRole("button", { name: "Очистить" })).toBeDisabled();
  });

  it("удаляет только заполненные ячейки", async () => {
    renderToolbar([FILLED, EMPTY, FILLED_2]);
    await userEvent.click(screen.getByRole("button", { name: "Очистить" }));
    expect(state().draft).toEqual({ [FILLED]: null, [FILLED_2]: null });
  });
});

describe("SelectionToolbar: снять", () => {
  it("снимает выделение", async () => {
    renderToolbar([FILLED, EMPTY]);
    await userEvent.click(screen.getByRole("button", { name: "Снять выделение" }));
    expect(state().selection.size).toBe(0);
  });
});

describe("SelectionToolbar: изменить время", () => {
  it("кнопки нет, если смен в выделении нет", () => {
    renderToolbar([EMPTY]);
    expect(screen.queryByRole("button", { name: "Изменить время" })).not.toBeInTheDocument();
  });

  it("подставляет время первой выделенной смены", async () => {
    renderToolbar([FILLED]);
    await userEvent.click(screen.getByRole("button", { name: "Изменить время" }));
    expect(await screen.findByLabelText("Начало")).toHaveValue("10:00");
    expect(screen.getByLabelText("Конец")).toHaveValue("18:00");
  });

  it("применяет новое время ко всем выделенным сменам, сохраняя шаблон", async () => {
    renderToolbar([FILLED, FILLED_2, EMPTY]);
    await userEvent.click(screen.getByRole("button", { name: "Изменить время" }));
    fireEvent.change(await screen.findByLabelText("Начало"), { target: { value: "11:00" } });
    fireEvent.change(screen.getByLabelText("Конец"), { target: { value: "19:30" } });
    await userEvent.click(screen.getByRole("button", { name: "Применить к выделенным сменам" }));

    const updated = { start: "11:00", end: "19:30", templateId: "tpl-day" };
    expect(state().draft).toEqual({ [FILLED]: updated, [FILLED_2]: updated });
  });

  it("одинаковые начало и конец — ошибка, применить нельзя", async () => {
    renderToolbar([FILLED]);
    await userEvent.click(screen.getByRole("button", { name: "Изменить время" }));
    fireEvent.change(await screen.findByLabelText("Конец"), { target: { value: "10:00" } });

    expect(screen.getByText("Начало и конец не должны совпадать")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Применить к выделенным сменам" })).toBeDisabled();
  });
});
