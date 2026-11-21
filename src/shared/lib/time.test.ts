import { describe, expect, it } from "vitest";
import { formatDuration, formatRange, formatRangeFull, isValidTime } from "./time";

describe("isValidTime", () => {
  it.each(["00:00", "07:05", "12:30", "23:59"])("принимает %s", value => {
    expect(isValidTime(value)).toBe(true);
  });

  it.each(["", "7:00", "24:00", "12:60", "12-30", "12:3", "ab:cd", "12:30:00"])("отклоняет «%s»", value => {
    expect(isValidTime(value)).toBe(false);
  });
});

describe("formatDuration", () => {
  it("считает обычную смену", () => {
    expect(formatDuration("07:00", "15:00")).toBe("8 ч");
    expect(formatDuration("10:00", "18:00")).toBe("8 ч");
  });

  it("считает смену через полночь", () => {
    expect(formatDuration("22:00", "06:00")).toBe("8 ч");
    expect(formatDuration("23:30", "00:30")).toBe("1 ч");
  });

  it("совпадающие начало и конец дают сутки", () => {
    expect(formatDuration("09:00", "09:00")).toBe("24 ч");
  });

  it("выводит доли часа с запятой", () => {
    expect(formatDuration("09:00", "17:30")).toBe("8,5 ч");
  });
});

describe("formatRange", () => {
  it("сокращает ровные часы", () => {
    expect(formatRange("08:00", "18:00")).toBe("08 - 18");
  });

  it("оставляет минуты, если они есть", () => {
    expect(formatRange("08:30", "18:00")).toBe("08:30 - 18");
    expect(formatRange("08:00", "18:45")).toBe("08 - 18:45");
  });
});

describe("formatRangeFull", () => {
  it("выводит время целиком", () => {
    expect(formatRangeFull("07:00", "15:00")).toBe("07:00 - 15:00");
  });
});
