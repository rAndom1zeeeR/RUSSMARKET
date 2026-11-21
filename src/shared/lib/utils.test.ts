import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("склеивает классы и пропускает ложные значения", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b");
  });

  it("поддерживает объекты и массивы", () => {
    expect(cn({ a: true, b: false }, ["c", "d"])).toBe("a c d");
  });

  it("при конфликте Tailwind-классов побеждает последний", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });

  it("не смешивает разные варианты одного свойства", () => {
    expect(cn("p-2", "md:p-4")).toBe("p-2 md:p-4");
  });
});
