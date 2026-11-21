import { render, screen } from "@testing-library/react";
import { TEMPLATES } from "@tests/helpers/fixtures";
import { describe, expect, it } from "vitest";
import { TemplateCard } from "./template-card";

const [MORNING, DAY, EVENING] = TEMPLATES;

describe("TemplateCard", () => {
  it("показывает название, время и длительность", () => {
    if (!MORNING) throw new Error("нет фикстуры");
    render(<TemplateCard template={MORNING} usage={0} />);
    expect(screen.getByText("Утро")).toBeInTheDocument();
    expect(screen.getByText("07:00 - 15:00 · 8 ч")).toBeInTheDocument();
  });

  it("счётчик использований доступен по aria-label", () => {
    if (!DAY) throw new Error("нет фикстуры");
    render(<TemplateCard template={DAY} usage={4} />);
    expect(screen.getByLabelText("Использований: 4")).toHaveTextContent("4");
  });

  it("считает длительность вечерней смены", () => {
    if (!EVENING) throw new Error("нет фикстуры");
    render(<TemplateCard template={EVENING} usage={2} />);
    expect(screen.getByText("15:00 - 23:00 · 8 ч")).toBeInTheDocument();
  });

  it.each([
    [0, "border-l-shift-indigo-stripe"],
    [1, "border-l-shift-violet-stripe"],
    [2, "border-l-shift-teal-stripe"],
  ])("цветная полоса шаблона #%i", (index, expected) => {
    const template = TEMPLATES[index];
    if (!template) throw new Error("нет фикстуры");
    const { container } = render(<TemplateCard template={template} usage={0} />);
    expect(container.firstElementChild?.className).toContain(expected);
  });
});
