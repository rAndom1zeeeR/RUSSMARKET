import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./button";

describe("Button", () => {
  it("по умолчанию type=button, чтобы не отправлять формы", () => {
    render(<Button>Ок</Button>);
    expect(screen.getByRole("button", { name: "Ок" })).toHaveAttribute("type", "button");
  });

  it("вызывает onClick", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Нажми</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("disabled не пропускает клик и получает стиль отключённой кнопки", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Нельзя
      </Button>
    );
    const button = screen.getByRole("button");
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
    expect(button.className).toContain("disabled:bg-muted");
  });

  it.each([
    ["ink", "primary", "bg-ink"],
    ["ink", "secondary", "bg-muted"],
    ["ink", "tertiary", "border-foreground"],
    ["brand", "primary", "bg-brand"],
    ["brand", "secondary", "bg-brand-soft"],
    ["brand", "tertiary", "border-brand"],
  ] as const)("тон %s, вариант %s → %s", (tone, variant, expected) => {
    render(
      <Button tone={tone} variant={variant}>
        x
      </Button>
    );
    expect(screen.getByRole("button").className).toContain(expected);
  });

  it.each([
    ["sm", "h-8"],
    ["md", "h-10"],
    ["lg", "h-12"],
    ["icon", "size-12"],
  ] as const)("размер %s → %s", (size, expected) => {
    render(<Button size={size}>x</Button>);
    expect(screen.getByRole("button").className).toContain(expected);
  });

  it("по умолчанию — тёмная основная кнопка среднего размера", () => {
    render(<Button>x</Button>);
    const { className } = screen.getByRole("button");
    expect(className).toContain("bg-ink");
    expect(className).toContain("h-10");
  });

  it("свой className переопределяет конфликтующие классы", () => {
    render(
      <Button size="lg" className="px-2">
        x
      </Button>
    );
    const { className } = screen.getByRole("button");
    expect(className).toContain("px-2");
    expect(className).not.toContain("px-4");
  });

  it("пробрасывает aria- и title-атрибуты", () => {
    render(
      <Button aria-label="Закрыть" title="Подсказка">
        ×
      </Button>
    );
    expect(screen.getByRole("button", { name: "Закрыть" })).toHaveAttribute("title", "Подсказка");
  });
});
