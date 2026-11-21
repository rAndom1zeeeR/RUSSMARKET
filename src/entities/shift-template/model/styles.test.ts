import { describe, expect, it } from "vitest";
import { TONE_STYLES } from "./styles";

describe("TONE_STYLES", () => {
  it("описывает все цвета шаблонов и собственную смену", () => {
    expect(Object.keys(TONE_STYLES).toSorted()).toEqual(["custom", "indigo", "teal", "violet"]);
  });

  it("у каждого тона есть фон чипа, акцент и полоса", () => {
    for (const style of Object.values(TONE_STYLES)) {
      expect(style.chip).toMatch(/bg-/);
      expect(style.accent).toMatch(/text-/);
      expect(style.stripe).toMatch(/border-l-/);
    }
  });

  it("собственная смена — белый текст на фирменном фоне", () => {
    expect(TONE_STYLES.custom.chip).toContain("text-white");
  });
});
