import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { callsTo, stubFetch } from "@tests/helpers/fetch";
import { ANCHOR, EMPLOYEES, SCHEDULE, SHIFTS, TEMPLATES } from "@tests/helpers/fixtures";
import { createTestClient, renderWithClient, stubLayoutSize } from "@tests/helpers/render";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useScheduleStore } from "@/entities/schedule/model/store";
import { SchedulePage } from "./schedule-page";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() }, Toaster: () => null }));

const state = () => useScheduleStore.getState();

function routes(overrides: Parameters<typeof stubFetch>[0] = {}) {
  return stubFetch({
    "GET /api/employees": { body: EMPLOYEES },
    "GET /api/templates": { body: TEMPLATES },
    "GET /api/schedules/main": { body: SCHEDULE },
    "GET /api/schedules/main/shifts": call => {
      const from = call.url.searchParams.get("from") ?? "";
      const to = call.url.searchParams.get("to") ?? "";
      return { body: SHIFTS.filter(shift => shift.date >= from && shift.date <= to) };
    },
    "PUT /api/schedules/main/shifts": { body: SCHEDULE },
    ...overrides,
  });
}

async function renderPage() {
  const view = renderWithClient(<SchedulePage scheduleId="main" />);
  await screen.findByRole("grid");
  const cell = (employeeId: string, date: string): HTMLElement => {
    const element = view.container.querySelector<HTMLElement>(`[data-cell="${employeeId}|${date}"]`);
    if (!element) throw new Error(`Нет ячейки ${employeeId} ${date}`);
    return element;
  };
  return { ...view, cell };
}

let restoreLayout: () => void;

beforeEach(() => {
  useScheduleStore.setState(useScheduleStore.getInitialState(), true);
  state().setAnchor(ANCHOR);
  restoreLayout = stubLayoutSize(1000, 700);
});

afterEach(() => {
  restoreLayout();
  vi.unstubAllGlobals();
});

describe("SchedulePage: загрузка", () => {
  it("сначала индикатор загрузки, затем график", async () => {
    routes();
    renderWithClient(<SchedulePage scheduleId="main" />);
    expect(screen.getByText("Загрузка графика…")).toBeInTheDocument();
    expect(await screen.findByRole("grid")).toBeInTheDocument();
    expect(screen.queryByText("Загрузка графика…")).not.toBeInTheDocument();
  });

  it("заголовок, ссылка на главную и панель шаблонов", async () => {
    routes();
    await renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "График" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "На главную" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("heading", { name: "Шаблоны смен" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Своя смена" })).toBeInTheDocument();
  });

  it("показывает сотрудников, смены и покрытие из API", async () => {
    routes();
    const { cell } = await renderPage();
    expect(screen.getByText("Волков Тимур")).toBeInTheDocument();
    expect(within(cell("emp-1", "2026-11-17")).getByText("10 - 18")).toBeInTheDocument();
    expect(screen.getByLabelText("Покрытие 2026-11-17: 2")).toBeInTheDocument();
    expect(screen.getByLabelText("Покрытие 2026-11-19: 0")).toBeInTheDocument();
    expect(screen.getByLabelText("Использований: 2")).toBeInTheDocument();
  });

  it("ошибка API выводится в alert вместо графика", async () => {
    routes({ "GET /api/employees": { status: 500, body: { error: "База данных не готова" } } });
    renderWithClient(<SchedulePage scheduleId="main" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("База данных не готова");
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
  });
});

describe("SchedulePage: назначение смен", () => {
  it("выделение пустой ячейки и шаблон из панели: смена появляется, покрытие и счётчик растут", async () => {
    routes();
    const { cell } = await renderPage();

    await userEvent.click(cell("emp-3", "2026-11-16"));
    await userEvent.click(screen.getByRole("button", { name: /Утро/ }));

    expect(within(cell("emp-3", "2026-11-16")).getByText("07 - 15")).toBeInTheDocument();
    expect(screen.getByLabelText("Покрытие 2026-11-16: 1")).toHaveTextContent("1");
    expect(screen.getByLabelText("Использований: 1")).toBeInTheDocument();
  });

  it("панель выделения появляется вместе с выделением и пропадает после «Снять»", async () => {
    routes();
    const { cell } = await renderPage();
    expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();

    await userEvent.click(cell("emp-3", "2026-11-16"));
    expect(screen.getByRole("toolbar")).toHaveTextContent("1 ячейка");

    await userEvent.click(screen.getByRole("button", { name: "Снять выделение" }));
    expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
  });

  it("своя смена во все выделенные ячейки", async () => {
    routes();
    const { cell } = await renderPage();

    await userEvent.click(cell("emp-3", "2026-11-19"));
    fireEvent.pointerDown(cell("emp-3", "2026-11-20"), { button: 0, pointerType: "mouse", ctrlKey: true });
    fireEvent.change(screen.getByLabelText("Начало"), { target: { value: "08:30" } });
    fireEvent.change(screen.getByLabelText("Конец"), { target: { value: "13:00" } });
    await userEvent.click(screen.getByRole("button", { name: "Поставить в выделенные" }));

    expect(within(cell("emp-3", "2026-11-19")).getByText("08:30 - 13")).toBeInTheDocument();
    expect(within(cell("emp-3", "2026-11-20")).getByText("08:30 - 13")).toBeInTheDocument();
    expect(screen.getByLabelText("Покрытие 2026-11-19: 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Покрытие 2026-11-20: 1")).toBeInTheDocument();
  });

  it("очистка смены уменьшает покрытие", async () => {
    routes();
    const { cell } = await renderPage();

    await userEvent.click(cell("emp-1", "2026-11-17"));
    await userEvent.click(screen.getByRole("button", { name: "Очистить" }));

    expect(within(cell("emp-1", "2026-11-17")).queryByText("10 - 18")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Покрытие 2026-11-17: 1")).toBeInTheDocument();
  });

  it("быстрое назначение по клику на дату ставит смену всем сотрудникам", async () => {
    routes();
    const { cell } = await renderPage();

    await userEvent.click(screen.getByRole("button", { name: "Быстро назначить смену на 2026-11-20" }));
    await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: /Вечер/ }));

    for (const employee of EMPLOYEES) {
      expect(within(cell(employee.id, "2026-11-20")).getByText("15 - 23")).toBeInTheDocument();
    }
    expect(screen.getByLabelText("Покрытие 2026-11-20: 3")).toBeInTheDocument();
  });

  it("быстрое назначение ставит смену всем сотрудникам, даже когда поиск сузил список (PLAN §10.1)", async () => {
    routes();
    const { cell } = await renderPage();

    await userEvent.type(screen.getByRole("textbox", { name: "Поиск по ФИО" }), "Волков");
    await waitFor(() => expect(screen.queryByText("Кузнецова Алина")).not.toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Быстро назначить смену на 2026-11-20" }));
    const menu = await screen.findByRole("dialog");
    expect(menu).toHaveTextContent(`${EMPLOYEES.length} сотр.`);
    await userEvent.click(within(menu).getByRole("button", { name: /День/ }));

    expect(within(cell("emp-2", "2026-11-20")).getByText("10 - 18")).toBeInTheDocument();
    expect(screen.getByLabelText(`Покрытие 2026-11-20: ${EMPLOYEES.length}`)).toBeInTheDocument();

    await userEvent.clear(screen.getByRole("textbox", { name: "Поиск по ФИО" }));
    await waitFor(() => expect(screen.getByText("Кузнецова Алина")).toBeInTheDocument());
    expect(within(cell("emp-1", "2026-11-20")).getByText("10 - 18")).toBeInTheDocument();
    expect(within(cell("emp-3", "2026-11-20")).getByText("10 - 18")).toBeInTheDocument();
  });
});

describe("SchedulePage: дата периода считается на клиенте", () => {
  function serverHtml(): string {
    const client = createTestClient();
    return renderToString(
      <QueryClientProvider client={client}>
        <SchedulePage scheduleId="main" />
      </QueryClientProvider>
    );
  }

  it("серверный HTML не зависит от даты: ни заголовка периода, ни сетки, только заготовка", () => {
    useScheduleStore.setState(useScheduleStore.getInitialState(), true);
    const html = serverHtml();
    expect(html).toContain("Загрузка графика…");
    expect(html).not.toMatch(/ноябр|декабр|январ/);
    expect(html).not.toContain('role="grid"');
    // На сервере эффекты не выполняются: дата так и остаётся невыставленной.
    expect(state().anchor).toBeNull();
  });

  it("в браузере до первой отрисовки выставляется «сегодня» по часам пользователя", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 18, 9, 0));
    useScheduleStore.setState(useScheduleStore.getInitialState(), true);
    routes();

    renderWithClient(<SchedulePage scheduleId="main" />);

    expect(state().anchor).toBe("2026-11-18");
    expect(await screen.findByRole("button", { name: "16 – 22 ноября 2026" })).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("уже выбранный период не сбрасывается на «сегодня» при повторном открытии страницы", async () => {
    state().setAnchor("2027-03-10");
    routes();
    renderWithClient(<SchedulePage scheduleId="main" />);
    expect(state().anchor).toBe("2027-03-10");
    expect(await screen.findByRole("button", { name: "8 – 14 марта 2027" })).toBeInTheDocument();
  });
});

describe("SchedulePage: сохранение", () => {
  it("кнопка «Сохранить» оживает после правки и отправляет diff", async () => {
    const { calls } = routes();
    const { cell } = await renderPage();
    const save = screen.getByRole("button", { name: /Сохран/ });
    expect(save).toBeDisabled();

    await userEvent.click(cell("emp-3", "2026-11-16"));
    await userEvent.click(screen.getByRole("button", { name: /Утро/ }));
    expect(save).toBeEnabled();

    await userEvent.click(save);
    await waitFor(() => expect(callsTo(calls, "PUT", "/api/schedules/main/shifts")).toHaveLength(1));
    expect(callsTo(calls, "PUT", "/api/schedules/main/shifts")[0]?.body).toEqual({
      upserts: [{ employeeId: "emp-3", date: "2026-11-16", start: "07:00", end: "15:00", templateId: "tpl-morning" }],
      deletes: [],
      expectedUpdatedAt: expect.any(String),
    });
    await waitFor(() => expect(state().draft).toEqual({}));
  });

  it("удаление отправляется в deletes", async () => {
    const { calls } = routes();
    const { cell } = await renderPage();

    await userEvent.click(cell("emp-1", "2026-11-18"));
    await userEvent.click(screen.getByRole("button", { name: "Очистить" }));
    await userEvent.click(screen.getByRole("button", { name: /Сохран/ }));

    await waitFor(() => expect(callsTo(calls, "PUT", "/api/schedules/main/shifts")).toHaveLength(1));
    expect(callsTo(calls, "PUT", "/api/schedules/main/shifts")[0]?.body).toEqual({
      upserts: [],
      deletes: [{ employeeId: "emp-1", date: "2026-11-18" }],
      expectedUpdatedAt: expect.any(String),
    });
  });
});

describe("SchedulePage: выделение и поиск", () => {
  it("поиск снимает выделение ячеек скрытых сотрудников, видимые остаются", async () => {
    routes();
    await renderPage();

    state().setSelection(["emp-1|2026-11-19", "emp-2|2026-11-19"], "emp-1|2026-11-19");
    expect(state().selection.size).toBe(2);

    await userEvent.type(screen.getByRole("textbox", { name: "Поиск по ФИО" }), "Волков");
    await waitFor(() => expect(screen.queryByText("Кузнецова Алина")).not.toBeInTheDocument());

    expect([...state().selection]).toEqual(["emp-2|2026-11-19"]);
    expect(state().selectionAnchor).toBeNull();
  });
});

describe("SchedulePage: смена периода", () => {
  it("пока грузится новый период, сетка помечена занятой и есть статус для скринридера", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>(resolve => {
      release = resolve;
    });
    routes({
      "GET /api/schedules/main/shifts": async call => {
        if (call.url.searchParams.get("from") === "2026-11-23") await gate;
        return { body: [] };
      },
    });
    await renderPage();
    expect(screen.getByRole("grid")).toHaveAttribute("aria-busy", "false");

    await userEvent.click(screen.getByRole("button", { name: "Следующий период" }));
    await waitFor(() => expect(screen.getByRole("grid")).toHaveAttribute("aria-busy", "true"));
    expect(screen.getByText("Загружаем период…")).toBeInTheDocument();

    release();
    await waitFor(() => expect(screen.getByRole("grid")).toHaveAttribute("aria-busy", "false"));
  });
});

describe("SchedulePage: навигация по периодам", () => {
  it("переход на следующую неделю запрашивает смены нового периода", async () => {
    const { calls } = routes();
    await renderPage();

    await userEvent.click(screen.getByRole("button", { name: "Следующий период" }));
    await waitFor(() =>
      expect(
        callsTo(calls, "GET", "/api/schedules/main/shifts").some(
          call => call.url.searchParams.get("from") === "2026-11-23"
        )
      ).toBe(true)
    );
  });

  it("переключение на месяц запрашивает весь месяц", async () => {
    const { calls } = routes();
    await renderPage();

    await userEvent.click(screen.getByRole("radio", { name: "Месяц" }));
    await waitFor(() =>
      expect(
        callsTo(calls, "GET", "/api/schedules/main/shifts").some(
          call => call.url.searchParams.get("from") === "2026-11-01" && call.url.searchParams.get("to") === "2026-11-30"
        )
      ).toBe(true)
    );
  });
});
