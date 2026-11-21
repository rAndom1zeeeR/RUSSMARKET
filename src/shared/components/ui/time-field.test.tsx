import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TimeField } from "./time-field";

describe("TimeField", () => {
  it("подпись связана с полем времени", () => {
    render(<TimeField label="Начало" value="09:00" onValueChange={() => undefined} />);
    const input = screen.getByLabelText("Начало");
    expect(input).toHaveAttribute("type", "time");
    expect(input).toHaveValue("09:00");
  });

  it("сообщает новое значение", () => {
    const onValueChange = vi.fn();
    render(<TimeField label="Конец" value="17:00" onValueChange={onValueChange} />);
    fireEvent.change(screen.getByLabelText("Конец"), { target: { value: "18:30" } });
    expect(onValueChange).toHaveBeenCalledWith("18:30");
  });

  it("значение по умолчанию приглушено, изменённое — нет", () => {
    const { rerender } = render(<TimeField label="Начало" value="09:00" muted onValueChange={() => undefined} />);
    expect(screen.getByLabelText("Начало").className).toContain("text-muted-foreground");
    rerender(<TimeField label="Начало" value="10:00" onValueChange={() => undefined} />);
    expect(screen.getByLabelText("Начало").className).toContain("text-foreground");
  });

  it("не рисует иконку выбора времени браузера", () => {
    render(<TimeField label="Начало" value="09:00" onValueChange={() => undefined} />);
    expect(screen.getByLabelText("Начало").className).toContain("calendar-picker-indicator");
  });

  it("можно подключить свой id", () => {
    render(<TimeField id="custom-id" label="Начало" value="09:00" onValueChange={() => undefined} />);
    expect(screen.getByLabelText("Начало")).toHaveAttribute("id", "custom-id");
  });
});
