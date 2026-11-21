import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TEMPLATES } from "@tests/helpers/fixtures";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useScheduleStore } from "@/entities/schedule/model/store";
import { QuickAssignMenu } from "./quick-assign-menu";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() }, Toaster: () => null }));

const state = () => useScheduleStore.getState();
const DATE = "2026-11-17";
const TRIGGER = `Быстро назначить смену на ${DATE}`;

function renderMenu(employeeIds = ["emp-1", "emp-2", "emp-3"]) {
  return render(
    <QuickAssignMenu date={DATE} employeeIds={employeeIds} templates={TEMPLATES}>
      вт 17
    </QuickAssignMenu>
  );
}

async function open() {
  await userEvent.click(screen.getByRole("button", { name: TRIGGER }));
}

beforeEach(() => {
  useScheduleStore.setState(useScheduleStore.getInitialState(), true);
  vi.mocked(toast.error).mockClear();
});

describe("QuickAssignMenu", () => {
  it("триггер — подпись дня", () => {
    renderMenu();
    expect(screen.getByRole("button", { name: TRIGGER })).toHaveTextContent("вт 17");
  });

  it("недоступен, если нет сотрудников", () => {
    renderMenu([]);
    expect(screen.getByRole("button", { name: TRIGGER })).toBeDisabled();
  });

  it("в заголовке — дата и число сотрудников", async () => {
    renderMenu();
    await open();
    expect(await screen.findByText(/Смена на 17 ноября, вт · 3 сотр\./)).toBeInTheDocument();
  });

  it("предлагает шаблоны, свою смену и очистку дня", async () => {
    renderMenu();
    await open();
    await Promise.all(
      TEMPLATES.map(template =>
        screen.findByRole("button", { name: (_name, element) => element.textContent?.includes(template.name) ?? false })
      )
    );
    expect(screen.getByRole("button", { name: /Своя смена 09:00–17:00/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Очистить день" })).toBeInTheDocument();
  });

  it("шаблон назначается всем сотрудникам на эту дату, меню закрывается", async () => {
    renderMenu();
    await open();
    await userEvent.click(await screen.findByRole("button", { name: /Утро/ }));

    const morning = { start: "07:00", end: "15:00", templateId: "tpl-morning" };
    expect(state().draft).toEqual({
      [`emp-1|${DATE}`]: morning,
      [`emp-2|${DATE}`]: morning,
      [`emp-3|${DATE}`]: morning,
    });
    expect(screen.queryByRole("button", { name: "Очистить день" })).not.toBeInTheDocument();
  });

  it("ставит смену ровно тем сотрудникам, которых передала страница", async () => {
    renderMenu(["emp-2"]);
    await open();
    await userEvent.click(await screen.findByRole("button", { name: /Вечер/ }));
    expect(Object.keys(state().draft)).toEqual([`emp-2|${DATE}`]);
  });

  it("своя смена берёт время из панели «Своя смена»", async () => {
    state().setCustomTime({ customStart: "08:00", customEnd: "20:00" });
    renderMenu(["emp-1"]);
    await open();
    await userEvent.click(await screen.findByRole("button", { name: /Своя смена 08:00–20:00/ }));
    expect(state().draft).toEqual({ [`emp-1|${DATE}`]: { start: "08:00", end: "20:00", templateId: null } });
  });

  it("своя смена с одинаковым временем — ошибка и никаких правок", async () => {
    state().setCustomTime({ customStart: "10:00", customEnd: "10:00" });
    renderMenu(["emp-1"]);
    await open();
    await userEvent.click(await screen.findByRole("button", { name: /Своя смена 10:00–10:00/ }));
    expect(toast.error).toHaveBeenCalledWith("Начало и конец не должны совпадать");
    expect(state().draft).toEqual({});
  });

  it("«Очистить день» помечает смены дня удалёнными", async () => {
    renderMenu(["emp-1", "emp-2"]);
    await open();
    await userEvent.click(await screen.findByRole("button", { name: "Очистить день" }));
    expect(state().draft).toEqual({ [`emp-1|${DATE}`]: null, [`emp-2|${DATE}`]: null });
  });

  it("вызов с Esc закрывает меню без правок", async () => {
    renderMenu();
    await open();
    await screen.findByRole("button", { name: "Очистить день" });
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    await userEvent.keyboard("{Escape}");
    expect(state().draft).toEqual({});
  });
});
