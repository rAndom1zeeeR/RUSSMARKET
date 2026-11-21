import { afterEach, describe, expect, it, vi } from "vitest";
import { dayOfMonth, fromISODate, getRange, rangeTitle, stepAnchor, todayISO, weekdayShort } from "./date";

afterEach(() => {
  vi.useRealTimers();
});

describe("getRange", () => {
  it("неделя начинается с понедельника", () => {
    // 2026-11-21 — суббота
    const range = getRange("week", "2026-11-21");
    expect(range.from).toBe("2026-11-16");
    expect(range.to).toBe("2026-11-22");
    expect(range.days).toHaveLength(7);
    expect(range.days[0]).toBe("2026-11-16");
    expect(range.days[6]).toBe("2026-11-22");
  });

  it("понедельник и воскресенье остаются в своей неделе", () => {
    expect(getRange("week", "2026-11-16").from).toBe("2026-11-16");
    expect(getRange("week", "2026-11-22").to).toBe("2026-11-22");
  });

  it("неделя может переходить через границу месяца", () => {
    const range = getRange("week", "2026-12-02");
    expect(range.from).toBe("2026-11-30");
    expect(range.to).toBe("2026-12-06");
  });

  it("месяц охватывает все его дни", () => {
    const range = getRange("month", "2026-11-21");
    expect(range.from).toBe("2026-11-01");
    expect(range.to).toBe("2026-11-30");
    expect(range.days).toHaveLength(30);
  });

  it("учитывает високосный февраль", () => {
    expect(getRange("month", "2028-02-10").days).toHaveLength(29);
    expect(getRange("month", "2026-02-10").days).toHaveLength(28);
  });
});

describe("stepAnchor", () => {
  it("двигает по неделям", () => {
    expect(stepAnchor("week", "2026-11-21", 1)).toBe("2026-11-28");
    expect(stepAnchor("week", "2026-11-21", -1)).toBe("2026-11-14");
  });

  it("двигает по месяцам", () => {
    expect(stepAnchor("month", "2026-11-21", 1)).toBe("2026-12-21");
    expect(stepAnchor("month", "2026-11-21", -1)).toBe("2026-10-21");
  });

  it("не вылетает за конец короткого месяца", () => {
    expect(stepAnchor("month", "2026-01-31", 1)).toBe("2026-02-28");
  });
});

describe("подписи дат", () => {
  it("weekdayShort — две буквы по-русски", () => {
    expect(weekdayShort("2026-11-16")).toBe("пн");
    expect(weekdayShort("2026-11-22")).toBe("вс");
  });

  it("dayOfMonth — число месяца", () => {
    expect(dayOfMonth("2026-11-05")).toBe(5);
    expect(dayOfMonth("2026-11-30")).toBe(30);
  });

  it("fromISODate разбирает дату", () => {
    const date = fromISODate("2026-11-21");
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 10, 21]);
  });
});

describe("rangeTitle", () => {
  it("месяц — «ноябрь 2026»", () => {
    expect(rangeTitle("month", getRange("month", "2026-11-21"))).toBe("ноябрь 2026");
  });

  it("неделя внутри месяца — «16 – 22 ноября 2026»", () => {
    expect(rangeTitle("week", getRange("week", "2026-11-21"))).toBe("16 – 22 ноября 2026");
  });

  it("неделя на стыке месяцев называет оба", () => {
    const title = rangeTitle("week", getRange("week", "2026-12-02"));
    expect(title).toMatch(/^30 ноя\S* – 6 дек\S* 2026$/);
  });
});

describe("todayISO", () => {
  it("возвращает текущую дату в формате YYYY-MM-DD", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 21, 15, 30));
    expect(todayISO()).toBe("2026-11-21");
  });
});
