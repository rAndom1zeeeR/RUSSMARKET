import { fireEvent, render } from "@testing-library/react";
import Link from "next/link";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UNSAVED_CHANGES_MESSAGE, useUnsavedChangesGuard } from "./use-unsaved-changes-guard";

function Probe({ active }: { active: boolean }) {
  useUnsavedChangesGuard(active);
  return (
    <>
      <Link href="/schedules">внутренняя</Link>
      <a href="https://example.com/x">внешняя</a>
      <a href={window.location.pathname}>эта же страница</a>
    </>
  );
}

const linkNamed = (container: HTMLElement, text: string) =>
  [...container.querySelectorAll("a")].find(link => link.textContent === text) as HTMLAnchorElement;

const click = () => new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useUnsavedChangesGuard", () => {
  it("без правок ничего не перехватывает", () => {
    const confirm = vi.spyOn(window, "confirm");
    const { container } = render(<Probe active={false} />);
    const unload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(false);

    const event = click();
    linkNamed(container, "внутренняя").dispatchEvent(event);
    expect(confirm).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it("с правками просит подтвердить закрытие вкладки", () => {
    render(<Probe active />);
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("переход по внутренней ссылке: отказ отменяет переход", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const { container } = render(<Probe active />);
    const event = click();
    linkNamed(container, "внутренняя").dispatchEvent(event);
    expect(confirm).toHaveBeenCalledWith(UNSAVED_CHANGES_MESSAGE);
    expect(event.defaultPrevented).toBe(true);
  });

  it("переход по внутренней ссылке: согласие пропускает переход", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const { container } = render(<Probe active />);
    const event = click();
    linkNamed(container, "внутренняя").dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it("внешние ссылки, эта же страница, модификаторы, не левая кнопка и не ссылки не спрашивают", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const { container } = render(<Probe active />);
    linkNamed(container, "внешняя").dispatchEvent(click());
    linkNamed(container, "эта же страница").dispatchEvent(click());
    fireEvent.click(linkNamed(container, "внутренняя"), { ctrlKey: true });
    fireEvent.click(linkNamed(container, "внутренняя"), { button: 1 });
    fireEvent.click(container);
    expect(confirm).not.toHaveBeenCalled();
  });

  it("после снятия правок слушатели убираются", () => {
    const { rerender } = render(<Probe active />);
    rerender(<Probe active={false} />);
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
});
