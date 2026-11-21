import { describe, expect, it } from "vitest";
import { plural } from "./plural";

const FORMS = ["ячейка", "ячейки", "ячеек"] as const;

describe("plural", () => {
  it.each([
    [0, "ячеек"],
    [1, "ячейка"],
    [2, "ячейки"],
    [4, "ячейки"],
    [5, "ячеек"],
    [10, "ячеек"],
    [11, "ячеек"],
    [12, "ячеек"],
    [14, "ячеек"],
    [21, "ячейка"],
    [22, "ячейки"],
    [25, "ячеек"],
    [100, "ячеек"],
    [101, "ячейка"],
    [111, "ячеек"],
    [112, "ячеек"],
  ])("для %i выбирает «%s»", (count, expected) => {
    expect(plural(count, FORMS)).toBe(expected);
  });

  it("не зависит от знака числа", () => {
    expect(plural(-1, FORMS)).toBe("ячейка");
    expect(plural(-5, FORMS)).toBe("ячеек");
  });
});
