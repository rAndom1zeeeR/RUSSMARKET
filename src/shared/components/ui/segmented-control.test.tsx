import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SegmentedControl } from "./segmented-control";

const OPTIONS = [
  { value: "month", label: "Месяц" },
  { value: "week", label: "Неделя" },
] as const;

describe("SegmentedControl", () => {
  it("это radiogroup с подписью и по радио на опцию", () => {
    render(<SegmentedControl aria-label="Период" value="week" onValueChange={() => undefined} options={OPTIONS} />);
    expect(screen.getByRole("radiogroup", { name: "Период" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(2);
  });

  it("активная опция помечена aria-checked и тёмным фоном", () => {
    render(<SegmentedControl value="week" onValueChange={() => undefined} options={OPTIONS} />);
    expect(screen.getByRole("radio", { name: "Неделя" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Неделя" }).className).toContain("bg-ink-bar");
    expect(screen.getByRole("radio", { name: "Месяц" })).toHaveAttribute("aria-checked", "false");
  });

  it("клик сообщает значение выбранной опции", async () => {
    const onValueChange = vi.fn();
    render(<SegmentedControl value="week" onValueChange={onValueChange} options={OPTIONS} />);
    await userEvent.click(screen.getByRole("radio", { name: "Месяц" }));
    expect(onValueChange).toHaveBeenCalledWith("month");
  });

  it("свой className переопределяет ширину по умолчанию", () => {
    render(<SegmentedControl value="week" onValueChange={() => undefined} options={OPTIONS} className="w-full" />);
    const { className } = screen.getByRole("radiogroup");
    expect(className).toContain("w-full");
    expect(className).not.toContain("w-75");
  });
});
