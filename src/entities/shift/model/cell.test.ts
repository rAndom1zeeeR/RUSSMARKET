import { describe, expect, it } from "vitest";
import { cellKey, parseCellKey } from "./cell";

describe("cellKey / parseCellKey", () => {
  it("строит ключ из сотрудника и даты", () => {
    expect(cellKey("emp-1", "2026-11-21")).toBe("emp-1|2026-11-21");
  });

  it("разбирает ключ обратно", () => {
    expect(parseCellKey("emp-1|2026-11-21")).toEqual({ employeeId: "emp-1", date: "2026-11-21" });
  });

  it("round-trip сохраняет значения", () => {
    expect(parseCellKey(cellKey("emp-7", "2027-01-05"))).toEqual({ employeeId: "emp-7", date: "2027-01-05" });
  });

  it("делит по последнему разделителю, поэтому id с «|» не ломает дату", () => {
    expect(parseCellKey("a|b|2026-11-21")).toEqual({ employeeId: "a|b", date: "2026-11-21" });
  });
});
