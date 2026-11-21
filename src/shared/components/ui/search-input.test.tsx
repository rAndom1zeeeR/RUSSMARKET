import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { SearchInput } from "./search-input";

function Controlled({ onChange }: { onChange?: (value: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <SearchInput
      value={value}
      onValueChange={next => {
        setValue(next);
        onChange?.(next);
      }}
      placeholder="Поиск по ФИО"
      aria-label="Поиск"
    />
  );
}

describe("SearchInput", () => {
  it("пробрасывает placeholder и aria-label на input", () => {
    render(<Controlled />);
    const input = screen.getByRole("textbox", { name: "Поиск" });
    expect(input).toHaveAttribute("placeholder", "Поиск по ФИО");
  });

  it("сообщает введённый текст", async () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    await userEvent.type(screen.getByRole("textbox"), "Ал");
    expect(onChange).toHaveBeenLastCalledWith("Ал");
    expect(screen.getByRole("textbox")).toHaveValue("Ал");
  });

  it("кнопка очистки появляется только при непустом значении", async () => {
    render(<Controlled />);
    expect(screen.queryByRole("button", { name: "Очистить поиск" })).not.toBeInTheDocument();
    await userEvent.type(screen.getByRole("textbox"), "а");
    expect(screen.getByRole("button", { name: "Очистить поиск" })).toBeInTheDocument();
  });

  it("очистка сбрасывает значение", async () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    await userEvent.type(screen.getByRole("textbox"), "Волков");
    await userEvent.click(screen.getByRole("button", { name: "Очистить поиск" }));
    expect(screen.getByRole("textbox")).toHaveValue("");
    expect(onChange).toHaveBeenLastCalledWith("");
  });

  it("поддерживает светлое оформление", () => {
    const { container } = render(<SearchInput value="" onValueChange={() => undefined} appearance="white" />);
    expect(container.firstElementChild?.className).toContain("bg-surface");
  });
});
