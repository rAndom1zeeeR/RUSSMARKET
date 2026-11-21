import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ShiftChip } from "./shift-chip";

describe("ShiftChip", () => {
  it("в неделе показывает диапазон и длительность", () => {
    render(<ShiftChip start="08:00" end="18:00" tone="violet" view="week" />);
    expect(screen.getByText("08 - 18")).toBeInTheDocument();
    expect(screen.getByText("10 ч")).toBeInTheDocument();
  });

  it("в месяце показывает только длительность", () => {
    render(<ShiftChip start="08:00" end="18:00" tone="violet" view="month" />);
    expect(screen.getByText("10 ч")).toBeInTheDocument();
    expect(screen.queryByText("08 - 18")).not.toBeInTheDocument();
  });

  it("считает ночную смену и показывает минуты", () => {
    render(<ShiftChip start="22:30" end="06:00" tone="indigo" view="week" />);
    expect(screen.getByText("22:30 - 06")).toBeInTheDocument();
    expect(screen.getByText("7,5 ч")).toBeInTheDocument();
  });

  it("title содержит полное время и длительность", () => {
    const { container } = render(<ShiftChip start="07:00" end="15:00" tone="indigo" view="week" />);
    expect(container.firstElementChild).toHaveAttribute("title", "07:00 – 15:00 · 8 ч");
  });

  it.each([
    ["indigo", "bg-shift-indigo-bg"],
    ["violet", "bg-shift-violet-bg"],
    ["teal", "bg-shift-teal-bg"],
    ["custom", "bg-shift-custom-bg"],
  ] as const)("тон %s → %s", (tone, expected) => {
    const { container } = render(<ShiftChip start="08:00" end="16:00" tone={tone} view="week" />);
    expect(container.firstElementChild?.className).toContain(expected);
  });

  it("собственная смена в месяце — белый текст, у шаблонов — акцентный", () => {
    const { rerender } = render(<ShiftChip start="08:00" end="16:00" tone="custom" view="month" />);
    expect(screen.getByText("8 ч").className).toContain("text-white");
    rerender(<ShiftChip start="08:00" end="16:00" tone="teal" view="month" />);
    expect(screen.getByText("8 ч").className).toContain("text-shift-teal-fg");
  });

  it("принимает дополнительный className", () => {
    const { container } = render(<ShiftChip start="08:00" end="16:00" tone="teal" view="week" className="ring-2" />);
    expect(container.firstElementChild?.className).toContain("ring-2");
  });
});
