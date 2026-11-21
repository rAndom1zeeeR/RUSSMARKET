import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EMPLOYEES } from "../../../../tests/helpers/fixtures";
import { EmployeeCell } from "./employee-cell";

const [WITH_PHOTO, WITHOUT_PHOTO] = EMPLOYEES;

describe("EmployeeCell", () => {
  it("показывает ФИО, роль и месячные часы", () => {
    if (!WITH_PHOTO) throw new Error("нет фикстуры");
    render(<EmployeeCell employee={WITH_PHOTO} />);
    expect(screen.getByText("Кузнецова Алина")).toBeInTheDocument();
    expect(screen.getByText("агент · 24 ч")).toBeInTheDocument();
  });

  it("с фото рисует изображение 40×40", () => {
    if (!WITH_PHOTO) throw new Error("нет фикстуры");
    const { container } = render(<EmployeeCell employee={WITH_PHOTO} />);
    const image = container.querySelector("img");
    expect(image).not.toBeNull();
    expect(image?.getAttribute("src")).toContain("user1.png");
    expect(image).toHaveAttribute("width", "40");
    expect(image).toHaveAttribute("height", "40");
  });

  it("без фото показывает инициалы", () => {
    if (!WITHOUT_PHOTO) throw new Error("нет фикстуры");
    const { container } = render(<EmployeeCell employee={WITHOUT_PHOTO} />);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("ВТ")).toBeInTheDocument();
  });

  it("инициалы — первые буквы двух первых слов, в верхнем регистре", () => {
    render(
      <EmployeeCell
        employee={{ id: "x", fullName: "иванов иван иванович", role: "старший", monthlyHours: 40, avatarUrl: null }}
      />
    );
    expect(screen.getByText("ИИ")).toBeInTheDocument();
    expect(screen.getByText("старший · 40 ч")).toBeInTheDocument();
  });
});
