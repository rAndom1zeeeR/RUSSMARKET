import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "./badge";

describe("Badge", () => {
  it("по умолчанию синий", () => {
    render(<Badge>5</Badge>);
    expect(screen.getByText("5").className).toContain("bg-brand");
  });

  it.each([
    ["dark", "bg-ink"],
    ["onDark", "bg-ink-bar-badge"],
    ["counter", "bg-surface"],
  ] as const)("тон %s → %s", (tone, expected) => {
    render(<Badge tone={tone}>x</Badge>);
    expect(screen.getByText("x").className).toContain(expected);
  });

  it("объединяет свой className и пробрасывает атрибуты", () => {
    render(
      <Badge tone="counter" className="mt-1" aria-label="Использований: 3">
        3
      </Badge>
    );
    const badge = screen.getByLabelText("Использований: 3");
    expect(badge.className).toContain("mt-1");
    expect(badge).toHaveTextContent("3");
  });
});
